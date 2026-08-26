// Internal team API for konkret-haiti.com/ekip/.
//
// LANGUAGE RULE: the admin side is English - Wesley, Dan and Jethro read it.
// Anything a trainee sees (the forms at /f/) stays Kreyol.
//
// verify_jwt is off because this implements its own auth (HTTP Basic).
// HTML is served by GitHub Pages - Supabase forces text/plain on *.supabase.co.
//
// Split into modules on purpose: as one file the deploy payload was large
// enough to truncate.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  akseList, Fail, fichyeUrl, fomDelete, fomGet, fomList, fomSave,
  initMods, lesonDelete, lesonGet, lesonList, lesonSave, modDok, modWhoami, reponsGet,
} from "./mods.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
initMods(SUPABASE_URL, SERVICE_KEY);

// EKIP_USERS secret, JSON. Two accepted shapes per user:
//   "wbertil": "password"
//   "dtillias": {"pass":"...","non":"Daniel Tillias","wol":["trezorye"]}
//
// FAILS CLOSED, 2026-08-22. The previous version carried a hardcoded fallback
// so that an unset or malformed EKIP_USERS silently restored two known logins.
// Those values had been committed to a public repo, which made a single typo
// in the secret the difference between no access and published access. There
// is no fallback now: no secret, no logins.
function users(): Record<string, string> {
  const raw = Deno.env.get("EKIP_USERS");
  if (!raw) {
    console.error("EKIP_USERS is not set. Refusing every login.");
    return {};
  }
  let src: Record<string, unknown>;
  try {
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object" || Array.isArray(p)) throw new Error("not an object");
    src = p as Record<string, unknown>;
  } catch (e) {
    console.error("EKIP_USERS is not valid JSON. Refusing every login:", e);
    return {};
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(src)) {
    if (typeof v === "string") out[k] = v;
    else if (v && typeof v === "object") out[k] = String((v as Record<string, unknown>).pass ?? "");
  }
  return out;
}

const ALLOWED = new Set([
  "https://konkret-haiti.com",
  "https://www.konkret-haiti.com",
]);

function cors(origin: string | null) {
  const h: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    // Every response here is authenticated and per-user. Cloudflare cached a
    // signed file URL once and served it to a second user without running the
    // function; this is the belt to that fix's braces.
    "Cache-Control": "no-store, private",
  };
  if (origin && ALLOWED.has(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

function whoami(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  if (!h.startsWith("Basic ")) return null;
  let d: string;
  try { d = atob(h.slice(6)); } catch { return null; }
  const i = d.indexOf(":");
  if (i < 0) return null;
  const u = d.slice(0, i);
  const want = users()[u];
  return want && want === d.slice(i + 1) ? u : null;
}

// The gateway may hand us /ekip/dok or /functions/v1/ekip/dok.
// Anchor on the function name instead of assuming a prefix.
function segments(url: string): string[] {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const i = parts.lastIndexOf("ekip");
  return (i >= 0 ? parts.slice(i + 1) : parts).map(decodeURIComponent);
}

Deno.serve(async (req: Request) => {
  const ch = cors(req.headers.get("origin"));
  const json = { ...ch, "Content-Type": "application/json; charset=utf-8" };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: ch });

  const user = whoami(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: json });
  }

  const seg = segments(req.url);
  const head = seg[0] ?? "";
  const rest = seg[1];
  const m = req.method;

  try {
    let out: unknown;

    if (head === "" || head === "whoami") out = modWhoami(user);
    else if (head === "dok") out = await modDok();
    else if (head === "repons" && rest) out = await reponsGet(rest);
    else if (head === "akse") out = await akseList();
    else if (head === "fichye") {
      // POST only, path in the body. As a GET with the path in the URL,
      // Cloudflare cached it by the ".jpg" suffix and served one user's signed
      // URL to another with nothing logged.
      if (m !== "POST") throw new Fail("Use POST with {path} in the body.", 405);
      const b = await req.json().catch(() => ({}));
      out = await fichyeUrl(
        String((b as Record<string, unknown>).path ?? ""),
        user, req.headers.get("user-agent") ?? "");
    } else if (head === "fom") {
      if (!rest) {
        if (m === "GET") out = await fomList();
        else if (m === "POST") out = await fomSave(user, await req.json());
        else throw new Fail("Method not allowed", 405);
      } else {
        if (m === "GET") out = await fomGet(rest);
        else if (m === "PUT" || m === "POST") out = await fomSave(user, await req.json(), rest);
        else if (m === "DELETE") out = await fomDelete(rest);
        else throw new Fail("Method not allowed", 405);
      }
    } else if (head === "leson") {
      // Same shape as fom: the slug in the path, the body carrying the deck.
      if (!rest) {
        if (m === "GET") out = await lesonList();
        else if (m === "POST") out = await lesonSave(user, await req.json());
        else throw new Fail("Method not allowed", 405);
      } else {
        if (m === "GET") out = await lesonGet(rest);
        else if (m === "PUT" || m === "POST") out = await lesonSave(user, await req.json(), rest);
        else if (m === "DELETE") out = await lesonDelete(rest);
        else throw new Fail("Method not allowed", 405);
      }
    } else if (head === "pewol") out = { pare: false, mesaj: "The payroll module is not built yet." };
    else throw new Fail(`Unknown module "${head}".`, 404);

    return new Response(JSON.stringify(out), { headers: json });
  } catch (e) {
    const f = e as Fail;
    const status = typeof f.status === "number" ? f.status : 500;
    if (status >= 500) console.error("ekip", head, rest, "failed:", e);
    return new Response(JSON.stringify({ error: f.message ?? String(e) }), { status, headers: json });
  }
});
