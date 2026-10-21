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
//   POST /jesyon/pin  {pin, non}   -> NO key needed: a right PIN returns a new key
//   GET  /jesyon/kaye              -> Kaye criteria, every trainee's work and verdicts
//   POST /jesyon/kaye/evalye       -> one evaluator verdict (append-only)
//
// LANGUAGE: Kreyòl, like the hub.
//
// WHO YOU ARE: a key in the `x-ekip-kle` header, matched against
// public.jesyon_kle (service role only). Since 2026-10-21 a phone gets its key
// by typing the ONE shared PIN (Wesley's call: no login; only he and Dan hold
// it). The database function jesyon_pin_antre checks the bcrypt hash, rate
// limits (5 misses per IP per 15 min, 40 misses overall per hour) and mints a
// key per phone (sous='pin'), so approvals still sign per phone. Changing the
// PIN means switching every sous='pin' key off. The older hand-made build keys
// (sous='bati') and HTTP Basic against EKIP_USERS still work alongside.
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
// verify_jwt is off because this does its own auth (PIN keys, build keys, HTTP Basic).
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

// ------------------------------------------------------------------ kaye
// The evaluator's side of the Kaye Aktivite Pratik (2026-10-21). The criteria
// live in the `kaye` form's schema (schema.evalye, written by the Kaye builder,
// the same lists the paper prints). A trainee is the name typed on the forms,
// folded to one key (no accents, no case, single spaces): there are no accounts.
// Work arrives in `kaye` (by activity), 5.1 in rapo-jou flagged pratik=wi, 6.1
// is done in front of the evaluator. Verdicts go to ekip_evalyasyon, which the
// database keeps append-only; the newest verdict per trainee and activity counts.
type Akt = { n: string; modil: number; non: string; pot: boolean; kote: string; kritè: string[]; pratik: boolean };

