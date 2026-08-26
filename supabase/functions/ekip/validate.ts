// Schema validation for the form builder.
//
// Reject a malformed schema at the door: a form that renders wrong in the
// field costs far more than a save that fails here. Messages are English --
// they surface in the builder, which Wesley, Dan and Jethro read.
//
// A group multiplies that argument. One bad group definition is not one bad
// question, it is a table that draws wrong fifty times, on a phone, in Limbé,
// while somebody is accounting for money they have already spent.
//
// MERGE NOTE 2026-08-22: the group rules come from _agent_groups/
// ekip_validate_snippet.ts, which was written against ekip version 6 and
// predates the file-upload work in version 8. It was layered onto this file
// rather than replacing it -- taking it wholesale would have silently deleted
// every file-upload rule, because its TYPES set has no "file" in it.

// Derived from the 25 Job Power form specs. signature appears in 26 of 28 and
// is load-bearing: "no line pays without the youth's own signature that day."
export const TYPES = new Set([
  "text", "textarea", "number", "date", "time", "tel", "email",
  "currency", "rating", "signature", "select", "radio", "checkbox", "file",
  "group",
]);
export const CHOICE = new Set(["select", "radio", "checkbox"]);

// What may appear inside a repeated row. See GROUPS.md for why signature,
// rating, checkbox and group are all excluded -- three of the four are hard
// bugs in the renderer's global-by-name wiring, not taste. file is excluded
// for the same reason plus quota: six uploads is the whole-form ceiling.
export const ROW_TYPES = new Set([
  "text", "textarea", "number", "currency",
  "date", "time", "tel", "email", "select", "radio",
]);

// Numeric cells: the only things a product or a sum may point at.
const NUMERIC = new Set(["number", "currency"]);

const GROUP_MAX_ROWS = 50;    // must match ROW_MAX in the `f` function
const GROUP_MAX_COLS = 12;    // past this a card is a wall and nobody fills it

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

  // GROUP -- pass 0. Index every group and the type of each of its columns, so
  // a sum_of written anywhere in the form can be resolved against it. Without
  // this a total could point at a column that does not exist and would be
  // discovered only by a person in the field getting a zero.
  const groups = new Map<string, Map<string, string>>();
  for (const secRaw of secs) {
    const sec = secRaw as Record<string, unknown>;
    for (const fRaw of (Array.isArray(sec.fields) ? sec.fields : [])) {
      const f = fRaw as Record<string, unknown>;
      if (String(f.type ?? "") !== "group") continue;
      const gk = String(f.key ?? "");
      if (!gk) continue;
      const cols = new Map<string, string>();
      for (const cRaw of (Array.isArray(f.fields) ? f.fields : [])) {
        const c = cRaw as Record<string, unknown>;
        cols.set(String(c.key ?? ""), String(c.type ?? ""));
      }
      groups.set(gk, cols);
    }
  }

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

      // ------------------------------------------------------------- GROUP
      if (type === "group") {
        errs.push(...validateGroup(f, where, groups));
        if (f.answer !== undefined) {
          errs.push(`${where}: a repeatable group cannot have an answer key.`);
        }
        if (!String(f.label ?? "")) errs.push(`${where}: missing label.`);
        return;   // nothing below applies to a group
      }

      // GROUP -- sum_of on an ordinary field, i.e. a computed total.
      if (f.sum_of !== undefined) {
        errs.push(...validateSumOf(f, type, where, groups));
      }
      // GROUP -- product_of only means anything inside a row.
      if (f.product_of !== undefined) {
        errs.push(`${where}: only a column inside a repeatable group can be calculated by multiplying.`);
      }
      // GROUP -- a stray fields array on a non-group is a half-finished edit.
      if (f.fields !== undefined) {
        errs.push(`${where}: only a repeatable group can have columns.`);
      }

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

  // PASS MARK IS A PERCENTAGE as of 2026-08-26, not a count of questions.
  // The `f` function now awards partial credit and reports the score out of
  // 100, so "4" no longer means "4 of the 5 questions" -- it means 4%. There
  // was exactly one form in the database carrying a pass mark when this
  // changed, and it was migrated in the same pass.
  //
  // A pass mark remains OPTIONAL and answer keys no longer depend on it: a
  // form can score a candidate and tell them what they missed without also
  // deciding they failed. Leave it off unless the form is genuinely a door.
  const pm = s.pass_mark;
  if (pm !== undefined && pm !== null) {
    if (typeof pm !== "number" || pm < 0) errs.push("Pass mark is not a number.");
    else if (!scored) errs.push("There is a pass mark but no field has an answer key.");
    else if (pm > 100) errs.push(`Pass mark is a percentage, so ${pm} is above the maximum of 100.`);
  }
  return errs;
}

