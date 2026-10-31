import { useEffect, useRef, useState } from 'react'
import { DURATION, renderIntro } from './timeline'
import { H, W } from './scene'
import '../styles/Intro.css'

interface Props {
  onDone: () => void
  /** For reviewing: freeze the animation at this time (ms). */
  freezeAt?: number | null
}

/** Full-screen pixel-art intro: the dachshund takes over Daniel's computer and opens "orcas". */
export function Intro({ onDone, freezeAt = null }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: W, h: H, dpr: 1 })
  const [leaving, setLeaving] = useState(false)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  // As big as the screen allows: always the room's full height, and on narrow (upright phone)
  // screens only part of its width, which the camera pans across. At least 100 pixels of the
  // room stay visible side to side, and never more than the whole room.
  useEffect(() => {
    const fit = () => {
      const availW = window.innerWidth
      const availH = window.innerHeight * 0.86
      const k = Math.min(availH / H, availW / 100)
      const w = Math.floor(Math.min(availW, W * k))
      setSize({ w, h: Math.floor(H * k), dpr: Math.min(window.devicePixelRatio || 1, 3) })
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    if (freezeAt !== null) {
      renderIntro(ctx, freezeAt)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = now - start
      renderIntro(ctx, Math.min(t, DURATION))
      if (t >= DURATION) {
        setLeaving(true)
        window.setTimeout(() => doneRef.current(), 500)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [size, freezeAt])

  const skip = () => {
    setLeaving(true)
    window.setTimeout(() => doneRef.current(), 300)
  }

  return (
    <div className={`intro ${leaving ? 'intro-leaving' : ''}`} onClick={freezeAt === null ? skip : undefined} role="dialog" aria-label="Intro animation">
      <canvas
        ref={canvasRef}
        width={Math.round(size.w * size.dpr)}
        height={Math.round(size.h * size.dpr)}
        style={{ width: size.w, height: size.h }}
        className="intro-canvas"
      />
      {freezeAt === null && (
        <button
          className="intro-skip"
          onClick={(e) => {
            e.stopPropagation()
            skip()
          }}
        >
          Skip ▸
        </button>
      )}
    </div>
  )
}
