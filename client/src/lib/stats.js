import { STATS, record } from './model'

export const norm = s => (s || '').trim().toLowerCase()
export const pct = (w, n) => (n ? Math.round((w / n) * 100) : null)

/* ---------- Versions ---------- */

export const currentVersion = team => team.versions?.[team.versions.length - 1]

/** The roster a version was played with. The current version uses the live roster. */
export function rosterOf(team, versionId) {
  const v = team.versions?.find(x => x.id === versionId)
  if (!v || v.id === currentVersion(team)?.id) return team.mons
  return v.mons || []
}

/** Every mon that has ever been on the team, by id (so old games still show sprites). */
export function monIndex(team) {
  const idx = {}
  for (const v of team.versions || []) for (const m of v.mons || []) idx[m.id] = m
  for (const m of team.mons) idx[m.id] = m
  return idx
}

export const matchesIn = (team, versionId) =>
  versionId ? team.matches.filter(m => m.versionId === versionId) : team.matches

const setKey = m => ({
  item: norm(m.item),
  ability: norm(m.ability),
  nature: norm(m.nature),
  moves: (m.moves || []).filter(Boolean).map(norm).sort().join('|'),
  SP: STATS.map(([k]) => m.spread?.[k] || 0).join('/'),
})

/** Human-readable roster changes between two rosters. */
export function diffMons(prev = [], next = []) {
  const changes = []
  const prevById = Object.fromEntries(prev.map(m => [m.id, m]))
  const nextIds = new Set(next.map(m => m.id))

  for (const m of prev) {
    if (!nextIds.has(m.id)) changes.push({ type: 'removed', text: `Removed ${m.species}` })
  }
  for (const m of next) {
    const old = prevById[m.id]
    if (!old) {
      changes.push({ type: 'added', text: `Added ${m.species}` })
    } else if (norm(old.species) !== norm(m.species)) {
      changes.push({ type: 'swapped', text: `${old.species} → ${m.species}` })
    } else {
      const a = setKey(old)
      const b = setKey(m)
      const fields = Object.keys(a).filter(k => a[k] !== b[k])
      if (fields.length) changes.push({ type: 'changed', text: `${m.species}: ${fields.join(', ')} changed` })
    }
  }
  return changes
}

/* ---------- Game plans ---------- */

const sameSet = (a = [], b = []) => a.length === b.length && a.every(x => b.includes(x))

/** A game counts for a plan when the leads match (and the back too, if the plan names one). */
export function planMatches(plan, game) {
  if (!plan.leads.length || !sameSet(plan.leads, game.leads)) return false
  if (!plan.back.length) return true
  const back = (game.brought || []).filter(id => !game.leads.includes(id))
  return sameSet(plan.back, back)
}

/* ---------- Match stats ---------- */

export function monStats(team, matches) {
  const idx = monIndex(team)
  const rows = {}
  const logged = matches.filter(m => m.brought?.length)
  for (const g of logged) {
    for (const id of g.brought) {
      const r = (rows[id] ||= { id, mon: idx[id], games: 0, w: 0, leadGames: 0, leadW: 0 })
      r.games++
      if (g.result === 'W') r.w++
      if (g.leads?.includes(id)) {
        r.leadGames++
        if (g.result === 'W') r.leadW++
      }
    }
  }
  return {
    logged: logged.length,
    rows: Object.values(rows).filter(r => r.mon).sort((a, b) => b.games - a.games),
  }
}

export function leadStats(matches) {
  const groups = {}
  const logged = matches.filter(m => m.leads?.length === 2)
  for (const g of logged) {
    const ids = [...g.leads].sort()
    const r = (groups[ids.join('|')] ||= { key: ids.join('|'), ids, games: 0, w: 0 })
    r.games++
    if (g.result === 'W') r.w++
  }
  return { logged: logged.length, rows: Object.values(groups).sort((a, b) => b.games - a.games) }
}

export function opponentStats(matches) {
  const rows = {}
  const logged = matches.filter(m => m.opponentTeam?.length)
  for (const g of logged) {
    const seen = new Set()
    for (const sp of g.opponentTeam) {
      const k = norm(sp)
      if (!k || seen.has(k)) continue
      seen.add(k)
      const r = (rows[k] ||= { key: k, species: sp.trim(), games: 0, w: 0 })
      r.games++
      if (g.result === 'W') r.w++
    }
  }
  return { logged: logged.length, rows: Object.values(rows) }
}

export const recordVs = (matches, species) =>
  record(matches.filter(m => m.opponentTeam?.some(s => norm(s) === norm(species))))

/** Newest first: by date, then most recently logged. */
export const newestFirst = matches =>
  matches
    .map((m, i) => [m, i])
    .sort((a, b) => (b[0].date || '').localeCompare(a[0].date || '') || b[1] - a[1])
    .map(([m]) => m)
