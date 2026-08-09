import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  connection: {
    readyState: 1 as number,
    name: '',
    db: undefined as { databaseName: string } | undefined,
  },
}));

vi.mock('mongoose', () => ({
  default: { connection: mocks.connection },
}));

const {
  assertDemoResetTarget,
  checkDemoResetTarget,
  describeDemoResetRefusal,
  DemoResetTargetError,
  DEMO_RESET_DB_ENV,
} = await import('./target-guard');

// ── Why this suite is worth its length ──────────────────────────────────
// This is the only thing standing between a misdirected reset and a hundred-odd
// destructive writes, and the failure it exists to prevent has already happened
// once (2026-08-08, against production). Every case below was checked by
// breaking the guard first and confirming the named test failed — a guard whose
// tests pass with the guard deleted is the pattern this project's history
// records repeatedly.

describe('checkDemoResetTarget', () => {
  it('passes when the declared name matches the connected one', () => {
    expect(checkDemoResetTarget('elite-cuts-dev', 'elite-cuts-dev')).toEqual({
      ok: true,
      database: 'elite-cuts-dev',
    });
  });

  it('refuses when nothing is declared', () => {
    // Fail closed. An unset variable is the state a fresh deploy is in, which
    // is the state most in need of the guard — treating it as "no opinion" is
    // the one default that protects only the environments already protected.
    expect(checkDemoResetTarget(undefined, 'elite-cuts')).toMatchObject({
      ok: false,
      reason: 'not-configured',
    });
  });

  it('refuses when the declaration is blank or whitespace', () => {
    // `DEMO_RESET_DB_NAME=` in an env file reads as an empty string, not
    // undefined, and a stray space is the same mistake one keystroke along.
    expect(checkDemoResetTarget('', 'elite-cuts')).toMatchObject({
      reason: 'not-configured',
    });
    expect(checkDemoResetTarget('   ', 'elite-cuts')).toMatchObject({
      reason: 'not-configured',
    });
  });

  it('refuses when there is no live connection', () => {
    expect(checkDemoResetTarget('elite-cuts-dev', undefined)).toMatchObject({
      reason: 'not-connected',
    });
    expect(checkDemoResetTarget('elite-cuts-dev', '')).toMatchObject({
      reason: 'not-connected',
    });
  });

  it('refuses when connected somewhere other than the declared target', () => {
    // The 2026-08-08 incident in one line: the file on disk said dev, the
    // cached connection was still production.
    const check = checkDemoResetTarget('elite-cuts-dev', 'elite-cuts');
    expect(check).toEqual({
      ok: false,
      reason: 'wrong-database',
      expected: 'elite-cuts-dev',
      actual: 'elite-cuts',
    });
  });

  it('is case-sensitive', () => {
    // MongoDB database names are case-sensitive, so a case-insensitive
    // comparison would accept a name the driver would not resolve to.
    //
    // The prefix hazard — "elite-cuts" is a prefix of "elite-cuts-dev", and a
    // loose match would let the production name satisfy a dev declaration — is
    // already asserted by the mismatch test above, so it is not repeated here.
    expect(checkDemoResetTarget('elite-cuts-dev', 'Elite-Cuts-Dev')).toMatchObject({
      reason: 'wrong-database',
    });
  });

  it('tolerates surrounding whitespace on both sides', () => {
    // A trailing space in an env file is invisible and would otherwise refuse
    // a correctly-configured environment every night.
    expect(checkDemoResetTarget(' elite-cuts-dev ', 'elite-cuts-dev')).toMatchObject({
      ok: true,
    });
  });
});

describe('describeDemoResetRefusal', () => {
  it('names the env var for a missing declaration', () => {
    const message = describeDemoResetRefusal({
      ok: false,
      reason: 'not-configured',
      expected: '',
      actual: 'elite-cuts',
    });
    expect(message).toContain(DEMO_RESET_DB_ENV);
  });

  it('names both databases for a mismatch, so the log is actionable', () => {
    const message = describeDemoResetRefusal({
      ok: false,
      reason: 'wrong-database',
      expected: 'elite-cuts-dev',
      actual: 'elite-cuts',
    });
    expect(message).toContain('elite-cuts-dev');
    expect(message).toContain('elite-cuts');
  });
});

