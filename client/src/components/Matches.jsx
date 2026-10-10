import { useState } from 'react'
import { record, uid } from '../lib/model'
import { currentVersion, matchesIn, monAt, newestFirst, rosterOf } from '../lib/stats'
import BringPicker from './BringPicker'
import MonImage from './MonImage'
import SpeciesInput from './SpeciesInput'
import VersionFilter from './VersionFilter'
import { Field, Modal, RecordBar } from './ui'

const today = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time
const blankGame = () => ({
  result: 'W', date: today(), event: '', opponentName: '',
  brought: [], leads: [], opponentTeam: [], notes: '',
})

export default function Matches({ team, save, species, rememberSpecies }) {
  const [versionId, setVersionId] = useState('')
  const [editing, setEditing] = useState(null)
  const cur = currentVersion(team)

  const shown = newestFirst(matchesIn(team, versionId))
  const last = newestFirst(team.matches)[0]
  const rec = record(shown)
  const events = [...new Set(team.matches.map(m => m.event).filter(Boolean))]
  const byEvent = events
    .map(e => [e, record(shown.filter(m => m.event === e))])
    .filter(([, r]) => r.total)
  const versionNumber = id => team.versions.find(v => v.id === id)?.number

  const add = game => {
    save({ ...team, matches: [...team.matches, { ...game, id: uid(), versionId: cur?.id }] })
    rememberSpecies(game.opponentTeam)
  }
  const update = game => {
    save({ ...team, matches: team.matches.map(m => (m.id === game.id ? game : m)) })
    rememberSpecies(game.opponentTeam)
    setEditing(null)
  }
  const remove = id => {
    if (confirm('Delete this game from the log?')) {
      save({ ...team, matches: team.matches.filter(m => m.id !== id) })
    }
  }

  return (
    <section className="matches">
      <div className="matches-top">
        <div className="panel">
          <h2>Log a game</h2>
          {team.mons.length === 0 && <p className="hint">Add Pokémon to the team to track what you bring.</p>}
          <LogForm
            key={team.matches.length}
            roster={team.mons}
            initial={{ ...blankGame(), event: last?.event || '' }}
            last={last}
            species={species}
            events={events}
            onSubmit={add}
            submitLabel="Log game"
          />
        </div>

        <div className="panel summary-card">
          <VersionFilter team={team} value={versionId} onChange={setVersionId} />
          <strong className="big-record">{rec.w}–{rec.l}</strong>
          <span className="muted">{rec.total ? `${rec.rate}% win rate` : 'No games logged'}</span>
          <RecordBar rec={rec} />
          {shown.length > 0 && (
            <div className="form-pills" aria-label="Last 10 games, newest first">
              {shown.slice(0, 10).map(m => (
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
      </div>

      <div className="match-list">
        {shown.length === 0 ? (
          <div className="empty"><p>Games you log show up here, newest first.</p></div>
        ) : (
          shown.map(m => {
            const leads = (m.leads || []).map(id => monAt(team, m.versionId, id)).filter(Boolean)
            const back = (m.brought || []).filter(id => !m.leads?.includes(id)).map(id => monAt(team, m.versionId, id)).filter(Boolean)
            const v = versionNumber(m.versionId)
            return (
              <article className="match-row" key={m.id}>
                <span className={`pill big ${m.result === 'W' ? 'win' : 'loss'}`}>{m.result}</span>
                <div className="match-body">
                  <div className="match-head">
                    <p className="match-title">{m.opponentName || 'Unknown opponent'}</p>
                    <span className="muted small">
                      {[m.date, m.event, team.versions.length > 1 && v ? `v${v}` : null].filter(Boolean).join(', ')}
                    </span>
                  </div>
                  {(leads.length > 0 || back.length > 0) && (
                    <div className="mini-row">
                      <span className="mini-label">You</span>
                      {leads.map(mon => <MonImage key={mon.id} mon={mon} className="sm" />)}
                      {back.length > 0 && <span className="mini-sep" aria-hidden="true" />}
                      {back.map(mon => <MonImage key={mon.id} mon={mon} className="sm dim" />)}
                    </div>
                  )}
                  {m.opponentTeam?.length > 0 && (
                    <div className="mini-row">
                      <span className="mini-label">Them</span>
                      {m.opponentTeam.map((s, i) => <MonImage key={s + i} mon={{ species: s }} className="sm" />)}
                    </div>
                  )}
                  {m.notes && <p className="prewrap small">{m.notes}</p>}
                </div>
                <div className="match-actions">
                  <button className="btn ghost sm" onClick={() => setEditing(m)}>Edit</button>
                  <button className="btn ghost sm danger" onClick={() => remove(m.id)}>Delete</button>
                </div>
              </article>
            )
          })
        )}
      </div>

      {editing && (
        <Modal title="Edit game" onClose={() => setEditing(null)} wide>
          <LogForm
            roster={rosterOf(team, editing.versionId)}
            initial={{ ...blankGame(), ...editing }}
            species={species}
            events={events}
            onSubmit={update}
            submitLabel="Save changes"
          />
        </Modal>
      )}
    </section>
  )
}

function LogForm({ roster, initial, last, species, events, onSubmit, submitLabel }) {
  const [g, setG] = useState(initial)
  const set = (k, v) => setG(s => ({ ...s, [k]: v }))

  // Handy for Bo3: same player, same team preview
  const sameOpponent = () =>
    setG(s => ({ ...s, opponentName: last.opponentName || '', opponentTeam: [...(last.opponentTeam || [])], event: last.event || s.event }))

  return (
    <form className="stack" onSubmit={e => { e.preventDefault(); onSubmit(g) }}>
      <div className="log-grid">
        <div className="result-toggle" role="radiogroup" aria-label="Result">
          {[['W', 'Win'], ['L', 'Loss']].map(([v, l]) => (
            <button type="button" key={v} role="radio" aria-checked={g.result === v}
              className={`btn ${g.result === v ? (v === 'W' ? 'win-on' : 'loss-on') : ''}`}
              onClick={() => set('result', v)}>{l}</button>
          ))}
        </div>
        <Field label="Date">
          <input type="date" value={g.date} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label="Event">
          <input list="events" value={g.event} onChange={e => set('event', e.target.value)} placeholder="Ladder, locals, MBL" />
        </Field>
        <Field label="Opponent">
          <input value={g.opponentName} onChange={e => set('opponentName', e.target.value)} placeholder="Player name" />
        </Field>
      </div>

      {roster.length > 0 && (
        <div className="field">
          <span>Your bring <small className="muted">{g.brought.length}/4 brought, {g.leads.length}/2 leads</small></span>
          <BringPicker mons={roster} brought={g.brought} leads={g.leads}
            onChange={(brought, leads) => setG(s => ({ ...s, brought, leads }))} />
          <small className="hint">Tap once to bring, again to make it a lead, again to clear.</small>
        </div>
      )}

      <div className="field">
        <span>Their team preview</span>
        <SpeciesInput label="Opponent's team" value={g.opponentTeam} onChange={v => set('opponentTeam', v)}
          suggestions={species} max={6} placeholder="Type a Pokémon, press Enter" />
        {last && (
          <button type="button" className="btn ghost sm self-start" onClick={sameOpponent}>
            Same opponent as last game
          </button>
        )}
      </div>

      <Field label="Notes">
        <textarea rows={2} value={g.notes} onChange={e => set('notes', e.target.value)} placeholder="What decided the game" />
      </Field>

      <button className="btn primary">{submitLabel === 'Log game' ? `Log ${g.result === 'W' ? 'win' : 'loss'}` : submitLabel}</button>
      <datalist id="events">{events.map(e => <option key={e} value={e} />)}</datalist>
    </form>
  )
}
