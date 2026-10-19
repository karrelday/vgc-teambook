import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { api } from '../api'

/* ---------- Champions moves, items and abilities (loaded once) ---------- */

let state = { moves: [], movesByName: {}, items: [], abilities: [], loaded: false, failed: false }
const listeners = new Set()
let loading = null

function load() {
  loading ||= api.calcMeta()
    .then(m => {
      const movesByName = Object.fromEntries(m.moves.map(mv => [mv.name.toLowerCase(), mv]))
      state = { ...m, movesByName, loaded: true, failed: false }
    })
    .catch(() => { state = { ...state, loaded: true, failed: true } })
    .finally(() => listeners.forEach(fn => fn()))
  return loading
}

export function useCalcMeta() {
  return useSyncExternalStore(
    fn => { listeners.add(fn); load(); return () => listeners.delete(fn) },
    () => state
  )
}

/* ---------- Turning a saved calc into what the server needs ---------- */

export const emptySide = source => ({ source, monId: '', species: '', preset: 'auto', nature: '', sp: {}, item: '', ability: '', boost: 0 })
export const emptyField = () => ({
  singles: false, helpingHand: false, crit: false, reflect: false, lightScreen: false,
  friendGuard: false, auroraVeil: false, weather: '', terrain: '',
})

/** Resolve one side. Your Pokémon use their current set, so saved calcs follow spread changes. */
export function resolveSide(side, team, role) {
  const boost = Number(side.boost) || 0
  const boosts = role === 'attacker' ? { atk: boost, spa: boost } : { def: boost, spd: boost }
  if (side.source === 'mine') {
    const mon = team.mons.find(m => m.id === side.monId)
    if (!mon) return { error: 'That Pokémon is no longer on the team' }
    return { species: mon.species, nature: mon.nature, sp: mon.spread || {}, item: mon.item, ability: mon.ability, boosts }
  }
  if (!side.species) return { error: 'Pick a Pokémon' }
  const preset = side.preset === 'auto' ? (role === 'attacker' ? 'offense' : 'bulk') : side.preset
  return {
    species: side.species,
    preset: preset === 'custom' ? undefined : preset,
    nature: side.nature,
    sp: side.sp || {},
    item: side.item,
    ability: side.ability,
    boosts,
  }
}

export function resolveCalc(c, team) {
  const attacker = resolveSide(c.attacker, team, 'attacker')
  const defender = resolveSide(c.defender, team, 'defender')
  const error = attacker.error || defender.error || (!c.move ? 'Pick a move' : '')
  return error ? { error } : { attacker, defender, move: c.move, field: c.field || {} }
}

export const sideSpecies = (side, team) =>
  side.source === 'mine' ? team.mons.find(m => m.id === side.monId)?.species || '' : side.species

/** Runs a batch of calcs on the server whenever their inputs change (debounced). */
export function useCalcResults(calcs, team, delay = 250) {
  const inputs = useMemo(() => calcs.map(c => resolveCalc(c, team)), [calcs, team])
  const key = JSON.stringify(inputs)
  const [results, setResults] = useState({ key: '', list: [] })
  const seq = useRef(0)

  useEffect(() => {
    const n = ++seq.current
    const runnable = inputs.map((x, i) => [x, i]).filter(([x]) => !x.error)
    if (!runnable.length) {
      setResults({ key, list: inputs.map(x => ({ ok: false, error: x.error })) })
      return
    }
    const t = setTimeout(() => {
      api.calc(runnable.map(([x]) => x))
        .then(out => {
          if (n !== seq.current) return
          const list = inputs.map(x => ({ ok: false, error: x.error }))
          runnable.forEach(([, i], j) => { list[i] = out[j] })
          setResults({ key, list })
        })
        .catch(e => n === seq.current && setResults({ key, list: inputs.map(() => ({ ok: false, error: e.message })) }))
    }, delay)
    return () => clearTimeout(t)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return { list: results.list, stale: results.key !== key }
}