describe('assertDemoResetTarget', () => {
  const originalEnv = process.env[DEMO_RESET_DB_ENV];

  afterEach(() => {
    if (originalEnv === undefined) delete process.env[DEMO_RESET_DB_ENV];
    else process.env[DEMO_RESET_DB_ENV] = originalEnv;
    mocks.connection.readyState = 1;
    mocks.connection.db = undefined;
    mocks.connection.name = '';
    vi.restoreAllMocks();
  });

  it('returns the verified name when the connection matches', () => {
    process.env[DEMO_RESET_DB_ENV] = 'elite-cuts-dev';
    mocks.connection.db = { databaseName: 'elite-cuts-dev' };

    expect(assertDemoResetTarget()).toBe('elite-cuts-dev');
  });

  it('reads the driver-level database name in preference to the URI-derived one', () => {
    // `connection.name` comes from the URI at connect time; `db.databaseName`
    // is what the driver is really issuing commands against. When they differ
    // the second is the honest answer, and it is the one this must use.
    process.env[DEMO_RESET_DB_ENV] = 'elite-cuts-dev';
    mocks.connection.name = 'elite-cuts-dev';
    mocks.connection.db = { databaseName: 'elite-cuts' };

    expect(() => assertDemoResetTarget()).toThrow(DemoResetTargetError);
  });

  it('falls back to the connection name when the driver handle is absent', () => {
    process.env[DEMO_RESET_DB_ENV] = 'elite-cuts-dev';
    mocks.connection.name = 'elite-cuts-dev';
    mocks.connection.db = undefined;

    expect(assertDemoResetTarget()).toBe('elite-cuts-dev');
  });

  it('refuses when the connection is not open, whatever it claims to be named', () => {
    // readyState 2 is `connecting`. A name is populated from the URI well
    // before the handshake finishes, so trusting it here would verify a target
    // that no command has yet reached.
    process.env[DEMO_RESET_DB_ENV] = 'elite-cuts-dev';
    mocks.connection.readyState = 2;
    mocks.connection.name = 'elite-cuts-dev';
    mocks.connection.db = { databaseName: 'elite-cuts-dev' };

    expect(() => assertDemoResetTarget()).toThrow(DemoResetTargetError);
  });

  it('throws a typed error carrying the reason, and logs the detail', () => {
    process.env[DEMO_RESET_DB_ENV] = 'elite-cuts-dev';
    mocks.connection.db = { databaseName: 'elite-cuts' };
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Typed rather than message-matched: the admin route branches on this to
    // answer 503 instead of 500, and a reworded string must not silently
    // change that.
    expect(() => assertDemoResetTarget()).toThrow(DemoResetTargetError);
    try {
      assertDemoResetTarget();
    } catch (error) {
      expect((error as InstanceType<typeof DemoResetTargetError>).reason).toBe(
        'wrong-database',
      );
      // The thrown message reaches an HTTP client, so it must not name a
      // database. The log gets the detail instead.
      expect((error as Error).message).not.toContain('elite-cuts');
    }
    expect(logged).toHaveBeenCalledWith(
      expect.stringContaining('refusing to run'),
    );
  });

  it('refuses a production connection when dev is declared, and vice versa', () => {
    // Symmetric on purpose. Production legitimately runs this job, so the
    // guard is not "refuse production" — it is "refuse anything undeclared",
    // and it has to bite in both directions or it is just a name blocklist.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    process.env[DEMO_RESET_DB_ENV] = 'elite-cuts-dev';
    mocks.connection.db = { databaseName: 'elite-cuts' };
    expect(() => assertDemoResetTarget()).toThrow(DemoResetTargetError);

    process.env[DEMO_RESET_DB_ENV] = 'elite-cuts';
    mocks.connection.db = { databaseName: 'elite-cuts-dev' };
    expect(() => assertDemoResetTarget()).toThrow(DemoResetTargetError);

    // And production passes once it is the declared target — the point of the
    // whole design.
    process.env[DEMO_RESET_DB_ENV] = 'elite-cuts';
    mocks.connection.db = { databaseName: 'elite-cuts' };
    expect(assertDemoResetTarget()).toBe('elite-cuts');
  });
});
