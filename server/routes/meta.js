import { Router } from 'express'
import Team from '../models/Team.js'

const router = Router()

// Every species name you've used anywhere, for type-ahead suggestions
router.get('/species', async (req, res) => {
  const lists = await Promise.all([
    Team.distinct('mons.species'),
    Team.distinct('versions.mons.species'),
    Team.distinct('matches.opponentTeam'),
    Team.distinct('threats.species'),
  ])
  const seen = new Map()
  for (const s of lists.flat()) {
    const name = (s || '').trim()
    if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name)
  }
  res.json([...seen.values()].sort((a, b) => a.localeCompare(b)))
})

// Image proxy so the share card can be exported to PNG.
// Browsers refuse to export images loaded straight from other sites.
// If you ever host this publicly, restrict which hosts are allowed here.
router.get('/sprite', async (req, res) => {
  let url
  try {
    url = new URL(req.query.url)
  } catch {
    return res.status(400).json({ error: 'Invalid image URL' })
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    return res.status(400).json({ error: 'Invalid image URL' })
  }

  let upstream
  try {
    upstream = await fetch(url, { signal: AbortSignal.timeout(8000) })
  } catch {
    return res.status(502).json({ error: 'Could not load image' })
  }
  const type = upstream.headers.get('content-type') || ''
  if (!upstream.ok || !type.startsWith('image/')) {
    return res.status(404).json({ error: 'Image not found' })
  }
  const body = Buffer.from(await upstream.arrayBuffer())
  if (body.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'Image too large' })

  res.set('Content-Type', type).set('Cache-Control', 'public, max-age=86400').send(body)
})

export default router
