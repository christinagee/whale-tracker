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
  const [scale, setScale] = useState(1)
  const [leaving, setLeaving] = useState(false)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  // Largest whole-number scale that fits the screen keeps the pixels crisp.
  useEffect(() => {
    const fit = () => setScale(Math.max(1, Math.floor(Math.min(window.innerWidth / W, (window.innerHeight * 0.82) / H))))
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
  }, [scale, freezeAt])

  const skip = () => {
    setLeaving(true)
    window.setTimeout(() => doneRef.current(), 300)
  }

  return (
    <div className={`intro ${leaving ? 'intro-leaving' : ''}`} onClick={freezeAt === null ? skip : undefined} role="dialog" aria-label="Intro animation">
      <canvas ref={canvasRef} width={W * scale} height={H * scale} className="intro-canvas" />
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
