import { PODS, type PodKey } from '../lib/species'

export function PodBadges({ pods }: { pods: PodKey[] }) {
  if (pods.length === 0) return null
  return (
    <span className="pod-badges">
      {pods.map((p) => (
        <span key={p} className={`pod-badge pod-${p}`} title={PODS[p].name}>
          {PODS[p].name}
        </span>
      ))}
    </span>
  )
}
