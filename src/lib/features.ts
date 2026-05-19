// Feature flags. **Server-only** — call this from API routes, route handlers,
// and server components, then thread the boolean down to client components as
// a prop. Keeping the env name un-`NEXT_PUBLIC_`-prefixed means the value
// isn't baked into the client bundle at build time, so a deploy can flip the
// flag without re-building.

// Demo Card tile at checkout. The tile creates a paid order without ever
// charging a card — fine for a portfolio demo on a deploy with no real money
// behind it, but a clear footgun if the same build ever shipped to production
// with Stripe live keys. Default posture:
//   - production:  off unless explicitly set to 'true'
//   - dev / test:  on unless explicitly set to 'false'
// so the portfolio demo works locally without anyone editing .env, and a real
// deploy needs an explicit opt-in to expose the tile.
export function isDemoCardTileEnabled(): boolean {
  const explicit = process.env.ENABLE_DEMO_CARD_TILE;
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}
