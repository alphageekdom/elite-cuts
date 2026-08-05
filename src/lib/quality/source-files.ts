/**
 * Reading the source tree, for the checks in this folder.
 *
 * These checks are syntactic: they answer questions about how code is *written*
 * rather than what it does, so there is no runtime in which to observe them —
 * which is exactly why the type checker and the test suite both pass the bugs
 * they catch. Each one needs the same thing: every `.tsx` file, as text.
 *
 * This lives here rather than in either check so that `SourceFile` has a home of
 * its own. `inline-glyphs` used to import it from `handler-wiring`, which tied
 * two unrelated checks together for no reason beyond which was written first.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, normalize } from 'node:path';

export type SourceFile = { path: string; source: string };

/** Absolute path to `src`, resolved from this file rather than the cwd. */
export const SRC_ROOT = normalize(join(import.meta.dirname, '..', '..'));

/**
 * Every `.tsx` file under `dir`, read as text.
 *
 * Callers should assert the result is non-empty. A walk that silently returns
 * nothing makes any check over it report zero findings, which reads as a pass —
 * the failure mode this whole folder exists to prevent.
 */
export function readSourceFiles(
  dir: string = SRC_ROOT,
  out: SourceFile[] = [],
): SourceFile[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) readSourceFiles(full, out);
    else if (entry.endsWith('.tsx'))
      out.push({ path: full, source: readFileSync(full, 'utf8') });
  }
  return out;
}