function kleNon(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

async function kayeSpec(db: ReturnType<typeof sb>): Promise<Akt[]> {
  const { data, error } = await db.from("ekip_fom").select("schema").eq("slug", "kaye").maybeSingle();
  if (error) throw new Fail(error.message, 500);
  const akt = (data?.schema as { evalye?: { aktivite?: unknown } } | null)?.evalye?.aktivite;
  if (!Array.isArray(akt) || !akt.length) throw new Fail("Kaye a pa gen kritè evalyasyon.", 500);
  return akt as Akt[];
}

async function kaye() {
  const db = sb();
  const spec = await kayeSpec(db);
  const [ks, rj, ev] = await Promise.all([
    db.from("ekip_repons").select("id,referans,created_at,repons").eq("fom_slug", "kaye")
      .order("created_at", { ascending: false }).limit(3000),
    db.from("ekip_repons").select("id,referans,created_at,repons").eq("fom_slug", "rapo-jou")
      .eq("repons->>pratik", "wi").order("created_at", { ascending: false }).limit(3000),
    db.from("ekip_evalyasyon").select("id,manadje_kle,manadje_non,aktivite,repons_id,krite,pase,not_yo,evalyate_non,le")
      .order("le", { ascending: false }).limit(5000),
  ]);
  for (const r of [ks, rj, ev]) if (r.error) throw new Fail(r.error.message, 500);
  type M = { kle: string; non: string; sit: string; soumisyon: unknown[]; evalyasyon: unknown[] };
  const moun = new Map<string, M>();
  const jwenn = (non: string): M | null => {
    const k = kleNon(non);
    if (!k) return null;
    if (!moun.has(k)) moun.set(k, { kle: k, non: non.trim(), sit: "", soumisyon: [], evalyasyon: [] });
    return moun.get(k)!;
  };
  for (const r of ks.data ?? []) {
    const rp = r.repons as Record<string, unknown>;
    const m = jwenn(String(rp.non ?? ""));
    if (!m) continue;
    if (!m.sit && rp.sit) m.sit = String(rp.sit);
    m.soumisyon.push({ id: r.id, fom: "kaye", aktivite: String(rp.aktivite ?? ""), referans: r.referans, le: r.created_at });
  }
  for (const r of rj.data ?? []) {
    const rp = r.repons as Record<string, unknown>;
    const m = jwenn(String(rp.moun_ki_rapote ?? ""));
    if (!m) continue;
    if (!m.sit && rp.sit) m.sit = String(rp.sit);
    m.soumisyon.push({ id: r.id, fom: "rapo-jou", aktivite: "5.1", referans: r.referans, le: r.created_at });
  }
  for (const e of ev.data ?? []) {
    const m = moun.get(e.manadje_kle) ?? jwenn(e.manadje_non);
    if (m) m.evalyasyon.push(e);
  }
  return { aktivite: spec, moun: [...moun.values()].sort((a, b) => a.non.localeCompare(b.non, "fr")) };
}

async function evalye(me: { id: string; moun: Moun }, b: Record<string, unknown>) {
  const db = sb();
  const a = (await kayeSpec(db)).find((x) => x.n === String(b.aktivite ?? ""));
  if (!a) throw new Fail("Aktivite sa a pa nan Kaye a.");
  const manadje = String(b.manadje ?? "").trim().slice(0, 120);
  const kle = kleNon(manadje);
  if (!kle) throw new Fail("Non manadjè estajyè a obligatwa.");
  const ok = Array.isArray(b.krite) ? (b.krite as unknown[]).map((x) => x === true) : [];
  if (ok.length !== a.kritè.length) throw new Fail("Kritè yo pa koresponn ak Kaye a. Rechaje paj la.", 409);
  const siyati = String(b.siyati ?? "");
  if (!/^data:image\/(png|jpeg);base64,/.test(siyati)) throw new Fail("Siyati obligatwa.");
  if (siyati.length > 400_000) throw new Fail("Siyati a twò gwo.");
  const evalyate = String(b.non ?? "").trim().slice(0, 120) || me.moun.non;
  let repons_id: string | null = null;
  if (b.repons_id) {
    const { data: r } = await db.from("ekip_repons").select("id,fom_slug").eq("id", String(b.repons_id)).maybeSingle();
    if (!r || !["kaye", "rapo-jou"].includes(r.fom_slug)) throw new Fail("Repons sa a pa yon travay Kaye.");
    repons_id = r.id;
  }
  // The verdict is the criteria, never a button: every box ticked, or it does not pass.
  const pase = ok.every(Boolean);
  const { data, error } = await db.from("ekip_evalyasyon").insert({
    manadje_kle: kle, manadje_non: manadje, aktivite: a.n, repons_id,
    krite: a.kritè.map((t, i) => ({ t, ok: ok[i] })), pase,
    not_yo: b.not_yo ? String(b.not_yo).slice(0, 2000) : null,
    evalyate_non: evalyate, pa_ki_moun: me.id, siyati,
  }).select("id,pase,le").single();
  if (error) { console.error("evalye", error); throw new Fail(error.message, 500); }
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

  // The PIN door is the one route that needs no key.
  if (segments(req.url)[0] === "pin" && req.method === "POST") {
    const b = await req.json().catch(() => ({})) as Record<string, unknown>;
    const ip = req.headers.get("cf-connecting-ip")
      ?? (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    const { data, error } = await sb().rpc("jesyon_pin_antre", {
      p_pin: String(b.pin ?? "").slice(0, 20), p_ip: ip, p_non: String(b.non ?? "").slice(0, 60),
    });
    if (error) {
      console.error("pin", error);
      return new Response(JSON.stringify({ error: "Erè sèvè a. Eseye ankò." }), { status: 500, headers: json });
    }
    const r = data as { ok: boolean; kle?: string; bloke?: string; rete?: number };
    if (r.ok) return new Response(JSON.stringify({ kle: r.kle }), { headers: json });
    const msg = r.bloke ? "Twòp move PIN. Tann 15 minit epi eseye ankò."
      : `PIN an pa bon.${r.rete != null ? ` Ou gen ${r.rete} eseye ki rete.` : ""}`;
    return new Response(JSON.stringify({ error: msg }), { status: r.bloke ? 429 : 401, headers: json });
  }

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
    else if (head === "kaye" && !rest && m === "GET") out = await kaye();
    else if (head === "kaye" && rest === "evalye" && m === "POST") {
      const b = await req.json().catch(() => null);
      if (!b || typeof b !== "object") throw new Fail("bad json");
      out = await evalye(me, b as Record<string, unknown>);
    }
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
