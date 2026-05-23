// Builds the two SVG path strings (line + area fill) for a sparkline and the
// (x, y) and (cx, cy) sequence so the caller can render endpoint or per-point
// markers.
//
// Values are normalised and mapped to the SVG viewBox with `padding` reserved
// at the top/bottom so the line never touches the edges. SVG y grows
// downward, so higher values sit closer to y=padding.
//
// `floor: 'min'` (default) scales from min→max so a flat-but-positive series
// still uses the full height; `floor: 'zero'` scales from 0→max so two
// overlaid series in the same chart stay comparable (the revenue card pattern).
//
// Returns empty strings and an empty points list when there's nothing to draw.

export type SparklinePoint = { x: number; y: number };

export type SparklinePaths = {
  line: string;
  area: string;
  endpoint: SparklinePoint | null;
  points: SparklinePoint[];
};

type Opts = {
  width: number;
  height: number;
  padding?: number;
  floor?: 'min' | 'zero';
  // When floor is 'zero', the caller can supply a shared max so multiple
  // overlaid sparklines render against the same scale.
  max?: number;
};

export function buildSparklinePath(
  values: number[],
  opts: Opts = { width: 600, height: 180 },
): SparklinePaths {
  const { width, height, padding = 20, floor = 'min', max: maxOverride } = opts;
  if (!values.length) return { line: '', area: '', endpoint: null, points: [] };

  const max = maxOverride ?? Math.max(...values);
  const min = floor === 'zero' ? 0 : Math.min(...values);
  const span = max - min;

  const usableH = height - padding * 2;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;

  const points: SparklinePoint[] = values.map((v, i) => {
    const x = i * stepX;
    // Flat series → center the line; otherwise normalise into the padded area.
    const norm = span === 0 ? 0.5 : (v - min) / span;
    const y = height - padding - norm * usableH;
    return { x, y };
  });

  // When floor='zero' and every value is zero, return empty so the caller can
  // skip rendering instead of drawing a flat strip at the centre.
  if (floor === 'zero' && max === 0) {
    return { line: '', area: '', endpoint: null, points: [] };
  }

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const firstX = points[0].x;
  const last = points[points.length - 1];
  const area = `${line} L${last.x},${height} L${firstX},${height} Z`;

  return { line, area, endpoint: { x: last.x, y: last.y }, points };
}
