import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import teams from './routes/teams.js'
import meta from './routes/meta.js'
import dex from './routes/dex.js'
import calc from './routes/calc.js'

const app = express()
app.use(cors())
// Images are stored as compressed data URLs inside team documents
app.use(express.json({ limit: '25mb' }))
app.use('/api/teams', teams)
app.use('/api', meta)
app.use('/api', dex)
app.use('/api', calc)

app.use((err, req, res, next) => {
  console.error(err)
  const status = err.name === 'ValidationError' ? 400 : err.status || 500
  res.status(status).json({ error: err.message || 'Server error' })
})

const PORT = process.env.PORT || 5050
const URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vgc-teambook'

mongoose
  .connect(URI)
  .then(() => app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`)))
  .catch(err => {
    console.error('Could not connect to MongoDB:', err.message)
    process.exit(1)
  })
