import { readFileSync } from 'node:fs';
import { join, dirname, normalize } from 'node:path';

import { describe, expect, it } from 'vitest';

import { SRC_ROOT, readSourceFiles } from './source-files';

import { scanHandlerWiring, type SourceFile } from './handler-wiring';

// ── What this covers ────────────────────────────────────────────────────
// Two things, deliberately separated.
//
// The fixture cases below pin the RULE — that a native element's handler must
// take an event or nothing, and that a component's handler may take whatever
// its prop type says. They are the ones a refactor of the scanner has to keep
// passing.
//
// The repo scan at the bottom is the actual guard. It reads the source tree,
// which no other test here does; that is appropriate because the property is
// syntactic. The failure is in how a handler is *wired*, so there is no runtime
// in which to observe it — which is exactly why the type checker misses it.

const fixture = (source: string): SourceFile[] => [
  { path: 'Test.tsx', source },
];

describe('scanHandlerWiring — the rule', () => {
  it('flags a native element wired to a function taking a non-event argument', () => {
    // The historical cart bug, reduced. The browser passes the click event as
    // `resetFirst`, the event is truthy, and the destructive path runs.
    const found = scanHandlerWiring(
      fixture(`
        const retryLoadCart = (resetFirst?: boolean) => reload(resetFirst);
        export const X = () => <button onClick={retryLoadCart}>Retry</button>;
      `),
    );

    expect(found).toHaveLength(1);
    expect(found[0].handler).toBe('retryLoadCart');
    expect(found[0].args).toBe('resetFirst?: boolean');
  });

  it('does not flag the same handler on a React component', () => {
    // `SortPopover`'s `onChange` is typed `(value: T) => void`, so a
    // value-taking function is correct. Five real sites look like this; a rule
    // that flagged them would be noise, and noise gets switched off.
    const found = scanHandlerWiring(
      fixture(`
        const pushSort = (sort: SortValue) => router.push(sort);
        export const X = () => <SortPopover onChange={pushSort} />;
      `),
    );

    expect(found).toEqual([]);
  });

  it('does not flag a handler that takes the event', () => {
    const byName = scanHandlerWiring(
      fixture(`
        const onSubmit = (e: React.FormEvent) => e.preventDefault();
        export const X = () => <form onSubmit={onSubmit} />;
      `),
    );
    const byType = scanHandlerWiring(
      fixture(`
        const handle = (submitEvent: React.FormEvent) => submitEvent.preventDefault();
        export const X = () => <form onSubmit={handle} />;
      `),
    );

    expect(byName).toEqual([]);
    expect(byType).toEqual([]);
  });

  it('does not flag a zero-argument handler', () => {
    const found = scanHandlerWiring(
      fixture(`
        const close = () => setOpen(false);
        export const X = () => <button onClick={close} />;
      `),
    );

    expect(found).toEqual([]);
  });

  it('resolves a signature from the props type of the file itself', () => {
    const found = scanHandlerWiring(
      fixture(`
        type Props = { onPick: (id: string) => void };
        export const X = ({ onPick }: Props) => <button onClick={onPick} />;
      `),
    );

    expect(found).toHaveLength(1);
    expect(found[0].origin).toBe('own props type');
  });

  it('resolves a signature from a file this one imports, and only that file', () => {
    const consumer: SourceFile[] = [
      {
        path: 'Consumer.tsx',
        source: `export const X = () => <button onClick={retryLoadCart} />;`,
      },
    ];
    const context: SourceFile = {
      path: 'CartContext.tsx',
      source: `type Ctx = { retryLoadCart: (resetFirst?: boolean) => void };`,
    };
    const unrelated: SourceFile = {
      path: 'Other.tsx',
      source: `type Other = { retryLoadCart: () => void };`,
    };

    // Scoped to the importer's own dependencies. Searching every file by name
    // instead produced collisions between same-named props — `onSave` and
    // `onToggle` are each declared in several unrelated components.
    expect(scanHandlerWiring(consumer, () => [context])).toHaveLength(1);
    expect(scanHandlerWiring(consumer, () => [unrelated])).toEqual([]);
  });

  it('skips an identifier it cannot resolve rather than guessing', () => {
    const found = scanHandlerWiring(
      fixture(`export const X = () => <button onClick={mystery} />;`),
    );

    // Silence here is the documented limitation, not a pass. A clean repo scan
    // is evidence, not proof.
    expect(found).toEqual([]);
  });
});

// ── The guard ───────────────────────────────────────────────────────────


describe('no handler in this repo is wired to a function that will be handed an event', () => {
  it('finds nothing', () => {
    const files = readSourceFiles();
    const byPath = new Map(files.map((f) => [f.path, f]));

    const resolveImports = (path: string): SourceFile[] => {
      const source = byPath.get(path)?.source ?? '';
      const deps: SourceFile[] = [];
      for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
        const spec = match[1];
        const base = spec.startsWith('@/')
          ? join(SRC_ROOT, spec.slice(2))
          : spec.startsWith('.')
            ? normalize(join(dirname(path), spec))
            : null;
        if (!base) continue;
        for (const ext of ['.tsx', '.ts']) {
          const hit = byPath.get(base + ext);
          if (hit) {
            deps.push(hit);
            break;
          }
          // `.ts` siblings aren't in `files` (it only walks .tsx), so read them
          // directly — `CartContext` and most prop types live in `.ts`/`.tsx`
          // both, and the historical case resolved through a `.tsx` context.
          try {
            deps.push({
              path: base + ext,
              source: readFileSync(base + ext, 'utf8'),
            });
            break;
          } catch {
            // not a file — try the next extension
          }
        }
      }
      return deps;
    };

    // Sanity: the scan must actually be looking at something. Without this a
    // broken walk would report zero findings and read as a pass.
    expect(files.length).toBeGreaterThan(200);

    const findings = scanHandlerWiring(files, resolveImports);
    expect(
      findings.map((f) => `${f.file}:${f.line} ${f.handler}(${f.args})`),
    ).toEqual([]);
  });
});
