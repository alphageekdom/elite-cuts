import { describe, expect, it } from 'vitest';

import { pinNaturalKeyForDemo } from './natural-keys';

const demoAdmin = { isDemo: true, isAdmin: true };
const demoCustomer = { isDemo: true, isAdmin: false };
const realAdmin = { isDemo: false, isAdmin: true };

describe('pinNaturalKeyForDemo', () => {
  it('keeps the persisted key when a demo admin submits a different one', () => {
    // The regression this exists for. A renamed slug detaches the row from
    // its snapshot entry: the next restore re-creates the original as a
    // duplicate and the renamed copy is left behind permanently — it has no
    // `createdBy`, so neither the ownership-scoped delete nor the
    // seeded-cut delete guard can ever clear it.
    expect(pinNaturalKeyForDemo(demoAdmin, 'renamed-ribeye', 'ribeye')).toBe(
      'ribeye',
    );
  });

  it('passes a real admin’s rename straight through', () => {
    expect(pinNaturalKeyForDemo(realAdmin, 'renamed-ribeye', 'ribeye')).toBe(
      'renamed-ribeye',
    );
  });

  it('passes through for a signed-out or unknown actor', () => {
    // Route-level auth decides who may edit at all; this helper only ever
    // narrows a demo admin's write.
    expect(pinNaturalKeyForDemo(null, 'renamed', 'original')).toBe('renamed');
    expect(pinNaturalKeyForDemo(undefined, 'renamed', 'original')).toBe(
      'renamed',
    );
  });

  it('does not pin for a demo customer', () => {
    // A demo *customer* never reaches an admin edit route, so pinning here
    // would be a misleading no-op rather than a safeguard.
    expect(pinNaturalKeyForDemo(demoCustomer, 'renamed', 'original')).toBe(
      'renamed',
    );
  });

  it('is a no-op when the submitted key already matches', () => {
    expect(pinNaturalKeyForDemo(demoAdmin, 'ribeye', 'ribeye')).toBe('ribeye');
  });
});
