import { describe, expect, it } from 'vitest';

import {
  describeOutcome,
  readUrlFlag,
  requiresConfirmation,
  resolveEndpoint,
} from './demo-reset.mjs';

// ── The incident this file exists for ───────────────────────────────────
// A `--dry-run` against a deployment that predated the flag ran a real reset on
// production (2026-08-09). Two independent things were wrong: the safe path was
// a droppable flag rather than a path, and the CLI trusted a 200 without
// checking the server had agreed to do the safe thing. Both are pinned below.
// Full account: `src/app/api/cron/reset-demo/dry-run/route.ts`.
//
// A third thing was wrong in the FIX, and is pinned below too: the
// route-is-absent branch keyed on a 404 status that the platform does not
// actually send. Every case here that carries `isJson` exists because of it —
// the honest signal is whether a reset handler answered, not what status a
// missing route happens to carry.
//
// Every case here was checked by breaking the source first and confirming the
// named test failed.
//
// Importing this module must not fire a request — the entry point is guarded by
// an `import.meta.url` check for exactly that reason. If this file ever hangs or
// hits the network, that guard is what broke.

describe('resolveEndpoint', () => {
  it('sends a dry run to its own path, not a flag on the real one', () => {
    // The whole fix. An older deployment silently drops an unrecognised query
    // parameter and runs the real thing; it cannot route to a handler it does
    // not have. (What that non-arrival looks like on the wire is a 200 HTML
    // page on Vercel, not a 404 — see `describeOutcome`.)
    const url = resolveEndpoint('http://localhost:3000', { dryRun: true });
    expect(url.pathname).toBe('/api/cron/reset-demo/dry-run');
    expect(url.searchParams.get('dryRun')).toBeNull();
  });

  it('sends a real run to the reset path', () => {
    const url = resolveEndpoint('http://localhost:3000', { dryRun: false });
    expect(url.pathname).toBe('/api/cron/reset-demo');
  });

  it('labels the run as cli so the history can tell it from the nightly one', () => {
    expect(
      resolveEndpoint('http://localhost:3000', { dryRun: false }).searchParams.get(
        'trigger',
      ),
    ).toBe('cli');
  });

  it('keeps the target origin, including a non-default port', () => {
    const url = resolveEndpoint('https://elite-cuts-three.vercel.app', { dryRun: true });
    expect(url.origin).toBe('https://elite-cuts-three.vercel.app');
    expect(resolveEndpoint('http://localhost:3101', { dryRun: false }).origin).toBe(
      'http://localhost:3101',
    );
  });
});

describe('readUrlFlag', () => {
  it('returns the value when one is given', () => {
    expect(readUrlFlag(['--url', 'https://example.test'])).toEqual({
      value: 'https://example.test',
    });
  });

  it('returns null when the flag is absent, so the caller falls back', () => {
    expect(readUrlFlag(['--dry-run'])).toEqual({ value: null });
  });

  it('refuses a trailing --url instead of silently using localhost', () => {
    // The whole premise of this tool is that a silent target change is the bug.
    // `--url` as the last argument used to yield undefined and fall through to
    // localhost — a silent target change in its own argument parsing.
    expect(readUrlFlag(['--dry-run', '--url']).error).toBeTruthy();
  });

  it('refuses a flag-shaped value instead of throwing deeper in', () => {
    // `--url --yes` used to reach `new URL('--yes')` and die with an unhandled
    // TypeError, which reads as a crash rather than a usage mistake.
    const result = readUrlFlag(['--url', '--yes']);
    expect(result.error).toContain('--yes');
  });
});

describe('requiresConfirmation', () => {
  it('does not gate a real reset against localhost', () => {
    // The ordinary development case. Ceremony here would train the reflex to
    // add --yes without reading, which is the opposite of the point.
    for (const host of [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://0.0.0.0:3000',
    ]) {
      expect(requiresConfirmation(host, { dryRun: false })).toBe(false);
    }
  });

  it('gates a real reset against a remote host', () => {
    expect(
      requiresConfirmation('https://elite-cuts-three.vercel.app', { dryRun: false }),
    ).toBe(true);
  });

  it('never gates a dry run, wherever it points', () => {
    // It writes nothing but its own history row. Requiring --yes would make the
    // safe option as awkward as the dangerous one.
    expect(
      requiresConfirmation('https://elite-cuts-three.vercel.app', { dryRun: true }),
    ).toBe(false);
  });

  it('treats an unparseable url as remote', () => {
    // Failing toward "needs confirmation" is the only defensible direction: a
    // malformed --url is not evidence that the target is your own machine.
    expect(requiresConfirmation('not a url', { dryRun: false })).toBe(true);
    expect(requiresConfirmation('', { dryRun: false })).toBe(true);
  });

  it('is not fooled by a hostname that merely contains localhost', () => {
    // `localhost.evil.com` and `mylocalhost` both resolve elsewhere. Exact
    // hostname match, not substring.
    expect(
      requiresConfirmation('https://localhost.example.com', { dryRun: false }),
    ).toBe(true);
    expect(requiresConfirmation('https://notlocalhost/', { dryRun: false })).toBe(true);
  });
});

