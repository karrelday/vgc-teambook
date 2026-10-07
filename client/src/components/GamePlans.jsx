import { useState } from 'react'
import { emptyPlan, record } from '../lib/model'
import MonImage from './MonImage'
import { Field, Modal } from './ui'

export const planName = (plan, team) =>
  plan.label ||
  plan.leads.map(id => team.mons.find(m => m.id === id)?.species).filter(Boolean).join(' + ') ||
  'Untitled plan'

export default function GamePlans({ team, save }) {
  const [editing, setEditing] = useState(null)
  const byId = Object.fromEntries(team.mons.map(m => [m.id, m]))

  const upsert = plan => {
    const exists = team.plans.some(p => p.id === plan.id)
    save({ ...team, plans: exists ? team.plans.map(p => (p.id === plan.id ? plan : p)) : [...team.plans, plan] })
    setEditing(null)
  }

  const remove = id => {
    if (!confirm('Delete this game plan? Logged games keep their result but lose the link.')) return
    save({ ...team, plans: team.plans.filter(p => p.id !== id) })
    setEditing(null)
  }

  if (team.mons.length < 2) {
    return <div className="empty"><p>Add at least two Pokémon before writing game plans.</p></div>
  }

  return (
    <section>
      <div className="section-head">
        <h2>Game plans</h2>
        <button className="btn primary" onClick={() => setEditing(emptyPlan())}>Add game plan</button>
      </div>

      {team.plans.length === 0 ? (
        <div className="empty">
          <p>Write down your common leads, what you bring in the back, and how the game should go.</p>
        </div>
      ) : (
        <div className="plans">
          <div className="plan-cols" aria-hidden="true">
            <span>Leads</span><span>Back</span><span>Strategy</span>
          </div>
          {team.plans.map(p => {
            const rec = record(team.matches.filter(m => m.planId === p.id))
            return (
              <article className="plan" key={p.id}>
                <div className="plan-leads">
                  {p.label && <span className="plan-label">{p.label}</span>}
                  <div className="pair">
                    {p.leads.map(id => byId[id] && <MonImage key={id} mon={byId[id]} className="lg" />)}
                  </div>
                </div>
                <div className="pair plan-back">
                  {p.back.map(id => byId[id] && <MonImage key={id} mon={byId[id]} className="md" />)}
                </div>
                <div className="plan-strategy">
                  <p className="prewrap">{p.strategy || <span className="muted">No strategy written yet.</span>}</p>
                  <div className="plan-foot">
                    <span className={rec.total ? 'rec' : 'muted'}>
                      {rec.total ? `${rec.w}–${rec.l} with this plan (${rec.rate}%)` : 'No games logged with this plan'}
                    </span>
                    <button className="btn ghost sm" onClick={() => setEditing(p)}>Edit</button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {editing && (
        <PlanEditor
          plan={editing}
          team={team}
          isNew={!team.plans.some(p => p.id === editing.id)}
          onSave={upsert}
          onDelete={() => remove(editing.id)}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}

function MonToggle({ mons, selected, blocked, onToggle, label }) {
  return (
    <div className="mon-toggle" role="group" aria-label={label}>
      {mons.map(m => {
        const on = selected.includes(m.id)
        const disabled = !on && (blocked.includes(m.id) || selected.length >= 2)
        return (
          <button type="button" key={m.id} className={`toggle ${on ? 'on' : ''}`}
            disabled={disabled} aria-pressed={on} onClick={() => onToggle(m.id)}>
            <MonImage mon={m} className="sm" />
            <span>{m.species}</span>
          </button>
        )
      })}
    </div>
  )
}

function PlanEditor({ plan, team, isNew, onSave, onDelete, onClose }) {
  const [draft, setDraft] = useState(plan)
  const toggle = group => id =>
    setDraft(d => ({
      ...d,
      [group]: d[group].includes(id) ? d[group].filter(x => x !== id) : [...d[group], id],
    }))

  return (
    <Modal title={isNew ? 'Add game plan' : 'Edit game plan'} onClose={onClose} wide>
      <form className="stack" onSubmit={e => { e.preventDefault(); onSave(draft) }}>
        <Field label="Label (optional)">
          <input value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
            placeholder="Go-to lead, Into Steel/Fairy, Trick Room matchups" />
        </Field>
        <div className="field">
          <span>Leads (pick 2)</span>
          <MonToggle label="Leads" mons={team.mons} selected={draft.leads} blocked={draft.back} onToggle={toggle('leads')} />
        </div>
        <div className="field">
          <span>Back (pick 2)</span>
          <MonToggle label="Back" mons={team.mons} selected={draft.back} blocked={draft.leads} onToggle={toggle('back')} />
        </div>
        <Field label="Strategy">
          <textarea rows={6} value={draft.strategy} onChange={e => setDraft(d => ({ ...d, strategy: e.target.value }))}
            placeholder="Turn 1 options, what you are trying to KO, how the back cleans up" />
        </Field>
        <div className="actions spread-actions">
          {!isNew && <button type="button" className="btn ghost danger" onClick={onDelete}>Delete plan</button>}
          <div className="row">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" disabled={!draft.leads.length}>{isNew ? 'Add plan' : 'Save changes'}</button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
