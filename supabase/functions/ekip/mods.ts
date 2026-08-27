// Module handlers for the internal team API.
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { validate, validateDeck, validateLiv } from "./validate.ts";

export class Fail extends Error {
  status: number;
  constructor(msg: string, status = 400) { super(msg); this.status = status; }
}

let SB: () => SupabaseClient;
export function initMods(url: string, key: string) { SB = () => createClient(url, key); }

export function modWhoami(user: string) {
  return {
    user,
    moduleyo: [
      { kle: "fom", tit: "Forms", deskripsyon: "Build and publish forms", pare: true },
      { kle: "apwobasyon", tit: "Approvals", deskripsyon: "Two signatures before money moves", pare: true },
      { kle: "leson", tit: "Lessons", deskripsyon: "What a trainee watches and reads", pare: true },
      { kle: "dok", tit: "Documents", deskripsyon: "Which version is current", pare: true },
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

// The Send 0 results module was DELETED on 2026-08-26. It read the legacy
// `jp_send0_reponses` table, which stopped receiving writes on 2026-08-22 when
// Send 0 moved onto the form engine, and it scored those rows against a
// hardcoded copy of the answer key that had since drifted from the live form.
// It showed 2 rows, from build day, while 9 real submissions by 4 candidates
// piled up unseen in `ekip_repons`.
//
// Nothing replaced it, because `reponsGet()` below already handles send0 the
// same way it handles every other form, and now computes item analysis from
// the form's OWN answer keys instead of a second copy pasted into this file.
// Two copies of one answer key is how you get an answer key with two values.


// -------------------------------------------------------------- lessons

// A lesson is a row and one renderer draws it, the same bargain the form
// engine makes. Creating a lesson is an INSERT: no deploy, no git, no HTML
// per lesson, and Dan cannot make an ugly one because he never touches CSS.

export async function lesonList() {
  const { data, error } = await SB()
    .from("ekip_leson")
    .select("id,slug,tit,deskripsyon,deck,liv,send,lang,eta,kreye_pa,updated_at")
    .order("send", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false });
  if (error) throw new Fail(error.message, 500);
  return {
    leson: (data ?? []).map((l) => {
      const slides = ((l.deck?.slides ?? []) as Record<string, unknown>[]);
      return {
        id: l.id, slug: l.slug, tit: l.tit, deskripsyon: l.deskripsyon,
        send: l.send, lang: l.lang, eta: l.eta, kreye_pa: l.kreye_pa,
        updated_at: l.updated_at,
        glise: slides.length,
        // Surfaced in the list because these are the two things that decide
        // whether a lesson can go out: has it got its video, and does it hand
        // the trainee anything to do at the end.
        videyo: slides.filter((x) => x.type === "videyo").length,
        videyo_vid: slides.filter((x) => x.type === "videyo" && !String(x.youtube ?? "").trim()).length,
        fom: slides.filter((x) => x.type === "fen").map((x) => String(x.fom ?? "")).filter(Boolean)[0] ?? null,
        // The reading version, counted the same way. Zero means it is not
        // written yet, which is the normal state until the deck is settled.
        liv: ((l.liv?.slides ?? []) as unknown[]).length,
      };
    }),
  };
}

export async function lesonGet(slug: string) {
  const { data, error } = await SB().from("ekip_leson").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Fail(error.message, 500);
  if (!data) throw new Fail(`Lesson "${slug}" does not exist.`, 404);
  return data;
}

export async function lesonSave(user: string, body: Record<string, unknown>, slug?: string) {
  const newSlug = String(body.slug ?? slug ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(newSlug)) {
    throw new Fail("Slug must be lowercase letters, digits and hyphens, 3-50 characters.");
  }
  const tit = String(body.tit ?? "").trim();
  if (!tit) throw new Fail("The lesson needs a title.");

  const eta = String(body.eta ?? "bouyon");
  if (!["bouyon", "live", "feme"].includes(eta)) throw new Fail("Unknown status.");

  const lang = String(body.lang ?? "KR");
  if (!["KR", "EN", "FR"].includes(lang)) throw new Fail("Language must be KR, EN or FR.");

  let send: number | null = null;
  if (body.send !== undefined && body.send !== null && body.send !== "") {
    send = Number(body.send);
    if (!Number.isInteger(send) || send < 0 || send > 7) {
      throw new Fail("Send must be a whole number from 0 to 7.");
    }
  }

  const deck = body.deck ?? { slides: [] };
  const errs = validateDeck(deck);
  if (errs.length) throw new Fail(errs.join(" · "));

  // The reading version is optional and stays optional. A lesson with an empty
  // `liv` is a lesson somebody has not written the manual text for yet, and the
  // builder must never make that a reason it cannot save the deck.
  const liv = body.liv ?? { slides: [] };
  const livErrs = validateLiv(liv);
  if (livErrs.length) throw new Fail("Reading version: " + livErrs.join(" · "));

  // GOING LIVE IN KREYOL IS THE POINT. An English deck can exist as a draft
  // for as long as it takes -- that is how it gets written -- but a trainee
  // opening a WhatsApp link and finding English is the failure this whole
  // pipeline was built to avoid. Refuse it here rather than discover it in
  // the field.
  if (eta === "live" && lang !== "KR") {
    throw new Fail(
      `This lesson is in ${lang}. Only a Kreyol lesson can go live, because a ` +
      `trainee opens it on a phone with nobody beside them. Keep it a draft ` +
      `until it is translated.`);
  }

  const row = {
    slug: newSlug, tit,
    deskripsyon: String(body.deskripsyon ?? "").trim() || null,
    deck, liv, send, lang, eta,
  };

  if (slug) {
    const { data, error } = await SB().from("ekip_leson")
      .update(row).eq("slug", slug).select().maybeSingle();
    if (error) throw new Fail(error.message, error.code === "23505" ? 409 : 500);
    if (!data) throw new Fail(`Lesson "${slug}" does not exist.`, 404);
    return data;
  }

  const { data, error } = await SB().from("ekip_leson")
    .insert({ ...row, kreye_pa: user }).select().maybeSingle();
  if (error) throw new Fail(
    error.code === "23505" ? `Slug "${newSlug}" is already taken.` : error.message,
    error.code === "23505" ? 409 : 500);
  return data;
}

export async function lesonDelete(slug: string) {
  // No responses to protect, unlike a form -- a lesson collects nothing. Only
  // guard against deleting something a trainee currently has a link to.
  const { data } = await SB().from("ekip_leson").select("eta").eq("slug", slug).maybeSingle();
  if (data?.eta === "live") {
    throw new Fail("This lesson is live and someone may hold a link to it. Close it first.", 409);
  }
  const { error } = await SB().from("ekip_leson").delete().eq("slug", slug);
  if (error) throw new Fail(error.message, 500);
  return { ok: true };
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

  const fields: { key: string; label: string; type: string; fields?: unknown }[] = [];
  const keyed: Record<string, unknown>[] = [];
  for (const sec of (fom.schema?.sections ?? []) as Record<string, unknown>[]) {
    for (const f of (sec.fields ?? []) as Record<string, unknown>[]) {
      fields.push({
        key: String(f.key),
        label: String(f.label ?? sec.legend ?? f.key),
        type: String(f.type),
        // Carried so the admin screen can label the columns of a repeatable
        // group and build the items CSV. Absent for every other type, so the
        // payload does not change for any existing form.
        ...(f.type === "group" ? { fields: f.fields } : {}),
      });
      if (f.answer !== undefined) keyed.push({ ...f, _label: String(f.label || sec.legend || f.key) });
    }
  }

  // ITEM ANALYSIS, from the form's own answer keys. Added 2026-08-26 to
  // replace the deleted Send 0 module, which carried its own copy of the key
  // and drifted from the live form without anyone noticing.
  //
  // Admin only, and admin already sees the keys -- fomGet() returns the whole
  // schema to a logged-in caller by design. Nothing here reaches a trainee.
  const rows = data ?? [];
  const kesyon = keyed.map((f) => {
    const key = String(f.key);
    let full = 0, part = 0, zero = 0;
    for (const r of rows) {
      const p = pwen((r.repons as Record<string, unknown>)?.[key], f.answer);
      p >= 1 ? full++ : p > 0 ? part++ : zero++;
    }
    return {
      key, label: String(f._label), type: String(f.type),
      full, part, zero,
      pct: rows.length ? Math.round((full / rows.length) * 100) : 0,
    };
  }).sort((a, b) => a.pct - b.pct);   // worst-answered first, which is the point

  const eskore = rows.filter((r) => r.esko != null);
  return {
    slug, tit: fom.tit, eta: fom.eta, fields, rows,
    kesyon,
    rezime: eskore.length
      ? {
        eskore: eskore.length,
        mwayèn: Math.round(eskore.reduce((s, r) => s + (r.esko ?? 0), 0) / eskore.length),
        pase: eskore.filter((r) => r.pase === true).length,
        // A form can be scored and have no pass mark, which is the preferred
        // shape for a gate. Then there is no verdict to count.
        gen_pòt: eskore.some((r) => r.pase !== null),
      }
      : null,
  };
}

// Same partial-credit rule the `f` function scores with. Restated rather than
// shared because these are two separate deployments; if they drift, the admin
// screen is wrong and the stored score is still right.
function pwen(got: unknown, want: unknown): number {
  if (Array.isArray(want)) {
    const wantSet = new Set(want.map(String));
    const gotSet = new Set(Array.isArray(got) ? got.map(String) : []);
    if (!wantSet.size) return gotSet.size ? 0 : 1;
    let right = 0, wrong = 0;
    for (const v of gotSet) wantSet.has(v) ? right++ : wrong++;
    return Math.max(0, (right - wrong) / wantSet.size);
  }
  return String(got) === String(want) ? 1 : 0;
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
