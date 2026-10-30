import type { Alert } from '../lib/alert'
import '../styles/AlertBanner.css'

interface Props {
  alert: Alert
  onOpen: () => void
}

/** Shows what the whale lamp would be doing right now. */
export function AlertBanner({ alert, onOpen }: Props) {
  if (alert.level === 0) return null
  return (
    <button className={`alert-banner alert-${alert.state}`} onClick={onOpen}>
      <span className={`alert-light alert-light-${alert.effect}`} style={{ background: alert.color }} />
      <span className="alert-text">
        <strong>{alert.title}</strong>
        <span>{alert.message}</span>
      </span>
      <span className="alert-go">View →</span>
    </button>
  )
}
