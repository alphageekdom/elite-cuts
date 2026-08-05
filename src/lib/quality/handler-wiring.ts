/**
 * Finds event handlers wired to a function that does not take an event.
 *
 * The bug this catches shipped once, in the cart's error notice. A retry button
 * was written `onClick={retryLoadCart}`, and `retryLoadCart` later gained an
 * optional `resetFirst` parameter. The browser passes the click event as the
 * first argument, the event is truthy, and so every press quietly ran the
 * destructive path. `CartContext.tsx` still carries a comment explaining that
 * `retryLoadCart` must stay zero-arg *because* of this — that comment was the
 * only thing guarding it.
 *
 * TypeScript cannot see it: a function with an optional first parameter
 * satisfies a `() => void` prop type, so the assignment is legal. No runtime
 * test in this repo reaches it either, because the failure is in how the
 * handler is *wired*, not in what it does.
 *
 * The rule turns on one distinction, and it is categorical rather than a
 * judgement call:
 *
 * - A **native** element (`<button>`, `<input>` — lowercase) is wired by the
 *   browser, which always supplies the event as the first argument. A handler
 *   there must take an event or nothing.
 * - A **component** (`<SortPopover>` — capitalised) supplies whatever its own
 *   prop type declares. `onChange={(value: SortValue) => …}` is correct there,
 *   and flagging it would be noise.
 *
 * Verified against the historical case: with `retryLoadCart`'s pre-fix
 * signature restored, this reports exactly that site and nothing else; with the
 * fix in place it reports nothing at all.
 *
 * KNOWN LIMITS — this is a syntactic scan, not a type checker.
 *
 * - Identifiers it cannot resolve are skipped, not flagged. It resolves a local
 *   function, then the file's own props type, then a type in a file this one
 *   imports. Handlers reached any other way (deep re-exports, generics that
 *   rename the prop) fall through silently. As of writing, 20 of 199 wirings
 *   are unresolved this way, so a clean run is evidence, not proof.
 * - It only sees `on…={bareIdentifier}`. An inline arrow is already safe from
 *   this failure, because the author has written the parameter list.
 * - Deciding which element an attribute belongs to is approximate — see
 *   `enclosingTag`. It errs toward checking too much, not too little.
 *
 * Runs in CI: `test:tz` executes the whole suite, this guard included, on every
 * push.
 */

export type HandlerWiringFinding = {
  file: string;
  line: number;
  handler: string;
  /** The offending parameter list, verbatim. */
  args: string;
  /** Where the signature was resolved from — for triaging a report. */
  origin: string;
};

import type { SourceFile } from './source-files';
// Re-exported: several call sites already import the type from here.
export type { SourceFile };

const HANDLER = /\bon[A-Z][A-Za-z]*=\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

/**
 * A first parameter that is an event. Matches by name (`e`, `event`) or by an
 * event type, since both conventions appear in this codebase.
 */
const EVENT_ARG =
  /^(e|ev|evt|event)\b|Event<|React\.\w*Event|MouseEvent|ChangeEvent|FormEvent|KeyboardEvent|FocusEvent|PointerEvent/;

const JSX_TAG = /<([A-Za-z][A-Za-z0-9_.]*)/g;

/** The parameter list of a function declared in this source, if it is. */
const localSignature = (source: string, name: string): string | null => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    `const\\s+${escaped}\\s*=\\s*useCallback\\(\\s*(?:async\\s*)?\\(([^)]*)\\)`,
    `const\\s+${escaped}\\s*=\\s*(?:async\\s*)?\\(([^)]*)\\)\\s*(?::[^=]*)?=>`,
    `function\\s+${escaped}\\s*\\(([^)]*)\\)`,
  ];
  for (const pattern of patterns) {
    const match = new RegExp(pattern).exec(source);
    if (match) return match[1].trim();
  }
  return null;
};

/**
 * The parameter list of a `name: (args) => …` field declared in this source.
 *
 * Anchored to the start of a line OR to `{` / `;` / `,` — the places a type
 * field legitimately begins. Line-start alone was the first attempt and missed
 * a single-line declaration such as `type Ctx = { retry: () => void }`, which
 * is exactly the shape the fixture test caught.
 */
const typeSignature = (source: string, name: string): string | null => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(
    `(?:^|[{;,])\\s*${escaped}\\??\\s*:\\s*\\(([^)]*)\\)\\s*=>`,
    'm',
  ).exec(source);
  return match ? match[1].trim() : null;
};

/**
 * The JSX element an attribute sits on, approximately: the last opening tag
 * before it.
 *
 * Approximately, because JSX in an *earlier* prop wins — `<SlideDrawer
 * header={<em>…</em>} onClose={fn}>` reports `em`. Measured across this repo:
 * 11 of 199 wirings resolve to something other than their true tag, and in
 * **zero** of them does this skip a handler that a stricter rule would check.
 * The error runs the other way — it can treat a component's handler as native,
 * which costs a false positive rather than a miss. Given the alternative is
 * parsing JSX properly, that is the right direction to be wrong in.
 */
const enclosingTag = (source: string, index: number): string | null => {
  const before = source.slice(0, index);
  let tag: string | null = null;
  JSX_TAG.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = JSX_TAG.exec(before)) !== null) tag = match[1];
  return tag;
};

/**
 * @param files every `.tsx` file to scan
 * @param resolveImports given a file path, the sources it imports — used to
 *   find a prop type declared elsewhere. Scoped per file rather than searched
 *   globally by name, or same-named props in unrelated files collide.
 */
export function scanHandlerWiring(
  files: SourceFile[],
  resolveImports: (path: string) => SourceFile[] = () => [],
): HandlerWiringFinding[] {
  const findings: HandlerWiringFinding[] = [];

  for (const { path, source } of files) {
    HANDLER.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = HANDLER.exec(source)) !== null) {
      const handler = match[1];

      const tag = enclosingTag(source, match.index);
      // A component supplies its own typed value; only the browser forces an
      // event on the handler.
      if (!tag || !/^[a-z]/.test(tag)) continue;

      let args = localSignature(source, handler);
      let origin = 'local function';
      if (args === null) {
        args = typeSignature(source, handler);
        origin = 'own props type';
      }
      if (args === null) {
        for (const dep of resolveImports(path)) {
          const found = typeSignature(dep.source, handler);
          if (found !== null) {
            args = found;
            origin = `imported from ${dep.path}`;
            break;
          }
        }
      }

      // Unresolved: skipped rather than flagged. See KNOWN LIMITS above.
      if (args === null || args === '') continue;
      if (EVENT_ARG.test(args)) continue;

      findings.push({
        file: path,
        line: source.slice(0, match.index).split('\n').length,
        handler,
        args,
        origin,
      });
    }
  }

  return findings;
}
