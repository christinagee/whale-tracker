import { useCallback, useEffect, useRef, useState } from 'react'
import type Hls from 'hls.js'
import { getLiveStreamUrl, type Hydrophone } from '../api/orcasound'

export type AudioStatus = 'idle' | 'loading' | 'playing' | 'error'

/** Plays one hydrophone's live stream at a time. */
export function useLiveAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [status, setStatus] = useState<AudioStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const stop = useCallback(() => {
    hlsRef.current?.destroy()
    hlsRef.current = null
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    setPlayingId(null)
    setStatus('idle')
  }, [])

  const play = useCallback(
    async (h: Hydrophone) => {
      stop()
      setPlayingId(h.id)
      setStatus('loading')
      setError(null)
      try {
        const url = await getLiveStreamUrl(h)
        const audio = (audioRef.current ??= new Audio())
        audio.onplaying = () => setStatus('playing')
        audio.onerror = () => {
          setError('The stream stopped. The hydrophone may be offline.')
          setStatus('error')
        }

        if (audio.canPlayType('application/vnd.apple.mpegurl')) {
          audio.src = url // Safari / iPhone play HLS natively
        } else {
          const { default: HlsLib } = await import('hls.js')
          if (!HlsLib.isSupported()) throw new Error("This browser can't play the live stream")
          const hls = new HlsLib({ liveSyncDurationCount: 3 })
          hlsRef.current = hls
          hls.on(HlsLib.Events.ERROR, (_e, data) => {
            if (data.fatal) {
              setError('The stream stopped. The hydrophone may be offline.')
              setStatus('error')
            }
          })
          hls.loadSource(url)
          hls.attachMedia(audio)
        }
        await audio.play()
      } catch (err) {
        hlsRef.current?.destroy()
        hlsRef.current = null
        setError(err instanceof Error ? err.message : "Couldn't start the stream")
        setStatus('error')
      }
    },
    [stop],
  )

  useEffect(() => stop, [stop])

  return { playingId, status, error, play, stop }
}
