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
    moves: [String],
    spread: statBlock, // Stat Points
    stats: statBlock,  // final stats, filled in by hand
    notes: String,
  },
  { _id: false }
)

// A version's `mons` is its frozen roster. The current (last) version's roster is team.mons.
const versionSchema = new Schema(
  {
    id: { type: String, required: true },
    number: { type: Number, required: true },
    note: String,
    startedAt: String,
    mons: [monSchema],
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
    event: String,
    opponentName: String,
    versionId: String,
    tournamentId: String,
    round: String,          // e.g. "R3", "Top 8"; games with the same round form a set
    brought: [String],      // up to 4 mon ids
    leads: [String],        // 2 of the brought mon ids
    opponentTeam: [String], // species from team preview
    notes: String,
  },
  { _id: false }
)

const threatSchema = new Schema(
  {
    id: { type: String, required: true },
    species: { type: String, required: true },
    howToPlay: String,
  },
  { _id: false }
)

const tournamentSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    date: String,
    bestOf: { type: Number, enum: [1, 3], default: 3 },
    placement: String,
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
    versions: [versionSchema],
    plans: [planSchema],
    matches: [matchSchema],
    threats: [threatSchema],
    tournaments: [tournamentSchema],
    speedTargets: [String], // extra Pokémon to compare against on the Speed tab
    tags: [{ type: String, trim: true }],
    archived: { type: Boolean, default: false },
    notes: { howItPlays: String, weaknesses: String, piloting: String },
  },
  { timestamps: true }
)

export default mongoose.model('Team', teamSchema)
