import mongoose from 'mongoose'
const { Schema } = mongoose

const statBlock = {
  hp: Number, atk: Number, def: Number, spa: Number, spd: Number, spe: Number,
}

const monSchema = new Schema(
  {
    id: { type: String, required: true },
    species: { type: String, default: '' },
    nickname: String,
    image: String, // data URL or remote URL; empty = auto sprite
    item: String,
    ability: String,
    teraType: String,
    nature: String,
    level: { type: Number, default: 50 },
    moves: [String],
    spread: statBlock, // EVs / stat points, whatever the format uses
    stats: statBlock,  // final stats, filled in by hand
    notes: String,
  },
  { _id: false }
)

const planSchema = new Schema(
  {
    id: { type: String, required: true },
    label: String,
    leads: [String], // mon ids
    back: [String],
    strategy: String,
  },
  { _id: false }
)

const matchSchema = new Schema(
  {
    id: { type: String, required: true },
    result: { type: String, enum: ['W', 'L'], required: true },
    date: String, // YYYY-MM-DD
    opponent: String,
    planId: String,
    event: String,
    notes: String,
  },
  { _id: false }
)

const teamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    format: String,
    summary: String,
    mons: {
      type: [monSchema],
      validate: { validator: v => v.length <= 6, message: 'A team can have at most 6 Pokémon' },
    },
    plans: [planSchema],
    matches: [matchSchema],
    notes: { howItPlays: String, weaknesses: String, piloting: String },
  },
  { timestamps: true }
)

export default mongoose.model('Team', teamSchema)
