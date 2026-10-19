import { Router } from 'express'
import calcPkg from '@smogon/calc'

const { calculate, Generations, Pokemon, Move, Field } = calcPkg
const router = Router()

// Generation 0 in @smogon/calc is Pokémon Champions: Level 50, perfect IVs,
// spreads read as Stat Points, and Champions' own legal Pokémon, moves and items.
const gen = Generations.get(0)
const toId = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

let meta = null
router.get('/calc/meta', (req, res) => {
  meta ||= {
    moves: [...gen.moves]
      .filter(m => m.name !== '(No Move)')
      .map(m => ({ name: m.name, type: m.type, category: m.category, bp: m.basePower || 0 }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    items: [...gen.items].map(i => i.name).sort(),
    abilities: [...gen.abilities].map(a => a.name).sort(),
  }
  res.set('Cache-Control', 'public, max-age=86400').json(meta)
})

/* Spread presets for opponents you only know the species of */
function presetSpread(preset, role, move) {
  const special = move.category === 'Special'
  if (preset === 'offense' && role === 'attacker') {
    const stat = special ? 'spa' : 'atk'
    return { sp: { hp: 2, [stat]: 32, spe: 32 }, nature: special ? 'Modest' : 'Adamant' }
  }
  if (preset === 'bulk' && role === 'defender') {
    return special
      ? { sp: { hp: 32, def: 2, spd: 32 }, nature: 'Careful' }
      : { sp: { hp: 32, def: 32, spd: 2 }, nature: 'Impish' }
  }
  if (preset === 'none') return { sp: {}, nature: 'Serious' }
  return null
}

function makeMon(side, role, move) {
  if (!gen.species.get(toId(side.species))) {
    throw new Error(`${side.species || 'That Pokémon'} isn't in the Champions data`)
  }
  const p = presetSpread(side.preset, role, move)
  const opts = {
    nature: p?.nature ?? (side.nature || 'Serious'),
    evs: p?.sp ?? side.sp ?? {}, // read as Stat Points in Champions
    boosts: side.boosts || {},
  }
  if (side.item) opts.item = side.item
  if (side.ability) opts.ability = side.ability
  if (side.status) opts.status = side.status
  return new Pokemon(gen, side.species, opts)
}

function runOne({ attacker, defender, move: moveName, field = {} }) {
  if (!gen.moves.get(toId(moveName))) throw new Error(`${moveName || 'That move'} isn't in the Champions data`)
  const move = new Move(gen, moveName, { isCrit: !!field.crit })
  if (move.category === 'Status') throw new Error(`${move.name} is a status move, so it does no damage`)

  const atk = makeMon(attacker, 'attacker', move)
  const def = makeMon(defender, 'defender', move)
  const f = new Field({
    gameType: field.singles ? 'Singles' : 'Doubles',
    weather: field.weather || undefined,
    terrain: field.terrain || undefined,
    attackerSide: { isHelpingHand: !!field.helpingHand },
    defenderSide: {
      isReflect: !!field.reflect,
      isLightScreen: !!field.lightScreen,
      isFriendGuard: !!field.friendGuard,
      isAuroraVeil: !!field.auroraVeil,
    },
  })

  const result = calculate(gen, atk, def, move, f)
  const [min, max] = result.range()
  const hp = def.maxHP()
  const pct = n => Math.floor((n / hp) * 1000) / 10 // same rounding as Showdown

  let desc = ''
  let ko = ''
  try {
    desc = result.desc()
    ko = result.kochance().text || ''
  } catch {
    // The calc refuses to describe 0-damage results (immunities)
    desc = `${atk.name} ${move.name} vs. ${def.name}: no damage`
  }
  return {
    ok: true,
    min, max,
    minPct: pct(min),
    maxPct: pct(max),
    hp,
    ko: max === 0 ? 'Does not affect' : ko,
    desc,
    attackerAbility: atk.ability || '',
    defenderAbility: def.ability || '',
    moveType: move.type,
    category: move.category,
  }
}

router.post('/calc', (req, res) => {
  const list = Array.isArray(req.body?.calcs) ? req.body.calcs.slice(0, 100) : []
  res.json(
    list.map(c => {
      try {
        return runOne(c)
      } catch (e) {
        return { ok: false, error: e.message }
      }
    })
  )
})

export default router
