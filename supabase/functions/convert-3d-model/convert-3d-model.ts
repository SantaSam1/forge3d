import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { source_url, output_format } = await req.json();

    if (!source_url || !output_format) {
      return new Response(JSON.stringify({ error: "source_url and output_format are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("CLOUDCONVERT_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "CLOUDCONVERT_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supportedFormats = ['obj', 'stl', 'fbx', 'usdz', 'gltf', 'glb'];
    if (!supportedFormats.includes(output_format.toLowerCase())) {
      return new Response(JSON.stringify({ error: `Unsupported format: ${output_format}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create CloudConvert job
    const jobRes = await fetch("https://api.cloudconvert.com/v2/jobs", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: {
          "import-url": {
            operation: "import/url",
            url: source_url,
            filename: "model.glb",
          },
          "convert": {
            operation: "convert",
            input: "import-url",
            input_format: "glb",
            output_format: output_format.toLowerCase(),
          },
          "export-url": {
            operation: "export/url",
            input: "convert",
            inline: false,
            archive_multiple_files: false,
          },
        },
        tag: "3d-prin-conversion",
      }),
    });

    if (!jobRes.ok) {
      const err = await jobRes.text();
      return new Response(JSON.stringify({ error: "CloudConvert job creation failed", details: err }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const job = await jobRes.json();
    const jobId = job.data?.id;

    if (!jobId) {
      return new Response(JSON.stringify({ error: "No job ID returned" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Poll for completion (max 120s)
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 3000));

      const statusRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
        headers: { "Authorization": `Bearer ${apiKey}` },
      });
      const statusData = await statusRes.json();
      const status = statusData.data?.status;

      if (status === "finished") {
        // Find export task with URL
        const tasks = statusData.data?.tasks || [];
        const exportTask = tasks.find((t: { name: string; result?: { files?: { url: string; filename: string }[] } }) => t.name === "export-url");
        const fileUrl = exportTask?.result?.files?.[0]?.url;
        const filename = exportTask?.result?.files?.[0]?.filename || `model.${output_format}`;

        if (!fileUrl) {
          return new Response(JSON.stringify({ error: "No output URL in result" }), {
            status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ url: fileUrl, filename }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (status === "error") {
        const errTask = (statusData.data?.tasks || []).find((t: { status: string; message?: string }) => t.status === "error");
        return new Response(JSON.stringify({ error: "Conversion failed", details: errTask?.message || "Unknown error" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Conversion timeout" }), {
      status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
