#!/usr/bin/env node
/**
 * Manual trigger for the nightly demo reset, and its dry run.
 *
 *   npm run demo:reset:dry                      # plan only, writes nothing
 *   npm run demo:reset                          # really do it, localhost
 *
 *   CRON_SECRET='<prod secret>' node tools/demo-reset.mjs \
 *     --dry-run --url https://elite-cuts-three.vercel.app
 *
 * A real reset against anything other than localhost additionally needs
 * `--yes`. See `requiresConfirmation` below for why.
 *
 * ── Why this lives in `tools/` and not `scripts/` ──────────────────────
 * `scripts/` is gitignored in its entirety, so a `demo:reset` entry in the
 * tracked `package.json` pointing there would be a dangling reference for every
 * clone — the exact defect class this project has corrected twice already.
 *
 * ── Why it goes over HTTP rather than importing the service ────────────
 * The reset is TypeScript, imports `server-only`, and resolves `@/` through
 * Next's bundler. Running it directly would mean either a second toolchain or a
 * duplicate of the orchestration — and a duplicate is how the cron and the
 * admin button would come to disagree about what a reset does. Hitting the
 * endpoint runs the genuine article: same service, same target-database guard,
 * same advisory lock, same run-history row.
 *
 * The consequence, stated rather than discovered: this needs something serving
 * the app. It is not a way to reset a database you cannot already reach.
 */

import { pathToFileURL } from 'node:url';

/**
 * Hosts treated as "your own machine" for the confirmation rule below.
 *
 * `[::1]` is bracketed because that is what `URL` reports — checked, not
 * assumed: `new URL('http://[::1]:3000').hostname` is `"[::1]"`, and the
 * unbracketed form is not a parseable URL at all. A bare `'::1'` entry can
 * therefore never match, so it is not here.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0']);

/**
 * Pulls `--url`'s value, refusing the two ways it silently goes wrong.
 *
 * `--url` as the final argument used to yield `undefined` and fall through to
 * localhost, and `--url --yes` used to hand `'--yes'` to `new URL()` and throw
 * an unhandled TypeError deeper in. A tool whose entire premise is that silent
 * target changes are the bug cannot have a silent target change in its own
 * argument parsing.
 *
 * Returns `{ value }` or `{ error }`.
 */
export function readUrlFlag(args) {
  const at = args.indexOf('--url');
  if (at === -1) return { value: null };

  const next = args[at + 1];
  if (next === undefined) {
    return { error: '--url was given with no value.' };
  }
  if (next.startsWith('--')) {
    return { error: `--url was followed by "${next}", which looks like a flag.` };
  }
  return { value: next };
}

/**
 * Which endpoint an invocation should hit.
 *
 * The dry run has its **own path**, not a query parameter on the real one, and
 * that is load-bearing rather than tidy: an older deployment silently drops an
 * unknown flag and runs the real thing, whereas it cannot route a request to a
 * handler it does not have. What that non-arrival looks like on the wire is a
 * separate question, and not the 404 this line used to assert — see
 * `describeOutcome`. The full account lives on
 * `src/app/api/cron/reset-demo/dry-run/route.ts`.
 */
export function resolveEndpoint(baseUrl, { dryRun }) {
  const url = new URL(
    dryRun ? '/api/cron/reset-demo/dry-run' : '/api/cron/reset-demo',
    baseUrl,
  );
  // Always `cli` — this file is the only thing that sets it, and the routes
  // treat anything else as `cron`. It was a parameter with a default that the
  // sole caller never overrode.
  url.searchParams.set('trigger', 'cli');
  return url;
}

/**
 * Whether this invocation needs an explicit `--yes`.
 *
 * Only a REAL reset against a non-local host. A dry run writes nothing, and a
 * real reset against your own machine is the ordinary development case that
 * should not need ceremony.
 *
 * This exists because pasting a command is how the 2026-08-09 production reset
 * happened. `scripts/seed.mjs` reached the same conclusion years-of-commits ago
 * and calls its flag `--force`: some things should have to feel deliberate.
 *
 * A parse failure counts as remote. An unparseable `--url` is not a reason to
 * assume the safest-sounding answer.
 */
export function requiresConfirmation(baseUrl, { dryRun }) {
  if (dryRun) return false;
  try {
    return !LOCAL_HOSTS.has(new URL(baseUrl).hostname);
  } catch {
    return true;
  }
}

/**
 * Reads the outcome of a response the CLI has already received.
 *
 * The route-is-absent branch is the one that matters. It is not an error in the
 * usual sense — it is the fail-closed path working, and it must not read as a
 * crash, because the reassuring half ("nothing ran") is the part the operator
 * needs.
 *
 * ── "Absent" does not mean 404, and assuming it did was a real defect ───
 * This keyed on `status === 404` until 2026-08-09, on the reasoning that a
 * missing route 404s. Measured against the actual deployment, it does not: a
 * POST to a path the App Router cannot match renders the not-found PAGE, and
 * Vercel serves that as **HTTP 200, `content-type: text/html`** (confirmed by
 * `x-matched-path: /_not-found` on the response).
 *
 * So in the precise scenario this tool exists for — a dry run against a
 * deployment that predates the endpoint — it fell through to the body check and
 * told the operator "a real reset may have run. Check the run history." The
 * belt-and-braces check kept it from reporting success, which is why this was a
 * wrong diagnosis rather than an unsafe one. But it is the most alarming message
 * in the file, printed in the most harmless situation, and it sends someone
 * hunting a reset that never happened.
 *
 * The reliable signal is **whether the body parsed as JSON**. Both reset
 * handlers answer JSON on every path they have — success, refusal, 401, 500 —
 * so a response that is not JSON did not come from either of them. That is a
 * property of the handlers rather than of the platform, which is what makes it
 * worth keying on: it does not change when Vercel changes how it renders a
 * missing route.
 */