// ---------------------------------------------------------------------------
// Repeatable groups.
// ---------------------------------------------------------------------------

function validateGroup(
  f: Record<string, unknown>,
  where: string,
  groups: Map<string, Map<string, string>>,
): string[] {
  const errs: string[] = [];
  const gk = String(f.key ?? "");

  // ---- the columns exist at all
  const cols = f.fields;
  if (!Array.isArray(cols) || !cols.length) {
    errs.push(`${where}: a repeatable group needs at least one column.`);
    return errs;
  }
  if (cols.length > GROUP_MAX_COLS) {
    errs.push(`${where}: ${cols.length} columns is too many (max ${GROUP_MAX_COLS}). ` +
      `A row has to fit on a phone.`);
  }

  // ---- min / max row counts
  //
  // NOTE, and it matters when reading a schema: on a group, min and max are
  // ROW COUNTS. On a rating they are the button range; on a number they are
  // the value range. Same two words, three meanings, decided by `type`.
  const hasMin = f.min !== undefined && f.min !== null && f.min !== "";
  const hasMax = f.max !== undefined && f.max !== null && f.max !== "";
  const min = hasMin ? Number(f.min) : 0;
  const max = hasMax ? Number(f.max) : GROUP_MAX_ROWS;

  if (hasMin && (!Number.isInteger(min) || min < 0)) {
    errs.push(`${where}: minimum rows must be a whole number, 0 or more.`);
  }
  if (hasMax && (!Number.isInteger(max) || max < 1)) {
    errs.push(`${where}: maximum rows must be a whole number, 1 or more.`);
  }
  if (Number.isFinite(min) && Number.isFinite(max) && max < min) {
    errs.push(`${where}: maximum rows (${max}) is below minimum rows (${min}).`);
  }
  if (Number.isFinite(max) && max > GROUP_MAX_ROWS) {
    errs.push(`${where}: maximum rows (${max}) is above the ceiling of ${GROUP_MAX_ROWS}.`);
  }
  if (Number.isFinite(min) && min > GROUP_MAX_ROWS) {
    errs.push(`${where}: minimum rows (${min}) is above the ceiling of ${GROUP_MAX_ROWS}.`);
  }

  // ---- `required` on the group itself is a trap: the `f` function's
  // emptiness test is (v === "" || v === null), and an array is neither, so a
  // required empty group would sail through. Say so instead of ignoring it.
  if (f.required) {
    errs.push(`${where}: a repeatable group is not "required" — set minimum rows to 1 instead.`);
  }

  // ---- the columns themselves
  const colKeys = new Set<string>();
  const numericCols = new Set<string>();
  const productCols = new Set<string>();

  cols.forEach((cRaw, ci) => {
    const c = cRaw as Record<string, unknown>;
    const cw = `${where}, column ${ci + 1}`;
    const ck = String(c.key ?? "");
    const ctype = String(c.type ?? "");

    // key shape and DUPLICATE KEYS INSIDE THE GROUP.
    // Column keys live in the group's own namespace, not the form's: a column
    // called `total` and a top-level field called `total` never collide,
    // because one lives inside the array. So they are checked against each
    // other and nothing else.
    if (!/^[a-z][a-z0-9_]{0,40}$/.test(ck)) {
      errs.push(`${cw}: key "${ck}" is invalid (lowercase letters, digits, underscore).`);
    } else if (colKeys.has(ck)) {
      errs.push(`${cw}: key "${ck}" is used twice in this group.`);
    } else colKeys.add(ck);

    // NESTED GROUPS. Called out by name rather than folded into the generic
    // type error, because someone will try it and deserves to know why not.
    if (ctype === "group") {
      errs.push(`${cw}: a repeatable group cannot contain another repeatable group. ` +
        `One level only.`);
      return;
    }
    // A TYPE THAT MAKES NO SENSE INSIDE A ROW.
    if (!ROW_TYPES.has(ctype)) {
      const why = ctype === "signature"
        ? "a signature belongs to the whole form, not to one line"
        : ctype === "rating"
        ? "a rating strip does not fit in a row"
        : ctype === "checkbox"
        ? 'a "choose many" column would put a list inside a list; use "choose one"'
        : ctype === "file"
        ? "an upload belongs to the whole form, not to one line"
        : `"${ctype}" is not a field type`;
      errs.push(`${cw}: cannot be used inside a repeatable group — ${why}.`);
      return;
    }

    if (!String(c.label ?? "")) errs.push(`${cw}: missing label.`);

    if (c.answer !== undefined) {
      errs.push(`${cw}: a column inside a repeatable group cannot be scored.`);
    }
    if (c.sum_of !== undefined) {
      errs.push(`${cw}: a total cannot live inside the rows it adds up. ` +
        `Put it in a field after the group.`);
    }
    if (c.fields !== undefined) {
      errs.push(`${cw}: a column cannot have columns of its own.`);
    }

    if (CHOICE.has(ctype)) {
      const opts = c.options;
      if (!Array.isArray(opts) || !opts.length) {
        errs.push(`${cw}: needs at least one option.`);
      } else {
        const vals = new Set<string>();
        opts.forEach((oRaw, oi) => {
          const o = oRaw as Record<string, unknown>;
          const v = String(o.v ?? "");
          if (!v) errs.push(`${cw}, option ${oi + 1}: missing value.`);
          else if (vals.has(v)) errs.push(`${cw}: option value "${v}" is used twice.`);
          else vals.add(v);
          if (!String(o.t ?? "")) errs.push(`${cw}, option ${oi + 1}: missing text.`);
        });
      }
    }

    if (NUMERIC.has(ctype)) numericCols.add(ck);
    if (c.product_of !== undefined) productCols.add(ck);
  });

  // ---- product_of, second pass so every sibling key is known
  cols.forEach((cRaw, ci) => {
    const c = cRaw as Record<string, unknown>;
    if (c.product_of === undefined) return;
    const cw = `${where}, column ${ci + 1}`;
    const ck = String(c.key ?? "");
    const ctype = String(c.type ?? "");

    if (!NUMERIC.has(ctype)) {
      errs.push(`${cw}: only a number or money column can be calculated.`);
      return;
    }
    const factors = c.product_of;
    if (!Array.isArray(factors) || factors.length < 2) {
      errs.push(`${cw}: a calculated column must multiply at least two other columns.`);
      return;
    }
    const usedFactors = new Set<string>();
    for (const raw of factors) {
      const k = String(raw);
      if (k === ck) { errs.push(`${cw}: a column cannot multiply itself.`); continue; }
      if (usedFactors.has(k)) { errs.push(`${cw}: column "${k}" is listed twice.`); continue; }
      usedFactors.add(k);
      if (!colKeys.has(k)) { errs.push(`${cw}: there is no column "${k}" in this group.`); continue; }
      if (!numericCols.has(k)) { errs.push(`${cw}: column "${k}" is not a number, so it cannot be multiplied.`); continue; }
      // No chains. A product of a product is a dependency order problem for
      // no benefit anyone has asked for.
      if (productCols.has(k)) {
        errs.push(`${cw}: column "${k}" is itself calculated. A calculated column ` +
          `can only multiply columns that are typed in.`);
      }
    }
  });

  // keep the index honest for sum_of resolution even if this group had errors
  if (gk) groups.set(gk, new Map([...colKeys].map((k) => [k, "?"])));

  return errs;
}

