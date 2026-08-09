import 'server-only';

import connectDB from '@/config/database';
import { ALL_MODELS } from '@/models/all';

// ── Making index state answerable ───────────────────────────────────────
// `autoIndex` builds indexes but never reports, and it builds LAZILY: per model,
// per process, only once something imports that model. On a serverless deploy
// every cold start re-derives that independently, so "does this environment have
// all its indexes?" had no answer anywhere. A fresh dev database sat at 21 of 23
// on 2026-08-08 purely because two routes had not been hit.
//
// `scripts/check-indexes.mjs` reports what EXISTS but has nothing to compare
// against — it deliberately cannot import these TypeScript models, to avoid
// carrying a second copy of every declaration. So it cannot tell a gap from a
// complete set. This can, because it holds the real models.
//
// Why `createIndexes()` and not `init()` — checked in the mongoose 9.9.1 source:
//   * `init()` MEMOIZES (`if (this.$init != null) return this.$init`), so a
//     transient failure is cached for the life of the process and re-calling it
//     returns the same rejection rather than retrying.
//   * `createIndexes()` → `ensureIndexes()` wraps `_ensureIndexes` in a promise
//     with a real `reject`, so awaiting it SURFACES what `Model.init().catch(noop)`
//     swallows at every mongoose call site. Not memoized.
//   * It also ignores the `autoIndex` setting: that gate is guarded by
//     `options._automatic`, which only `init()` passes. So this still builds when
//     a `readPreference` on the URI has forced `autoIndex` off — one of the two
//     silent failure modes recorded on the setting in `src/config/database.ts`.

export type ModelIndexReport = {
  model: string;
  collection: string;
  declared: number;
  /**
   * Declared but not really present — `diffIndexes().toCreate`, so an index
   * whose OPTIONS drifted counts, not only one that is absent outright.
   */
  missing: string[];
  /** Present in the database but matching no declaration. */
  extra: string[];
  /**
   * The build threw, OR the read-back failed for a reason other than the
   * collection not existing. Either way this model's `missing` / `extra` are
   * not to be trusted, which is why a non-null value fails the run.
   */
  error: string | null;
};

export type EnsureIndexesResult = {
  models: ModelIndexReport[];
  declaredTotal: number;
  /** Models whose build threw. Non-zero must fail the run — see the cron wrapper. */
  failureCount: number;
  missingTotal: number;
  extraTotal: number;
};

// A LABEL for the report, never the basis of the comparison. It reproduces the
// driver's default naming (`mongodb/lib/operations/indexes.js`: an explicit
// `name`, else the key spec's entries flattened and joined with `_`), which is
// what the database stores — so a reader can paste it into mongosh.
//
// This used to BE the comparison, and that was wrong in the one direction the
// file cannot afford. An index name is derived from the key pattern alone:
// `unique`, `partialFilterExpression`, `sparse`, `collation` and
// `expireAfterSeconds` never appear in it. Eight of the declared indexes are
// unique and four carry a partial filter, so an index that had lost its
// `unique` still matched by name and reported as present — a clean bill of
// health over a missing constraint. `src/models/Order.ts` already documented
// exactly that trap ("the change would look applied and not be") before this
// file was written. `diffIndexes()` compares options and is used instead.
function indexLabel(
  spec: Record<string, unknown>,
  options: Record<string, unknown>,
): string {
  if (typeof options.name === 'string' && options.name) return options.name;
  return Object.entries(spec)
    .map(([field, dir]) => `${field}_${dir}`)
    .join('_');
}

// The one error that is not a failure: the collection does not exist yet.
function isNamespaceNotFound(err: unknown): boolean {
  const e = err as { code?: number; codeName?: string } | null;
  return e?.code === 26 || e?.codeName === 'NamespaceNotFound';
}

// A failed unique build reports the document that collided:
//   E11000 duplicate key error ... dup key: { email: "someone@example.com" }
// `withCronSecret` spreads the whole result into the JSON body, so that would
// ship a real customer's address to anyone holding the cron secret. This project
// already strips Stripe ids and admin notes from far less sensitive payloads.
// The index name is the actionable part and survives; the colliding value is
// not, and is replaced rather than truncated so no partial address leaks.
export function redactBuildError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/dup key:\s*\{[^}]*\}/gi, 'dup key: { redacted }');
}

/**
 * Builds every declared index, then reads back what the database actually has
 * and reports both directions.
 *
 * `extra` is not padding. The 2026-07-30 models audit removed five declarations
 * and all five indexes were still live eight days later, invisible to code
 * review because the source was correct and only the database disagreed. Nothing
 * in this codebase drops an index, so an orphan is permanent until someone looks
 * — and until now, nothing looked.
 */
export async function ensureDeclaredIndexes(): Promise<EnsureIndexesResult> {
  await connectDB();

  const models: ModelIndexReport[] = [];

  for (const [name, model] of Object.entries(ALL_MODELS)) {
    const declared = model.schema.indexes();

    let error: string | null = null;
    try {
      // Skipped for a model that declares nothing, where it is a pure no-op:
      // `_ensureIndexes` returns before touching the collection when the index
      // list is empty (`mongoose/lib/model.js`). An earlier comment here claimed
      // the call would create the collection as a side effect — it does not;
      // that belongs to `Model.init()`'s `_createCollection` step, which
      // `createIndexes()` never reaches.
      if (declared.length > 0) await model.createIndexes();
    } catch (err) {
      error = redactBuildError(err);
    }

    // Read back rather than trusting the build to have done what it said. A
    // build that resolves is not proof the index is there — that assumption is
    // what made the original problem invisible.
    //
    // `diffIndexes()` rather than a name comparison: it is read-only (its only
    // database call is `listIndexes`; the drop lives in `cleanIndexes()`, which
    // only `syncIndexes()` reaches — deliberately retired from this project),
    // and it compares through `isIndexEqual`, which checks `unique`,
    // `partialFilterExpression`, `sparse`, `expireAfterSeconds` and `collation`.
    // It also excludes the automatic `_id_` and timeseries indexes itself.
    let missing: string[] = [];
    let extra: string[] = [];
    try {
      const diff = await model.diffIndexes({ indexOptionsToCreate: true });
      // `toCreate` is declared-but-not-really-present, options included.
      missing = (
        diff.toCreate as [Record<string, unknown>, Record<string, unknown>][]
      )
        .map(([spec, options]) => indexLabel(spec, options ?? {}))
        .sort();
      // `toDrop` is already index names.
      extra = [...(diff.toDrop as string[])].sort();
    } catch (err) {
      // Narrow, not bare. A missing collection is the ordinary state for a model
      // nothing has written to and must read as "nothing there". Anything else —
      // a timeout, or an authorization gap where the user can `createIndex` but
      // not `listIndexes` — used to land here silently and report every declared
      // index as missing under a 200, sending someone hunting for indexes that
      // were present all along.
      if (isNamespaceNotFound(err)) {
        missing = declared.map(([spec, options]) =>
          indexLabel(
            spec as Record<string, unknown>,
            (options ?? {}) as Record<string, unknown>,
          ),
        );
      } else {
        error = error ?? redactBuildError(err);
      }
    }

    models.push({
      model: name,
      collection: model.collection.name,
      declared: declared.length,
      missing,
      extra,
      error,
    });
  }

  return {
    models,
    declaredTotal: models.reduce((n, m) => n + m.declared, 0),
    failureCount: models.filter((m) => m.error !== null).length,
    missingTotal: models.reduce((n, m) => n + m.missing.length, 0),
    extraTotal: models.reduce((n, m) => n + m.extra.length, 0),
  };
}
