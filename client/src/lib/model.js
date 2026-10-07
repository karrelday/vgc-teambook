export const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  Date.now().toString(36) + Math.random().toString(36).slice(2, 10)

// Pokémon Champions rules: everything is Level 50, spreads use Stat Points.
// Flip TERA_ENABLED to true once a regulation allows Terastallization.
export const TERA_ENABLED = false
export const SP_MAX_STAT = 32
export const SP_MAX_TOTAL = 66

// Official HOME rule: first SP costs 4 EVs, each extra SP costs 8
export const evToSp = ev => (!ev || ev < 4 ? 0 : Math.min(SP_MAX_STAT, Math.floor((ev - 4) / 8) + 1))
export const spToEv = sp => (!sp ? 0 : Math.min(252, 4 + (sp - 1) * 8))

export const STATS = [
  ['hp', 'HP'], ['atk', 'Atk'], ['def', 'Def'],
  ['spa', 'SpA'], ['spd', 'SpD'], ['spe', 'Spe'],
]

const blankStats = () => Object.fromEntries(STATS.map(([k]) => [k, null]))

export const emptyMon = () => ({
  id: uid(),
  species: '',
  nickname: '',
  image: '',
  item: '',
  ability: '',
  teraType: '',
  nature: '',
  moves: ['', '', '', ''],
  spread: blankStats(),
  stats: blankStats(),
  notes: '',
})

export const emptyPlan = () => ({ id: uid(), label: '', leads: [], back: [], strategy: '' })

export function record(matches = []) {
  const w = matches.filter(m => m.result === 'W').length
  const total = matches.length
  return { w, l: total - w, total, rate: total ? Math.round((w / total) * 100) : null }
}

export const spreadText = mon =>
  STATS.filter(([k]) => mon.spread?.[k]).map(([k, l]) => `${mon.spread[k]} ${l}`).join(' / ')

export const spreadTotal = mon => STATS.reduce((sum, [k]) => sum + (mon.spread?.[k] || 0), 0)

export const TYPES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground',
  'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy', 'Stellar',
]

export const NATURES = [
  'Adamant', 'Bashful', 'Bold', 'Brave', 'Calm', 'Careful', 'Docile', 'Gentle', 'Hardy',
  'Hasty', 'Impish', 'Jolly', 'Lax', 'Lonely', 'Mild', 'Modest', 'Naive', 'Naughty',
  'Quiet', 'Quirky', 'Rash', 'Relaxed', 'Sassy', 'Serious', 'Timid',
]
