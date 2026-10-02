// Jesyon: the back office for the rebuilt Ekip (konkret-haiti.com/ekip/admin/).
// Written from scratch 2026-10-02 to replace the `ekip` and `apwobasyon`
// functions. Two jobs at launch, both read-mostly:
//
//   GET  /jesyon                   -> who am I (id, non, wol)
//   GET  /jesyon/fom               -> every form, with response counts
//   GET  /jesyon/rezilta/<slug>    -> a form's labelled fields and its responses
//   POST /jesyon/fichye  {path}    -> a 120 s signed URL for one uploaded file
//   GET  /jesyon/akse              -> who opened which file, newest first
//   GET  /jesyon/apwobasyon        -> what waits on me, and what was decided
//   POST /jesyon/apwobasyon/<id>   -> sign or refuse the current step
//
// LANGUAGE: Kreyòl, like the hub.
//
// WHO YOU ARE, until a real login exists (Wesley is building it): a personal
// build key in the `x-ekip-kle` header, matched against public.jesyon_kle
// (service role only). One key per person, so approvals still know who signs.
// No key, no data: the hub shows the Jesyon section only on a phone that
// carries one. HTTP Basic against EKIP_USERS still works alongside.
//
// WHAT WAS CARRIED OVER ON PURPOSE, because each line of it was learned:
// - Logins come only from the EKIP_USERS secret and FAIL CLOSED: no secret or a
//   malformed one means no logins at all, never a fallback.
// - Approvals are decided by the database function siyen_apwobasyon. This file
//   only says who you are and which roles you hold; order, two different
//   people, finality and refusal live in Postgres, so a bug here cannot release
//   money on one signature.
// - A file URL is minted only AFTER the access log row is written, and a failed
//   write refuses the file. The path travels in a POST body, never in the URL:
//   Cloudflare once cached a signed URL by its ".jpg" suffix and served it to
//   another user with nothing logged.
// - Every response is no-store. Everything here is per-person.
//
// verify_jwt is off because this does its own auth (HTTP Basic).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = () => createClient(URL_, KEY);

const ALLOWED = new Set(["https://konkret-haiti.com", "https://www.konkret-haiti.com"]);
const BUCKET = "form-uploads";
const PATH_RE =
  /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]\/\d{4}-\d{2}\/[a-z][a-z0-9_]{0,40}-[0-9a-z]{6,10}-[0-9a-f]{16}-[0-9a-f]{32}\.[a-z0-9]{2,4}$/;

class Fail extends Error {
  constructor(msg: string, public status = 400) { super(msg); }
}

// ------------------------------------------------------------------ who
type Moun = { pass: string; non: string; wol: string[] };

function users(): Record<string, Moun> {
  const raw = Deno.env.get("EKIP_USERS");
  if (!raw) { console.error("EKIP_USERS is not set. Refusing every login."); return {}; }
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
      out[k] = { pass: String(o.pass ?? ""), non: String(o.non ?? k),
                 wol: Array.isArray(o.wol) ? o.wol.map(String) : [] };
    }
  }
  return out;
}

// Constant time, so a wrong guess takes as long as a nearly right one.
function same(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return d === 0;
}

async function who(req: Request): Promise<{ id: string; moun: Moun } | null> {
  const kle = (req.headers.get("x-ekip-kle") ?? "").trim();
  if (kle) {
    if (!/^[0-9a-f]{64}$/.test(kle)) return null;
    const db = sb();
    const { data: k } = await db.from("jesyon_kle")
      .select("id,non,wol,aktif").eq("kle", kle).maybeSingle();
    if (!k || !k.aktif) return null;
    await db.from("jesyon_kle").update({ denye_le: new Date().toISOString() }).eq("id", k.id);
    return { id: "kle:" + k.id, moun: { pass: "", non: k.non, wol: (k.wol ?? []).map(String) } };
  }
  const h = req.headers.get("authorization") ?? "";
  if (!h.startsWith("Basic ")) return null;
  let d: string;
  try { d = new TextDecoder().decode(Uint8Array.from(atob(h.slice(6)), (c) => c.charCodeAt(0))); }
  catch { return null; }
  const i = d.indexOf(":");
  if (i < 0) return null;
  const id = d.slice(0, i), m = users()[id];
  return m && m.pass && same(m.pass, d.slice(i + 1)) ? { id, moun: m } : null;
}

// ------------------------------------------------------------------ forms
type Sec = { legend?: string; fields?: Record<string, unknown>[] };

function fieldsOf(schema: { sections?: Sec[] } | null) {
  const out: { key: string; label: string; type: string; seksyon: string; fields?: unknown }[] = [];
  for (const sec of schema?.sections ?? []) {
    for (const f of sec.fields ?? []) {
      out.push({
        key: String(f.key),
        label: String(f.label || sec.legend || f.key),
        type: String(f.type),
        seksyon: String(sec.legend ?? ""),
        ...(f.type === "group" ? { fields: f.fields } : {}),
      });
    }
  }
  return out;
}

