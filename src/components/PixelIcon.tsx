/** Draws a small pixel-art icon from rows of characters ('#' filled, '.' empty, other letters = other colors). */
export function PixelIcon({ rows, colors, size }: { rows: string[]; colors: Record<string, string>; size: number }) {
  const w = rows[0].length
  const h = rows.length
  return (
    <svg width={size} height={(size * h) / w} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden="true">
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) => (ch === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={colors[ch] ?? colors['#']} />)),
      )}
    </svg>
  )
}
