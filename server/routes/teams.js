import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'
import Team from '../models/Team.js'

const router = Router()

// Strip fields the client should never set directly
const clean = ({ _id, __v, createdAt, updatedAt, ...rest } = {}) => rest
const notFound = res => res.status(404).json({ error: 'Team not found' })
const firstVersion = note => [{ id: randomUUID(), number: 1, note, startedAt: new Date().toISOString(), mons: [] }]

router.param('id', (req, res, next, id) =>
  mongoose.isValidObjectId(id) ? next() : notFound(res)
)

router.get('/', async (req, res) => {
  res.json(await Team.find().sort({ updatedAt: -1 }))
})

router.get('/:id', async (req, res) => {
  const team = await Team.findById(req.params.id)
  team ? res.json(team) : notFound(res)
})

router.post('/', async (req, res) => {
  const data = clean(req.body)
  if (!data.versions?.length) data.versions = firstVersion('First version')
  res.status(201).json(await Team.create(data))
})

// Saves carry the updatedAt of the copy they were made from. If the team has been
// saved since (another tab or device), the save is refused so it can't erase newer data.
router.put('/:id', async (req, res) => {
  const filter = { _id: req.params.id }
  const seen = req.body?.updatedAt ? new Date(req.body.updatedAt) : null
  if (seen && !Number.isNaN(seen.getTime())) filter.updatedAt = seen

  const team = await Team.findOneAndUpdate(filter, clean(req.body), { new: true, runValidators: true })
  if (team) return res.json(team)

  const current = await Team.findById(req.params.id)
  if (!current) return notFound(res)
  res.status(409).json({ error: 'This team was changed somewhere else.', team: current })
})

router.post('/:id/duplicate', async (req, res) => {
  const team = await Team.findById(req.params.id)
  if (!team) return notFound(res)
  const copy = clean(team.toObject())
  res.status(201).json(
    await Team.create({
      ...copy,
      name: `${copy.name} (copy)`,
      matches: [],
      versions: firstVersion(`Copied from ${copy.name}`),
    })
  )
})

router.delete('/:id', async (req, res) => {
  const team = await Team.findByIdAndDelete(req.params.id)
  team ? res.status(204).end() : notFound(res)
})

export default router
