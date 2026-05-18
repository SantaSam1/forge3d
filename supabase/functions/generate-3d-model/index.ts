import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TRIPO_API = "https://api.tripo3d.ai/v2/openapi";
const FREE_GENERATION_LIMIT = 5;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  // GET /generate-3d-model/status?task_id=xxx&model_id=xxx
  if (req.method === "GET" && url.searchParams.get("task_id")) {
    return await checkStatus(req, url);
  }

  // POST — create new task
  return await createTask(req);
});

async function createTask(req: Request): Promise<Response> {
  try {
    const { prompt, user_id } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tripoKey = Deno.env.get("TRIPO_API_KEY");
    const supabase = createClient(Deno.env.get("DB_URL")!, Deno.env.get("DB_SERVICE_KEY")!);

    // Rate limit
    if (user_id) {
      const { count } = await supabase.from("models")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user_id).eq("source_type", "ai_generated");
      if ((count ?? 0) >= FREE_GENERATION_LIMIT) {
        return new Response(JSON.stringify({ error: "limit_reached", limit: FREE_GENERATION_LIMIT }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Create DB record
    const { data: modelRecord, error: insertError } = await supabase.from("models").insert({
      user_id: user_id || null, name: prompt.slice(0, 80), prompt,
      status: "processing", source_type: "ai_generated", format: "glb",
    }).select().single();
    if (insertError) throw insertError;

    // Submit to Tripo
    const taskRes = await fetch(`${TRIPO_API}/task`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tripoKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "text_to_model", prompt }),
    });
    const taskData = await taskRes.json();

    if (!taskRes.ok || !taskData.data?.task_id) {
      await supabase.from("models").update({ status: "failed" }).eq("id", modelRecord.id);
      return new Response(JSON.stringify({ error: "Tripo error", details: JSON.stringify(taskData) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save task_id to DB
    await supabase.from("models").update({
      metadata: { task_id: taskData.data.task_id }
    }).eq("id", modelRecord.id);

    // Return immediately with task_id and model_id
    return new Response(JSON.stringify({
      status: "processing",
      task_id: taskData.data.task_id,
      model_id: modelRecord.id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

async function checkStatus(req: Request, url: URL): Promise<Response> {
  try {
    const taskId = url.searchParams.get("task_id")!;
    const modelId = url.searchParams.get("model_id")!;
    const tripoKey = Deno.env.get("TRIPO_API_KEY");
    const supabase = createClient(Deno.env.get("DB_URL")!, Deno.env.get("DB_SERVICE_KEY")!);

    const pollRes = await fetch(`${TRIPO_API}/task/${taskId}`, {
      headers: { Authorization: `Bearer ${tripoKey}` },
    });
    const pollData = await pollRes.json();
    const status = pollData.data?.status;

    if (status === "success") {
      const modelUrl = pollData.data?.output?.model || "";

      // Download and upload to storage
      let storedUrl = modelUrl;
      try {
        const fileRes = await fetch(modelUrl);
        if (fileRes.ok) {
          const fileBuffer = await fileRes.arrayBuffer();
          const filePath = `anon/${modelId}.glb`;
          const { error: uploadError } = await supabase.storage.from("models")
            .upload(filePath, fileBuffer, { contentType: "model/gltf-binary", upsert: true });
          if (!uploadError) {
            const { data } = supabase.storage.from("models").getPublicUrl(filePath);
            storedUrl = data.publicUrl;
          }
        }
      } catch (e) { console.warn("Storage error:", e); }

      await supabase.from("models").update({
        status: "ready", file_url: storedUrl, updated_at: new Date().toISOString(),
      }).eq("id", modelId);

      return new Response(JSON.stringify({ status: "success", url: storedUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (status === "failed" || status === "cancelled") {
      await supabase.from("models").update({ status: "failed" }).eq("id", modelId);
      return new Response(JSON.stringify({ status: "failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: "processing", progress: pollData.data?.progress || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}