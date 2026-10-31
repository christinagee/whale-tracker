/**
 * The orca mascot as a pixel sprite. Sprites come in a few fixed sizes and are always shown
 * at their own size (scaled up crisply on high-resolution screens), never blurred in between.
 */
export function OrcaIcon({ size = 32 }: { size?: number }) {
  const px = size >= 40 ? 40 : size >= 26 ? 32 : 20
  return (
    <img className="orca-img pixel-art" src={`/pixel/orca-${px}.png`} width={px} height={px} alt="" draggable={false} />
  )
}
