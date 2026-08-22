// Schema validation for the form builder.
//
// Reject a malformed schema at the door: a form that renders wrong in the
// field costs far more than a save that fails here. Messages are English --
// they surface in the builder, which Wesley, Dan and Jethro read.

// Derived from the 25 Job Power form specs. signature appears in 26 of 28 and
// is load-bearing: "no line pays without the youth's own signature that day."
export const TYPES = new Set([
  "text", "textarea", "number", "date", "time", "tel", "email",
  "currency", "rating", "signature", "select", "radio", "checkbox", "file",
]);
export const CHOICE = new Set(["select", "radio", "checkbox"]);

// Must match HARD_MAX_MB in the `f` function. If these drift the builder will
// happily save a 20 MB field the public API then refuses at 8.
const FILE_HARD_MAX_MB = 8;
const FILE_ACCEPT = new Set(["photo", "pdf", "any"]);

// A form with a dozen upload fields fills a 1 GB free-tier bucket in 250
// submissions. Six is already generous for a receipt log.
const FILE_MAX_FIELDS = 6;

export function validate(schema: unknown): string[] {
  const errs: string[] = [];
  if (!schema || typeof schema !== "object") return ["Schema is not an object."];
  const s = schema as Record<string, unknown>;
  const secs = s.sections;
  if (!Array.isArray(secs) || !secs.length) return ["A form needs at least one section."];

  const seen = new Set<string>();
  let scored = 0;
  let files = 0;

  secs.forEach((secRaw, si) => {
    const sec = secRaw as Record<string, unknown>;
    const fields = sec.fields;
    if (!Array.isArray(fields) || !fields.length) {
      errs.push(`Section ${si + 1} has no fields.`);
      return;
    }
    fields.forEach((fRaw, fi) => {
      const f = fRaw as Record<string, unknown>;
      const where = `Section ${si + 1}, field ${fi + 1}`;
      const key = String(f.key ?? "");
      if (!/^[a-z][a-z0-9_]{0,40}$/.test(key)) {
        errs.push(`${where}: key "${key}" is invalid (lowercase letters, digits, underscore).`);
      } else if (seen.has(key)) {
        errs.push(`${where}: key "${key}" is used twice.`);
      } else seen.add(key);

      const type = String(f.type ?? "");
      if (!TYPES.has(type)) { errs.push(`${where}: unknown field type "${type}".`); return; }

      if (CHOICE.has(type)) {
        const opts = f.options;
        if (!Array.isArray(opts) || !opts.length) {
          errs.push(`${where}: needs at least one option.`);
        } else {
          const vals = new Set<string>();
          opts.forEach((oRaw, oi) => {
            const o = oRaw as Record<string, unknown>;
            const v = String(o.v ?? "");
            if (!v) errs.push(`${where}, option ${oi + 1}: missing value.`);
            else if (vals.has(v)) errs.push(`${where}: option value "${v}" is used twice.`);
            else vals.add(v);
            if (!String(o.t ?? "")) errs.push(`${where}, option ${oi + 1}: missing text.`);
          });
          if (f.answer !== undefined) {
            const ans = Array.isArray(f.answer) ? f.answer.map(String) : [String(f.answer)];
            for (const a of ans) {
              if (!vals.has(a)) errs.push(`${where}: answer "${a}" is not one of the options.`);
            }
            if (type === "checkbox" && !Array.isArray(f.answer)) {
              errs.push(`${where}: a checkbox answer must be a list.`);
            }
            if (type !== "checkbox" && Array.isArray(f.answer)) {
              errs.push(`${where}: a ${type} answer cannot be a list.`);
            }
          }
        }
      } else if (f.answer !== undefined) {
        errs.push(`${where}: only radio, select and checkbox can have an answer key.`);
      }

      if (type === "rating") {
        const lo = f.min == null ? 1 : Number(f.min);
        const hi = f.max == null ? 5 : Number(f.max);
        if (!Number.isFinite(lo) || !Number.isFinite(hi)) errs.push(`${where}: rating range is not numeric.`);
        else if (hi <= lo) errs.push(`${where}: rating high (${hi}) must be above low (${lo}).`);
        else if (hi - lo > 10) errs.push(`${where}: rating range is too wide (max 11 buttons).`);
      }

      if (type === "file") {
        files++;
        const mode = f.accept === undefined ? "any" : String(f.accept);
        if (!FILE_ACCEPT.has(mode)) {
          errs.push(`${where}: file accept must be photo, pdf or any.`);
        }
        if (f.max_mb !== undefined && f.max_mb !== null) {
          const mb = Number(f.max_mb);
          if (!Number.isFinite(mb) || mb < 1 || mb > FILE_HARD_MAX_MB) {
            errs.push(`${where}: size limit must be a number between 1 and ${FILE_HARD_MAX_MB} MB.`);
          }
        }
        if (f.camera !== undefined && typeof f.camera !== "boolean") {
          errs.push(`${where}: camera must be true or false.`);
        }
        // The field key is baked into the storage path and into the HMAC that
        // authorises it, and hyphen is the path separator. The generic key
        // check already enforces [a-z][a-z0-9_]*; restate it so a future
        // loosening of that regex fails loudly instead of quietly making
        // paths ambiguous.
        if (key.indexOf("-") >= 0) {
          errs.push(`${where}: a file field key cannot contain a hyphen.`);
        }
      }

      if (f.answer !== undefined) scored++;
      if (!String(f.label ?? "") && !CHOICE.has(type)) {
        errs.push(`${where}: missing label.`);
      }
    });
  });

  if (files > FILE_MAX_FIELDS) {
    errs.push(`This form has ${files} upload fields; the limit is ${FILE_MAX_FIELDS}.`);
  }

  const pm = s.pass_mark;
  if (pm !== undefined && pm !== null) {
    if (typeof pm !== "number" || pm < 0) errs.push("Pass mark is not a number.");
    else if (!scored) errs.push("There is a pass mark but no field has an answer key.");
    else if (pm > scored) errs.push(`Pass mark (${pm}) is higher than the number of scored fields (${scored}).`);
  }
  return errs;
}
