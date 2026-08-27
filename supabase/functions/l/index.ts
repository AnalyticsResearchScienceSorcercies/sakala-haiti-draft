// Public lesson API. Serves one slide deck.
//
//   GET /l/<slug>   ->  the lesson, if it is live: the deck AND the reading
//                       version, in one response
//
// Both renderings ship together because they are one row and the page lets a
// trainee flip between them without a second round trip on a bad connection.
//
// Public by design, same as `f`: a trainee opens a WhatsApp link and has no
// credentials. verify_jwt off for that reason. Reads go through the
// service-role key server-side; the browser never holds a key and the table
// has RLS with no policies.
//
// SMALL ON PURPOSE. There is nothing to validate, nothing to score and nothing
// to store, because a lesson collects nothing. The proof that somebody did the
// work is the gate form at the end of the deck, not a view counter here.
//
// HTML for the slideshow lives on GitHub Pages at /l/. Supabase forces
// text/plain on *.supabase.co and mangles every accent with it, so this
// returns JSON and only JSON.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED = new Set([
  "https://konkret-haiti.com",
  "https://www.konkret-haiti.com",
]);

function cors(origin: string | null) {
  const h: Record<string, string> = {
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (origin && ALLOWED.has(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

// The gateway may hand us /l/<slug> or /functions/v1/l/<slug>, and the page
// also calls it as /l?s=<slug>. Anchor on the function name, same as `f`.
function slugOf(url: string): string {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const i = parts.lastIndexOf("l");
  const rest = i >= 0 ? parts.slice(i + 1) : parts;
  if (rest.length) return rest[0];
  return new URL(url).searchParams.get("s") ?? "";
}

const sb = () => createClient(SUPABASE_URL, SERVICE_KEY);

Deno.serve(async (req: Request) => {
  const ch = cors(req.headers.get("origin"));
  const json = { ...ch, "Content-Type": "application/json; charset=utf-8" };
  const bad = (msg: string, status = 400) =>
    new Response(JSON.stringify({ error: msg }), { status, headers: json });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: ch });
  if (req.method !== "GET") return bad("Method not allowed", 405);

  const slug = slugOf(req.url);
  if (!slug) return bad("Ki leson?", 400);

  const { data: leson, error } = await sb()
    .from("ekip_leson").select("slug,tit,deskripsyon,deck,liv,send,lang,eta")
    .eq("slug", slug).maybeSingle();

  if (error) { console.error("lookup failed", error); return bad("Gen yon pwoblèm teknik.", 500); }
  if (!leson) return bad(`Leson "${slug}" pa egziste.`, 404);

  // A draft is invisible to the public, exactly like a draft form. The admin
  // preview passes ?prevyou=1 and gets it anyway -- there is nothing secret in
  // a lesson, and a builder you cannot preview is a builder nobody trusts.
  const preview = new URL(req.url).searchParams.get("prevyou") === "1";
  if (leson.eta !== "live" && !preview) {
    return bad(leson.eta === "bouyon" ? "Leson sa a poko pare." : "Leson sa a fèmen.", 409);
  }

  return new Response(JSON.stringify(leson), { headers: json });
});