async function fomList() {
  const db = sb();
  const { data: foms, error } = await db.from("ekip_fom")
    .select("slug,tit,deskripsyon,eta,updated_at").order("slug");
  if (error) throw new Fail(error.message, 500);
  // One cheap pass over (slug, created_at) for counts and the latest date.
  const { data: rs, error: e2 } = await db.from("ekip_repons")
    .select("fom_slug,created_at").order("created_at", { ascending: false }).limit(20000);
  if (e2) throw new Fail(e2.message, 500);
  const n: Record<string, number> = {}, last: Record<string, string> = {};
  for (const r of rs ?? []) {
    n[r.fom_slug] = (n[r.fom_slug] ?? 0) + 1;
    if (!last[r.fom_slug]) last[r.fom_slug] = r.created_at;
  }
  return (foms ?? []).map((f) => ({ ...f, n: n[f.slug] ?? 0, denye: last[f.slug] ?? null }));
}

async function rezilta(slug: string) {
  const db = sb();
  const { data: fom, error } = await db.from("ekip_fom")
    .select("slug,tit,deskripsyon,eta,schema").eq("slug", slug).maybeSingle();
  if (error) throw new Fail(error.message, 500);
  if (!fom) throw new Fail(`Pa gen fòm "${slug}".`, 404);
  const { data: rows, error: e2 } = await db.from("ekip_repons")
    .select("id,referans,created_at,repons,esko,total,pase,eta_apwobasyon")
    .eq("fom_slug", slug).order("created_at", { ascending: false }).limit(1000);
  if (e2) throw new Fail(e2.message, 500);
  return { slug: fom.slug, tit: fom.tit, deskripsyon: fom.deskripsyon, eta: fom.eta,
           fields: fieldsOf(fom.schema), rows: rows ?? [] };
}

// ------------------------------------------------------------------ files
// The log row first; no log, no file.
async function fichye(path: string, user: string, ua: string) {
  if (!PATH_RE.test(path)) throw new Fail("Se pa yon chemen fichye sistèm nan te bay.", 400);
  const db = sb();
  const { data: up } = await db.from("ekip_upload")
    .select("repons_id,fom_slug").eq("path", path).maybeSingle();
  const { error: logErr } = await db.from("ekip_gade_fichye").insert({
    path, pa_ki_moun: user, fom_slug: up?.fom_slug ?? path.split("/")[0],
    repons_id: up?.repons_id ?? null, ua: ua.slice(0, 300),
  });
  if (logErr) {
    console.error("access log write failed, refusing the URL", logErr);
    throw new Fail("Nou pa t ka anrejistre ou louvri fichye a, kidonk li pa louvri.", 500);
  }
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, 120);
  if (error || !data) throw new Fail("Fichye a pa nan depo a ankò.", 404);
  return { url: data.signedUrl, expires_in: 120 };
}

async function akse() {
  const { data, error } = await sb().from("ekip_gade_fichye")
    .select("path,pa_ki_moun,fom_slug,gade_le").order("gade_le", { ascending: false }).limit(200);
  if (error) throw new Fail(error.message, 500);
  return { rows: data ?? [] };
}

// ------------------------------------------------------------------ approvals
async function apwobasyonList(me: { id: string; moun: Moun }) {
  const db = sb();
  const { data: steps, error } = await db.from("ekip_apwobasyon")
    .select("id,repons_id,etap,wol,tit,desizyon,pa_ki_moun,non,not_yo,fet_le")
    .order("repons_id").order("etap");
  if (error) throw new Fail(error.message, 500);
  const by = new Map<string, NonNullable<typeof steps>>();
  for (const s of steps ?? []) {
    if (!by.has(s.repons_id)) by.set(s.repons_id, []);
    by.get(s.repons_id)!.push(s);
  }
  const mwen = { id: me.id, non: me.moun.non, wol: me.moun.wol };
  if (!by.size) return { mwen, tann: [], fini: [] };

  const { data: reps, error: e2 } = await db.from("ekip_repons")
    .select("id,fom_slug,referans,repons,eta_apwobasyon,created_at")
    .in("id", [...by.keys()]).order("created_at", { ascending: false });
  if (e2) throw new Fail(e2.message, 500);
  const { data: foms } = await db.from("ekip_fom").select("slug,tit,schema");
  const tit: Record<string, string> = {}, lab: Record<string, ReturnType<typeof fieldsOf>> = {};
  for (const f of foms ?? []) { tit[f.slug] = f.tit; lab[f.slug] = fieldsOf(f.schema); }

  const tann: unknown[] = [], fini: unknown[] = [];
  for (const r of reps ?? []) {
    const chain = by.get(r.id)!;
    const open = chain.find((s) => s.desizyon === "tann");
    // Mine to sign only if I hold the role AND have not signed another step of
    // this same chain. The database refuses it anyway; this keeps the button
    // honest.
    const deja = chain.some((s) => s.desizyon !== "tann" && s.pa_ki_moun === me.id);
    const item = {
      repons_id: r.id, fom_slug: r.fom_slug, fom_tit: tit[r.fom_slug] ?? r.fom_slug,
      fields: lab[r.fom_slug] ?? [], referans: r.referans, repons: r.repons,
      eta: r.eta_apwobasyon, created_at: r.created_at,
      chenn: chain.map((s) => ({ etap: s.etap, wol: s.wol, tit: s.tit, desizyon: s.desizyon,
                                 non: s.non, not_yo: s.not_yo, fet_le: s.fet_le })),
      kounye: open ? { etap: open.etap, wol: open.wol, tit: open.tit } : null,
      mwen_ka_siyen: !!open && me.moun.wol.includes(open.wol) && !deja,
      poukisa_non: !open ? null
        : deja ? "Ou deja siyen yon etap sou sa a."
        : !me.moun.wol.includes(open.wol) ? `L ap tann wòl ${open.wol}.`
        : null,
    };
    (r.eta_apwobasyon === "tann" ? tann : fini).push(item);
  }
  return { mwen, tann, fini: fini.slice(0, 50) };
}

