import { finalStats, lookup, speedBenchmarks, toId, useDex } from '../lib/dex'
import { usePersistentState } from '../lib/persist'
import { opponentStats } from '../lib/stats'
import MonImage from './MonImage'
import SpeciesInput from './SpeciesInput'

const ASSUME = [
  ['max', 'Fastest', '32 SP, +Spe nature'],
  ['neutral', 'Max neutral', '32 SP, neutral nature'],
  ['none', 'No investment', '0 SP, neutral nature'],
  ['min', 'Slowest', '0 SP, −Spe nature'],
]
const STAGES = [6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6]

const DEFAULTS = {
  twYou: false, twThem: false, trickRoom: false, assume: 'max',
  withThreats: true, withFaced: true, stages: {},
}

const hasScarf = mon => /choice\s*scarf/i.test(mon.item || '')
const stageMult = n => (n >= 0 ? (2 + n) / 2 : 2 / (2 - n))
const fmtStage = n => (n > 0 ? `+${n}` : `${n}`)
const names = list => (list.length > 3 ? `${list.slice(0, 3).join(', ')} +${list.length - 3}` : list.join(', '))

/** Speed after stat stages, Choice Scarf and Tailwind, in the order the games apply them. */
function effectiveSpeed(raw, { stage = 0, scarf = false, tailwind = false }) {
  let s = Math.floor(raw * stageMult(stage))
  if (scarf) s = Math.floor(s * 1.5)
  if (tailwind) s *= 2
  return s
}

