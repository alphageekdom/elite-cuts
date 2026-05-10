export function fmtDollars(amount: number): { whole: string; frac: string } {
  const [whole, frac] = amount.toFixed(2).split('.');
  return { whole: `$${Number(whole).toLocaleString()}`, frac };
}

export function fmtDollarShort(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

export function fmtRank(n: number): string {
  return n.toString().padStart(2, '0');
}

export function isAbsoluteUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

export function toSvgPath(values: number[], maxVal: number, svgW = 550, svgH = 256, pad = 20): string {
  if (!values.length || maxVal === 0) return '';
  return values
    .map((v, i) => {
      const x = ((i / (values.length - 1)) * svgW).toFixed(1);
      const y = (svgH - pad - (v / maxVal) * (svgH - 2 * pad)).toFixed(1);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');
}

export function toSvgArea(values: number[], maxVal: number, svgW = 550, svgH = 256, pad = 20): string {
  const path = toSvgPath(values, maxVal, svgW, svgH, pad);
  if (!path) return '';
  return `${path} L${svgW},${svgH} L0,${svgH} Z`;
}

export function dotPositions(
  values: number[],
  maxVal: number,
  svgW = 550,
  svgH = 256,
  pad = 20,
): { cx: number; cy: number }[] {
  if (!values.length || maxVal === 0) return [];
  return values.map((v, i) => ({
    cx: (i / (values.length - 1)) * svgW,
    cy: svgH - pad - (v / maxVal) * (svgH - 2 * pad),
  }));
}

export const HEAT_BG = [
  'bg-cream-deep',
  'bg-[rgba(184,137,90,0.2)]',
  'bg-[rgba(184,137,90,0.4)]',
  'bg-[rgba(184,137,90,0.65)]',
  'bg-[rgba(107,31,31,0.6)]',
  'bg-oxblood',
];

export const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
export const HOUR_LABELS = ['9A', '10A', '11A', '12P', '1P', '2P', '3P', '4P', '5P', '6P', '7P', '8P'];
