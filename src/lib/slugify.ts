// Minimal slugifier — keeps the project free of external deps for a job that's
// the same five-line shape every library reaches for. Output is lowercase,
// alphanumeric + hyphens, with leading/trailing hyphens trimmed. Non-ASCII
// characters are dropped after a permissive NFKD pass, which is fine for the
// shop's catalog scope (English product names with the occasional accent).

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
