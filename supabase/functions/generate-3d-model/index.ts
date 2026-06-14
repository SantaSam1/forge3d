import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyUser, checkRateLimit, isAllowedUrl } from "../_shared/auth.ts";

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
  if (url.searchParams.get("proxy")) {
    const modelUrl = url.searchParams.get("proxy")!;
    if (!isAllowedUrl(modelUrl)) {
      return new Response(JSON.stringify({ error: "Forbidden URL" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    try {
      const fileRes = await fetch(modelUrl);
      const buffer = await fileRes.arrayBuffer();
      return new Response(buffer, {
        headers: {
          ...corsHeaders,
          "Content-Type": "model/gltf-binary",
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const body = await req.json();
    if (body.task_id && body.model_id) {
      return await checkStatus(body.task_id, body.model_id);
    }
    // Route: image-to-model or text-to-model
    if (body.image_base64) {
      return await createImageTask(body);
    }
    return await createTask(body);
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function checkLimit(supabase: ReturnType<typeof createClient>, user_id?: string): Promise<Response | null> {
  if (!user_id) return null;
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan,status")
    .eq("user_id", user_id)
    .maybeSingle();
  const isPro = sub && sub.plan === "pro" && sub.status === "active";
  if (!isPro) {
    const { count } = await supabase.from("models")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id).eq("source_type", "ai_generated");
    if ((count ?? 0) >= FREE_GENERATION_LIMIT) {
      return new Response(JSON.stringify({ error: "limit_reached", limit: FREE_GENERATION_LIMIT }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }
  return null;
}

async function createTask(body: { prompt: string; user_id?: string }): Promise<Response> {
  const { prompt, user_id } = body;

  if (!prompt) {
    return new Response(JSON.stringify({ error: "prompt is required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const tripoKey = Deno.env.get("TRIPO_API_KEY");
  const supabase = createClient(Deno.env.get("DB_URL")!, Deno.env.get("DB_SERVICE_KEY")!);

  const limitErr = await checkLimit(supabase, user_id);
  if (limitErr) return limitErr;

  const { data: modelRecord, error: insertError } = await supabase.from("models").insert({
    user_id: user_id || null, name: prompt.slice(0, 80), prompt,
    status: "processing", source_type: "ai_generated", format: "glb",
  }).select().single();
  if (insertError) throw insertError;

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

  await supabase.from("models").update({
    metadata: { task_id: taskData.data.task_id }
  }).eq("id", modelRecord.id);

  return new Response(JSON.stringify({
    status: "processing",
    task_id: taskData.data.task_id,
    model_id: modelRecord.id,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function createImageTask(body: {
  image_base64: string;
  image_mime?: string;
  user_id?: string;
}): Promise<Response> {
  const { image_base64, image_mime = "image/jpeg", user_id } = body;

  if (!image_base64) {
    return new Response(JSON.stringify({ error: "image_base64 is required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const tripoKey = Deno.env.get("TRIPO_API_KEY");
  const supabase = createClient(Deno.env.get("DB_URL")!, Deno.env.get("DB_SERVICE_KEY")!);

  const limitErr = await checkLimit(supabase, user_id);
  if (limitErr) return limitErr;

  // Step 1: Upload image to Tripo to get an image_token
  const imageBytes = Uint8Array.from(atob(image_base64), c => c.charCodeAt(0));
  const ext = image_mime.split("/")[1] || "jpg";
  const formData = new FormData();
  formData.append("file", new Blob([imageBytes], { type: image_mime }), `upload.${ext}`);

  const uploadRes = await fetch(`${TRIPO_API}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tripoKey}` },
    body: formData,
  });
  const uploadData = await uploadRes.json();

  if (!uploadRes.ok || !uploadData.data?.image_token) {
    return new Response(JSON.stringify({ error: "Image upload to Tripo failed", details: JSON.stringify(uploadData) }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const imageToken = uploadData.data.image_token;

  // Step 2: Insert model record
  const { data: modelRecord, error: insertError } = await supabase.from("models").insert({
    user_id: user_id || null,
    name: "photo-to-3d",
    prompt: null,
    status: "processing",
    source_type: "ai_generated",
    format: "glb",
  }).select().single();
  if (insertError) throw insertError;

  // Step 3: Create image_to_model task
  const taskRes = await fetch(`${TRIPO_API}/task`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tripoKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "image_to_model", file: { type: "jpg", file_token: imageToken } }),
  });
  const taskData = await taskRes.json();

  if (!taskRes.ok || !taskData.data?.task_id) {
    await supabase.from("models").update({ status: "failed" }).eq("id", modelRecord.id);
    return new Response(JSON.stringify({ error: "Tripo task error", details: JSON.stringify(taskData) }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await supabase.from("models").update({
    metadata: { task_id: taskData.data.task_id }
  }).eq("id", modelRecord.id);

  return new Response(JSON.stringify({
    status: "processing",
    task_id: taskData.data.task_id,
    model_id: modelRecord.id,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function checkStatus(taskId: string, modelId: string): Promise<Response> {
  const tripoKey = Deno.env.get("TRIPO_API_KEY");
  const supabase = createClient(Deno.env.get("DB_URL")!, Deno.env.get("DB_SERVICE_KEY")!);

  const pollRes = await fetch(`${TRIPO_API}/task/${taskId}`, {
    headers: { Authorization: `Bearer ${tripoKey}` },
  });
  const pollData = await pollRes.json();
  const status = pollData.data?.status;

  if (status === "success") {
    console.log("FULL OUTPUT:", JSON.stringify(pollData.data));
    const tripoUrl = pollData.data?.output?.model || pollData.data?.output?.pbr_model || pollData.data?.output?.base_model || "";

    let storedUrl = tripoUrl;
    try {
      const fileRes = await fetch(tripoUrl);
      if (fileRes.ok) {
        const buffer = await fileRes.arrayBuffer();
        const fileName = `${modelId}.glb`;
        const { data: uploadData } = await supabase.storage
          .from("models")
          .upload(fileName, buffer, { contentType: "model/gltf-binary", upsert: true });
        if (uploadData) {
          const { data: signedData } = await supabase.storage
            .from("models")
            .createSignedUrl(fileName, 60 * 60 * 24 * 365 * 10);
          if (signedData?.signedUrl) {
            storedUrl = signedData.signedUrl;
          }
        }
      }
    } catch (e) {
      console.error("Storage upload failed, using direct URL:", e);
    }

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
}
