import { useQuery } from '@tanstack/react-query'
import { fetchSightings } from '../api/acartia'

const REFRESH_MS = 60_000

export function useSightings() {
  return useQuery({
    queryKey: ['sightings'],
    queryFn: fetchSightings,
    refetchInterval: REFRESH_MS,
    staleTime: REFRESH_MS / 2,
  })
}
