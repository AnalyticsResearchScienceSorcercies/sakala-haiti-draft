// Module handlers for the internal team API.
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { validate } from "./validate.ts";

export class Fail extends Error {
  status: number;
  constructor(msg: string, status = 400) { super(msg); this.status = status; }
}

let SB: () => SupabaseClient;
export function initMods(url: string, key: string) { SB = () => createClient(url, key); }

function setEq(got: string[], want: string[]) {
  const g = new Set(got ?? []);
  return g.size === want.length && want.every((v) => g.has(v));
}

export function modWhoami(user: string) {
  return {
    user,
    moduleyo: [
      { kle: "fom", tit: "Forms", deskripsyon: "Build and publish forms", pare: true },
      { kle: "apwobasyon", tit: "Approvals", deskripsyon: "Two signatures before money moves", pare: true },
      { kle: "dok", tit: "Documents", deskripsyon: "Which version is current", pare: true },
      { kle: "send0", tit: "Send 0 results", deskripsyon: "The comprehension gate", pare: true },
      { kle: "pewol", tit: "Hours & payroll", deskripsyon: "What each person is owed", pare: false },
    ],
  };
}

export async function modDok() {
  const { data, error } = await SB()
    .from("ekip_dokiman")
    .select("id,kategori,tit,deskripsyon,lang,vesyon,url,lod,updated_at")
    .eq("aktif", true).order("kategori").order("lod");
  if (error) throw new Fail(error.message, 500);
  const byKat: Record<string, unknown[]> = {};
  for (const r of data ?? []) (byKat[r.kategori] ??= []).push(r);
  return { total: (data ?? []).length, kategori: byKat };
}

// STALE AS OF 2026-08-22, AND KNOWN TO BE. Two separate problems:
//
//   1. This key is the pre-2026-08-22 one. q5 is now ["a","b","d","e","f"]
//      after the violence clause went into the terms page and into the gate,
//      so every "wrong" count for q5 below is computed against a question
//      that no longer exists.
//   2. It reads jp_send0_reponses, the legacy table. Send 0 now runs through
//      the form engine and its responses live in ekip_repons, so this view is
//      frozen on the two pre-migration rows and will never show a new one.
//
// The fix is not to update this key. It is to delete this whole module and let
// the generic responses view handle send0 like every other form, with item
// analysis computed from the schema's own answer keys rather than a copy of
// them pasted into a second file. Left in place only so the existing admin tab
// does not 404 before that lands.
const KOREK: Record<string, string> = { q1: "b", q2: "b", q3: "b" };
const SET_KOREK: Record<string, string[]> = { q4: ["a", "b", "d", "e"], q5: ["a", "b", "d", "e"] };
const LABEL: Record<string, string> = {
  q1: "1. Training pay per hour",
  q2: "2. Trainee who does not finish",
  q3: "3. What Level 2 means",
  q4: "4. Never held against you",
  q5: "5. What ends it",
};

