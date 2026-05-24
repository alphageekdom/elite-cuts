export function fmtDollars(amount: number): { whole: string; frac: string } {
  const [whole, frac] = amount.toFixed(2).split('.');
  return { whole: `$${Number(whole).toLocaleString()}`, frac };
}

export function fmtDollarShort(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

// Compact dollar formatter for narrow KPI cards where the full
// `$6,759.64` shape blows out the card width on phones. Cents are
// dropped above $1K (a recruiter glances at magnitude, not pennies),
// the K/M abbreviation scales: $6.8K / $108K / $1.2M. Below $1K the
// full whole-dollar amount fits cleanly so we keep it readable. The
// M threshold sits at 950K so $999,999 reads "$1.0M" instead of the
// ugly "$1000K" the strict 1M cutoff would round to.
export function fmtDollarCompact(amount: number): string {
  if (amount >= 950_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 100_000) return `$${Math.round(amount / 1000)}K`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

// Heatmap intensity steps. The 1–4 stops land on the camel token (rising
// opacity) and 5 sits on oxblood — chosen so a busy slot draws the eye and
// quieter slots fade toward the card background.
export const HEAT_BG = [
  'bg-cream-deep',
  'bg-camel/20',
  'bg-camel/40',
  'bg-camel/65',
  'bg-oxblood/60',
  'bg-oxblood',
];

export const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
export const HOUR_LABELS = ['9A', '10A', '11A', '12P', '1P', '2P', '3P', '4P', '5P', '6P', '7P', '8P'];
