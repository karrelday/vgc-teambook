import { useState } from 'react'
import { Field, Modal } from './ui'
import ImagePicker from './ImagePicker'
import { NATURES, STATS, TYPES, TERA_ENABLED, SP_MAX_STAT, SP_MAX_TOTAL, spreadTotal } from '../lib/model'

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

  const total = spreadTotal(draft)
  const overStat = STATS.some(([k]) => (draft.spread[k] || 0) > SP_MAX_STAT)
  const overTotal = total > SP_MAX_TOTAL
  const invalid = overStat || overTotal

  return (
    <Modal title={isNew ? 'Add Pokémon' : `Edit ${mon.species}`} onClose={onClose} wide>
      <form className="editor" onSubmit={e => { e.preventDefault(); if (!invalid) onSave(draft) }}>
        <div className="editor-grid">
          <ImagePicker mon={draft} onChange={img => set('image', img)} />
          <div className="fields">
            <Field label="Species">
              <input required autoFocus value={draft.species} onChange={e => set('species', e.target.value)} placeholder="Sableye" />
            </Field>
            <Field label="Nickname">
              <input value={draft.nickname || ''} onChange={e => set('nickname', e.target.value)} />
            </Field>
            <Field label="Item">
              <input value={draft.item || ''} onChange={e => set('item', e.target.value)} placeholder="Sablenite" />
            </Field>
            <Field label="Ability">
              <input value={draft.ability || ''} onChange={e => set('ability', e.target.value)} placeholder="Prankster" />
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
              <input key={i} value={m} onChange={e => setMove(i, e.target.value)} aria-label={`Move ${i + 1}`} placeholder={`Move ${i + 1}`} />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Stat Points and final stats (Level 50)</legend>
          <div className="stat-table">
            <span />
            {STATS.map(([k, l]) => <span key={k} className="stat-h">{l}</span>)}
            <span className="row-label">SP</span>
            {STATS.map(([k, l]) => (
              <input key={k} type="number" min="0" max={SP_MAX_STAT} aria-label={`${l} stat points`}
                className={(draft.spread[k] || 0) > SP_MAX_STAT ? 'over' : ''}
                value={draft.spread[k] ?? ''} onChange={e => setStat('spread', k, e.target.value)} />
            ))}
            <span className="row-label">Final stat</span>
            {STATS.map(([k, l]) => (
              <input key={k} type="number" min="0" aria-label={`${l} final stat`}
                value={draft.stats[k] ?? ''} onChange={e => setStat('stats', k, e.target.value)} />
            ))}
          </div>
          <p className={`hint ${invalid ? 'error' : ''}`}>
            {total} / {SP_MAX_TOTAL} SP used
            {overStat && `. Max ${SP_MAX_STAT} in a single stat.`}
            {overTotal && !overStat && `. Remove ${total - SP_MAX_TOTAL} to save.`}
            {!invalid && total < SP_MAX_TOTAL && ` (${SP_MAX_TOTAL - total} left)`}
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

        <datalist id="types">{TYPES.map(t => <option key={t} value={t} />)}</datalist>
        <datalist id="natures">{NATURES.map(n => <option key={n} value={n} />)}</datalist>
      </form>
    </Modal>
  )
}
