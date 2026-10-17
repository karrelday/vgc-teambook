import { useState } from 'react'
import { uid } from '../lib/model'
import { tournamentSummary } from '../lib/stats'
import MonImage from './MonImage'
import { Field, Modal } from './ui'

const today = () => new Date().toLocaleDateString('en-CA')
export const emptyTournament = () => ({ id: uid(), name: '', date: today(), bestOf: 3, placement: '', notes: '' })

const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '')

export default function Tournaments({ team, save, onLog }) {
  const [editing, setEditing] = useState(null)
  const list = [...(team.tournaments || [])].sort(byDateDesc)

  const upsert = t => {
    const all = team.tournaments || []
    const exists = all.some(x => x.id === t.id)
    const tournaments = exists ? all.map(x => (x.id === t.id ? t : x)) : [...all, t]
    // Keep the event name on linked games in step with the tournament name
    const matches = team.matches.map(m => (m.tournamentId === t.id ? { ...m, event: t.name } : m))
    save({ ...team, tournaments, matches })
    setEditing(null)
  }

  const remove = t => {
    if (!confirm(`Delete "${t.name}"? Its games stay in your log, just no longer grouped.`)) return
    save({
      ...team,
      tournaments: team.tournaments.filter(x => x.id !== t.id),
      matches: team.matches.map(m => (m.tournamentId === t.id ? { ...m, tournamentId: '', round: '' } : m)),
    })
    setEditing(null)
  }

  return (
    <section>
      <div className="section-head">
        <h2>Tournaments</h2>
        <button className="btn primary" onClick={() => setEditing(emptyTournament())}>New tournament</button>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <p>Create a tournament, then pick it when logging games. Games with the same round become a set.</p>
        </div>
      ) : (
        <div className="tournaments">
          {list.map(t => {
            const s = tournamentSummary(team, t.id)
            const played = s.sets.length > 0
            return (
              <article className="tournament" key={t.id}>
                <header className="t-head">
                  <div>
                    <h3>{t.name}</h3>
                    <p className="muted small">{[t.date, `Best of ${t.bestOf || 3}`].filter(Boolean).join(', ')}</p>
                  </div>
                  <div className="t-result">
                    {t.placement && <strong className="t-place">{t.placement}</strong>}
                    {played && (
                      <span className="small">
                        {t.bestOf === 1 ? `${s.gameW}–${s.gameL}` : `${s.setW}–${s.setL} in sets, ${s.gameW}–${s.gameL} in games`}
                      </span>
                    )}
                  </div>
                </header>

                {played ? (
                  <ol className="sets">
                    {s.sets.map(set => (
                      <li key={set.key} className="set">
                        <span className="set-round">{set.round || '–'}</span>
                        <span className={`pill big ${set.result === 'W' ? 'win' : set.result === 'L' ? 'loss' : ''}`}>
                          {set.result === 'T' ? '–' : set.result}
                        </span>
                        <div className="set-body">
                          <p className="match-title">
                            {set.opponentName || 'Unknown opponent'}
                            {t.bestOf !== 1 && <span className="muted small"> {set.w}–{set.l}</span>}
                          </p>
                          {set.opponentTeam.length > 0 && (
                            <div className="mini-row">
                              {set.opponentTeam.map((sp, i) => <MonImage key={sp + i} mon={{ species: sp }} className="sm" />)}
                            </div>
                          )}
                        </div>
                        {t.bestOf !== 1 && (
                          <div className="form-pills set-games" aria-label="Games in this set">
                            {set.games.map(g => <span key={g.id} className={`pill ${g.result === 'W' ? 'win' : 'loss'}`}>{g.result}</span>)}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="muted small">No games yet. Pick this tournament when you log a game.</p>
                )}

                {t.notes && <p className="prewrap small t-notes">{t.notes}</p>}

                <div className="card-actions">
                  <button className="btn ghost sm" onClick={() => onLog(t)}>Log a game</button>
                  <button className="btn ghost sm" onClick={() => setEditing(t)}>Edit</button>
                  <button className="btn ghost sm danger" onClick={() => remove(t)}>Delete</button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {editing && (
        <TournamentForm
          tournament={editing}
          isNew={!(team.tournaments || []).some(t => t.id === editing.id)}
          onSave={upsert}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}

export function TournamentForm({ tournament, isNew, onSave, onClose }) {
  const [t, setT] = useState(tournament)
  const set = (k, v) => setT(x => ({ ...x, [k]: v }))
  return (
    <Modal title={isNew ? 'New tournament' : `Edit ${tournament.name}`} onClose={onClose}>
      <form className="stack" onSubmit={e => { e.preventDefault(); if (t.name.trim()) onSave({ ...t, name: t.name.trim() }) }}>
        <Field label="Name">
          <input required autoFocus value={t.name} onChange={e => set('name', e.target.value)} placeholder="MBL Philippines" />
        </Field>
        <div className="two-col">
          <Field label="Date">
            <input type="date" value={t.date || ''} onChange={e => set('date', e.target.value)} />
          </Field>
          <div className="field">
            <span>Format</span>
            <div className="seg" role="radiogroup" aria-label="Best of">
              {[3, 1].map(n => (
                <button key={n} type="button" role="radio" aria-checked={t.bestOf === n}
                  className={`btn sm ${t.bestOf === n ? 'on' : 'ghost'}`} onClick={() => set('bestOf', n)}>Best of {n}</button>
              ))}
            </div>
          </div>
        </div>
        <Field label="Placement">
          <input value={t.placement || ''} onChange={e => set('placement', e.target.value)} placeholder="Top 8, 5–2, 3rd" />
        </Field>
        <Field label="Notes">
          <textarea rows={3} value={t.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="How the day went, what to change next time" />
        </Field>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary">{isNew ? 'Create tournament' : 'Save changes'}</button>
        </div>
      </form>
    </Modal>
  )
}