export function describeOutcome({ status, body, isJson, dryRun }) {
  // Two ways the endpoint can be absent, and both must read as "nothing ran":
  // a genuine 404 (another host, a proxy, a future Next that restores the
  // status), and the observed 2xx-with-an-HTML-page.
  if (dryRun && (status === 404 || (!isJson && status >= 200 && status < 300))) {
    return {
      ok: false,
      message:
        'This deployment does not have the dry-run endpoint — it predates it.\n' +
        'NOTHING WAS RUN. Deploy the current code, then try again.',
    };
  }

  if (!(status >= 200 && status < 300)) {
    return { ok: false, message: `Request failed with HTTP ${status}.` };
  }

  // A 2xx that is not JSON never came from a reset handler. On a real run this
  // is the one that matters: without it, a 200 carrying a not-found page has an
  // undefined body, passes every check below, and reports a clean reset that
  // never happened.
  if (!isJson) {
    return {
      ok: false,
      message:
        `Server answered HTTP ${status} but not JSON, so the request never reached\n` +
        'the reset endpoint. Nothing was run. Check the URL and the deployment.',
    };
  }

  // A JSON 2xx from the dry-run path whose body does not say so means the
  // response came from somewhere other than the route intended — a redirect, a
  // proxy, a rewrite. Independent of the checks above, and cheap, so all are
  // kept.
  if (dryRun && body?.dryRun !== true) {
    return {
      ok: false,
      message:
        'Server answered 200 but did not confirm `dryRun: true`.\n' +
        'Treat this as UNSAFE — a real reset may have run. Check the run history.',
    };
  }

  return { ok: true, message: null };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const confirmed = args.includes('--yes');

  const urlFlag = readUrlFlag(args);
  if (urlFlag.error) {
    console.error(`${urlFlag.error}\nUsage: --url https://your-deployment.example`);
    process.exit(1);
  }
  const baseUrl =
    urlFlag.value ?? process.env.DEMO_RESET_URL ?? 'http://localhost:3000';

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error(
      'CRON_SECRET is not set. Run via `node --env-file=.env tools/demo-reset.mjs`,\n' +
        'or export it — the endpoint compares it in constant time and answers 401 without it.\n' +
        'Note a remote target needs THAT deployment’s secret, not your local one.',
    );
    process.exit(1);
  }

  if (requiresConfirmation(baseUrl, { dryRun }) && !confirmed) {
    console.error(
      `Refusing to run a REAL reset against ${baseUrl}.\n\n` +
        'This wipes and reseeds the demo accounts, restores the catalog, and clears\n' +
        'every grill event and every shift outside the seeded week.\n\n' +
        'Add --yes if you mean it, or --dry-run to see what it would change.',
    );
    process.exit(1);
  }

  const endpoint = resolveEndpoint(baseUrl, { dryRun });
  console.log(`${dryRun ? 'Dry run' : 'RESET'} → ${endpoint.origin}${endpoint.pathname}`);

  // A dry run needs no confirmation — it destroys nothing, and making the safe
  // option as awkward as the dangerous one trains the reflex to add `--yes`
  // without reading. But the bearer token still leaves the machine, so a typo'd
  // host receives a valid `CRON_SECRET`. Warn rather than gate.
  if (dryRun && requiresConfirmation(baseUrl, { dryRun: false })) {
    console.warn(
      `  note: sending CRON_SECRET to ${endpoint.origin} — check that host is yours.`,
    );
  }

  let res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${secret}` },
    });
  } catch (error) {
    // Almost always "nothing is listening". Say so, rather than printing a bare
    // ECONNREFUSED that reads like the reset itself failed.
    console.error(`Could not reach ${endpoint.origin} — is the app running?`);
    console.error(error.message);
    process.exit(1);
  }

  // Read as text and parse here, rather than `res.json().catch(() => null)`.
  // That collapsed "the server sent JSON null" and "the server sent an HTML
  // page" into the same value, and telling those apart is the whole of the
  // not-found detection below.
  const raw = await res.text();
  let body = null;
  let isJson = true;
  try {
    body = JSON.parse(raw);
  } catch {
    isJson = false;
  }

  console.log(`HTTP ${res.status}`);
  if (isJson && body !== null) console.log(JSON.stringify(body, null, 2));
  // A non-JSON body is almost always a whole HTML page. Print enough to
  // recognise it and no more — dumping it buries the diagnosis underneath it.
  else if (!isJson) console.log(`(non-JSON response, ${raw.length} bytes)`);

  const outcome = describeOutcome({ status: res.status, body, isJson, dryRun });
  if (!outcome.ok) {
    console.error(`\n${outcome.message}`);
    // Non-zero on anything that is not a clean success. The endpoint answers
    // 500 when a run completed WITH failures, and a CLI exiting 0 on that would
    // hide a partly-broken demo from any shell script wrapping this.
    process.exit(1);
  }
}

// Only run when invoked directly, so the helpers above can be imported by a
// test without firing a request at whatever `DEMO_RESET_URL` happens to be.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