describe('describeOutcome', () => {
  it('reads a 404 on a dry run as fail-closed, and says nothing ran', () => {
    // The reassuring half is the part the operator needs. If this read as a
    // generic crash, the natural next move is to retry without --dry-run —
    // which is the destructive thing.
    const outcome = describeOutcome({
      status: 404,
      body: null,
      isJson: false,
      dryRun: true,
    });
    expect(outcome.ok).toBe(false);
    expect(outcome.message).toContain('NOTHING WAS RUN');
    expect(outcome.message).toContain('predates it');
  });

  it('reads a 200 HTML page on a dry run as fail-closed too — the REAL shape', () => {
    // Measured against the live deployment on 2026-08-09, not reasoned about.
    // A POST to a path the App Router cannot match renders the not-found page,
    // and Vercel serves it as 200 text/html (`x-matched-path: /_not-found`).
    //
    // So the 404 above never happens there, and this case — the only one that
    // actually occurs — used to fall through to the body check and print "a
    // real reset may have run. Check the run history." Nothing had run.
    const outcome = describeOutcome({
      status: 200,
      body: null,
      isJson: false,
      dryRun: true,
    });
    expect(outcome.ok).toBe(false);
    expect(outcome.message).toContain('NOTHING WAS RUN');
    expect(outcome.message).not.toContain('UNSAFE');
  });

  it('rejects a JSON 200 whose body does not confirm the dry run', () => {
    // Independent of the not-found checks: a redirect, proxy or rewrite could
    // land a dry run on the real endpoint and still answer 2xx JSON. That is
    // precisely the 2026-08-09 shape, and it must not read as success.
    const outcome = describeOutcome({
      status: 200,
      body: { message: 'Demo data reset', ordersDeleted: 6 },
      isJson: true,
      dryRun: true,
    });
    expect(outcome.ok).toBe(false);
    expect(outcome.message).toContain('UNSAFE');
  });

  it('accepts a dry run that confirms itself', () => {
    expect(
      describeOutcome({
        status: 200,
        body: { dryRun: true },
        isJson: true,
        dryRun: true,
      }),
    ).toEqual({ ok: true, message: null });
  });

  it('does not demand the dryRun flag on a real run', () => {
    // The real endpoint has no reason to carry it, and requiring it would make
    // every genuine reset report failure.
    expect(
      describeOutcome({
        status: 200,
        body: { ordersDeleted: 6 },
        isJson: true,
        dryRun: false,
      }),
    ).toEqual({ ok: true, message: null });
  });

  it('refuses to call a REAL run successful when the body is not JSON', () => {
    // The same platform behaviour, on the destructive path. A 200 carrying a
    // not-found page left `body` undefined, which satisfied every check and
    // reported a clean reset that had never happened — a silent false success
    // on exactly the command whose output someone acts on.
    const outcome = describeOutcome({
      status: 200,
      body: null,
      isJson: false,
      dryRun: false,
    });
    expect(outcome.ok).toBe(false);
    expect(outcome.message).toContain('never reached');
  });

  it('fails on a 500, which is how a run that completed WITH failures answers', () => {
    // Exiting 0 there would hide a partly-broken demo from any script wrapping
    // this — the same "reported success on a failed run" defect the endpoint
    // itself was fixed for in August.
    expect(
      describeOutcome({
        status: 500,
        body: { validationFailures: ['product:x'] },
        isJson: true,
        dryRun: false,
      }).ok,
    ).toBe(false);
  });

  it('fails on a 401, so a wrong secret is never mistaken for a clean run', () => {
    expect(
      describeOutcome({
        status: 401,
        body: { message: 'Unauthorized' },
        isJson: true,
        dryRun: false,
      }).ok,
    ).toBe(false);
  });

  it('does not treat a 404 on a REAL run as the fail-closed case', () => {
    // Only the dry run has the "this deployment is too old" reading. A 404 on
    // the real path means something else entirely and must not print a
    // reassuring message about nothing having run.
    const outcome = describeOutcome({
      status: 404,
      body: null,
      isJson: false,
      dryRun: false,
    });
    expect(outcome.ok).toBe(false);
    expect(outcome.message).not.toContain('NOTHING WAS RUN');
  });
});
