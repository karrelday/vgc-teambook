import { useEffect, useMemo, useState } from 'react'
import { spriteSources } from '../lib/image'

// Routes remote images through our API so they can be exported to PNG
const viaProxy = src => (/^https?:/.test(src) ? `/api/sprite?url=${encodeURIComponent(src)}` : src)

/** Shows the uploaded image, or falls back through Showdown sprites by species name. */
export default function MonImage({ mon, className = '', proxy = false }) {
  const sources = useMemo(() => {
    const list = mon?.image ? [mon.image] : spriteSources(mon?.species)
    return proxy ? list.map(viaProxy) : list
  }, [mon?.image, mon?.species, proxy])
  const [index, setIndex] = useState(0)
  useEffect(() => setIndex(0), [sources])

  if (!sources.length || index >= sources.length) {
    return (
      <div className={`mon-img placeholder ${className}`} role="img" aria-label={mon?.species || 'Empty slot'}>
        {mon?.species?.[0] ?? ''}
      </div>
    )
  }
  return (
    <img
      className={`mon-img ${className}`}
      src={sources[index]}
      alt={mon.species}
      title={mon.species}
      loading={proxy ? 'eager' : 'lazy'}
      onError={() => setIndex(i => i + 1)}
    />
  )
}
