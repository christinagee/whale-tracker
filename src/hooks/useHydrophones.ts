import { useQuery } from '@tanstack/react-query'
import { fetchDetections, fetchHydrophones } from '../api/orcasound'

export function useHydrophones() {
  return useQuery({
    queryKey: ['hydrophones'],
    queryFn: fetchHydrophones,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  })
}

export function useDetections() {
  return useQuery({
    queryKey: ['detections'],
    queryFn: fetchDetections,
    refetchInterval: 60_000,
    retry: 1,
  })
}
