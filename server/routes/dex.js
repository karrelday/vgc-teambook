import { Router } from 'express'
import { Dex } from '@pkmn/dex'

const router = Router()

// Slim Pokédex (name, types, base stats) from Showdown's own data, built once.
// Includes the Champions / Legends Z-A Megas (marked "Future" in Showdown's data).
let cache = null
function build() {
  const out = []
  for (const s of Dex.species.all()) {
    if (!s.exists || s.isNonstandard === 'CAP' || s.isNonstandard === 'Custom' || s.num <= 0) continue
    out.push({ name: s.name, types: s.types, base: s.baseStats, abilities: Object.values(s.abilities) })
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

router.get('/dex', (req, res) => {
  cache ||= build()
  res.set('Cache-Control', 'public, max-age=86400').json(cache)
})

export default router