function validateSumOf(
  f: Record<string, unknown>,
  type: string,
  where: string,
  groups: Map<string, Map<string, string>>,
): string[] {
  const errs: string[] = [];
  const ref = f.sum_of;

  if (typeof ref !== "string" || !ref) {
    errs.push(`${where}: the total to add up is not set properly.`);
    return errs;
  }
  if (!NUMERIC.has(type)) {
    errs.push(`${where}: only a number or money field can be a computed total.`);
    return errs;
  }
  const dot = ref.indexOf(".");
  if (dot <= 0 || dot === ref.length - 1 || ref.indexOf(".", dot + 1) >= 0) {
    errs.push(`${where}: a total must point at "group.column", not "${ref}".`);
    return errs;
  }
  const gk = ref.slice(0, dot);
  const ck = ref.slice(dot + 1);

  const cols = groups.get(gk);
  if (!cols) {
    errs.push(`${where}: there is no repeatable group called "${gk}" in this form.`);
    return errs;
  }
  if (!cols.has(ck)) {
    errs.push(`${where}: the group "${gk}" has no column called "${ck}".`);
    return errs;
  }
  const ctype = cols.get(ck)!;
  if (ctype !== "?" && !NUMERIC.has(ctype)) {
    errs.push(`${where}: column "${ck}" is not a number, so it cannot be added up.`);
  }
  return errs;
}

