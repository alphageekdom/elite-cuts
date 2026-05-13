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
export function csvRowsToRecords(rows: string[][]): { headers: string[]; records: Record<string, string>[] } {
  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map((h) => h.trim());
  const records = rows.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = (cells[i] ?? '').trim();
    });
    return record;
  });
  return { headers, records };
}
