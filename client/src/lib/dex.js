import { useSyncExternalStore } from 'react'
import { STATS } from './model'

// Showdown's species ids: "Basculegion-F" -> "basculegionf", "Mr. Mime" -> "mrmime"
export const toId = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

/* ---------- Store: loads /api/dex once and shares it app-wide ---------- */

let state = { byId: {}, names: [], loaded: false, failed: false }
const listeners = new Set()
let loading = null

function load() {
  loading ||= fetch('/api/dex')
    .then(r => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
    .then(list => {
      const byId = {}
      for (const s of list) byId[toId(s.name)] = s
      state = { byId, names: list.map(s => s.name), loaded: true, failed: false }
    })
    .catch(() => {
      // Without the Pokédex, final stats fall back to manual entry
      state = { ...state, loaded: true, failed: true }
    })
    .finally(() => listeners.forEach(fn => fn()))
  return loading
}

export function useDex() {
  return useSyncExternalStore(
    fn => {
      listeners.add(fn)
      load()
      return () => listeners.delete(fn)
    },
    () => state
  )
}

export const lookup = (dex, species) => dex.byId[toId(species)] || null

/* ---------- Natures ---------- */

const NATURE_MODS = {
  Lonely: ['atk', 'def'], Brave: ['atk', 'spe'], Adamant: ['atk', 'spa'], Naughty: ['atk', 'spd'],
  Bold: ['def', 'atk'], Relaxed: ['def', 'spe'], Impish: ['def', 'spa'], Lax: ['def', 'spd'],
  Timid: ['spe', 'atk'], Hasty: ['spe', 'def'], Jolly: ['spe', 'spa'], Naive: ['spe', 'spd'],
  Modest: ['spa', 'atk'], Mild: ['spa', 'def'], Quiet: ['spa', 'spe'], Rash: ['spa', 'spd'],
  Calm: ['spd', 'atk'], Gentle: ['spd', 'def'], Sassy: ['spd', 'spe'], Careful: ['spd', 'spa'],
}

/** [boosted stat, lowered stat], or [] for neutral / unknown natures */
export function natureMods(nature) {
  const key = Object.keys(NATURE_MODS).find(n => n.toLowerCase() === (nature || '').trim().toLowerCase())
  return key ? NATURE_MODS[key] : []
}

/* ---------- Champions stat formula (Level 50, perfect IVs, 1 SP = +1) ---------- */

export function calcStat(key, base, sp = 0, natureMult = 1) {
  if (key === 'hp') return base === 1 ? 1 : base + 75 + sp // Shedinja stays at 1
  return Math.floor((base + 20 + sp) * natureMult)
}

export function calcStats(base, spread = {}, nature) {
  const [plus, minus] = natureMods(nature)
  return Object.fromEntries(
    STATS.map(([k]) => [k, calcStat(k, base[k], spread[k] || 0, k === plus ? 1.1 : k === minus ? 0.9 : 1)])
  )
}

/** Final stats for a mon: calculated when the species is in the Pokédex, otherwise what was typed in. */
export function finalStats(mon, dex) {
  const entry = lookup(dex, mon?.species)
  if (entry) return { stats: calcStats(entry.base, mon.spread, mon.nature), auto: true, entry }
  return { stats: mon?.stats || {}, auto: false, entry: null }
}

/** Speed benchmarks for an opponent you only know the species of. */
export const speedBenchmarks = base => ({
  max: Math.floor((base + 52) * 1.1), // 32 SP, +Spe nature
  neutral: base + 52,                 // 32 SP, neutral nature
  none: base + 20,                    // 0 SP, neutral nature
  min: Math.floor((base + 20) * 0.9), // 0 SP, -Spe nature (Trick Room)
})