export async function modSend0() {
  const { data, error } = await SB()
    .from("jp_send0_reponses")
    .select("non,kominote,telefon,q1,q2,q3,q4,q5,esko,pase,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Fail(error.message, 500);
  const rows = data ?? [];
  const total = rows.length;
  const passed = rows.filter((r) => r.pase).length;
  const miss = Object.keys(LABEL).map((q) => {
    const wrong = rows.filter((r) =>
      q in KOREK ? r[q] !== KOREK[q] : !setEq(r[q], SET_KOREK[q])).length;
    return { q, label: LABEL[q], wrong, pct: total ? Math.round((wrong / total) * 100) : 0 };
  }).sort((a, b) => b.wrong - a.wrong);
  return {
    total, passed,
    rate: total ? Math.round((passed / total) * 100) : 0,
    avg: total ? +(rows.reduce((s, r) => s + (r.esko ?? 0), 0) / total).toFixed(1) : null,
    miss, rows,
    stale: true,
  };
}

// ---------------------------------------------------------- forms (builder)

export async function fomList() {
  const { data, error } = await SB()
    .from("ekip_fom")
    .select("id,slug,tit,deskripsyon,eta,kreye_pa,updated_at,schema")
    .order("updated_at", { ascending: false });
  if (error) throw new Fail(error.message, 500);

  const { data: counts } = await SB().from("ekip_repons").select("fom_slug");
  const n: Record<string, number> = {};
  for (const r of counts ?? []) n[r.fom_slug] = (n[r.fom_slug] ?? 0) + 1;

  return {
    fom: (data ?? []).map((f) => {
      const secs = (f.schema?.sections ?? []) as Record<string, unknown>[];
      return {
        id: f.id, slug: f.slug, tit: f.tit, deskripsyon: f.deskripsyon,
        eta: f.eta, kreye_pa: f.kreye_pa, updated_at: f.updated_at,
        seksyon: secs.length,
        chan: secs.reduce((s, x) => s + ((x.fields as unknown[])?.length ?? 0), 0),
        repons: n[f.slug] ?? 0,
      };
    }),
  };
}

export async function fomGet(slug: string) {
  const { data, error } = await SB().from("ekip_fom").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Fail(error.message, 500);
  if (!data) throw new Fail(`Form "${slug}" does not exist.`, 404);
  return data; // admin sees answer keys -- that is the point of being logged in
}

export async function fomSave(user: string, body: Record<string, unknown>, slug?: string) {
  const newSlug = String(body.slug ?? slug ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(newSlug)) {
    throw new Fail("Slug must be lowercase letters, digits and hyphens, 3-50 characters.");
  }
  const tit = String(body.tit ?? "").trim();
  if (!tit) throw new Fail("The form needs a title.");

  const eta = String(body.eta ?? "bouyon");
  if (!["bouyon", "live", "feme"].includes(eta)) throw new Fail("Unknown status.");

  const schema = body.schema ?? { sections: [] };
  const errs = validate(schema);
  if (errs.length) throw new Fail(errs.join(" · "));

  const row = {
    slug: newSlug, tit,
    deskripsyon: String(body.deskripsyon ?? "").trim() || null,
    schema, eta,
  };

  if (slug) {
    const { data, error } = await SB().from("ekip_fom")
      .update(row).eq("slug", slug).select().maybeSingle();
    if (error) throw new Fail(error.message, error.code === "23505" ? 409 : 500);
    if (!data) throw new Fail(`Form "${slug}" does not exist.`, 404);
    return data;
  }

  const { data, error } = await SB().from("ekip_fom")
    .insert({ ...row, kreye_pa: user }).select().maybeSingle();
  if (error) throw new Fail(
    error.code === "23505" ? `Slug "${newSlug}" is already taken.` : error.message,
    error.code === "23505" ? 409 : 500);
  return data;
}

export async function fomDelete(slug: string) {
  const { count } = await SB().from("ekip_repons")
    .select("id", { count: "exact", head: true }).eq("fom_slug", slug);
  if ((count ?? 0) > 0) {
    throw new Fail(`This form has ${count} response(s). Close it instead of deleting it.`, 409);
  }
  const { error } = await SB().from("ekip_fom").delete().eq("slug", slug);
  if (error) throw new Fail(error.message, 500);
  return { ok: true };
}

export async function reponsGet(slug: string) {
  const fom = await fomGet(slug);
  const { data, error } = await SB().from("ekip_repons")
    .select("id,repons,esko,total,pase,referans,created_at")
    .eq("fom_slug", slug).order("created_at", { ascending: false }).limit(500);
  if (error) throw new Fail(error.message, 500);

  const fields: { key: string; label: string; type: string }[] = [];
  for (const sec of (fom.schema?.sections ?? []) as Record<string, unknown>[]) {
    for (const f of (sec.fields ?? []) as Record<string, unknown>[]) {
      fields.push({
        key: String(f.key),
        label: String(f.label ?? sec.legend ?? f.key),
        type: String(f.type),
      });
    }
  }
  return { slug, tit: fom.tit, eta: fom.eta, fields, rows: data ?? [] };
}

// ------------------------------------------------------------------ files

const UPLOAD_BUCKET = "form-uploads";

// Same shape the `f` function mints. Re-stated rather than shared because
// these are two separate deployments; if they drift, this one fails closed.
const UPLOAD_PATH_RE =
  /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]\/\d{4}-\d{2}\/[a-z][a-z0-9_]{0,40}-[0-9a-z]{6,10}-[0-9a-f]{16}-[0-9a-f]{32}\.[a-z0-9]{2,4}$/;

// POST /ekip/fichye  { path }  ->  { url, expires_in }
//
// POST, not GET, and the path travels in the BODY. Learned the hard way
// 2026-08-21: as GET /ekip/fichye/<path> the URL ended in ".jpg", Cloudflare's
// default rules treated it as a static asset, and a signed URL minted for one
// user was served to another from cache with the function never running --
// so nothing was logged. Never put a file path in the URL of an
// authenticated route.
//
// 120 seconds is enough to open a tab or load an <img>, and short enough that
// a URL pasted into a group chat is dead before it arrives.
//
// THE LOG IS WRITTEN FIRST, AND A FAILED WRITE REFUSES THE URL. An audit log
// you can bypass by making the log fail is not an audit log.
export async function fichyeUrl(path: string, user: string, ua: string) {
  if (!UPLOAD_PATH_RE.test(path)) {
    throw new Fail("Not a file path this system issued.", 400);
  }

  const { data: up } = await SB().from("ekip_upload")
    .select("repons_id,fom_slug").eq("path", path).maybeSingle();

  const { error: logErr } = await SB().from("ekip_gade_fichye").insert({
    path,
    pa_ki_moun: user,
    fom_slug: up?.fom_slug ?? path.split("/")[0],
    repons_id: up?.repons_id ?? null,
    ua: ua.slice(0, 300),
  });
  if (logErr) {
    console.error("access log write failed, refusing to mint a URL", logErr);
    throw new Fail("Could not record file access, so the file was not opened.", 500);
  }

  const { data, error } = await SB().storage
    .from(UPLOAD_BUCKET).createSignedUrl(path, 120);
  if (error || !data) {
    throw new Fail(error?.message ?? "That file is not in storage any more.", 404);
  }
  return { url: data.signedUrl, expires_in: 120 };
}

// GET /ekip/akse -> recent file access, so the log is visible and not just kept
export async function akseList() {
  const { data, error } = await SB().from("ekip_gade_fichye")
    .select("path,pa_ki_moun,fom_slug,gade_le")
    .order("gade_le", { ascending: false }).limit(200);
  if (error) throw new Fail(error.message, 500);
  return { total: (data ?? []).length, rows: data ?? [] };
}
