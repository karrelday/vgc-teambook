import { lookup } from './dex'

export const TYPES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground',
  'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy',
]

// Attacking type -> defending types it's super effective on, resisted by, and can't touch
const CHART = {
  Normal: { se: [], nve: ['Rock', 'Steel'], immune: ['Ghost'] },
  Fire: { se: ['Grass', 'Ice', 'Bug', 'Steel'], nve: ['Fire', 'Water', 'Rock', 'Dragon'], immune: [] },
  Water: { se: ['Fire', 'Ground', 'Rock'], nve: ['Water', 'Grass', 'Dragon'], immune: [] },
  Electric: { se: ['Water', 'Flying'], nve: ['Electric', 'Grass', 'Dragon'], immune: ['Ground'] },
  Grass: { se: ['Water', 'Ground', 'Rock'], nve: ['Fire', 'Grass', 'Poison', 'Flying', 'Bug', 'Dragon', 'Steel'], immune: [] },
  Ice: { se: ['Grass', 'Ground', 'Flying', 'Dragon'], nve: ['Fire', 'Water', 'Ice', 'Steel'], immune: [] },
  Fighting: { se: ['Normal', 'Ice', 'Rock', 'Dark', 'Steel'], nve: ['Poison', 'Flying', 'Psychic', 'Bug', 'Fairy'], immune: ['Ghost'] },
  Poison: { se: ['Grass', 'Fairy'], nve: ['Poison', 'Ground', 'Rock', 'Ghost'], immune: ['Steel'] },
  Ground: { se: ['Fire', 'Electric', 'Poison', 'Rock', 'Steel'], nve: ['Grass', 'Bug'], immune: ['Flying'] },
  Flying: { se: ['Grass', 'Fighting', 'Bug'], nve: ['Electric', 'Rock', 'Steel'], immune: [] },
  Psychic: { se: ['Fighting', 'Poison'], nve: ['Psychic', 'Steel'], immune: ['Dark'] },
  Bug: { se: ['Grass', 'Psychic', 'Dark'], nve: ['Fire', 'Fighting', 'Poison', 'Flying', 'Ghost', 'Steel', 'Fairy'], immune: [] },
  Rock: { se: ['Fire', 'Ice', 'Flying', 'Bug'], nve: ['Fighting', 'Ground', 'Steel'], immune: [] },
  Ghost: { se: ['Psychic', 'Ghost'], nve: ['Dark'], immune: ['Normal'] },
  Dragon: { se: ['Dragon'], nve: ['Steel'], immune: ['Fairy'] },
  Dark: { se: ['Psychic', 'Ghost'], nve: ['Fighting', 'Dark', 'Fairy'], immune: [] },
  Steel: { se: ['Ice', 'Rock', 'Fairy'], nve: ['Fire', 'Water', 'Electric', 'Steel'], immune: [] },
  Fairy: { se: ['Fighting', 'Dragon', 'Dark'], nve: ['Fire', 'Poison', 'Steel'], immune: [] },
}

// Abilities that change what a type does to the holder
const ABILITY_MODS = {
  levitate: { Ground: 0 },
  earthEater: { Ground: 0 },
  flashFire: { Fire: 0 },
  wellBakedBody: { Fire: 0 },
  waterAbsorb: { Water: 0 },
  stormDrain: { Water: 0 },
  drySkin: { Water: 0, Fire: 1.25 },
  voltAbsorb: { Electric: 0 },
  lightningRod: { Electric: 0 },
  motorDrive: { Electric: 0 },
  sapSipper: { Grass: 0 },
  thickFat: { Fire: 0.5, Ice: 0.5 },
  heatproof: { Fire: 0.5 },
  waterBubble: { Fire: 0.5 },
  purifyingSalt: { Ghost: 0.5 },
  fluffy: { Fire: 2 },
}
const abilityKey = a => (a || '').toLowerCase().replace(/[^a-z]/g, '')
const ABILITY_BY_ID = Object.fromEntries(Object.entries(ABILITY_MODS).map(([k, v]) => [k.toLowerCase(), v]))

export function typeMult(attackType, defTypes = []) {
  const row = CHART[attackType]
  if (!row) return 1
  return defTypes.reduce((m, t) => m * (row.immune.includes(t) ? 0 : row.se.includes(t) ? 2 : row.nve.includes(t) ? 0.5 : 1), 1)
}

/** Effectiveness against a Pokémon, including abilities like Levitate when known. */
export function multAgainst(attackType, defTypes, ability) {
  const base = typeMult(attackType, defTypes)
  const mod = ABILITY_BY_ID[abilityKey(ability)]?.[attackType]
  return mod === undefined ? base : base * mod
}

/** The ability a mon effectively has: what you typed, or its only ability (Megas have one). */
export function knownAbility(mon, entry) {
  if (mon?.ability) return mon.ability
  return entry?.abilities?.length === 1 ? entry.abilities[0] : ''
}

/** Types and effective ability of one of your mons, or null if the species isn't in the Pokédex. */
export function monTyping(mon, dex) {
  const entry = lookup(dex, mon.species)
  return entry ? { types: entry.types, ability: knownAbility(mon, entry) } : null
}

/** Defensive grid: for every attacking type, the multiplier on each of your mons. */
export function defensiveMatrix(mons, dex) {
  const typed = mons.map(m => ({ mon: m, typing: monTyping(m, dex) }))
  return TYPES.map(type => {
    const cells = typed.map(({ mon, typing }) => ({
      mon,
      mult: typing ? multAgainst(type, typing.types, typing.ability) : null,
    }))
    const known = cells.filter(c => c.mult !== null)
    const weak = known.filter(c => c.mult > 1).length
    const resist = known.filter(c => c.mult < 1).length
    return { type, cells, weak, resist, problem: weak >= 3 || (weak >= 2 && resist === 0) }
  })
}

/** Offense: for each type, the best multiplier any of your damaging moves gets against it. */
export function offensiveCoverage(mons, movesByName) {
  const attacks = []
  for (const m of mons) {
    for (const name of m.moves || []) {
      const mv = movesByName[(name || '').toLowerCase()]
      if (mv && mv.category !== 'Status' && mv.bp > 0) attacks.push({ mon: m, move: mv })
    }
  }
  return TYPES.map(type => {
    let best = attacks.length ? 0 : null
    const hitters = []
    for (const a of attacks) {
      const mult = typeMult(a.move.type, [type])
      if (mult > best) best = mult
      if (mult > 1) hitters.push(a)
    }
    return { type, best, hitters }
  })
}

export const multLabel = m => (m === null || m === undefined ? '?' : m === 0 ? '0' : m === 0.25 ? '¼' : m === 0.5 ? '½' : m === 1 ? '' : `${m}×`)
export const multClass = m =>
  m === null || m === undefined ? 'unknown' : m === 0 ? 'immune' : m < 1 ? 'resist' : m > 2 ? 'weak4' : m > 1 ? 'weak' : 'neutral'
