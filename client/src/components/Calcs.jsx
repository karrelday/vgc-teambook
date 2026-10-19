import { useMemo, useState } from 'react'
import { NATURES, STATS, spreadText, uid } from '../lib/model'
import { emptyField, emptySide, sideSpecies, useCalcMeta, useCalcResults } from '../lib/calc'
import { lookup, useDex } from '../lib/dex'
import { usePersistentState } from '../lib/persist'
import MonImage from './MonImage'
import SpeciesInput from './SpeciesInput'

const WEATHER = ['', 'Sun', 'Rain', 'Sand', 'Snow']
const TERRAIN = ['', 'Electric', 'Grassy', 'Psychic', 'Misty']
const TOGGLES = [
  ['helpingHand', 'Helping Hand'], ['crit', 'Critical hit'], ['reflect', 'Reflect'],
  ['lightScreen', 'Light Screen'], ['auroraVeil', 'Aurora Veil'], ['friendGuard', 'Friend Guard'], ['singles', 'Singles'],
]
const STAGES = [6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6]

const newCalc = team => ({
  id: uid(),
  attacker: { ...emptySide('mine'), monId: team.mons[0]?.id || '' },
  defender: emptySide('theirs'),
  move: '',
  field: emptyField(),
  note: '',
})

export default function Calcs({ team, save, species }) {
  const meta = useCalcMeta()
  const dex = useDex()
  const [calc, setCalc] = usePersistentState(`teambook:calc:${team._id}`, () => newCalc(team))
  const [note, setNote] = useState('')
  const set = (k, v) => setCalc(c => ({ ...c, [k]: v }))

  const live = useCalcResults(useMemo(() => [calc], [calc]), team)
  const result = live.list[0]
  const saved = team.calcs || []
  const savedResults = useCalcResults(saved, team, 0)

  const swap = () => setCalc(c => ({ ...c, attacker: c.defender, defender: c.attacker, move: '' }))
  const saveCalc = () => {
    const entry = { ...calc, id: uid(), note: note.trim() }
    save({ ...team, calcs: [...saved, entry] })
    setNote('')
  }
  const remove = id => save({ ...team, calcs: saved.filter(c => c.id !== id) })
  const load = c => {
    setCalc({ ...c, id: uid() })
    window.scrollTo({ top: document.querySelector('.tabs')?.offsetTop ?? 0, behavior: 'smooth' })
  }

  if (meta.failed) return <div className="empty"><p>The damage calculator couldn't load. Check the API is running and up to date.</p></div>

  return (
    <section className="calcs">
      <div className="panel calc-panel">
        <div className="calc-sides">
          <SideEditor role="attacker" side={calc.attacker} onChange={v => set('attacker', v)} team={team} species={species} meta={meta} dex={dex} />
          <button type="button" className="btn ghost sm swap" onClick={swap} title="Swap attacker and defender">⇄ Swap</button>
          <SideEditor role="defender" side={calc.defender} onChange={v => set('defender', v)} team={team} species={species} meta={meta} dex={dex} />
        </div>

        <MovePicker calc={calc} team={team} meta={meta} onChange={v => set('move', v)} />

        <div className="calc-field">
          {TOGGLES.map(([k, l]) => (
            <button key={k} type="button" aria-pressed={!!calc.field[k]}
              className={`btn sm ${calc.field[k] ? 'on' : 'ghost'}`}
              onClick={() => set('field', { ...calc.field, [k]: !calc.field[k] })}>{l}</button>
          ))}
          <label className="inline-select">Weather
            <select value={calc.field.weather || ''} onChange={e => set('field', { ...calc.field, weather: e.target.value })}>
              {WEATHER.map(w => <option key={w} value={w}>{w || 'None'}</option>)}
            </select>
          </label>
          <label className="inline-select">Terrain
            <select value={calc.field.terrain || ''} onChange={e => set('field', { ...calc.field, terrain: e.target.value })}>
              {TERRAIN.map(t => <option key={t} value={t}>{t || 'None'}</option>)}
            </select>
          </label>
        </div>

        <Result result={result} stale={live.stale} />

        {result?.ok && (
          <div className="save-row">
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional): why this calc matters" aria-label="Calc note" />
            <button className="btn primary" onClick={saveCalc}>Save calc</button>
          </div>
        )}
      </div>

      <div className="section-head">
        <h2>Saved calcs</h2>
        {saved.length > 0 && <span className="hint">These use your Pokémon's current sets, so they update when you change a spread.</span>}
      </div>
      {saved.length === 0 ? (
        <div className="empty"><p>Save the calcs you want to remember, like what your spread survives or what your attacks KO.</p></div>
      ) : (
        <ul className="saved-calcs">
          {saved.map((c, i) => {
            const r = savedResults.list[i]
            const atkSp = sideSpecies(c.attacker, team)
            const defSp = sideSpecies(c.defender, team)
            return (
              <li key={c.id} className="saved-calc">
                <div className="sc-mons">
                  <MonImage mon={c.attacker.source === 'mine' ? team.mons.find(m => m.id === c.attacker.monId) : { species: atkSp }} className="sm" />
                  <span className="arrow" aria-hidden="true">→</span>
                  <MonImage mon={c.defender.source === 'mine' ? team.mons.find(m => m.id === c.defender.monId) : { species: defSp }} className="sm" />
                </div>
                <div className="sc-text">
                  <p className="sc-title">{atkSp || '?'} <strong>{c.move}</strong> vs {defSp || '?'}</p>
                  {c.note && <p className="small">{c.note}</p>}
                  {r && !r.ok && <p className="small error">{r.error}</p>}
                  {r?.ok && <p className="small muted">{r.desc}</p>}
                </div>
                <div className="sc-num">
                  {r?.ok && (
                    <>
                      <strong>{r.minPct}–{r.maxPct}%</strong>
                      <span className={koClass(r.ko)}>{r.ko}</span>
                    </>
                  )}
                </div>
                <div className="sc-actions">
                  <button className="btn ghost sm" onClick={() => load(c)}>Load</button>
                  <button className="btn ghost sm danger" onClick={() => remove(c.id)}>Delete</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <datalist id="calc-natures">{NATURES.map(n => <option key={n} value={n} />)}</datalist>
      <datalist id="calc-items">{meta.items.map(n => <option key={n} value={n} />)}</datalist>
    </section>
  )
}

const koClass = ko => (/OHKO/.test(ko) ? 'ko ohko' : /2HKO/.test(ko) ? 'ko two' : 'ko')

function Result({ result, stale }) {
  if (!result) return <div className="calc-result muted">Calculating</div>
  if (!result.ok) return <div className="calc-result muted">{result.error}</div>
  const lo = Math.min(result.minPct, 100)
  const hi = Math.min(result.maxPct, 100)
  return (
    <div className={`calc-result ${stale ? 'stale' : ''}`} aria-live="polite">
      <div className="calc-big">
        <strong>{result.minPct}–{result.maxPct}%</strong>
        <span className={koClass(result.ko)}>{result.ko}</span>
      </div>
      {/* HP left after the hit: solid = guaranteed, faded = depends on the roll */}
      <div className="hp-bar" role="img" aria-label={`Leaves ${Math.max(0, 100 - hi).toFixed(1)} to ${Math.max(0, 100 - lo).toFixed(1)} percent HP`}>
        <div className="hp-left" style={{ width: `${Math.max(0, 100 - hi)}%` }} />
        <div className="hp-roll" style={{ width: `${hi - lo}%` }} />
      </div>
      <p className="small muted">{result.desc}</p>
    </div>
  )
}

function SideEditor({ role, side, onChange, team, species, meta, dex }) {
  const set = (k, v) => onChange({ ...side, [k]: v })
  const mon = side.source === 'mine' ? team.mons.find(m => m.id === side.monId) : null
  const entry = side.source === 'theirs' ? lookup(dex, side.species) : null
  const label = role === 'attacker' ? 'Attacker' : 'Defender'

  return (
    <div className="calc-side">
      <div className="side-head">
        <h3>{label}</h3>
        <div className="seg" role="radiogroup" aria-label={`${label} from`}>
          {[['mine', 'Your team'], ['theirs', 'Opponent']].map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={side.source === v}
              className={`btn sm ${side.source === v ? 'on' : 'ghost'}`}
              onClick={() => onChange({ ...emptySide(v), monId: v === 'mine' ? team.mons[0]?.id || '' : '' })}>{l}</button>
          ))}
        </div>
      </div>

      {side.source === 'mine' ? (
        <>
          <div className="pick-mon" role="radiogroup" aria-label={`${label} Pokémon`}>
            {team.mons.map(m => (
              <button key={m.id} type="button" role="radio" aria-checked={side.monId === m.id} title={m.species}
                className={`pick ${side.monId === m.id ? 'on' : ''}`} onClick={() => set('monId', m.id)}>
                <MonImage mon={m} className="sm" />
              </button>
            ))}
          </div>
          {mon ? (
            <p className="small set-line">
              <strong>{mon.species}</strong> {[mon.nature, spreadText(mon) && `${spreadText(mon)} SP`, mon.item, mon.ability].filter(Boolean).join(', ')}
            </p>
          ) : <p className="small muted">Pick one of your Pokémon.</p>}
        </>
      ) : (
        <>
          <SpeciesInput label={`${label} Pokémon`} value={side.species ? [side.species] : []} max={1}
            suggestions={species} placeholder="Type a Pokémon, press Enter"
            onChange={v => onChange({ ...side, species: v[0] || '', ability: '' })} />
          <div className="side-grid">
            <label className="inline-select">Spread
              <select value={side.preset} onChange={e => set('preset', e.target.value)}>
                <option value="auto">{role === 'attacker' ? 'Max offense' : 'Max bulk'}</option>
                <option value="none">No investment</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className="inline-select">Item
              <input list="calc-items" value={side.item} onChange={e => set('item', e.target.value)} placeholder="None" />
            </label>
            {entry?.abilities?.length > 1 && (
              <label className="inline-select">Ability
                <select value={side.ability} onChange={e => set('ability', e.target.value)}>
                  <option value="">{entry.abilities[0]}</option>
                  {entry.abilities.slice(1).map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
            )}
          </div>
          {side.preset === 'custom' && (
            <div className="custom-spread">
              <label className="inline-select">Nature
                <input list="calc-natures" value={side.nature} onChange={e => set('nature', e.target.value)} placeholder="Serious" />
              </label>
              <div className="sp-grid">
                {STATS.map(([k, l]) => (
                  <label key={k}>
                    <span>{l}</span>
                    <input type="number" min="0" max="32" value={side.sp?.[k] ?? ''}
                      onChange={e => set('sp', { ...side.sp, [k]: e.target.value === '' ? undefined : Number(e.target.value) })} />
                  </label>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <label className="inline-select">
        {role === 'attacker' ? 'Attack stage' : 'Defense stage'}
        <select value={side.boost || 0} onChange={e => set('boost', Number(e.target.value))}>
          {STAGES.map(n => <option key={n} value={n}>{n > 0 ? `+${n}` : n}</option>)}
        </select>
      </label>
    </div>
  )
}

function MovePicker({ calc, team, meta, onChange }) {
  const mon = calc.attacker.source === 'mine' ? team.mons.find(m => m.id === calc.attacker.monId) : null
  // Only damaging moves the calc knows about get a button
  const own = (mon?.moves || []).filter(Boolean).filter(n => {
    const mv = meta.movesByName[n.toLowerCase()]
    return mv && mv.category !== 'Status'
  })
  return (
    <div className="move-pick">
      <span className="control-label">Move</span>
      {own.map(n => (
        <button key={n} type="button" aria-pressed={calc.move === n}
          className={`btn sm ${calc.move === n ? 'on' : 'ghost'}`} onClick={() => onChange(n)}>{n}</button>
      ))}
      <input list="calc-moves" value={own.includes(calc.move) ? '' : calc.move} onChange={e => onChange(e.target.value)}
        placeholder={own.length ? 'Or another move' : 'Type a move'} aria-label="Move" />
      <datalist id="calc-moves">
        {meta.moves.filter(m => m.category !== 'Status').map(m => <option key={m.name} value={m.name} />)}
      </datalist>
    </div>
  )
}
