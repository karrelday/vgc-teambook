import { useState } from 'react'
import { record, uid } from '../lib/model'
import { planName } from './GamePlans'
import { Field, RecordBar } from './ui'

const today = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time

export default function Matches({ team, save }) {
  const blank = () => ({ result: 'W', date: today(), opponent: '', planId: '', event: '', notes: '' })
  const [form, setForm] = useState(blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const rec = record(team.matches)
  const sorted = [...team.matches].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const events = [...new Set(team.matches.map(m => m.event).filter(Boolean))]
  const planLabel = id => {
    const p = team.plans.find(p => p.id === id)
    return p ? planName(p, team) : ''
  }

  const byEvent = events.map(e => [e, record(team.matches.filter(m => m.event === e))])

  const add = e => {
    e.preventDefault()
    save({ ...team, matches: [...team.matches, { ...form, id: uid() }] })
    // Keep event and plan so logging a whole tournament is quick
    setForm(f => ({ ...blank(), event: f.event, planId: f.planId }))
  }

  const remove = id => {
    if (confirm('Delete this game from the log?')) {
      save({ ...team, matches: team.matches.filter(m => m.id !== id) })
    }
  }

  return (
    <section className="matches">
      <div className="matches-side">
        <div className="summary-card">
          <strong className="big-record">{rec.w}–{rec.l}</strong>
          <span className="muted">{rec.total ? `${rec.rate}% win rate` : 'No games logged'}</span>
          <RecordBar rec={rec} />
          {sorted.length > 0 && (
            <div className="form-pills" aria-label="Last 10 games, newest first">
              {sorted.slice(0, 10).map(m => (
                <span key={m.id} className={`pill ${m.result === 'W' ? 'win' : 'loss'}`}>{m.result}</span>
              ))}
            </div>
          )}
          {byEvent.length > 0 && (
            <dl className="by-event">
              {byEvent.map(([e, r]) => (
                <div key={e}><dt>{e}</dt><dd>{r.w}–{r.l}</dd></div>
              ))}
            </dl>
          )}
        </div>

        <form className="stack log-form" onSubmit={add}>
          <h2>Log a game</h2>
          <div className="result-toggle" role="radiogroup" aria-label="Result">
            {[['W', 'Win'], ['L', 'Loss']].map(([v, l]) => (
              <button type="button" key={v} role="radio" aria-checked={form.result === v}
                className={`btn ${form.result === v ? (v === 'W' ? 'win-on' : 'loss-on') : ''}`}
                onClick={() => set('result', v)}>{l}</button>
            ))}
          </div>
          <div className="two-col">
            <Field label="Date">
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </Field>
            <Field label="Event">
              <input list="events" value={form.event} onChange={e => set('event', e.target.value)} placeholder="Ladder, locals, MBL" />
            </Field>
          </div>
          <Field label="Opponent">
            <input value={form.opponent} onChange={e => set('opponent', e.target.value)} placeholder="Player or their core, e.g. Incineroar + Rillaboom" />
          </Field>
          {team.plans.length > 0 && (
            <Field label="Game plan used">
              <select value={form.planId} onChange={e => set('planId', e.target.value)}>
                <option value="">None or something else</option>
                {team.plans.map(p => <option key={p.id} value={p.id}>{planName(p, team)}</option>)}
              </select>
            </Field>
          )}
          <Field label="Notes">
            <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="What decided the game" />
          </Field>
          <button className="btn primary">Log {form.result === 'W' ? 'win' : 'loss'}</button>
          <datalist id="events">{events.map(e => <option key={e} value={e} />)}</datalist>
        </form>
      </div>

      <div className="match-list">
        {sorted.length === 0 ? (
          <div className="empty"><p>Games you log show up here, newest first.</p></div>
        ) : (
          sorted.map(m => (
            <article className="match-row" key={m.id}>
              <span className={`pill big ${m.result === 'W' ? 'win' : 'loss'}`}>{m.result}</span>
              <div>
                <p className="match-title">{m.opponent || 'Unknown opponent'}</p>
                <p className="muted small">
                  {[m.date, m.event, planLabel(m.planId)].filter(Boolean).join(', ')}
                </p>
                {m.notes && <p className="prewrap small">{m.notes}</p>}
              </div>
              <button className="btn ghost sm danger" onClick={() => remove(m.id)} aria-label="Delete game">Delete</button>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
