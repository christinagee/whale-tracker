import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchBoats } from '../api/boats'
import { mergeBoats, type Boat } from '../lib/boats'

const STORAGE_KEY = 'whale-tracker:boats'

function loadSaved(): Boat[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(saved) ? mergeBoats(saved, []) : []
  } catch {
    return []
  }
}

/**
 * Whale-watch boats. Each check only hears boats that reported in the last ~25 seconds,
 * so we keep what we've heard before (in this browser) to show recent positions and trails.
 */
export function useBoats() {
  const query = useQuery({
    queryKey: ['boats'],
    queryFn: fetchBoats,
    refetchInterval: 90_000,
    retry: 1,
  })
  const [boats, setBoats] = useState<Boat[]>(loadSaved)

  useEffect(() => {
    if (!query.data) return
    setBoats((prev) => {
      const next = mergeBoats(prev, query.data.boats)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // storage unavailable: keep in memory only
      }
      return next
    })
  }, [query.data])

  return { boats, error: query.data?.error ?? (query.isError ? String(query.error) : null), loading: query.isLoading }
}
