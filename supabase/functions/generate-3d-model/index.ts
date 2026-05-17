import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FREE_GENERATION_LIMIT = 5;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { prompt, user_id } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Support both REPLICATE_API_TOKEN and REPLICATE_API_KEY
    const replicateApiKey =
      Deno.env.get("REPLICATE_API_TOKEN") || Deno.env.get("REPLICATE_API_KEY");

    if (!replicateApiKey) {
      return new Response(
        JSON.stringify({ error: "REPLICATE_API_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

     const supabase = createClient(
   Deno.env.get("DB_URL")!,
   Deno.env.get("DB_SERVICE_KEY")!
 );

    // --- Rate limiting: max FREE_GENERATION_LIMIT per user ---
    if (user_id) {
      const { count } = await supabase
        .from("models")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user_id)
        .eq("source_type", "ai_generated");

      if ((count ?? 0) >= FREE_GENERATION_LIMIT) {
        return new Response(
          JSON.stringify({ error: "limit_reached", limit: FREE_GENERATION_LIMIT }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // --- 1. Create DB record with status "processing" ---
    const { data: modelRecord, error: insertError } = await supabase
      .from("models")
      .insert({
        user_id: user_id || null,
        name: prompt.slice(0, 80),
        prompt,
        status: "processing",
        source_type: "ai_generated",
        format: "glb",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const modelId = modelRecord.id;

    const markFailed = async (reason: string) => {
      await supabase
        .from("models")
        .update({ status: "failed", metadata: { error: reason } })
        .eq("id", modelId);
    };

    // --- 2. Call Replicate shap-e ---
    const predictionRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${replicateApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "5957069d5c509126a73c7cb68abcddbb985aeefa4d318e7c63ec1352ce6da68c",
        input: { prompt, batch_size: 1 },
      }),
    });

    if (!predictionRes.ok) {
      const errText = await predictionRes.text();
      await markFailed(`Replicate API error: ${errText}`);
      return new Response(
        JSON.stringify({ error: "Replicate API error", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prediction = await predictionRes.json();
    const pollUrl =
      prediction.urls?.get ||
      `https://api.replicate.com/v1/predictions/${prediction.id}`;

    // --- 3. Poll for result (max 120s) ---
    let result = prediction;
    for (let i = 0; i < 40; i++) {
      if (["succeeded", "failed", "canceled"].includes(result.status)) break;
      await new Promise((r) => setTimeout(r, 3000));
      const pollRes = await fetch(pollUrl, {
        headers: { Authorization: `Token ${replicateApiKey}` },
      });
      result = await pollRes.json();
    }

    if (result.status !== "succeeded") {
      await markFailed(`Generation status: ${result.status}`);
      return new Response(
        JSON.stringify({ error: "Generation failed", status: result.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;

    // --- 4. Download .glb and upload to Supabase Storage ---
    let storedUrl = outputUrl;
    let fileSize = 0;

    try {
      const fileResponse = await fetch(outputUrl);
      if (fileResponse.ok) {
        const fileBuffer = await fileResponse.arrayBuffer();
        fileSize = fileBuffer.byteLength;
        const userId = user_id || "anon";
        const filePath = `${userId}/${modelId}.glb`;

        const { error: uploadError } = await supabase.storage
          .from("models")
          .upload(filePath, fileBuffer, {
            contentType: "model/gltf-binary",
            upsert: false,
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from("models")
            .getPublicUrl(filePath);
          storedUrl = publicUrlData.publicUrl;
        }
      }
    } catch (storageErr) {
      console.warn("Storage upload failed, using direct URL:", storageErr);
    }

    // --- 5. Update DB to "ready" ---
    await supabase
      .from("models")
      .update({
        status: "ready",
        file_url: storedUrl,
        file_size: fileSize,
        metadata: { prediction_id: result.id, original_url: outputUrl },
        updated_at: new Date().toISOString(),
      })
      .eq("id", modelId);

    return new Response(
      JSON.stringify({
        url: storedUrl,
        status: "succeeded",
        prediction_id: result.id,
        model_id: modelId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