export default function Speed({ team, save, species, onPick }) {
  const dex = useDex()
  // Settings and stages survive tab switches and refreshes, so they hold up mid-game
  const [opts, setOpts] = usePersistentState(`teambook:speed:${team._id}`, DEFAULTS)
  const o = { ...DEFAULTS, ...opts }
  const set = (k, v) => setOpts(p => ({ ...DEFAULTS, ...p, [k]: v }))
  const setStage = (key, n) => setOpts(p => ({ ...DEFAULTS, ...p, stages: { ...(p?.stages || {}), [key]: n } }))
  const targets = team.speedTargets || []

  if (!dex.loaded) return <p className="muted">Loading Pokédex</p>

  /* ----- Your side ----- */
  const yours = team.mons.map(mon => {
    const raw = finalStats(mon, dex).stats?.spe
    if (raw == null) return { side: 'you', key: mon.id, mon, speed: null }
    const stage = o.stages[mon.id] || 0
    const scarf = hasScarf(mon)
    const tags = [stage ? fmtStage(stage) : null, scarf ? 'Scarf' : null, o.twYou ? 'Tailwind' : null].filter(Boolean)
    return { side: 'you', key: mon.id, mon, stage, speed: effectiveSpeed(raw, { stage, scarf, tailwind: o.twYou }), tags }
  })

  /* ----- Their side: added Pokémon, threats, and Pokémon you've faced ----- */
  const sources = new Map()
  const add = (name, label) => {
    const id = toId(name)
    if (!id) return
    if (sources.has(id)) sources.get(id).labels.push(label)
    else sources.set(id, { name: name.trim(), labels: [label] })
  }
  targets.forEach(n => add(n, 'added'))
  if (o.withThreats) (team.threats || []).forEach(t => add(t.species, 'threat'))
  if (o.withFaced) {
    opponentStats(team.matches).rows
      .sort((a, b) => b.games - a.games)
      .slice(0, 12)
      .forEach(r => add(r.species, `faced ${r.games}×`))
  }

  const theirs = []
  const unknown = []
  for (const [id, src] of sources) {
    const entry = lookup(dex, src.name)
    if (!entry) { unknown.push(src.name); continue }
    const stage = o.stages[`them:${id}`] || 0
    const speed = effectiveSpeed(speedBenchmarks(entry.base.spe)[o.assume], { stage, tailwind: o.twThem })
    theirs.push({ side: 'them', key: `them:${id}`, species: entry.name, base: entry.base.spe, stage, speed, labels: src.labels })
  }

  /* ----- Ladder: fastest first, or slowest first under Trick Room ----- */
  const ranked = [...yours.filter(r => r.speed != null), ...theirs].sort(
    (a, b) =>
      (o.trickRoom ? a.speed - b.speed : b.speed - a.speed) ||
      (a.side === b.side ? 0 : a.side === 'you' ? -1 : 1)
  )
  const before = (a, b) => (o.trickRoom ? a < b : a > b)
  const noteFor = r => ({
    ahead: theirs.filter(t => before(r.speed, t.speed)),
    ties: theirs.filter(t => t.speed === r.speed),
    behind: theirs.filter(t => before(t.speed, r.speed)),
  })
  const missing = yours.filter(r => r.speed == null)
  const anyStage = Object.values(o.stages).some(Boolean)

  const toggle = (k, label) => (
    <button type="button" aria-pressed={o[k]} className={`btn sm ${o[k] ? 'on' : 'ghost'}`} onClick={() => set(k, !o[k])}>{label}</button>
  )

  return (
    <section className="speed">
      <div className="speed-controls panel">
        <h2>Speed</h2>
        <div className="control-row">
          <span className="control-label">Field</span>
          <div className="seg">
            {toggle('twYou', 'Your Tailwind')}
            {toggle('twThem', 'Their Tailwind')}
            {toggle('trickRoom', 'Trick Room')}
          </div>
        </div>
        <div className="control-row">
          <span className="control-label">Assume they run</span>
          <div className="seg" role="radiogroup" aria-label="Opponent speed investment">
            {ASSUME.map(([v, l, hint]) => (
              <button key={v} type="button" role="radio" aria-checked={o.assume === v} title={hint}
                className={`btn sm ${o.assume === v ? 'on' : 'ghost'}`} onClick={() => set('assume', v)}>{l}</button>
            ))}
          </div>
          <span className="hint">{ASSUME.find(a => a[0] === o.assume)[2]}</span>
        </div>
        <div className="control-row wide">
          <span className="control-label">Compare against</span>
          <div className="grow">
            <SpeciesInput label="Pokémon to compare against" value={targets} onChange={list => save({ ...team, speedTargets: list })}
              suggestions={species} max={20} placeholder="Add a Pokémon, press Enter" />
            <div className="row">
              <label className="check">
                <input type="checkbox" checked={o.withThreats} onChange={e => set('withThreats', e.target.checked)} />
                Your threats
              </label>
              <label className="check">
                <input type="checkbox" checked={o.withFaced} onChange={e => set('withFaced', e.target.checked)} />
                Pokémon you've faced most
              </label>
              {anyStage && (
                <button type="button" className="btn ghost sm" onClick={() => set('stages', {})}>Reset all stages</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {missing.length > 0 && (
        <p className="hint">
          No Speed stat for {missing.map(r => r.mon.species || 'an unnamed Pokémon').join(', ')}.
          Fix the species name or type its final stats in the Team tab.
        </p>
      )}
      {theirs.length === 0 && (
        <p className="hint">Add Pokémon above, list threats, or log games with their team preview to see how your team lines up.</p>
      )}

      <ol className="ladder">
        {ranked.map(r =>
          r.side === 'you' ? (
            <li key={r.key} className="rung you">
              <span className="spd">{r.speed}</span>
              <MonImage mon={r.mon} className="md" />
              <div className="rung-body">
                <p className="rung-name">{r.mon.species}{r.tags.length > 0 && <span className="rung-tags">{r.tags.join(' + ')}</span>}</p>
                {theirs.length > 0 && <YourNote {...noteFor(r)} total={theirs.length} trickRoom={o.trickRoom} />}
              </div>
              <StageSelect value={r.stage} onChange={n => setStage(r.key, n)} label={`Your ${r.mon.species}`} />
            </li>
          ) : (
            <li key={r.key} className="rung them">
              <span className="spd">{r.speed}</span>
              <MonImage mon={{ species: r.species }} className="sm" />
              <div className="rung-body">
                <p className="rung-name">{r.species}{r.stage !== 0 && <span className="rung-tags">{fmtStage(r.stage)}</span>}</p>
                <span className="rung-meta">Base {r.base}, {r.labels.join(', ')}</span>
              </div>
              <div className="rung-actions">
                {onPick && <button type="button" className="btn ghost sm" onClick={() => onPick(r.species)} title={`Load ${r.species} into the calculator`}>Calc</button>}
                <StageSelect value={r.stage} onChange={n => setStage(r.key, n)} label={`Their ${r.species}`} />
              </div>
            </li>
          )
        )}
      </ol>

      {unknown.length > 0 && <p className="hint">Not in the Pokédex, so left out: {unknown.join(', ')}.</p>}
    </section>
  )
}

function StageSelect({ value, onChange, label }) {
  return (
    <select className={`stage ${value > 0 ? 'up' : value < 0 ? 'down' : ''}`} value={value}
      onChange={e => onChange(Number(e.target.value))} aria-label={`${label} Speed stage`} title="Speed stage">
      {STAGES.map(n => <option key={n} value={n}>{n === 0 ? '±0' : fmtStage(n)}</option>)}
    </select>
  )
}

function YourNote({ ahead, ties, behind, total, trickRoom }) {
  const verb = trickRoom ? 'Moves before' : 'Outspeeds'
  return (
    <p className="rung-note">
      <strong>{verb} {ahead.length} of {total}</strong>
      {ties.length > 0 && <span className="tie">. Speed tie with {names(ties.map(t => t.species))}</span>}
      {behind.length > 0 && behind.length <= 4 && (
        <span className="muted">. {trickRoom ? 'Moves after' : 'Slower than'} {names(behind.map(t => t.species))}</span>
      )}
    </p>
  )
}
