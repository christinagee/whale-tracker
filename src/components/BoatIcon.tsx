/** A small boat seen from above, bow pointing up (rotate it to show the course). */
export function BoatIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 1.5 C15.5 5 17 9 17 13 V20.5 C17 21.6 16.1 22.5 15 22.5 H9 C7.9 22.5 7 21.6 7 20.5 V13 C7 9 8.5 5 12 1.5 Z" fill={color} stroke="#fff" strokeWidth="1.6" />
      <rect x="9.3" y="12" width="5.4" height="6" rx="1.2" fill="#fff" opacity="0.85" />
    </svg>
  )
}
