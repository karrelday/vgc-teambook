import { STATS, record, uid } from './model'

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

/** The mon a game actually used: looked up in that game's version first. */
export function monAt(team, versionId, id) {
  return rosterOf(team, versionId).find(m => m.id === id) || monIndex(team)[id]
}

/** Freeze the current roster into the current version and start the next one. Returns a new team. */
export function startNewVersion(team, note = '') {
  const cur = currentVersion(team)
  const versions = team.versions.map(v => (v.id === cur.id ? { ...v, mons: structuredClone(team.mons) } : v))
  versions.push({ id: uid(), number: cur.number + 1, note: note.trim(), startedAt: new Date().toISOString(), mons: [] })
  return { ...team, versions }
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
  const rows = {}
  const logged = matches.filter(m => m.brought?.length)
  for (const g of logged) {
    for (const id of g.brought) {
      const mon = monAt(team, g.versionId, id)
      if (!mon) continue
      // Same slot edited into a different species (Basculegion -> Milotic) gets its own row
      const key = `${id}|${norm(mon.species)}`
      const r = (rows[key] ||= { id: key, mon, games: 0, w: 0, leadGames: 0, leadW: 0 })
      r.games++
      if (g.result === 'W') r.w++
      if (g.leads?.includes(id)) {
        r.leadGames++
        if (g.result === 'W') r.leadW++
      }
    }
  }
  return { logged: logged.length, rows: Object.values(rows).sort((a, b) => b.games - a.games) }
}

export function leadStats(team, matches) {
  const groups = {}
  const logged = matches.filter(m => m.leads?.length === 2)
  for (const g of logged) {
    const mons = g.leads.map(id => monAt(team, g.versionId, id)).filter(Boolean)
    if (mons.length !== 2) continue
    mons.sort((a, b) => a.species.localeCompare(b.species))
    const key = mons.map(m => norm(m.species)).join('|')
    const r = (groups[key] ||= { key, mons, games: 0, w: 0 })
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

/* ---------- Tournaments ---------- */

/** Games in a tournament grouped into sets by round (or opponent, when no round was typed). */
export function tournamentSets(team, tournamentId) {
  const sets = new Map()
  team.matches.forEach((g, order) => {
    if (g.tournamentId !== tournamentId) return
    const key = norm(g.round) || (g.opponentName ? `opp:${norm(g.opponentName)}` : `game:${g.id}`)
    const s = sets.get(key) || { key, order, round: g.round || '', opponentName: '', opponentTeam: [], games: [] }
    s.games.push(g)
    if (!s.opponentName && g.opponentName) s.opponentName = g.opponentName
    if (!s.opponentTeam.length && g.opponentTeam?.length) s.opponentTeam = g.opponentTeam
    sets.set(key, s)
  })
  return [...sets.values()]
    .sort((a, b) => a.order - b.order)
    .map(s => {
      const w = s.games.filter(g => g.result === 'W').length
      const l = s.games.length - w
      return { ...s, w, l, result: w > l ? 'W' : l > w ? 'L' : 'T' }
    })
}

export function tournamentSummary(team, tournamentId) {
  const sets = tournamentSets(team, tournamentId)
  const games = sets.flatMap(s => s.games)
  return {
    sets,
    setW: sets.filter(s => s.result === 'W').length,
    setL: sets.filter(s => s.result === 'L').length,
    gameW: games.filter(g => g.result === 'W').length,
    gameL: games.filter(g => g.result === 'L').length,
  }
}

/** "R3" -> "R4", "Round 2" -> "Round 3". Top cut labels like "Top 8" are left alone. */
export const nextRound = round => {
  const m = (round || '').trim().match(/^((?:r|round|swiss)\s*)(\d+)$/i)
  return m ? `${m[1]}${Number(m[2]) + 1}` : round || 'R1'
}
