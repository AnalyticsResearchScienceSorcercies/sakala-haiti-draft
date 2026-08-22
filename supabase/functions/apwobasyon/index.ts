// Two-signature approvals.
//
//   GET  /apwobasyon        -> what is waiting on me, and recent decided items
//   POST /apwobasyon/<id>   -> sign or reject the current step
//
// The controls live in Postgres (siyen_apwobasyon), not here. This function
// only decides WHO you are and WHICH roles you hold; sequence, separation of
// persons, finality and rejection are enforced by the database, so a bug in
// this file cannot release money on one signature.
//
// verify_jwt off: implements its own auth (HTTP Basic).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Moun = { pass: string; non: string; wol: string[] };

// EKIP_USERS accepts either shape per user:
//   "wbertil": "password"
//   "dtillias": {"pass":"...","non":"Daniel Tillias","wol":["trezorye"]}
//
// FAILS CLOSED, 2026-08-22. This function used to carry a hardcoded fallback
// pair of logins for when EKIP_USERS was unset or unparseable. Those values
// were committed to this repo, which is public, on 2026-08-21 -- so any typo
// in the secret silently restored two published credentials against the API
// that releases money. There is no fallback now: no secret, no logins.
function users(): Record<string, Moun> {
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
  const out: Record<string, Moun> = {};
  for (const [k, v] of Object.entries(src)) {
    if (typeof v === "string") out[k] = { pass: v, non: k, wol: [] };
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      out[k] = {
        pass: String(o.pass ?? ""),
        non: String(o.non ?? k),
        wol: Array.isArray(o.wol) ? o.wol.map(String) : [],
      };
    }
  }
  return out;
}

const ALLOWED = new Set(["https://konkret-haiti.com", "https://www.konkret-haiti.com"]);

