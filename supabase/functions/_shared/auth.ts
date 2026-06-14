import { createClient } from "npm:@supabase/supabase-js@2";

export async function verifyUser(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? Deno.env.get("DB_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("DB_SERVICE_KEY")!
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
  return { userId: user.id };
}

// Simple in-memory rate limiter (per cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
export function checkRateLimit(userId: string, maxPerMinute = 20): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= maxPerMinute) return false;
  entry.count++;
  return true;
}

// SSRF whitelist check
const ALLOWED_HOSTS = [
  "api.tripo3d.ai",
  "tripo-data.rg1.data.tripo3d.com",
  "storage.googleapis.com",
  `${Deno.env.get("SUPABASE_URL") ?? ""}`.replace("https://", ""),
];
export function isAllowedUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    return ALLOWED_HOSTS.some(h => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
