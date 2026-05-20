import { describe, expect, it } from 'vitest';

import {
  isDemoAdmin,
  isDemoCustomer,
  isDemoUser,
} from './demo-permissions';
import {
  DEMO_ACTOR_MESSAGE,
  DEMO_TARGET_MESSAGE,
  refuseDemoActor,
  refuseDemoTarget,
} from './demo-responses';

describe('isDemoUser', () => {
  it('returns true when isDemo is true', () => {
    expect(isDemoUser({ isDemo: true })).toBe(true);
  });

  it('returns false when isDemo is false', () => {
    expect(isDemoUser({ isDemo: false })).toBe(false);
  });

  it('returns false when isDemo is missing', () => {
    expect(isDemoUser({})).toBe(false);
  });

  it('returns false for null', () => {
    expect(isDemoUser(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isDemoUser(undefined)).toBe(false);
  });
});

describe('isDemoCustomer', () => {
  it('returns true when isDemo and not admin', () => {
    expect(isDemoCustomer({ isDemo: true, isAdmin: false })).toBe(true);
  });

  it('returns true when isDemo and isAdmin omitted', () => {
    expect(isDemoCustomer({ isDemo: true })).toBe(true);
  });

  it('returns false for a demo admin', () => {
    expect(isDemoCustomer({ isDemo: true, isAdmin: true })).toBe(false);
  });

  it('returns false for a real (non-demo) customer', () => {
    expect(isDemoCustomer({ isDemo: false })).toBe(false);
  });
});

describe('isDemoAdmin', () => {
  it('returns true when both isDemo and isAdmin are true', () => {
    expect(isDemoAdmin({ isDemo: true, isAdmin: true })).toBe(true);
  });

  it('returns false for a demo customer', () => {
    expect(isDemoAdmin({ isDemo: true, isAdmin: false })).toBe(false);
  });

  it('returns false for a real (non-demo) admin', () => {
    expect(isDemoAdmin({ isDemo: false, isAdmin: true })).toBe(false);
  });
});

describe('refuseDemoActor', () => {
  it('returns null for a non-demo actor', () => {
    expect(refuseDemoActor({ isDemo: false })).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(refuseDemoActor(undefined)).toBeNull();
  });

  it('returns a 403 response with the actor-blocked message for a demo actor', async () => {
    const res = refuseDemoActor({ isDemo: true });
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = await res!.json();
    expect(body).toEqual({ message: DEMO_ACTOR_MESSAGE });
  });

  it('refuses a demo admin too (broader policy than spec — demo fixtures stay immutable)', () => {
    expect(refuseDemoActor({ isDemo: true, isAdmin: true })).not.toBeNull();
  });
});

describe('refuseDemoTarget', () => {
  it('returns null for a non-demo target', () => {
    expect(refuseDemoTarget({ isDemo: false })).toBeNull();
  });

  it('returns null for null', () => {
    expect(refuseDemoTarget(null)).toBeNull();
  });

  it('returns a 403 response with the target-blocked message for a demo target', async () => {
    const res = refuseDemoTarget({ isDemo: true });
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = await res!.json();
    expect(body).toEqual({ message: DEMO_TARGET_MESSAGE });
  });
});
