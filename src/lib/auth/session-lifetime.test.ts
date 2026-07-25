import { describe, it, expect } from 'vitest';

import {
  REMEMBERED_SESSION_DAYS,
  SESSION_COOKIE_MAX_AGE_SECONDS,
  UNREMEMBERED_SESSION_HOURS,
  isSessionExpired,
  resolveRememberMe,
  resolveSessionExpiry,
} from './session-lifetime';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = 1_800_000_000_000;

describe('resolveSessionExpiry', () => {
  it('gives a remembered session the full 30 days', () => {
    expect(resolveSessionExpiry(true, NOW)).toBe(
      NOW + REMEMBERED_SESSION_DAYS * DAY,
    );
  });

  it('gives an unremembered session the short window', () => {
    expect(resolveSessionExpiry(false, NOW)).toBe(
      NOW + UNREMEMBERED_SESSION_HOURS * HOUR,
    );
  });

  // The whole point of the feature: the checkbox has to change the answer.
  // Before this module both branches were the same 30 days.
  it('makes the two branches genuinely different', () => {
    expect(resolveSessionExpiry(true, NOW)).toBeGreaterThan(
      resolveSessionExpiry(false, NOW),
    );
  });
});

describe('SESSION_COOKIE_MAX_AGE_SECONDS', () => {
  // A cookie shorter than the longest deadline would sign a remembered user
  // out early, which would make the checkbox lie in the other direction.
  it('is at least as long as the longest session it has to carry', () => {
    const longest = resolveSessionExpiry(true, NOW) - NOW;
    expect(SESSION_COOKIE_MAX_AGE_SECONDS * 1000).toBeGreaterThanOrEqual(
      longest,
    );
  });
});

describe('isSessionExpired', () => {
  it('is live before the deadline', () => {
    expect(isSessionExpired(NOW + 1, NOW)).toBe(false);
  });

  it('is expired at the deadline exactly', () => {
    expect(isSessionExpired(NOW, NOW)).toBe(true);
  });

  it('is expired past the deadline', () => {
    expect(isSessionExpired(NOW - 1, NOW)).toBe(true);
  });

  // Tokens minted before this shipped carry no deadline. Treating a missing
  // one as expired would sign out every customer holding a cookie at deploy.
  it('treats a missing deadline as live', () => {
    expect(isSessionExpired(undefined, NOW)).toBe(false);
  });
});

describe('resolveRememberMe', () => {
  it('reads the string the sign-in checkbox actually sends', () => {
    expect(resolveRememberMe('true')).toBe(true);
    expect(resolveRememberMe('false')).toBe(false);
  });

  it('accepts a real boolean too', () => {
    expect(resolveRememberMe(true)).toBe(true);
    expect(resolveRememberMe(false)).toBe(false);
  });

  // The regression this pins: Register's restore-and-sign-in and the checkout
  // inline sign-in both call the credentials provider with no checkbox on
  // screen and no `rememberMe` in the payload. Reading that silence as
  // "unticked" cut both flows from 30 days to 12 hours — a customer who
  // registered in the evening would be signed out by the next afternoon,
  // having never been offered the choice.
  it.each([undefined, null, ''])(
    'treats %p — a surface that never offered the choice — as remembered',
    (value) => {
      expect(resolveRememberMe(value)).toBe(true);
    },
  );

  // A value that IS present but unrecognised is tampering or a bug, and the
  // shorter session is the safer way to be wrong.
  it.each(['TRUE', '1', 'yes', 0, {}, []])(
    'treats present-but-unrecognised %p as not remembered',
    (value) => {
      expect(resolveRememberMe(value)).toBe(false);
    },
  );
});
