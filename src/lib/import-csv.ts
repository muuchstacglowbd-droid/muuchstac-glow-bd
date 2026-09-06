/**
 * CSV parsing + row mapping used by the Data import page.
 * Handles quoted fields, CRLF and a UTF-8 BOM.
 */

export type ImportKind = "expenses" | "customers";

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export function parseCsv(text: string): ParsedCsv {
  const src = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const pushField = () => {
    row.push(field.trim());
    field = "";
  };
  const pushRow = () => {
    pushField();
    if (row.some((c) => c !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === "," || ch === ";" || ch === "\t") pushField();
    else if (ch === "\n") pushRow();
    else if (ch !== "\r") field += ch;
  }
  pushRow();

  const headers = (rows.shift() ?? []).map((h) => h.trim());
  return { headers, rows };
}

/** Fields we can fill for each import kind. */
export const IMPORT_FIELDS: Record<
  ImportKind,
  { key: string; label: string; required?: boolean; aliases: string[] }[]
> = {
  expenses: [
    { key: "spent_on", label: "Date", required: true, aliases: ["date", "spent on", "day", "তারিখ"] },
    { key: "amount", label: "Amount", required: true, aliases: ["amount", "cost", "taka", "tk", "টাকা", "খরচ"] },
    { key: "category", label: "Category", aliases: ["category", "type", "head", "ধরন"] },
    { key: "note", label: "Note", aliases: ["note", "details", "description", "remark", "বিবরণ"] },
  ],
  customers: [
    { key: "name", label: "Name", required: true, aliases: ["name", "customer", "customer name", "নাম"] },
    { key: "phone", label: "Phone", aliases: ["phone", "mobile", "number", "contact", "ফোন", "মোবাইল"] },
    { key: "email", label: "Email", aliases: ["email", "mail", "ইমেইল"] },
    { key: "address", label: "Address", aliases: ["address", "location", "area", "ঠিকানা"] },
    { key: "notes", label: "Notes", aliases: ["notes", "note", "remark", "মন্তব্য"] },
  ],
};

const EXPENSE_CATEGORIES = [
  "packaging",
  "delivery",
  "ads",
  "salary",
  "rent",
  "purchase",
  "other",
];

/** Guess which CSV column feeds each field. Returns field key -> column index. */
export function guessMapping(kind: ImportKind, headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  const norm = headers.map((h) => h.toLowerCase().replace(/[_-]+/g, " ").trim());
  for (const field of IMPORT_FIELDS[kind]) {
    const idx = norm.findIndex(
      (h) => h === field.key || h === field.label.toLowerCase() || field.aliases.includes(h),
    );
    if (idx >= 0) map[field.key] = idx;
  }
  return map;
}

function toIsoDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y!.length === 2 ? `20${y}` : y!;
    return `${year}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function toAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/,/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export interface PreparedRow {
  index: number;
  values: Record<string, unknown>;
  error: string | null;
}

export function prepareRows(
  kind: ImportKind,
  rows: string[][],
  mapping: Record<string, number>,
): PreparedRow[] {
  return rows.map((cells, index) => {
    const get = (key: string) => {
      const col = mapping[key];
      return col === undefined ? "" : (cells[col] ?? "").trim();
    };

    if (kind === "expenses") {
      const date = toIsoDate(get("spent_on"));
      const amount = toAmount(get("amount"));
      const rawCat = get("category").toLowerCase().trim();
      const category = EXPENSE_CATEGORIES.includes(rawCat) ? rawCat : rawCat ? "other" : "other";
      if (!date) return { index, values: {}, error: "Date could not be read" };
      if (amount === null) return { index, values: {}, error: "Amount could not be read" };
      return {
        index,
        error: null,
        values: {
          spent_on: date,
          amount,
          category,
          note: get("note") || (rawCat && category === "other" ? rawCat : null),
        },
      };
    }

    const name = get("name");
    if (!name) return { index, values: {}, error: "Name is empty" };
    const email = get("email");
    return {
      index,
      error: null,
      values: {
        name,
        phone: get("phone") || null,
        email: email || null,
        address: get("address") || null,
        notes: get("notes") || null,
      },
    };
  });
}

export const SAMPLE_CSV: Record<ImportKind, string> = {
  expenses: "date,amount,category,note\n2026-09-01,1200,packaging,Poly bags\n2026-09-02,3500,ads,Facebook boost",
  customers: "name,phone,email,address\nMim Akter,01711000000,mim@example.com,Mirpur 10\nRafi Hasan,01822000000,,Uttara",
};
