import { useEffect, useRef, useState, type FormEvent } from 'react'
import { PixelIcon } from './PixelIcon'
import '../styles/LampButton.css'

const LAMP_ICON = [
  '....SSSS....',
  '...SLLLLS...',
  '..SLLLLLLS..',
  '..SLLLLLLS..',
  '.SLLLLLLLLS.',
  '.SSSSSSSSSS.',
  '.....PP.....',
  '.....PP.....',
  '.....PP.....',
  '....BBBB....',
  '...BBBBBB...',
]
const LAMP_COLORS = { S: '#0b2545', L: '#fde7b0', P: '#cfd8e3', B: '#e9f1f6' }

const STORAGE_KEY = 'lamp-password'
function loadPassword(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}
function storePassword(value: string | null) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // private browsing etc.: just don't remember
  }
}

type Message = { kind: 'ok' | 'info' | 'error'; text: string }

/** Header button: sets the whale lamp back to its normal setting (password protected). */
export function LampButton() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function show() {
    const saved = loadPassword()
    setPassword(saved)
    setMessage(null)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    if (!password) inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!password || busy) return
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch('/api/lamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; did?: string; why?: string; error?: string }
      if (res.status === 401) {
        storePassword(null)
        setMessage({ kind: 'error', text: 'Wrong password. Try again.' })
        inputRef.current?.select()
      } else if (!body.ok) {
        setMessage({ kind: 'error', text: body.error ?? "Couldn't reach the lamp. Try again in a minute." })
      } else {
        storePassword(remember ? password : null)
        setMessage(
          body.did === 'restore'
            ? { kind: 'ok', text: 'Done! The lamp is back to Natural.' }
            : { kind: 'info', text: `${body.why ?? 'Nothing to change'}.` },
        )
      }
    } catch {
      setMessage({ kind: 'error', text: "Couldn't reach the lamp. Check your connection." })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button className="lamp-button" onClick={show} aria-label="Whale lamp" title="Whale lamp">
        <PixelIcon rows={LAMP_ICON} colors={LAMP_COLORS} size={24} />
      </button>
      {open && (
        <div className="lamp-backdrop" onClick={() => setOpen(false)}>
          <form
            className="lamp-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lamp-title"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
          >
            <h2 id="lamp-title">Whale lamp</h2>
            <p className="lamp-intro">The lamp turns blue for 30 minutes when orcas are close to Seattle. Set it back to its normal light now:</p>
            <label className="lamp-field">
              Password
              <input
                ref={inputRef}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="lamp-remember">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember on this device
            </label>
            {message && (
              <p className={`lamp-message lamp-message-${message.kind}`} role="status">
                {message.text}
              </p>
            )}
            <div className="lamp-actions">
              <button type="button" className="lamp-secondary" onClick={() => setOpen(false)}>
                Close
              </button>
              <button type="submit" className="lamp-primary" disabled={busy || !password}>
                {busy ? 'Working…' : 'Back to Natural'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
