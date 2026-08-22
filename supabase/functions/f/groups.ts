// Repeatable row groups, server side.
//
// The one rule that shapes this file: a money figure the browser computed is a
// CLAIM, not a fact. Every product_of cell and every sum_of total is recomputed
// here from the row data and OVERWRITTEN -- never compared, so a one-centime
// rounding difference can never reject an honest report from someone who has
// already spent the money. The client arithmetic exists so the person watches
// the number move; it is never what gets stored.
import type { Field } from "./upload.ts";

// A hard ceiling no schema can raise. `max` in the schema may lower it.
export const ROW_MAX = 50;

// A cell in a row is a cell, not an essay. Deliberately far below TEXT_MAX:
// a 4,000-character cell in a 50-row table is a denial of service on the CSV
// and on every screen that renders it.
export const CELL_MAX = 500;

// What may appear INSIDE a row. Four deliberate exclusions:
//   group     one level of nesting only
//   signature wireSignatures() binds by document.querySelector('input[name=..]'),
//             which is global -- N rows would be N handlers fighting over one
//             node. Also 400 KB x 50 rows.
//   rating    same global-by-name wiring, and an 11-button strip per row is
//             unusable inside a card
//   checkbox  would make a cell an array, i.e. a list inside a list. Every cell
//             staying scalar is what makes the items CSV and the approvals
//             table well-defined. `select` covers the need.
export const ROW_TYPES = new Set([
  "text", "textarea", "number", "currency",
  "date", "time", "tel", "email", "select", "radio",
]);

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function emptyCell(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

export function normGroup(
  f: Field,
  raw: unknown,
): { rows: Record<string, unknown>[]; err: string | null } {
  const label = String(f.label ?? f.key);
  const children = (Array.isArray(f.fields) ? f.fields : []) as Field[];

  const minRaw = Number(f.min);
  const min = Number.isFinite(minRaw) ? Math.max(0, Math.trunc(minRaw)) : 0;
  const maxRaw = Number(f.max);
  const max = Math.min(
    ROW_MAX,
    Math.max(1, Number.isFinite(maxRaw) ? Math.trunc(maxRaw) : ROW_MAX),
  );

  if (raw === undefined || raw === null || raw === "") {
    return min > 0
      ? { rows: [], err: `"${label}" bezwen omwen ${min} liy.` }
      : { rows: [], err: null };
  }

  // A non-array where an array belongs means the phone is running an older
  // cached renderer that still sends this field as one block of text. Refuse
  // LOUDLY. Coercing to [] would store a money report with its line items
  // silently deleted, which is worse. Consequence: the offline queue drops 4xx,
  // so that submission is lost -- which is why a textarea to group swap happens
  // while the queue is empty.
  if (!Array.isArray(raw)) {
    return {
      rows: [],
      err: `Fòm sa a chanje depi ou te louvri l. Tanpri fèmen paj la, louvri l ankò, epi ranpli "${label}" yon lòt fwa.`,
    };
  }

  if (raw.length > max) {
    return { rows: [], err: `"${label}" pa ka gen plis pase ${max} liy.` };
  }

  const rows: Record<string, unknown>[] = [];

  for (let i = 0; i < raw.length; i++) {
    const src = raw[i];
    if (!src || typeof src !== "object" || Array.isArray(src)) {
      return { rows: [], err: `"${label}" liy ${i + 1} pa nan bon fòm.` };
    }
    const s = src as Record<string, unknown>;
    const row: Record<string, unknown> = {};
    let filled = false;

    // Only declared children survive. Anything else the client sent is dropped,
    // so nobody can grow the jsonb by inventing keys.
    for (const c of children) {
      const t = String(c.type ?? "");
      let v = s[c.key];

      if (t === "number" || t === "currency") {
        v = v === "" || v == null ? null : Number(v);
        if (v !== null && !Number.isFinite(v as number)) v = null;
        if (v !== null) filled = true;
      } else {
        v = v == null ? "" : String(v).trim().slice(0, CELL_MAX);
        if (v !== "") filled = true;
      }
      row[c.key] = v;
    }

    // A row the person added and then left alone. Drop it rather than store an
    // object of empty strings the accountant has to read past.
    if (!filled) continue;

    // Declared per-row arithmetic, recomputed. Whatever the browser sent for a
    // product cell is discarded before it is ever looked at.
    for (const c of children) {
      const factors = Array.isArray(c.product_of) ? (c.product_of as unknown[]).map(String) : null;
      if (!factors || factors.length < 2) continue;
      let p = 1;
      let ok = true;
      for (const k of factors) {
        const n = row[k];
        if (typeof n !== "number") { ok = false; break; }
        p *= n;
      }
      row[c.key] = ok ? round2(p) : null;
    }

    const missing = children
      .filter((c) => c.required && emptyCell(row[c.key]))
      .map((c) => String(c.label ?? c.key));
    if (missing.length) {
      return { rows: [], err: `"${label}" liy ${i + 1}: ${missing.join(", ")} obligatwa.` };
    }

    rows.push(row);
  }

  if (rows.length < min) {
    return { rows: [], err: `"${label}" bezwen omwen ${min} liy.` };
  }
  return { rows, err: null };
}

// A declared total is authoritative, not advisory. Accumulates in integer
// centimes so 1200.10 + 1200.20 is 2400.30, not 2400.2999999999997.
export function applySums(fields: Field[], repons: Record<string, unknown>) {
  for (const f of fields) {
    if (typeof f.sum_of !== "string") continue;

    const ref = f.sum_of as string;
    const dot = ref.indexOf(".");
    if (dot <= 0 || dot === ref.length - 1) { repons[f.key] = 0; continue; }
    const gk = ref.slice(0, dot);
    const ck = ref.slice(dot + 1);

    const rows = repons[gk];
    if (!Array.isArray(rows)) { repons[f.key] = 0; continue; }

    let cents = 0;
    for (const r of rows as Record<string, unknown>[]) {
      const n = Number((r ?? {})[ck]);
      if (Number.isFinite(n)) cents += Math.round(n * 100);
    }
    repons[f.key] = cents / 100;
  }
}
