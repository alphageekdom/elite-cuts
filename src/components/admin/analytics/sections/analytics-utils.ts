export function fmtDollars(amount: number): { whole: string; frac: string } {
  const [whole, frac] = amount.toFixed(2).split('.');
  return { whole: `$${Number(whole).toLocaleString()}`, frac };
}

export function fmtDollarShort(amount: number): string {
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
