// File upload machinery for the public form API.
//
// The form carries a RECEIPT, not the bytes. The phone gets a signed upload
// URL, PUTs straight to Storage, and the submission holds only a path. That is
// what keeps the offline queue, the jsonb column, the text cap and the CSV
// export all working unchanged.
//
// POLICY 2026-08-21: no national ID photographs at submission. Identity
// documents are checked in person at enrolment and not stored here.
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

export const BUCKET = "form-uploads";

// Hard ceiling regardless of what a form asks for. Free-tier Storage is 1 GB
// total, so an 8 MB object is already 0.8% of the whole quota.
const HARD_MAX_MB = 8;
const DEFAULT_MAX_MB = 5;

// How long an issued path stays redeemable. Longer than the 2 h Storage puts
// on the signed upload URL, because the response may sit in the phone's
// localStorage queue for days. Never sweep objects younger than this.
const PATH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Sized for "a trainee taps twice by mistake", NOT for a motivated attacker:
// one IP at 40 x 8 MB is 320 MB/hour, which fills a 1 GB bucket in about three
// hours. Tighten before any genuinely public QR.
const IP_PER_HOUR = 40;
const ALL_PER_HOUR = 600;

// The extension comes from THIS table, never from the browser's filename, so
// ".php" and ".html" cannot exist in the bucket.
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "image/heic": "heic", "image/heif": "heif", "application/pdf": "pdf",
};
const PHOTO = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const DOCS = new Set(["application/pdf"]);

function allowedFor(mode: string): Set<string> {
  if (mode === "photo") return PHOTO;
  if (mode === "pdf") return DOCS;
  return new Set([...PHOTO, ...DOCS]);
}

export type Field = {
  key: string; type: string; label?: string; required?: boolean;
  answer?: unknown; options?: { v: string; t: string }[]; [k: string]: unknown;
};

let SECRET = "";
let SB: () => SupabaseClient;

export function initUploads(url: string, serviceKey: string) {
  SECRET = Deno.env.get("UPLOAD_SECRET") ?? serviceKey;
  SB = () => createClient(url, serviceKey);
}

let HKEY: CryptoKey | null = null;
async function hkey(): Promise<CryptoKey> {
  if (!HKEY) {
    const seed = await crypto.subtle.digest(
      "SHA-256", new TextEncoder().encode("konkret-upload-v1|" + SECRET));
    HKEY = await crypto.subtle.importKey(
      "raw", seed, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  }
  return HKEY;
}

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function tag(msg: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await hkey(), new TextEncoder().encode(msg));
  return hex(sig).slice(0, 32); // 128 bits, plenty against a blind forge
}

// Constant time. A leaky compare here is a path-forging oracle.
function sameTag(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// Rate limiting needs a stable per-person key, but these are people filling in
// a form about themselves. Hash the address, never store it.
async function ipHash(req: Request): Promise<string> {
  const raw = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "?";
  const d = await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode("konkret-ip|" + SECRET + "|" + raw));
  return hex(d).slice(0, 32);
}

//   <slug>/<YYYY-MM>/<key>-<ts36>-<nonce>-<sig>.<ext>
// The field key cannot contain a hyphen (validate() enforces [a-z][a-z0-9_]*),
// so hyphen is an unambiguous separator and the regex needs no backtracking.
const PATH_RE =
  /^([a-z0-9][a-z0-9-]{1,48}[a-z0-9])\/(\d{4}-\d{2})\/([a-z][a-z0-9_]{0,40})-([0-9a-z]{6,10})-([0-9a-f]{16})-([0-9a-f]{32})\.([a-z0-9]{2,4})$/;

async function verifyPath(path: string, slug: string, key: string): Promise<boolean> {
  const m = PATH_RE.exec(path);
  if (!m) return false;
  const [, gslug, ym, gkey, ts, nonce, sig, ext] = m;
  if (gslug !== slug || gkey !== key) return false;
  if (!sameTag(sig, await tag(`v1|${gslug}|${gkey}|${ym}|${ts}|${nonce}|${ext}`))) return false;
  const when = parseInt(ts, 36);
  if (!Number.isFinite(when)) return false;
  if (Date.now() - when > PATH_TTL_MS) return false;
  if (when > Date.now() + 3_600_000) return false; // clock-skew forgery guard
  return true;
}

async function firstBytes(res: Response, n: number): Promise<Uint8Array> {
  const out = new Uint8Array(n);
  let got = 0;
  const rd = res.body?.getReader();
  if (!rd) return out.subarray(0, 0);
  try {
    while (got < n) {
      const { value, done } = await rd.read();
      if (done || !value) break;
      const take = Math.min(n - got, value.length);
      out.set(value.subarray(0, take), got);
      got += take;
    }
  } finally { try { await rd.cancel(); } catch { /* already closed */ } }
  return out.subarray(0, got);
}

