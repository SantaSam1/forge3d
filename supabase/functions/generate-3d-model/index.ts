import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FREE_GENERATION_LIMIT = 5;
const TRIPO_API = "https://api.tripo3d.ai/v2/openapi";

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

    const tripoKey = Deno.env.get("TRIPO_API_KEY");
    if (!tripoKey) {
      return new Response(
        JSON.stringify({ error: "TRIPO_API_KEY not configured" }),
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

    // --- 2. Submit task to Tripo3D ---
    const taskRes = await fetch(`${TRIPO_API}/task`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tripoKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "text_to_model",
        prompt,
      }),
    });

    const taskData = await taskRes.json();

    if (!taskRes.ok || !taskData.data?.task_id) {
      const err = JSON.stringify(taskData);
      await markFailed(`Tripo task error: ${err}`);
      return new Response(
        JSON.stringify({ error: "Tripo API error", details: err }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const taskId = taskData.data.task_id;

    // --- 3. Poll until done (max 120s) ---
    let modelUrl = "";
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 3000));

      const pollRes = await fetch(`${TRIPO_API}/task/${taskId}`, {
        headers: { Authorization: `Bearer ${tripoKey}` },
      });
      const pollData = await pollRes.json();
      const status = pollData.data?.status;

      if (status === "success") {
        modelUrl = pollData.data?.output?.model || "";
        break;
      }

      if (status === "failed" || status === "cancelled") {
        await markFailed(`Tripo generation failed: ${status}`);
        return new Response(
          JSON.stringify({ error: "Generation failed", status }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!modelUrl) {
      await markFailed("Timeout waiting for Tripo");
      return new Response(
        JSON.stringify({ error: "Timeout waiting for model" }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- 4. Download GLB and upload to Supabase Storage ---
    let storedUrl = modelUrl;
    let fileSize = 0;

    try {
      const fileRes = await fetch(modelUrl);
      if (fileRes.ok) {
        const fileBuffer = await fileRes.arrayBuffer();
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
    } catch (e) {
      console.warn("Storage upload failed:", e);
    }

    // --- 5. Update DB to ready ---
    await supabase
      .from("models")
      .update({
        status: "ready",
        file_url: storedUrl,
        file_size: fileSize,
        metadata: { task_id: taskId, original_url: modelUrl },
        updated_at: new Date().toISOString(),
      })
      .eq("id", modelId);

    return new Response(
      JSON.stringify({ url: storedUrl, status: "succeeded", model_id: modelId }),
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