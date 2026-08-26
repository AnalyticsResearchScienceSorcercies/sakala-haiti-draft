// RETIRED 2026-08-26. This function is a signpost, not a dashboard.
//
// It served the Send 0 results screen from `jp_send0_reponses`. That table
// stopped receiving writes on 2026-08-22, when Send 0 became a row in
// `ekip_fom` drawn by the shared renderer, and its responses moved to
// `ekip_repons`. The dashboard kept answering 200 with two rows from build
// day while four real candidates submitted nine times, unseen. Nobody
// checking it had any way to tell that a working page was showing a dead
// table.
//
// It also carried its own hardcoded copy of the answer key, which had drifted
// from the live form (q5 gained an option), so even those two rows were
// scored against a question that no longer existed. That copy is gone. Item
// analysis is now computed by the `ekip` function from the form's own keys,
// which is the only copy there is.
//
// AND it shipped fallback credentials in plaintext in this source. Deleted
// here; `EKIP_USERS` is the only source of logins now.
//
// Kept alive rather than deleted because the URL was bookmarked and lives in
// a dashboard link. It answers 410 with somewhere to go, which is what a
// retired endpoint owes its callers.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED = new Set([
  "https://konkret-haiti.com",
  "https://www.konkret-haiti.com",
]);

const WHERE = "https://konkret-haiti.com/ekip/#repons/send0";

Deno.serve((req: Request) => {
  const origin = req.headers.get("origin");
  const h: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, private",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && ALLOWED.has(origin)) h["Access-Control-Allow-Origin"] = origin;

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });

  return new Response(JSON.stringify({
    error: "This results view was retired on 2026-08-26.",
    why: "It read a table Send 0 stopped writing to on 2026-08-22.",
    where: WHERE,
  }), { status: 410, headers: h });
});