// ---------------------------------------------------------------------------
// Lessons. A slide deck, validated at the door for the same reason a form is:
// a lesson that draws wrong is discovered by a trainee, on a phone, alone.
//
// Far looser than validate() above, and deliberately. A form collects money
// and signatures; a lesson collects nothing, so the only real failures are a
// slide type the renderer cannot draw and a slide with nothing on it.
// ---------------------------------------------------------------------------

export const SLIDE_TYPES = new Set([
  "tit", "teks", "pwen", "videyo", "imaj", "sitasyon", "fen",
]);

const DECK_MAX_SLIDES = 60;   // past this it is a manual, not a lesson
const SLIDE_TEXT_MAX = 4000;

export function validateDeck(deck: unknown): string[] {
  const errs: string[] = [];
  if (!deck || typeof deck !== "object") return ["Deck is not an object."];
  const d = deck as Record<string, unknown>;
  const slides = d.slides;
  if (!Array.isArray(slides)) return ['A deck needs a "slides" list.'];
  if (!slides.length) return ["A lesson needs at least one slide."];
  if (slides.length > DECK_MAX_SLIDES) {
    errs.push(`${slides.length} slides is too many (max ${DECK_MAX_SLIDES}). ` +
      `Past that it is a manual, and a manual is a document, not a lesson.`);
  }

  let ends = 0;

  slides.forEach((sRaw, si) => {
    const where = `Slide ${si + 1}`;
    if (!sRaw || typeof sRaw !== "object" || Array.isArray(sRaw)) {
      errs.push(`${where}: not a slide.`);
      return;
    }
    const s = sRaw as Record<string, unknown>;
    const type = String(s.type ?? "teks");
    if (!SLIDE_TYPES.has(type)) {
      errs.push(`${where}: unknown slide type "${type}".`);
      return;
    }

    const txt = (k: string) => String(s[k] ?? "");
    for (const k of ["tit", "sou_tit", "ko", "teks", "kap", "alt", "ki_moun", "bouton", "kalite"]) {
      if (s[k] !== undefined && txt(k).length > SLIDE_TEXT_MAX) {
        errs.push(`${where}: "${k}" is longer than ${SLIDE_TEXT_MAX} characters. Split the slide.`);
      }
    }

    if (type === "tit" && !txt("tit")) errs.push(`${where}: a title slide needs a title.`);

    if (type === "pwen") {
      const pts = s.pwen;
      if (!Array.isArray(pts) || !pts.length) errs.push(`${where}: a points slide needs at least one point.`);
      else if (pts.length > 12) errs.push(`${where}: ${pts.length} points on one slide is a wall. Split it.`);
    }

    if (type === "videyo") {
      // The renderer takes an id or a URL it can pull an id out of, so this
      // only refuses what is neither. A missing video is allowed on purpose:
      // the deck gets built and frozen before anything is filmed.
      const raw = String(s.youtube ?? "").trim();
      if (raw && !/^[A-Za-z0-9_-]{11}$/.test(raw) &&
          !/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)[A-Za-z0-9_-]{11}/.test(raw)) {
        errs.push(`${where}: that is not a YouTube video id or link.`);
      }
      if (s.komanse !== undefined && s.komanse !== null && s.komanse !== "") {
        const n = Number(s.komanse);
        if (!Number.isFinite(n) || n < 0) errs.push(`${where}: start time must be seconds, 0 or more.`);
      }
    }

    if (type === "imaj") {
      const u = String(s.url ?? "").trim();
      // Same-origin or https only. A lesson that pulls an image over http gets
      // blocked as mixed content and shows a hole nobody can explain.
      if (u && !/^(https:\/\/|\/)/.test(u)) {
        errs.push(`${where}: an image must be an https link or a path starting with "/".`);
      }
    }

    if (type === "sitasyon" && !txt("teks")) errs.push(`${where}: a quote slide needs the quote.`);

    if (type === "fen") {
      ends++;
      const fom = String(s.fom ?? "").trim();
      if (fom && !/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(fom)) {
        errs.push(`${where}: "${fom}" is not a form slug.`);
      }
      const lyen = String(s.lyen ?? "").trim();
      if (lyen && !/^(https:\/\/|\/)/.test(lyen)) {
        errs.push(`${where}: a link must be https or start with "/".`);
      }
    }
  });

  // Not an error. A deck with no ending hands the trainee nothing to do next,
  // which is exactly the drift that turned Send 0's gate into a dead end, so
  // it is worth saying out loud in the builder.
  if (!ends) {
    errs.push('This lesson has no ending slide, so nothing tells the trainee what to do next. ' +
      'Add a "fen" slide pointing at the gate form.');
  }

  return errs;
}
