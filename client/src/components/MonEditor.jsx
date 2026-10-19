import { useState } from 'react'
import { Field, Modal } from './ui'
import ImagePicker from './ImagePicker'
import { NATURES, STATS, TYPES, TERA_ENABLED, SP_MAX_STAT, SP_MAX_TOTAL, spreadTotal } from '../lib/model'
import { calcStats, lookup, natureMods, useDex } from '../lib/dex'
import { useCalcMeta } from '../lib/calc'
import ItemIcon, { useIsChampionsItem } from './ItemIcon'
import { useLearnset } from '../lib/learnset'

export default function MonEditor({ mon, isNew, onSave, onDelete, onClose }) {
  const [draft, setDraft] = useState(() => ({
    ...mon,
    moves: [...(mon.moves || []), '', '', '', ''].slice(0, 4),
    spread: { ...mon.spread },
    stats: { ...mon.stats },
  }))

  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))
  const setStat = (group, k, v) =>
    setDraft(d => ({ ...d, [group]: { ...d[group], [k]: v === '' ? null : Number(v) } }))
  const setMove = (i, v) =>
    setDraft(d => {
      const moves = [...d.moves]
      moves[i] = v
      return { ...d, moves }
    })

  const dex = useDex()
  const entry = lookup(dex, draft.species)
  const auto = entry ? calcStats(entry.base, draft.spread, draft.nature) : null
  const [plus, minus] = natureMods(draft.nature)
  // Calculated stats are saved too, so older views and exports always have numbers
  const meta = useCalcMeta()
  const isChampionsItem = useIsChampionsItem()
  const { learnset, canLearn } = useLearnset(draft.species)
  const badMoves = draft.moves.filter(m => !canLearn(m))
  // With a known species the ability is a dropdown; an empty one means its first ability
  const abilities = entry?.abilities || []
  const ability = draft.ability || abilities[0] || ''
  const abilityOk = !abilities.length || abilities.some(a => a.toLowerCase() === ability.toLowerCase())
  const submit = () => {
    const out = { ...draft, ability: abilities.length ? ability : draft.ability }
    onSave(auto ? { ...out, stats: auto } : out)
  }

  const total = spreadTotal(draft)
  const overStat = STATS.some(([k]) => (draft.spread[k] || 0) > SP_MAX_STAT)
  const overTotal = total > SP_MAX_TOTAL
  const invalid = overStat || overTotal

  return (
    <Modal title={isNew ? 'Add Pokémon' : `Edit ${mon.species}`} onClose={onClose} wide>
      <form className="editor" onSubmit={e => { e.preventDefault(); if (!invalid) submit() }}>
        <div className="editor-grid">
          <ImagePicker mon={draft} onChange={img => set('image', img)} />
          <div className="fields">
            <Field label="Species">
              <input required autoFocus list="dex-species" value={draft.species} onChange={e => set('species', e.target.value)} placeholder="Sableye-Mega" />
              {draft.species && dex.loaded && !dex.failed && !entry && (
                <small className="hint">Not in the Pokédex, so enter final stats yourself. Forms use a hyphen: Raichu-Mega-Y.</small>
              )}
            </Field>
            <Field label="Nickname">
              <input value={draft.nickname || ''} onChange={e => set('nickname', e.target.value)} />
            </Field>
            <Field label="Item">
              <div className="with-icon">
                <ItemIcon item={draft.item} />
                <input list="champions-items" value={draft.item || ''} onChange={e => set('item', e.target.value)} placeholder="Sablenite" />
              </div>
              {!isChampionsItem(draft.item) && (
                <small className="hint warn">Not a Champions item, so calcs ignore it.</small>
              )}
            </Field>
            <Field label="Ability">
              {abilities.length ? (
                <select value={ability} onChange={e => set('ability', e.target.value)}>
                  {!abilityOk && <option value={ability}>{ability} (not one of {draft.species}'s)</option>}
                  {abilities.map(a => (
                    <option key={a} value={a}>{a}{a === entry.hidden ? ' (hidden)' : ''}</option>
                  ))}
                </select>
              ) : (
                <input value={draft.ability || ''} onChange={e => set('ability', e.target.value)} placeholder="Prankster" />
              )}
              {!abilityOk && <small className="hint warn">{draft.species} can't have {ability}. Pick one of its abilities.</small>}
            </Field>
            <Field label="Nature">
              <input list="natures" value={draft.nature || ''} onChange={e => set('nature', e.target.value)} />
            </Field>
            {TERA_ENABLED && (
              <Field label="Tera type">
                <input list="types" value={draft.teraType || ''} onChange={e => set('teraType', e.target.value)} />
              </Field>
            )}
          </div>
        </div>

        <fieldset>
          <legend>Moves</legend>
          <div className="move-inputs">
            {draft.moves.map((m, i) => (
              <input key={i} value={m} list="learnset-moves" onChange={e => setMove(i, e.target.value)}
                className={canLearn(m) ? '' : 'over'} aria-label={`Move ${i + 1}`} placeholder={`Move ${i + 1}`} />
            ))}
          </div>
          {learnset && (
            <p className={`hint ${badMoves.length ? 'warn' : ''}`}>
              {badMoves.length
                ? `${draft.species} can't learn ${badMoves.join(', ')} in Champions.`
                : `Suggestions are ${draft.species}'s ${learnset.moves.length} Champions moves${learnset.from !== learnset.species ? ` (from ${learnset.from})` : ''}.`}
            </p>
          )}
          <datalist id="learnset-moves">{(learnset?.moves || []).map(mv => <option key={mv.name} value={mv.name} />)}</datalist>
        </fieldset>

        <fieldset>
          <legend>Stat Points and final stats (Level 50)</legend>
          <div className="stat-table">
            <span />
            {STATS.map(([k, l]) => (
              <span key={k} className={`stat-h ${k === plus ? 'plus' : k === minus ? 'minus' : ''}`}>
                {l}{k === plus ? ' +' : k === minus ? ' −' : ''}
              </span>
            ))}
            {entry && (
              <>
                <span className="row-label">Base</span>
                {STATS.map(([k]) => <span key={k} className="base-val">{entry.base[k]}</span>)}
              </>
            )}
            <span className="row-label">SP</span>
            {STATS.map(([k, l]) => (
              <input key={k} type="number" min="0" max={SP_MAX_STAT} aria-label={`${l} stat points`}
                className={(draft.spread[k] || 0) > SP_MAX_STAT ? 'over' : ''}
                value={draft.spread[k] ?? ''} onChange={e => setStat('spread', k, e.target.value)} />
            ))}
            <span className="row-label">Final stat</span>
            {auto
              ? STATS.map(([k, l]) => (
                  <output key={k} className={`final-val ${k === plus ? 'plus' : k === minus ? 'minus' : ''}`} aria-label={`${l} final stat`}>
                    {auto[k]}
                  </output>
                ))
              : STATS.map(([k, l]) => (
                  <input key={k} type="number" min="0" aria-label={`${l} final stat`}
                    value={draft.stats[k] ?? ''} onChange={e => setStat('stats', k, e.target.value)} />
                ))}
          </div>
          <p className={`hint ${invalid ? 'error' : ''}`}>
            {total} / {SP_MAX_TOTAL} SP used
            {overStat && `. Max ${SP_MAX_STAT} in a single stat.`}
            {overTotal && !overStat && `. Remove ${total - SP_MAX_TOTAL} to save.`}
            {!invalid && total < SP_MAX_TOTAL && ` (${SP_MAX_TOTAL - total} left)`}
            {auto && '. Final stats are calculated from base stats, SP and nature.'}
          </p>
        </fieldset>

        <Field label="Notes on this Pokémon" wide>
          <textarea rows={3} value={draft.notes || ''} onChange={e => set('notes', e.target.value)}
            placeholder="What the spread does, key calcs, when to bring it" />
        </Field>

        <div className="actions spread-actions">
          {!isNew && <button type="button" className="btn ghost danger" onClick={onDelete}>Remove from team</button>}
          <div className="row">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" disabled={invalid}>{isNew ? 'Add to team' : 'Save changes'}</button>
          </div>
        </div>

        <datalist id="champions-items">{meta.items.map(n => <option key={n} value={n} />)}</datalist>
        <datalist id="dex-species">{dex.names.map(n => <option key={n} value={n} />)}</datalist>
        <datalist id="types">{TYPES.map(t => <option key={t} value={t} />)}</datalist>
        <datalist id="natures">{NATURES.map(n => <option key={n} value={n} />)}</datalist>
      </form>
    </Modal>
  )
}