// The Content-Type on an upload is whatever the browser claimed. This is the
// check that actually decides what the bytes are.
function magicOk(mime: string, b: Uint8Array): boolean {
  const at = (i: number, s: string) => {
    if (i + s.length > b.length) return false;
    for (let k = 0; k < s.length; k++) if (b[i + k] !== s.charCodeAt(k)) return false;
    return true;
  };
  switch (mime) {
    case "image/jpeg": return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "image/png": return b[0] === 0x89 && at(1, "PNG") &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a;
    case "image/webp": return at(0, "RIFF") && at(8, "WEBP");
    case "image/heic": case "image/heif": {
      if (!at(4, "ftyp")) return false;
      const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
      return ["heic","heix","hevc","heim","heis","hevm","hevs","mif1","msf1","avif"].includes(brand);
    }
    case "application/pdf":
      for (let i = 0; i + 5 <= b.length; i++) if (at(i, "%PDF-")) return true;
      return false;
  }
  return false;
}

async function dropObject(path: string) {
  try { await SB().storage.from(BUCKET).remove([path]); }
  catch (e) { console.error("storage remove failed", path, e); }
  try { await SB().from("ekip_upload").update({ eta: "jete" }).eq("path", path); }
  catch (e) { console.error("ledger mark jete failed", path, e); }
}

// ------------------------------------------------------- issue an upload
export type Issued = { status: number; body: Record<string, unknown> };

