import { describe, expect, it } from 'vitest';

import { csvRowsToRecords, parseCsv, unescapeCell } from './parse';
import { toCsv } from './build';

// The whole admin product import rides on this parser and it had no tests of
// its own — `build.ts` was covered, the reader was not. Every case here is
// something a real spreadsheet export produces.

describe('parseCsv — structure', () => {
  it('splits a plain file into header and data rows', () => {
    expect(parseCsv('name,price\nRibeye,24.99\nBrisket,12.50')).toEqual([
      ['name', 'price'],
      ['Ribeye', '24.99'],
      ['Brisket', '12.50'],
    ]);
  });

  it('flushes the last row when the file has no trailing newline', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('drops the empty row a trailing newline produces', () => {
    expect(parseCsv('a,b\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('keeps empty fields rather than collapsing them', () => {
    // A blanked column is meaningful — it is how an admin clears a field.
    expect(parseCsv('a,b,c\n1,,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
    ]);
  });

  it('returns nothing for an empty file', () => {
    expect(parseCsv('')).toEqual([]);
    expect(parseCsv('\n')).toEqual([]);
  });
});

describe('parseCsv — encodings and line endings', () => {
  it('strips a UTF-8 BOM', () => {
    // Excel on Windows writes one; without stripping, the first header name
    // carries an invisible character and every column lookup misses.
    expect(parseCsv('﻿name,price\nRibeye,24.99')[0]).toEqual([
      'name',
      'price',
    ]);
  });

  it('handles CRLF line endings', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('handles bare CR line endings', () => {
    expect(parseCsv('a,b\r1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('parseCsv — quoting', () => {
  it('keeps a comma inside a quoted field', () => {
    expect(parseCsv('name,description\nRibeye,"Rich, marbled, aged"')).toEqual([
      ['name', 'description'],
      ['Ribeye', 'Rich, marbled, aged'],
    ]);
  });

  it('keeps a newline inside a quoted field', () => {
    const [, row] = parseCsv('name,note\nRibeye,"line one\nline two"');
    expect(row).toEqual(['Ribeye', 'line one\nline two']);
  });

  it('unescapes a doubled quote', () => {
    const [, row] = parseCsv('name,note\nRibeye,"He said ""hello"""');
    expect(row).toEqual(['Ribeye', 'He said "hello"']);
  });

  it('treats a quoted empty field as empty, not missing', () => {
    expect(parseCsv('a,b\n"",2')).toEqual([
      ['a', 'b'],
      ['', '2'],
    ]);
  });
});

describe('csvRowsToRecords', () => {
  it('keys each row by its header', () => {
    const { headers, records } = csvRowsToRecords([
      ['name', 'price'],
      ['Ribeye', '24.99'],
    ]);
    expect(headers).toEqual(['name', 'price']);
    expect(records).toEqual([{ name: 'Ribeye', price: '24.99' }]);
  });

  it('fills missing trailing cells with empty strings', () => {
    // A short row shouldn't produce `undefined` for the columns it omits.
    const { records } = csvRowsToRecords([
      ['a', 'b', 'c'],
      ['1'],
    ]);
    expect(records).toEqual([{ a: '1', b: '', c: '' }]);
  });

  it('returns nothing for an empty parse', () => {
    expect(csvRowsToRecords([])).toEqual({ headers: [], records: [] });
  });
});

// `toCsv` defangs formula-injection by prefixing a cell with an apostrophe.
// Nothing stripped it on the way back in, so a description starting "- " came
// back with a literal apostrophe baked in — and showed a plausible diff on the
// way through.
describe('formula-injection defang round-trips', () => {
  it('strips the escape from a defanged cell', () => {
    expect(unescapeCell("'-8 oz portions")).toBe('-8 oz portions');
    expect(unescapeCell("'=SUM(A1)")).toBe('=SUM(A1)');
    expect(unescapeCell("'@handle")).toBe('@handle');
  });

  it('leaves a genuine leading apostrophe alone', () => {
    // Only a defanged character can follow the escape, so an apostrophe
    // before an ordinary letter is the author's own.
    expect(unescapeCell("'Nduja")).toBe("'Nduja");
    expect(unescapeCell("''tis the season")).toBe("''tis the season");
  });

  it('survives an export → import round trip unchanged', () => {
    const rows = [
      { name: 'Bullet cut', description: '- trimmed and tied' },
      { name: 'Plain cut', description: 'Nothing special' },
      { name: 'Quoted, tricky', description: 'He said "hi"' },
    ];
    const csv = toCsv(rows, [
      { header: 'name', value: (r) => r.name },
      { header: 'description', value: (r) => r.description },
    ]);
    const { records } = csvRowsToRecords(parseCsv(csv));
    expect(records).toEqual(rows);
  });
});