async function siyen(me: { id: string; moun: Moun }, target: string, body: Record<string, unknown>) {
  const desizyon = String(body.desizyon ?? "");
  if (desizyon !== "apwouve" && desizyon !== "refize") throw new Fail("Desizyon an se apwouve oswa refize.");
  const siyati = String(body.siyati ?? "");
  if (!/^data:image\/(png|jpeg);base64,/.test(siyati)) throw new Fail("Siyati obligatwa.");
  if (siyati.length > 400_000) throw new Fail("Siyati a twò gwo.");
  const non = String(body.non ?? me.moun.non).trim().slice(0, 120) || me.moun.non;

  const db = sb();
  const { data: open } = await db.from("ekip_apwobasyon")
    .select("wol").eq("repons_id", target).eq("desizyon", "tann")
    .order("etap").limit(1).maybeSingle();
  if (!open) throw new Fail("Pa gen anyen k ap tann siyati sou sa a.", 409);
  if (!me.moun.wol.includes(open.wol)) throw new Fail(`Etap sa a mande wòl ${open.wol}, ou pa genyen l.`, 403);

  const { data, error } = await db.rpc("siyen_apwobasyon", {
    p_repons_id: target, p_user: me.id, p_desizyon: desizyon, p_non: non,
    p_siyati: siyati, p_not: body.not_yo ? String(body.not_yo).slice(0, 2000) : null,
  });
  if (error) { console.error("sign failed", error); throw new Fail(error.message, 409); }
  return data;
}

// ------------------------------------------------------------------ serve
function segments(url: string): string[] {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const i = parts.lastIndexOf("jesyon");
  return (i >= 0 ? parts.slice(i + 1) : parts).map(decodeURIComponent);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const h: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, content-type, x-ekip-kle",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Cache-Control": "no-store, private",
  };
  if (origin && ALLOWED.has(origin)) h["Access-Control-Allow-Origin"] = origin;
  const json = { ...h, "Content-Type": "application/json; charset=utf-8" };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });

  const me = await who(req);
  if (!me) return new Response(JSON.stringify({ error: "Ou dwe konekte." }), { status: 401, headers: json });

  const [head = "", rest] = segments(req.url);
  const m = req.method;
  try {
    let out: unknown;
    if (head === "" && m === "GET") out = { id: me.id, non: me.moun.non, wol: me.moun.wol };
    else if (head === "fom" && m === "GET") out = await fomList();
    else if (head === "rezilta" && rest && m === "GET") out = await rezilta(rest);
    else if (head === "fichye" && m === "POST") {
      const b = await req.json().catch(() => ({})) as Record<string, unknown>;
      out = await fichye(String(b.path ?? ""), me.id, req.headers.get("user-agent") ?? "");
    } else if (head === "akse" && m === "GET") out = await akse();
    else if (head === "apwobasyon" && !rest && m === "GET") out = await apwobasyonList(me);
    else if (head === "apwobasyon" && rest && m === "POST") {
      const b = await req.json().catch(() => null);
      if (!b || typeof b !== "object") throw new Fail("bad json");
      out = await siyen(me, rest, b as Record<string, unknown>);
    } else throw new Fail("Pa gen chemen sa a.", 404);
    return new Response(JSON.stringify(out), { headers: json });
  } catch (e) {
    const f = e as Fail;
    const status = typeof f.status === "number" ? f.status : 500;
    if (status >= 500) console.error("jesyon", head, rest, e);
    return new Response(JSON.stringify({ error: f.message ?? String(e) }), { status, headers: json });
  }
});