function cors(origin: string | null) {
  const h: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (origin && ALLOWED.has(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

function who(req: Request): { id: string; moun: Moun } | null {
  const h = req.headers.get("authorization") ?? "";
  if (!h.startsWith("Basic ")) return null;
  let d: string;
  try { d = atob(h.slice(6)); } catch { return null; }
  const i = d.indexOf(":");
  if (i < 0) return null;
  const id = d.slice(0, i);
  const m = users()[id];
  return m && m.pass && m.pass === d.slice(i + 1) ? { id, moun: m } : null;
}

const sb = () => createClient(URL_, KEY);

Deno.serve(async (req: Request) => {
  const ch = cors(req.headers.get("origin"));
  const json = { ...ch, "Content-Type": "application/json; charset=utf-8" };
  const bad = (m: string, s = 400) =>
    new Response(JSON.stringify({ error: m }), { status: s, headers: json });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: ch });

  const me = who(req);
  if (!me) return bad("Authentication required", 401);
  const mwen = { id: me.id, non: me.moun.non, wol: me.moun.wol };

  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = parts.lastIndexOf("apwobasyon");
  const target = (i >= 0 ? parts.slice(i + 1) : [])[0];

  const db = sb();

  // ------------------------------------------------------------- GET queue
  if (req.method === "GET") {
    const { data: steps, error } = await db
      .from("ekip_apwobasyon")
      .select("id,repons_id,etap,wol,tit,desizyon,pa_ki_moun,non,not_yo,fet_le")
      .order("repons_id").order("etap");
    if (error) return bad(error.message, 500);

    const byRepons = new Map<string, typeof steps>();
    for (const s of steps ?? []) {
      if (!byRepons.has(s.repons_id)) byRepons.set(s.repons_id, [] as never);
      byRepons.get(s.repons_id)!.push(s);
    }
    if (!byRepons.size) {
      return new Response(JSON.stringify({ mwen, tann: [], fini: [] }), { headers: json });
    }

    const { data: reps, error: e2 } = await db
      .from("ekip_repons")
      .select("id,fom_slug,repons,eta_apwobasyon,created_at")
      .in("id", [...byRepons.keys()])
      .order("created_at", { ascending: false });
    if (e2) return bad(e2.message, 500);

    const { data: foms } = await db.from("ekip_fom").select("slug,tit,schema");
    const titles: Record<string, string> = {};
    const labels: Record<string, Record<string, string>> = {};
    for (const f of foms ?? []) {
      titles[f.slug] = f.tit;
      const m: Record<string, string> = {};
      for (const sec of (f.schema?.sections ?? []) as Record<string, unknown>[]) {
        for (const fl of (sec.fields ?? []) as Record<string, unknown>[]) {
          m[String(fl.key)] = String(fl.label ?? sec.legend ?? fl.key);
        }
      }
      labels[f.slug] = m;
    }

    const tann: unknown[] = [];
    const fini: unknown[] = [];

    for (const r of reps ?? []) {
      const chain = byRepons.get(r.id)!;
      const open = chain.find((s) => s.desizyon === "tann");
      // A signature is only mine to give if I hold the role AND I have not
      // already signed some other step of this same chain.
      const alreadyMine = chain.some((s) => s.desizyon !== "tann" && s.pa_ki_moun === me.id);
      const item = {
        repons_id: r.id,
        fom_slug: r.fom_slug,
        fom_tit: titles[r.fom_slug] ?? r.fom_slug,
        etikt: labels[r.fom_slug] ?? {},
        repons: r.repons,
        eta: r.eta_apwobasyon,
        created_at: r.created_at,
        chenn: chain.map((s) => ({
          etap: s.etap, wol: s.wol, tit: s.tit, desizyon: s.desizyon,
          pa_ki_moun: s.pa_ki_moun, non: s.non, not_yo: s.not_yo, fet_le: s.fet_le,
        })),
        kounye: open ? { etap: open.etap, wol: open.wol, tit: open.tit } : null,
        mwen_ka_siyen: !!open && me.moun.wol.includes(open.wol) && !alreadyMine,
        poukisa_non: !open ? null
          : alreadyMine ? "You already signed a step on this one."
          : !me.moun.wol.includes(open.wol) ? `Waiting on the ${open.wol} role.`
          : null,
      };
      (r.eta_apwobasyon === "tann" ? tann : fini).push(item);
    }

    return new Response(JSON.stringify({ mwen, tann, fini: fini.slice(0, 50) }), { headers: json });
  }

  // ------------------------------------------------------------- POST sign
  if (req.method !== "POST") return bad("Method not allowed", 405);
  if (!target) return bad("Which response?");

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return bad("bad json"); }

  const desizyon = String(body.desizyon ?? "");
  if (desizyon !== "apwouve" && desizyon !== "refize") {
    return bad("Decision must be apwouve or refize.");
  }
  const non = String(body.non ?? me.moun.non).trim().slice(0, 120);
  const siyati = String(body.siyati ?? "");
  if (!/^data:image\/(png|jpeg);base64,/.test(siyati)) return bad("A signature is required.");
  if (siyati.length > 400_000) return bad("Signature is too large.");

  // Role check here; the database still enforces sequence and separation.
  const { data: open } = await db
    .from("ekip_apwobasyon")
    .select("wol").eq("repons_id", target).eq("desizyon", "tann")
    .order("etap").limit(1).maybeSingle();
  if (!open) return bad("Nothing is waiting for a signature on this one.", 409);
  if (!me.moun.wol.includes(open.wol)) {
    return bad(`This step needs the ${open.wol} role, which you do not hold.`, 403);
  }

  const { data, error } = await db.rpc("siyen_apwobasyon", {
    p_repons_id: target,
    p_user: me.id,
    p_desizyon: desizyon,
    p_non: non,
    p_siyati: siyati,
    p_not: body.not_yo ? String(body.not_yo).slice(0, 2000) : null,
  });

  if (error) {
    console.error("sign failed", error);
    return bad(error.message, 409);
  }
  return new Response(JSON.stringify(data), { headers: json });
});
