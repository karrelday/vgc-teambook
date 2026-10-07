import { useEffect, useMemo, useState } from 'react'
import { spriteSources } from '../lib/image'

/** Shows the uploaded image, or falls back through Showdown sprites by species name. */
export default function MonImage({ mon, className = '' }) {
  const sources = useMemo(
    () => (mon?.image ? [mon.image] : spriteSources(mon?.species)),
    [mon?.image, mon?.species]
  )
  const [index, setIndex] = useState(0)
  useEffect(() => setIndex(0), [sources])

  if (!sources.length || index >= sources.length) {
    return (
      <div className={`mon-img placeholder ${className}`} aria-label={mon?.species || 'Empty slot'}>
        {mon?.species?.[0] ?? ''}
      </div>
    )
  }
  return (
    <img
      className={`mon-img ${className}`}
      src={sources[index]}
      alt={mon.species}
      loading="lazy"
      onError={() => setIndex(i => i + 1)}
    />
  )
}
