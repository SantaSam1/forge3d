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

    const hfToken = Deno.env.get("HF_TOKEN");
    if (!hfToken) {
      return new Response(
        JSON.stringify({ error: "HF_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("DB_URL")!,
      Deno.env.get("DB_SERVICE_KEY")!
    );

    // --- Rate limiting ---
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

    // --- 1. Create DB record ---
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

    // --- 2. Call HF Inference API ---
    const hfRes = await fetch(
      "https://api-inference.huggingface.co/models/openai/shap-e",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
          "X-Wait-For-Model": "true",
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    if (!hfRes.ok) {
      const errText = await hfRes.text();
      if (hfRes.status === 503) {
        await new Promise((r) => setTimeout(r, 30000));
        const retry = await fetch(
          "https://api-inference.huggingface.co/models/openai/shap-e",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${hfToken}`,
              "Content-Type": "application/json",
              "X-Wait-For-Model": "true",
            },
            body: JSON.stringify({ inputs: prompt }),
          }
        );
        if (!retry.ok) {
          const retryErr = await retry.text();
          await markFailed(`HF API error: ${retryErr}`);
          return new Response(
            JSON.stringify({ error: "HF API error", details: retryErr }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const fileBuffer = await retry.arrayBuffer();
        return await saveAndReturn(supabase, modelId, user_id, fileBuffer, corsHeaders);
      }
      await markFailed(`HF API error: ${errText}`);
      return new Response(
        JSON.stringify({ error: "HF API error", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileBuffer = await hfRes.arrayBuffer();
    return await saveAndReturn(supabase, modelId, user_id, fileBuffer, corsHeaders);

  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function saveAndReturn(
  supabase: ReturnType<typeof createClient>,
  modelId: string,
  user_id: string | undefined,
  fileBuffer: ArrayBuffer,
  corsHeaders: Record<string, string>
): Promise<Response> {
  let storedUrl = "";
  const fileSize = fileBuffer.byteLength;
  const userId = user_id || "anon";
  const filePath = `${userId}/${modelId}.glb`;

  try {
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
  } catch (e) {
    console.warn("Storage upload failed:", e);
  }

  await supabase
    .from("models")
    .update({
      status: "ready",
      file_url: storedUrl,
      file_size: fileSize,
      updated_at: new Date().toISOString(),
    })
    .eq("id", modelId);

  return new Response(
    JSON.stringify({ url: storedUrl, status: "succeeded", model_id: modelId }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}