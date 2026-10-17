import { useState } from 'react'
import { finalStats, lookup, speedBenchmarks, toId, useDex } from '../lib/dex'
import { opponentStats } from '../lib/stats'
import MonImage from './MonImage'
import SpeciesInput from './SpeciesInput'

const ASSUME = [
  ['max', 'Fastest', '32 SP, +Spe nature'],
  ['neutral', 'Max neutral', '32 SP, neutral nature'],
  ['none', 'No investment', '0 SP, neutral nature'],
  ['min', 'Slowest', '0 SP, −Spe nature'],
]

const hasScarf = mon => /choice\s*scarf/i.test(mon.item || '')

const names = list => (list.length > 3 ? `${list.slice(0, 3).join(', ')} +${list.length - 3}` : list.join(', '))

export default function Speed({ team, save, species }) {
  const dex = useDex()
  const [tw, setTw] = useState({ you: false, them: false })
  const [trickRoom, setTrickRoom] = useState(false)
  const [assume, setAssume] = useState('max')
  const [withFaced, setWithFaced] = useState(true)
  const targets = team.speedTargets || []

  if (!dex.loaded) return <p className="muted">Loading Pokédex</p>

  /* ----- Your side ----- */
  const yours = team.mons.map(mon => {
    const { stats } = finalStats(mon, dex)
    const raw = stats?.spe
    if (raw == null) return { side: 'you', key: mon.id, mon, speed: null }
    let speed = raw
    const tags = []
    if (hasScarf(mon)) { speed = Math.floor(speed * 1.5); tags.push('Scarf') }
    if (tw.you) { speed *= 2; tags.push('Tailwind') }
    return { side: 'you', key: mon.id, mon, speed, raw, tags }
  })

  /* ----- Their side: added targets, threats, and Pokémon you've faced ----- */
  const sources = new Map()
  const add = (name, label) => {
    const id = toId(name)
    if (!id) return
    if (sources.has(id)) sources.get(id).labels.push(label)
    else sources.set(id, { name: name.trim(), labels: [label] })
  }
  targets.forEach(n => add(n, 'Added'))
  ;(team.threats || []).forEach(t => add(t.species, 'Threat'))
  if (withFaced) {
    opponentStats(team.matches).rows
      .sort((a, b) => b.games - a.games)
      .slice(0, 12)
      .forEach(r => add(r.species, `Faced ${r.games}×`))
  }

  const theirs = []
  const unknown = []
  for (const [id, src] of sources) {
    const entry = lookup(dex, src.name)
    if (!entry) { unknown.push(src.name); continue }
    let speed = speedBenchmarks(entry.base.spe)[assume]
    if (tw.them) speed *= 2
    theirs.push({ side: 'them', key: id, species: entry.name, base: entry.base.spe, speed, labels: src.labels })
  }

  /* ----- Ladder: fastest first, or slowest first under Trick Room ----- */
  const ranked = [...yours.filter(r => r.speed != null), ...theirs].sort(
    (a, b) =>
      (trickRoom ? a.speed - b.speed : b.speed - a.speed) ||
      (a.side === b.side ? 0 : a.side === 'you' ? -1 : 1)
  )
  const before = (a, b) => (trickRoom ? a < b : a > b)
  const noteFor = r => {
    const ahead = theirs.filter(t => before(r.speed, t.speed))
    const ties = theirs.filter(t => t.speed === r.speed)
    const behind = theirs.filter(t => before(t.speed, r.speed))
    return { ahead, ties, behind }
  }
  const missing = yours.filter(r => r.speed == null)

  const setTargets = list => save({ ...team, speedTargets: list })

  return (
    <section className="speed">
      <div className="speed-controls panel">
        <div className="control-row">
          <span className="control-label">Field</span>
          <div className="seg">
            <button type="button" aria-pressed={tw.you} className={`btn sm ${tw.you ? 'on' : 'ghost'}`}
              onClick={() => setTw(t => ({ ...t, you: !t.you }))}>Your Tailwind</button>
            <button type="button" aria-pressed={tw.them} className={`btn sm ${tw.them ? 'on' : 'ghost'}`}
              onClick={() => setTw(t => ({ ...t, them: !t.them }))}>Their Tailwind</button>
            <button type="button" aria-pressed={trickRoom} className={`btn sm ${trickRoom ? 'on' : 'ghost'}`}
              onClick={() => setTrickRoom(v => !v)}>Trick Room</button>
          </div>
        </div>
        <div className="control-row">
          <span className="control-label">Assume they run</span>
          <div className="seg" role="radiogroup" aria-label="Opponent speed investment">
            {ASSUME.map(([v, l, hint]) => (
              <button key={v} type="button" role="radio" aria-checked={assume === v} title={hint}
                className={`btn sm ${assume === v ? 'on' : 'ghost'}`} onClick={() => setAssume(v)}>{l}</button>
            ))}
          </div>
          <span className="hint">{ASSUME.find(a => a[0] === assume)[2]}</span>
        </div>
        <div className="control-row wide">
          <span className="control-label">Compare against</span>
          <div className="grow">
            <SpeciesInput label="Pokémon to compare against" value={targets} onChange={setTargets}
              suggestions={species} max={20} placeholder="Add a Pokémon, press Enter" />
            <label className="check">
              <input type="checkbox" checked={withFaced} onChange={e => setWithFaced(e.target.checked)} />
              Include your threats and the Pokémon you've faced most
            </label>
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
        <p className="hint">
          Add Pokémon above, list threats, or log games with their team preview to see how your team lines up.
        </p>
      )}

      <ol className="ladder">
        {ranked.map(r =>
          r.side === 'you' ? (
            <li key={r.key} className="rung you">
              <span className="spd">{r.speed}</span>
              <MonImage mon={r.mon} className="md" />
              <div className="rung-body">
                <p className="rung-name">{r.mon.species}{r.tags.length > 0 && <span className="rung-tags">{r.tags.join(' + ')}</span>}</p>
                {theirs.length > 0 && <YourNote {...noteFor(r)} total={theirs.length} trickRoom={trickRoom} />}
              </div>
            </li>
          ) : (
            <li key={r.key} className="rung them">
              <span className="spd">{r.speed}</span>
              <MonImage mon={{ species: r.species }} className="sm" />
              <p className="rung-name">{r.species}</p>
              <span className="rung-meta">Base {r.base}, {r.labels.join(', ').toLowerCase()}</span>
            </li>
          )
        )}
      </ol>

      {unknown.length > 0 && (
        <p className="hint">Not in the Pokédex, so left out: {unknown.join(', ')}.</p>
      )}
    </section>
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
