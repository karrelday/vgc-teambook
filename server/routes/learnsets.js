import { Router } from 'express'
import { Dex } from '@pkmn/dex'
import * as champions from '@pkmn/mods/champions'

const router = Router()
const toId = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

// Showdown's Champions mod defines complete learnsets for every Champions Pokémon.
// Megas and other forms without their own fall back to the form they change from.
const dex = Dex.mod('champions', champions)
const L = champions.Learnsets
const cache = new Map()

function learnsetFor(name) {
  const s = dex.species.get(name)
  if (!s?.exists) return null
  const tries = [s.id, s.changesFrom && toId(s.changesFrom), toId(s.baseSpecies)].filter(Boolean)
  const id = tries.find(t => L[t]?.learnset)
  if (!id) return null
  return {
    species: s.name,
    from: dex.species.get(id).name,
    moves: Object.keys(L[id].learnset)
      .map(m => dex.moves.get(m))
      .filter(m => m.exists)
      .map(m => ({ name: m.name, type: m.type, category: m.category, bp: m.basePower || 0 }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }
}

router.get('/learnset/:species', (req, res) => {
  const key = toId(req.params.species)
  if (!cache.has(key)) cache.set(key, learnsetFor(req.params.species))
  const data = cache.get(key)
  res.set('Cache-Control', 'no-cache')
  data ? res.json({ champions: true, ...data }) : res.json({ champions: false, species: req.params.species, moves: [] })
})

export default router
