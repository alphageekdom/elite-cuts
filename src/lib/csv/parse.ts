// Minimal CSV reader for admin imports. Handles:
//   • optional UTF-8 BOM at the start of the file
//   • CRLF, LF, and CR line endings
//   • quoted fields containing commas or newlines
//   • escaped double-quotes inside quoted fields (`""` → `"`)
//
// Returns the rows as string arrays (first row is the header). The caller is
// responsible for mapping headers → values and validating types. Empty trailing
// lines are dropped. Excel `.xlsx` files aren't supported — admins should
// export as CSV first.

export function parseCsv(input: string): string[][] {
  // Strip BOM if present.
  let text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  // Normalise CR-only and CRLF to LF so the inner loop has one line ending to
  // worry about.
  text = text.replace(/\r\n?/g, '\n');

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        // Escaped quote inside a quoted field.
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }

  // Flush the last field / row if the file doesn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop empty trailing rows (a final newline produces one).
  while (rows.length > 0 && rows[rows.length - 1].every((cell) => cell.length === 0)) {
    rows.pop();
  }

  return rows;
}

// Maps a parsed CSV (first row = header) into typed row records keyed by
// header name. Unknown headers are preserved in the record so callers can
// reject CSVs with extra columns if they want strict shape checking.
// Undo the export's formula-injection defang.
//
// `toCsv` prefixes any cell starting with a formula character (`= + - @`, tab
// or CR) with a single quote — the conventional spreadsheet escape. Nothing
// stripped it on the way back in, so exporting and re-importing a description
// that begins with a bullet-style "- " baked a literal apostrophe into the
// database, and the row showed a plausible-looking diff on the way through.
// Only strips when a defanged character follows, so an ordinary leading
// apostrophe — `'Nduja` — survives. It is not a full inverse, and cannot be:
// an author's own `'-8 oz` is indistinguishable from a defanged `-8 oz`, and
// this strips it. That direction is chosen deliberately, since a description
// opening with an apostrophe-then-dash is far rarer than one opening with a
// bullet, and the alternative bakes a stray quote into the database.
//
// The mirror gap: `escapeCell` tests the formula character against the
// space-stripped string but prefixes the quote to the unstripped one, so
// ` -8 oz` exports as `' -8 oz` and the lookahead here sees the space rather
// than the dash. Unreachable through the app — every string column is trimmed
// by the product schema before it can be stored — so it is left alone rather
// than widened to swallow more genuine apostrophes.
const DEFANGED_CELL = /^'(?=[=+\-@\t\r])/;

export function unescapeCell(value: string): string {
  return value.replace(DEFANGED_CELL, '');
}

export function csvRowsToRecords(rows: string[][]): { headers: string[]; records: Record<string, string>[] } {
  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map((h) => unescapeCell(h.trim()));
  const records = rows.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = unescapeCell((cells[i] ?? '').trim());
    });
    return record;
  });
  return { headers, records };
}
