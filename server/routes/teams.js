import { Router } from 'express'
import mongoose from 'mongoose'
import Team from '../models/Team.js'

const router = Router()

// Strip fields the client should never set directly
const clean = ({ _id, __v, createdAt, updatedAt, ...rest } = {}) => rest
const notFound = res => res.status(404).json({ error: 'Team not found' })

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
  res.status(201).json(await Team.create(clean(req.body)))
})

router.put('/:id', async (req, res) => {
  const team = await Team.findByIdAndUpdate(req.params.id, clean(req.body), {
    new: true,
    runValidators: true,
  })
  team ? res.json(team) : notFound(res)
})

router.post('/:id/duplicate', async (req, res) => {
  const team = await Team.findById(req.params.id)
  if (!team) return notFound(res)
  const copy = clean(team.toObject())
  res.status(201).json(await Team.create({ ...copy, name: `${copy.name} (copy)`, matches: [] }))
})

router.delete('/:id', async (req, res) => {
  const team = await Team.findByIdAndDelete(req.params.id)
  team ? res.status(204).end() : notFound(res)
})

export default router
