// Public form API. Serves any form definition and accepts its responses.
//
//   GET  /f/<slug>          -> schema with every answer key STRIPPED
//   POST /f/<slug>/upload   -> mint one signed upload URL for one file field
//   POST /f/<slug>          -> validate, score server-side, store
//
// Public by design: trainees scan a QR, they have no credentials. verify_jwt
// off for that reason. Writes go through the service-role key server-side; the
// browser never holds a key and the tables have RLS with no policies.
//
// Split into modules on purpose: as one file the deploy payload truncated.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Field, initUploads, issueUpload, spendUploads, takeFile } from "./upload.ts";
import { applySums, normGroup } from "./groups.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
initUploads(SUPABASE_URL, SERVICE_KEY);

const ALLOWED = new Set([
  "https://konkret-haiti.com",
  "https://www.konkret-haiti.com",
]);

const SIG_MAX = 400_000;
const TEXT_MAX = 4_000;

function cors(origin: string | null) {
  const h: Record<string, string> = {
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (origin && ALLOWED.has(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

function slugOf(url: string): string {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const i = parts.lastIndexOf("f");
  const rest = i >= 0 ? parts.slice(i + 1) : parts;
  if (rest.length) return rest[0];
  return new URL(url).searchParams.get("s") ?? "";
}

function subOf(url: string): string {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const i = parts.lastIndexOf("f");
  const rest = i >= 0 ? parts.slice(i + 1) : parts;
  return rest.length > 1 ? rest[1] : "";
}

// THE important function. Anything returned to a browser goes through here.
// If an answer key ever leaks, the gate is decorative.
//
// Recurses ONE level into group children. validate() in the ekip function
// refuses an answer key on a group child, so nothing can get in the front
// door -- but the leak test is the invariant, not the validator, and a schema
// can also be written straight into the table by SQL.
function strip(schema: Record<string, unknown>) {
  const out = JSON.parse(JSON.stringify(schema));
  for (const sec of out.sections ?? []) {
    for (const f of sec.fields ?? []) {
      delete f.answer;
      for (const c of f.fields ?? []) delete c.answer;
    }
  }
  return out;
}

// Deliberately flattens ONE level. A group must stay one field to the main
// loop and to the scoring filter, so a child is never scored.
function fieldsOf(schema: Record<string, unknown>): Field[] {
  const out: Field[] = [];
  for (const sec of (schema.sections ?? []) as Record<string, unknown>[]) {
    for (const f of (sec.fields ?? []) as Field[]) out.push(f);
  }
  return out;
}

// A question's label for feedback. Most forms label the field; the quiz forms
// put the question in the section legend and leave the field unlabelled, so
// both have to be reachable by key.
function labelsOf(schema: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const sec of (schema.sections ?? []) as Record<string, unknown>[]) {
    for (const f of (sec.fields ?? []) as Record<string, unknown>[]) {
      out[String(f.key)] = String(f.label || sec.legend || f.key);
    }
  }
  return out;
}

// PARTIAL CREDIT. Returns 0..1 for one question.
//
// Replaces exact-set equality, 2026-08-26. Under setEq a candidate who ticked
// all four correct items on Send 0 q4 and added a fifth scored zero -- the
// same zero as someone who ticked nothing. Nine attempts by four people
// produced no pass and no score above 3/5, and the two who knew the answer
// were marked identically to the two who did not. A gate that cannot tell
// those apart is not measuring comprehension.
//
// Wrong ticks CANCEL right ones, so ticking every box scores 0 rather than
// full marks. Floored at 0 so one bad question cannot eat another's credit.
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

function fill(msg: string, referans: string | null) {
  return msg.replace(/\{referans\}/g, referans ?? "");
}

const sb = () => createClient(SUPABASE_URL, SERVICE_KEY);

Deno.serve(async (req: Request) => {
  const ch = cors(req.headers.get("origin"));
  const json = { ...ch, "Content-Type": "application/json; charset=utf-8" };
  const bad = (msg: string, status = 400) =>
    new Response(JSON.stringify({ error: msg }), { status, headers: json });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: ch });

  const slug = slugOf(req.url);
  if (!slug) return bad("Ki fòm?", 400);
  const sub = subOf(req.url);

  const { data: fom, error } = await sb()
    .from("ekip_fom").select("id,slug,tit,deskripsyon,schema,eta")
    .eq("slug", slug).maybeSingle();

  if (error) { console.error("lookup failed", error); return bad("Gen yon pwoblèm teknik.", 500); }
  if (!fom) return bad(`Fòm "${slug}" pa egziste.`, 404);

  if (req.method === "GET") {
    return new Response(JSON.stringify({
      slug: fom.slug, tit: fom.tit, deskripsyon: fom.deskripsyon,
      eta: fom.eta, schema: strip(fom.schema),
    }), { headers: json });
  }

  if (req.method !== "POST") return bad("Method not allowed", 405);

  if (fom.eta !== "live") {
    return bad(fom.eta === "bouyon" ? "Fòm sa a poko louvri." : "Fòm sa a fèmen.", 409);
  }

  const fields = fieldsOf(fom.schema);

  if (sub === "upload") {
    const r = await issueUpload(req, fom, fields);
    return new Response(JSON.stringify(r.body), { status: r.status, headers: json });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return bad("bad json"); }

  if (typeof body.website === "string" && body.website.trim()) {
    return new Response(JSON.stringify({ ok: true, msg: "Mèsi." }), { headers: json });
  }

  const repons: Record<string, unknown> = {};
  const manke: string[] = [];
  const attach: string[] = [];

  for (const f of fields) {
    let v = body[f.key];

    if (f.type === "group") {
      const g = normGroup(f, body[f.key]);
      if (g.err) return bad(g.err);
      repons[f.key] = g.rows;
      continue;   // a group's requiredness is `min`, not `required`
    }

    if (f.type === "checkbox") {
      v = Array.isArray(v) ? v.map(String) : [];
    } else if (f.type === "number" || f.type === "currency" || f.type === "rating") {
      v = v === "" || v == null ? null : Number(v);
      if (v !== null && Number.isNaN(v)) v = null;
    } else if (f.type === "signature") {
      const s = v == null ? "" : String(v);
      if (s && !/^data:image\/(png|jpeg);base64,/.test(s)) {
        return bad(`Siyati "${f.label ?? f.key}" pa bon.`);
      }
      if (s.length > SIG_MAX) return bad(`Siyati "${f.label ?? f.key}" twò gwo.`);
      v = s;
    } else if (f.type === "file") {
      const r = await takeFile(v, fom, f);
      if (!r.ok) return bad(r.msg, r.status);
      v = r.val;
      if (r.path) attach.push(r.path);
    } else {
      v = v == null ? "" : String(v).trim().slice(0, TEXT_MAX);
    }

    const empty = f.type === "checkbox"
      ? (v as string[]).length === 0
      : (v === "" || v === null);
    // A computed total is filled in after the loop, so it is always present and
    // there is nothing for the person to have forgotten. Checking it here would
    // fail a good submission whose browser never ran the client recalculation.
    if (f.required && empty && typeof f.sum_of !== "string") {
      manke.push(f.label || f.key);
    }
    repons[f.key] = v;
  }

  // Totals last: every group is normalised by now, so a sum works regardless
  // of the order the schema puts the group and its total in.
  applySums(fields, repons);

  if (manke.length) return bad("Chan sa yo obligatwa: " + manke.join(", "));

  // SCORING AND VERDICT ARE SEPARATE, 2026-08-26.
  //
  // Before, `pass_mark` gated both: a form with answer keys and no pass mark
  // was not scored at all, so the only way to show a candidate a score was to
  // also hang a door on it. Now answer keys produce a score, and `pass_mark`
  // decides only whether that score is also a verdict. A gate can tell someone
  // what they missed without shutting them out.
  //
  // `esko` is a PERCENTAGE, 0..100, and `total` is always 100. It was a count
  // of whole questions until 2026-08-26; partial credit made that a fraction,
  // and both columns are smallint. Percent survives any mix of question types
  // and reads better on a phone than "3.75/5". `pass_mark` is a percentage
  // too -- see the matching change in ekip/validate.ts.
  const passMark = (fom.schema as Record<string, unknown>).pass_mark;
  let esko: number | null = null;
  let total: number | null = null;
  let pase: boolean | null = null;
  const manke_kesyon: string[] = [];

  const scored = fields.filter((f) => f.answer !== undefined);
  if (scored.length) {
    const labels = labelsOf(fom.schema as Record<string, unknown>);
    let sum = 0;
    for (const f of scored) {
      const p = pwen(repons[f.key], f.answer);
      sum += p;
      // Which question, never which option. Naming the missed options would
      // hand back the answer key one retry at a time.
      if (p < 1) manke_kesyon.push(labels[f.key] ?? f.key);
    }
    total = 100;
    esko = Math.round((sum / scored.length) * 100);
    if (typeof passMark === "number") pase = esko >= passMark;
  }

  const { data: saved, error: insErr } = await sb().from("ekip_repons").insert({
    fom_id: fom.id, fom_slug: fom.slug, repons, esko, total, pase,
    meta: {
      ua: (req.headers.get("user-agent") ?? "").slice(0, 300),
      // Stamped so a row scored under the old whole-question scheme is never
      // silently compared against one scored as a percentage.
      ...(esko === null ? {} : { eskò_vesyon: 2 }),
    },
  }).select("id,referans").maybeSingle();

  if (insErr) {
    console.error("insert failed", insErr);
    return bad("Gen yon pwoblèm teknik. Tanpri eseye ankò.", 500);
  }

  if (saved?.id) await spendUploads(attach, saved.id);

  const referans = saved?.referans ?? null;
  const sch = fom.schema as Record<string, string>;
  const raw = pase === null
    ? (sch.success_message ?? "Mèsi. Repons ou anrejistre.")
    : pase ? (sch.pass_message ?? "Ou pase.") : (sch.fail_message ?? "Ou pa pase fwa sa a.");

  return new Response(JSON.stringify({
    ok: true, esko, total, pase, referans, msg: fill(raw, referans),
    // Empty array when every scored question was right; absent when the form
    // is not scored at all. The renderer distinguishes the two.
    ...(esko === null ? {} : { manke: manke_kesyon }),
  }), { headers: json });
});
