import { useEffect, useState } from 'react'

// One request per species, shared by every component that asks
const cache = new Map()
const key = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

function fetchLearnset(species) {
  const k = key(species)
  if (!cache.has(k)) {
    cache.set(k, fetch(`/api/learnset/${encodeURIComponent(species.trim())}`)
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null))
  }
  return cache.get(k)
}

/**
 * The Pokémon's Champions learnset.
 * Returns null while loading, or when the species isn't in Champions (then nothing is flagged).
 */
export function useLearnset(species) {
  const [data, setData] = useState(null)
  useEffect(() => {
    let live = true
    setData(null)
    if (!key(species)) return
    fetchLearnset(species).then(d => live && setData(d?.champions ? d : null))
    return () => { live = false }
  }, [key(species)]) // eslint-disable-line react-hooks/exhaustive-deps

  const names = data ? new Set(data.moves.map(m => m.name.toLowerCase())) : null
  return {
    learnset: data,
    /** true when the move is fine (or we can't tell) */
    canLearn: move => !names || !move?.trim() || names.has(move.trim().toLowerCase()),
  }
}
