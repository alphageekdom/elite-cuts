import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  connectDB: vi.fn(async () => undefined),
}));

vi.mock('@/config/database', () => ({ default: mocks.connectDB }));

vi.mock('@/models/DemoResetRun', async () => {
  // The sanitiser is the real one — it is half of what this suite is about,
  // and stubbing it would test the mock.
  const actual = await vi.importActual<typeof import('@/models/DemoResetRun')>(
    '@/models/DemoResetRun',
  );
  return { ...actual, default: { create: mocks.create } };
});

const { recordDemoResetRun, summariseError } = await import('./run-history');
const { sanitiseCounts } = await import('@/models/DemoResetRun');

const baseRecord = {
  runId: 'run-1',
  trigger: 'cron' as const,
  outcome: 'success' as const,
  startedAt: new Date('2026-08-09T08:00:00.000Z'),
  finishedAt: new Date('2026-08-09T08:00:12.500Z'),
  database: 'elite-cuts',
  counts: { ordersDeleted: 3 },
  validationFailures: [],
  error: null,
};

beforeEach(() => {
  mocks.create.mockReset().mockResolvedValue(undefined);
  mocks.connectDB.mockReset().mockResolvedValue(undefined);
  // Every record now emits one summary line. Spied so it does not scribble
  // over the test output, and so the log test below can read it.
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('sanitiseCounts', () => {
  it('keeps numbers and booleans', () => {
    expect(sanitiseCounts({ ordersDeleted: 3, settingsRestored: true, zero: 0, off: false })).toEqual(
      { ordersDeleted: 3, settingsRestored: true, zero: 0, off: false },
    );
  });

  it('drops strings, objects, arrays, null and undefined', () => {
    // `counts` is a Mixed field, so whatever is handed in is what gets stored.
    // The "no personal data" rule has to be enforced here rather than promised
    // in a comment — this is the test that makes it enforcement.
    expect(
      sanitiseCounts({
        ok: 1,
        email: 'someone@example.com',
        nested: { secret: 'x' },
        list: ['a'],
        nothing: null,
        absent: undefined,
      }),
    ).toEqual({ ok: 1 });
  });

  it('drops NaN and Infinity, which a bad count computation produces', () => {
    // A `failureCount` selector reading a missing key computes NaN, and that
    // has actually happened on this route before. Storing it would make a row
    // that no comparison can read.
    expect(sanitiseCounts({ bad: NaN, worse: Infinity, good: 2 })).toEqual({ good: 2 });
  });
});

describe('summariseError', () => {
  it('returns null for no error', () => {
    expect(summariseError(null)).toBeNull();
    expect(summariseError(undefined)).toBeNull();
  });

  it('takes the message off an Error, not the stack', () => {
    // No companion `not.toContain('at ')`: `toBe` already pins the whole
    // string, and `Error.message` never carries a stack in Node, so that
    // assertion could not fail on its own.
    expect(summariseError(new Error('mongo hiccup'))).toBe('mongo hiccup');
  });

  it('collapses newlines so a multi-line message cannot smuggle a stack in', () => {
    expect(summariseError(new Error('line one\n    at foo\n    at bar'))).toBe(
      'line one at foo at bar',
    );
  });

  it('clamps a very long message', () => {
    // A Mongo write error carries the offending document on it, so "our errors
    // have tidy messages" is an assumption rather than a guarantee.
    const summary = summariseError(new Error('x'.repeat(5000)));
    expect(summary).not.toBeNull();
    expect(summary!.length).toBeLessThanOrEqual(301);
    expect(summary!.endsWith('…')).toBe(true);
  });

  it('redacts the document Mongo embeds in a duplicate-key message', () => {
    // A failed unique build reports the colliding document. Nothing in the
    // reset path inserts a User today, so the reachable values are seeded
    // slugs and shift coordinates — this is defence for the day something
    // does, using the redactor that already exists for exactly this.
    const summary = summariseError(
      new Error(
        'E11000 duplicate key error collection: elite-cuts.shifts index: weekStart_1 dup key: { email: "someone@example.com" }',
      ),
    );

    expect(summary).not.toContain('someone@example.com');
    expect(summary).toContain('redacted');
    // The actionable half survives — an operator still learns which index.
    expect(summary).toContain('weekStart_1');
  });

  it('handles a thrown non-Error without recording its contents', () => {
    expect(summariseError({ token: 'sk_live_abc' })).toBe('Non-Error value thrown');
    expect(summariseError(['a', 'b'])).toBe('Non-Error value thrown');
  });

  it('keeps a thrown string, but treats a whitespace-only one as no error', () => {
    expect(summariseError('plain failure')).toBe('plain failure');
    expect(summariseError('   \n  ')).toBeNull();
  });
});

describe('recordDemoResetRun', () => {
  it('computes duration from the two timestamps', async () => {
    await recordDemoResetRun(baseRecord);
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ durationMs: 12500 }),
    );
  });

  it('floors duration at zero rather than recording a negative one', async () => {
    // Clocks go backwards — NTP correction mid-run is enough. A negative
    // duration is not a thing that can be true, and it would poison any
    // average computed off these rows.
    await recordDemoResetRun({
      ...baseRecord,
      startedAt: new Date('2026-08-09T08:00:10.000Z'),
      finishedAt: new Date('2026-08-09T08:00:00.000Z'),
    });
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ durationMs: 0 }),
    );
  });

  it('sanitises the counts on the way in', async () => {
    await recordDemoResetRun({
      ...baseRecord,
      counts: { ordersDeleted: 3, note: 'customer@example.com' },
    });
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ counts: { ordersDeleted: 3 } }),
    );
  });

  it('logs the run id and duration, since nothing reads the collection', async () => {
    // The collection has no reader. Without this line `runId` is a correlation
    // id with nothing to correlate and `durationMs` is invisible outside Atlas
    // — both are spec-required fields that would otherwise be inert.
    await recordDemoResetRun(baseRecord);

    const line = String(vi.mocked(console.log).mock.calls[0][0]);
    expect(line).toContain('runId=run-1');
    expect(line).toContain('duration=12500ms');
    expect(line).toContain('trigger=cron');
    expect(line).toContain('success');
  });

  it('logs even when the database write fails', async () => {
    // The log is the fallback for exactly the case where the row is missing,
    // so it must not be inside the try.
    mocks.create.mockRejectedValue(new Error('collection is read-only'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await recordDemoResetRun(baseRecord);

    expect(console.log).toHaveBeenCalled();
  });

  it('never throws when the write fails', async () => {
    // The history exists to explain a failed run. One that can fail the run it
    // is describing would be worse than none.
    mocks.create.mockRejectedValue(new Error('collection is read-only'));
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(recordDemoResetRun(baseRecord)).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });

  it('never throws when the connection itself fails', async () => {
    mocks.connectDB.mockRejectedValue(new Error('no connection'));
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(recordDemoResetRun(baseRecord)).resolves.toBeUndefined();
    expect(mocks.create).not.toHaveBeenCalled();
    logged.mockRestore();
  });
});
