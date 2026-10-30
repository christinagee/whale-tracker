/** The orca mascot. Uses a small file for little icons and the full-size one for big ones. */
export function OrcaIcon({ size = 18 }: { size?: number }) {
  return (
    <img
      className="orca-img"
      src={size > 48 ? '/orca.png' : '/orca-96.png'}
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  )
}
