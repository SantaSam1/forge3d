import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Официальный Gradio-сервер Tencent на Hugging Face
// Бесплатный, не требует API-ключей
const HUNYUAN_SPACE = "https://tencent-hunyuan3d-2.hf.space";

const FREE_GENERATION_LIMIT = 5;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Роутинг: проверка статуса задачи
    if (body.event_id && body.model_id) {
      return await checkStatus(body.event_id, body.model_id);
    }

    // Image-to-3D
    if (body.image_base64) {
      return await createImageTask(body);
    }

    // Text-to-3D (основной путь)
    return await createTextTask(body);
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Проверка лимита генераций ───────────────────────────────────────────────

async function checkLimit(
  supabase: ReturnType<typeof createClient>,
  user_id?: string
): Promise<Response | null> {
  if (!user_id) return null;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan,status")
    .eq("user_id", user_id)
    .maybeSingle();

  const isPro = sub?.plan === "pro" && sub?.status === "active";

  if (!isPro) {
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
  return null;
}

// ─── Text → 3D ───────────────────────────────────────────────────────────────

async function createTextTask(body: {
  prompt: string;
  user_id?: string;
  steps?: number;
  guidance_scale?: number;
}): Promise<Response> {
  const { prompt, user_id, steps = 30, guidance_scale = 5.5 } = body;

  if (!prompt?.trim()) {
    return new Response(
      JSON.stringify({ error: "prompt is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("DB_URL")!,
    Deno.env.get("DB_SERVICE_KEY")!
  );

  const limitErr = await checkLimit(supabase, user_id);
  if (limitErr) return limitErr;

  // Создаём запись в БД
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

  // Отправляем запрос на Gradio-сервер Hunyuan3D-2
  // Используем /queue/join — стандартный Gradio SSE-эндпоинт
  const gradioPayload = {
    data: [
      prompt,        // текстовый промпт
      steps,         // количество шагов диффузии
      guidance_scale // guidance scale
    ],
    fn_index: 0,     // индекс функции text-to-3d в Space
    session_hash: crypto.randomUUID().replace(/-/g, ""),
  };

  const joinRes = await fetch(`${HUNYUAN_SPACE}/queue/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(gradioPayload),
  });

  if (!joinRes.ok) {
    const errText = await joinRes.text();
    await supabase.from("models").update({ status: "failed" }).eq("id", modelRecord.id);
    return new Response(
      JSON.stringify({ error: "Hunyuan3D queue join failed", details: errText }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const joinData = await joinRes.json();
  const event_id = joinData.event_id;

  // Сохраняем event_id в metadata
  await supabase
    .from("models")
    .update({ metadata: { event_id, session_hash: gradioPayload.session_hash } })
    .eq("id", modelRecord.id);

  return new Response(
    JSON.stringify({ status: "processing", event_id, model_id: modelRecord.id }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ─── Image → 3D ──────────────────────────────────────────────────────────────

async function createImageTask(body: {
  image_base64: string;
  image_mime?: string;
  user_id?: string;
}): Promise<Response> {
  const { image_base64, image_mime = "image/jpeg", user_id } = body;

  if (!image_base64) {
    return new Response(
      JSON.stringify({ error: "image_base64 is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("DB_URL")!,
    Deno.env.get("DB_SERVICE_KEY")!
  );

  const limitErr = await checkLimit(supabase, user_id);
  if (limitErr) return limitErr;

  // Загружаем изображение в Gradio через /upload
  const imageBytes = Uint8Array.from(atob(image_base64), (c) => c.charCodeAt(0));
  const ext = image_mime.split("/")[1] || "jpg";
  const formData = new FormData();
  formData.append(
    "files",
    new Blob([imageBytes], { type: image_mime }),
    `upload.${ext}`
  );

  const uploadRes = await fetch(`${HUNYUAN_SPACE}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!uploadRes.ok) {
    return new Response(
      JSON.stringify({ error: "Image upload to Hunyuan failed" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const uploadedPaths: string[] = await uploadRes.json();
  const imagePath = uploadedPaths[0];

  // Создаём запись в БД
  const { data: modelRecord, error: insertError } = await supabase
    .from("models")
    .insert({
      user_id: user_id || null,
      name: "photo-to-3d",
      prompt: null,
      status: "processing",
      source_type: "ai_generated",
      format: "glb",
    })
    .select()
    .single();

  if (insertError) throw insertError;

  const session_hash = crypto.randomUUID().replace(/-/g, "");

  // Image-to-3D использует fn_index: 1 в пространстве Hunyuan3D-2
  const gradioPayload = {
    data: [{ path: imagePath, meta: { _type: "gradio.FileData" } }],
    fn_index: 1,
    session_hash,
  };

  const joinRes = await fetch(`${HUNYUAN_SPACE}/queue/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(gradioPayload),
  });

  if (!joinRes.ok) {
    await supabase.from("models").update({ status: "failed" }).eq("id", modelRecord.id);
    return new Response(
      JSON.stringify({ error: "Hunyuan3D queue join failed for image task" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const joinData = await joinRes.json();
  const event_id = joinData.event_id;

  await supabase
    .from("models")
    .update({ metadata: { event_id, session_hash } })
    .eq("id", modelRecord.id);

  return new Response(
    JSON.stringify({ status: "processing", event_id, model_id: modelRecord.id }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ─── Проверка статуса (polling) ───────────────────────────────────────────────

async function checkStatus(event_id: string, modelId: string): Promise<Response> {
  const supabase = createClient(
    Deno.env.get("DB_URL")!,
    Deno.env.get("DB_SERVICE_KEY")!
  );

  // Получаем session_hash из metadata модели
  const { data: modelData } = await supabase
    .from("models")
    .select("metadata")
    .eq("id", modelId)
    .single();

  const session_hash = modelData?.metadata?.session_hash ?? "";

  // Запрашиваем статус через Gradio SSE endpoint
  const statusRes = await fetch(
    `${HUNYUAN_SPACE}/queue/status?session_hash=${session_hash}`,
    {
      headers: { Accept: "text/event-stream" },
      // Читаем только первое событие, не держим соединение открытым
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!statusRes.ok || !statusRes.body) {
    return new Response(
      JSON.stringify({ status: "processing", progress: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Парсим SSE-поток
  const reader = statusRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: Record<string, unknown> | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(line.slice(6));
            // msg: "complete" — генерация завершена
            if (parsed.msg === "process_completed") {
              result = parsed;
              break;
            }
            // msg: "progress" — прогресс
            if (parsed.msg === "progress") {
              const progress = parsed.progress_data?.[0]?.progress ?? 0;
              reader.cancel();
              return new Response(
                JSON.stringify({ status: "processing", progress: Math.round(progress * 100) }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          } catch {
            // игнорируем невалидный JSON
          }
        }
      }

      if (result) break;
    }
  } catch {
    // timeout или разрыв соединения — генерация ещё идёт
    return new Response(
      JSON.stringify({ status: "processing", progress: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } finally {
    reader.cancel();
  }

  if (!result) {
    return new Response(
      JSON.stringify({ status: "processing", progress: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Обрабатываем результат
  const output = (result as { output?: { data?: unknown[] } }).output;
  if (!output?.data?.[0]) {
    await supabase.from("models").update({ status: "failed" }).eq("id", modelId);
    return new Response(
      JSON.stringify({ status: "failed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Gradio возвращает временный URL файла на HF-сервере
  const fileData = output.data[0] as { url?: string; path?: string };
  const tempUrl = fileData?.url ?? `${HUNYUAN_SPACE}/file=${fileData?.path}`;

  // Скачиваем и сохраняем в Supabase Storage
  let storedUrl = tempUrl;
  try {
    const fileRes = await fetch(tempUrl);
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
        if (signedData?.signedUrl) storedUrl = signedData.signedUrl;
      }
    }
  } catch (e) {
    console.error("Storage upload failed, using temp URL:", e);
  }

  await supabase.from("models").update({
    status: "ready",
    file_url: storedUrl,
    updated_at: new Date().toISOString(),
  }).eq("id", modelId);

  return new Response(
    JSON.stringify({ status: "success", url: storedUrl }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