export async function issueUpload(
  req: Request, fom: Record<string, unknown>, fields: Field[],
): Promise<Issued> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return { status: 400, body: { error: "bad json" } }; }

  const slug = String(fom.slug);
  const key = String(body.key ?? "");
  const field = fields.find((f) => f.key === key);
  if (!field || field.type !== "file") {
    return { status: 400, body: { error: "Chan sa a pa egziste sou fòm sa a." } };
  }

  const allow = allowedFor(String(field.accept ?? "any"));
  const mime = String(body.type ?? "").toLowerCase().split(";")[0].trim();
  if (!allow.has(mime) || !MIME_EXT[mime]) {
    return { status: 415, body: { error: "Kalite fichye sa a pa aksepte." } };
  }

  const asked = Number(field.max_mb ?? DEFAULT_MAX_MB);
  const maxMb = Math.min(HARD_MAX_MB, Math.max(1, Number.isFinite(asked) ? asked : DEFAULT_MAX_MB));
  const maxBytes = Math.round(maxMb * 1024 * 1024);
  const size = Number(body.size ?? 0);
  if (!Number.isFinite(size) || size <= 0 || size > maxBytes) {
    return { status: 413, body: { error: `Fichye a twò gwo. Maksimòm ${maxMb} MB.` } };
  }

  // Two counters: this phone, and everyone.
  const db = SB();
  const ip = await ipHash(req);
  const since = new Date(Date.now() - 3_600_000).toISOString();

  const mine = await db.from("ekip_upload").select("id", { count: "exact", head: true })
    .eq("ip_hash", ip).gte("created_at", since);
  if ((mine.count ?? 0) >= IP_PER_HOUR) {
    return { status: 429, body: { error: "Twòp fichye nan yon ti tan. Tanpri tann yon inè." } };
  }
  const all = await db.from("ekip_upload").select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if ((all.count ?? 0) >= ALL_PER_HOUR) {
    return { status: 429, body: { error: "Sistèm nan chaje kounye a. Tanpri eseye ankò talè." } };
  }

  const ext = MIME_EXT[mime];
  const now = new Date();
  const ym = now.toISOString().slice(0, 7);
  const ts = now.getTime().toString(36);
  const nonce = hex(crypto.getRandomValues(new Uint8Array(8)).buffer);
  const sig = await tag(`v1|${slug}|${key}|${ym}|${ts}|${nonce}|${ext}`);
  const path = `${slug}/${ym}/${key}-${ts}-${nonce}-${sig}.${ext}`;

  const { data: signed, error: sErr } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
  if (sErr || !signed) {
    console.error("createSignedUploadUrl failed", sErr);
    return { status: 500, body: { error: "Gen yon pwoblèm teknik." } };
  }

  const { error: iErr } = await db.from("ekip_upload").insert({
    path, fom_slug: slug, chan_kle: key, mime, gwose_max: maxBytes,
    non_orijinal: String(body.name ?? "").replace(/[\\/\r\n\t",]/g, " ").trim().slice(0, 120) || null,
    ip_hash: ip,
  });
  if (iErr) {
    console.error("ekip_upload insert failed", iErr);
    return { status: 500, body: { error: "Gen yon pwoblèm teknik." } };
  }

  return { status: 200, body: { path, url: signed.signedUrl, mime, max_bytes: maxBytes, expires_in: 7200 } };
}

// ------------------------------------------------------ redeem an upload
export type TakeOk = { ok: true; val: "" | Record<string, unknown>; path?: string };
export type TakeNo = { ok: false; msg: string; status: number };

export async function takeFile(
  raw: unknown, fom: Record<string, unknown>, field: Field,
): Promise<TakeOk | TakeNo> {
  const label = field.label ?? field.key;
  const no = (msg: string, status = 400): TakeNo => ({ ok: false, msg, status });

  if (raw == null || raw === "") return { ok: true, val: "" };

  let obj: Record<string, unknown>;
  if (typeof raw === "string") {
    try { obj = JSON.parse(raw); } catch { return no(`Fichye "${label}" pa bon.`); }
  } else if (typeof raw === "object") { obj = raw as Record<string, unknown>; }
  else { return no(`Fichye "${label}" pa bon.`); }
  if (!obj || typeof obj !== "object") return no(`Fichye "${label}" pa bon.`);

  const path = String(obj.path ?? "");
  if (!path) return { ok: true, val: "" };

  // 1. Is this a path this function minted, for this form and this field?
  if (!(await verifyPath(path, String(fom.slug), String(field.key)))) {
    return no(`Fichye "${label}" pa rekònèt. Tanpri chwazi l ankò.`);
  }

  // 2. Is it in the ledger, and unspent?
  const db = SB();
  const { data: row, error: rErr } = await db.from("ekip_upload")
    .select("id,mime,gwose_max,non_orijinal,repons_id").eq("path", path).maybeSingle();
  if (rErr) { console.error("ledger read failed", rErr); return no("Gen yon pwoblèm teknik.", 500); }
  if (!row) return no(`Fichye "${label}" pa rekònèt. Tanpri chwazi l ankò.`);
  if (row.repons_id) return no(`Fichye "${label}" deja itilize.`, 409);

  // 3. Do the bytes exist, and are they what they claim to be?
  //
  //    TESTED 2026-08-21: reading ${SUPABASE_URL}/storage/v1/object/<bucket>/
  //    <path> from inside a function returns "Bucket not found". A signed read
  //    URL plus a ranged GET returns 206 with Content-Range, giving existence,
  //    the true total size and the magic bytes in one request.
  const { data: rd, error: rdErr } = await db.storage.from(BUCKET).createSignedUrl(path, 60);
  if (rdErr || !rd?.signedUrl) {
    return no(`Fichye "${label}" pa rive. Tanpri chwazi l ankò.`);
  }

  let res: Response;
  try { res = await fetch(rd.signedUrl, { headers: { Range: "bytes=0-63" } }); }
  catch (e) { console.error("storage range fetch failed", path, e); return no("Gen yon pwoblèm teknik.", 500); }

  if (res.status === 404) {
    try { await res.body?.cancel(); } catch { /* ignore */ }
    return no(`Fichye "${label}" pa rive. Tanpri chwazi l ankò.`);
  }
  if (!res.ok && res.status !== 206) {
    try { await res.body?.cancel(); } catch { /* ignore */ }
    console.error("storage range returned", res.status, path);
    return no("Gen yon pwoblèm teknik.", 500);
  }

  const crange = res.headers.get("content-range") ?? "";
  const total = crange.includes("/")
    ? Number(crange.split("/")[1])
    : Number(res.headers.get("content-length") ?? 0);
  const head = await firstBytes(res, 64);

  if (!Number.isFinite(total) || total <= 0 || total > row.gwose_max) {
    await dropObject(path);
    return no(`Fichye "${label}" twò gwo.`, 413);
  }
  if (!magicOk(String(row.mime), head)) {
    // Declared image/jpeg, is not a JPEG. Delete rather than keep an unknown
    // blob addressable by a signed URL an admin will click.
    await dropObject(path);
    return no(`Fichye "${label}" pa yon foto ni yon PDF.`, 415);
  }

  // Everything stored is server-derived. Nothing the browser typed survives
  // except the original filename, sanitised at issue time.
  return { ok: true, path, val: { path, non: row.non_orijinal ?? "", kalite: row.mime, gwose: total } };
}

export async function spendUploads(paths: string[], reponsId: string) {
  if (!paths.length) return;
  const { error } = await SB().from("ekip_upload")
    .update({ eta: "tache", repons_id: reponsId, tache_le: new Date().toISOString() })
    .in("path", paths);
  if (error) console.error("attach failed", paths, error); // not fatal
}
