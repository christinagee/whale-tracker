export function OrcaIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M6 34c0-11 11-20 26-20 12 0 21 6 24 14l4-6c1 4 0 8-3 11 1 9-11 17-25 17C17 50 6 44 6 34z" fill="currentColor" />
      <ellipse cx="22" cy="40" rx="9" ry="5" fill="#fff" />
      <ellipse cx="19" cy="26" rx="4" ry="2.2" fill="#fff" />
      <path d="M34 14l3-10 5 11z" fill="currentColor" />
    </svg>
  )
}
