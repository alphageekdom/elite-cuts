// Builds the two SVG path strings (line + area fill) for a sparkline and the
// (x, y) of the latest point so the caller can render an endpoint marker.
//
// Values are normalised to a 0–1 range and mapped to the SVG viewBox with
// `padding` reserved at the top/bottom so the line never touches the edges.
// SVG y grows downward, so higher values sit closer to y=padding.
//
// Returns empty strings and a null endpoint when there's nothing to draw —
// caller can short-circuit on that.

export type SparklinePaths = {
  line: string;
  area: string;
  endpoint: { x: number; y: number } | null;
};

export function buildSparklinePath(
  values: number[],
  opts: { width: number; height: number; padding?: number } = { width: 600, height: 180 },
): SparklinePaths {
  const { width, height, padding = 20 } = opts;
  if (!values.length) return { line: '', area: '', endpoint: null };

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  const usableH = height - padding * 2;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;

  const points = values.map((v, i) => {
    const x = i * stepX;
    // Flat series → center the line; otherwise normalise into the padded area.
    const norm = span === 0 ? 0.5 : (v - min) / span;
    const y = height - padding - norm * usableH;
    return [x, y] as const;
  });

  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const [firstX] = points[0];
  const [lastX, lastY] = points[points.length - 1];
  const area = `${line} L${lastX},${height} L${firstX},${height} Z`;

  return { line, area, endpoint: { x: lastX, y: lastY } };
}
