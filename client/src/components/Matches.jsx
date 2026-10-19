import { useState } from 'react'
import { record, uid } from '../lib/model'
import { currentVersion, matchesIn, monAt, newestFirst, nextRound, rosterOf, tournamentSets } from '../lib/stats'
import BringPicker from './BringPicker'
import MonImage from './MonImage'
import SpeciesInput from './SpeciesInput'
import VersionFilter from './VersionFilter'
import Tournaments, { TournamentForm, emptyTournament } from './Tournaments'
import MatchupPanel from './MatchupPanel'
import { Field, Modal, RecordBar } from './ui'

const today = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time
const blankGame = () => ({
  result: 'W', date: today(), event: '', opponentName: '', tournamentId: '', round: '',
  brought: [], leads: [], opponentTeam: [], notes: '',
})

export default function Matches({ team, save, species, rememberSpecies, draft, setDraft }) {
  const [versionId, setVersionId] = useState('')
  const [editing, setEditing] = useState(null)
  const [view, setView] = useState('games')
  const cur = currentVersion(team)
  const tournaments = team.tournaments || []
  const tournamentOf = id => tournaments.find(t => t.id === id)

  const shown = newestFirst(matchesIn(team, versionId))
  const last = newestFirst(team.matches)[0]
  const rec = record(shown)
  const events = [...new Set(team.matches.map(m => m.event).filter(Boolean))]
  const byEvent = events
    .map(e => [e, record(shown.filter(m => m.event === e))])
    .filter(([, r]) => r.total)
  const versionNumber = id => team.versions.find(v => v.id === id)?.number

  // A tournament game's event is always the tournament's name
  const withEvent = game => {
    const t = tournamentOf(game.tournamentId)
    return t ? { ...game, event: t.name } : { ...game, tournamentId: '', round: '' }
  }
  const add = game => {
    // Drop any Pokémon removed from the team since the draft was started
    const ids = new Set(team.mons.map(m => m.id))
    const brought = game.brought.filter(id => ids.has(id))
    const leads = game.leads.filter(id => ids.has(id))
    const entry = { ...withEvent({ ...game, brought, leads }), id: uid(), versionId: cur?.id }
    save({ ...team, matches: [...team.matches, entry] })
    rememberSpecies(game.opponentTeam)
    setDraft(null)
  }
  const update = game => {
    save({ ...team, matches: team.matches.map(m => (m.id === game.id ? withEvent(game) : m)) })
    rememberSpecies(game.opponentTeam)
    setEditing(null)
  }
  const createTournament = t => save({ ...team, tournaments: [...tournaments, t] })

  // New games carry the last game's tournament and round when it was logged today
  const initialNew = () => {
    const init = { ...blankGame(), event: last?.event || '' }
    if (last?.tournamentId && tournamentOf(last.tournamentId) && last.date === today()) {
      return { ...init, tournamentId: last.tournamentId, round: last.round || '' }
    }
    return init
  }
  // From a tournament card: continue an unfinished Bo3 set, otherwise move to the next round
  const initialFor = t => {
    const lastSet = tournamentSets(team, t.id).at(-1)
    const toWin = t.bestOf === 1 ? 1 : 2
    const done = !lastSet || lastSet.w >= toWin || lastSet.l >= toWin
    const round = !lastSet ? 'R1' : done ? nextRound(lastSet.round) : lastSet.round
    const carry = !done ? { opponentName: lastSet.opponentName, opponentTeam: [...lastSet.opponentTeam] } : {}
    return { ...blankGame(), ...carry, tournamentId: t.id, round, date: t.date || today() }
  }
  const logFor = t => {
    // Keep anything already typed into the form; only point it at this tournament
    setDraft(prev => (isEmptyDraft(prev) ? initialFor(t) : { ...prev, tournamentId: t.id, round: initialFor(t).round }))
    setView('games')
    window.scrollTo({ top: document.querySelector('.tabs')?.offsetTop ?? 0, behavior: 'smooth' })
  }

  // The new-game form reads and writes the draft kept by the team page
  const g = draft ?? initialNew()
  const setG = update => setDraft(prev => (typeof update === 'function' ? update(prev ?? initialNew()) : update))
  const remove = id => {
    if (confirm('Delete this game from the log?')) {
      save({ ...team, matches: team.matches.filter(m => m.id !== id) })
    }
  }

  const switcher = (
    <div className="seg view-switch" role="tablist" aria-label="Matches view">
      {[['games', 'Games'], ['tournaments', `Tournaments${tournaments.length ? ` (${tournaments.length})` : ''}`]].map(([v, l]) => (
        <button key={v} role="tab" aria-selected={view === v} className={`btn sm ${view === v ? 'on' : 'ghost'}`}
          onClick={() => setView(v)}>{l}</button>
      ))}
    </div>
  )

  if (view === 'tournaments') {
    return (
      <section className="matches">
        {switcher}
        <Tournaments team={team} save={save} onLog={logFor} />
      </section>
    )
  }

  return (
    <section className="matches">
      {switcher}
      <div className="matches-top">
        <div className="panel">
          <div className="log-head">
            <h2>Log a game</h2>
            {!isEmptyDraft(draft) && (
              <button type="button" className="btn ghost sm" onClick={() => setDraft(null)}>Clear form</button>
            )}
          </div>
          {team.mons.length === 0 && <p className="hint">Add Pokémon to the team to track what you bring.</p>}
          <LogForm
            value={g}
            onChange={setG}
            roster={team.mons}
            last={last}
            species={species}
            events={events}
            tournaments={tournaments}
            onCreateTournament={createTournament}
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

      {g.opponentTeam.length > 0 && <MatchupPanel team={team} preview={g.opponentTeam} />}

      <div className="match-list">
        {shown.length === 0 ? (
          <div className="empty"><p>Games you log show up here, newest first.</p></div>
        ) : (
          shown.map(m => {
            const leads = (m.leads || []).map(id => monAt(team, m.versionId, id)).filter(Boolean)
            const back = (m.brought || []).filter(id => !m.leads?.includes(id)).map(id => monAt(team, m.versionId, id)).filter(Boolean)
            const v = versionNumber(m.versionId)
            const t = tournamentOf(m.tournamentId)
            const where = t ? [t.name, m.round].filter(Boolean).join(' ') : m.event
            return (
              <article className="match-row" key={m.id}>
                <span className={`pill big ${m.result === 'W' ? 'win' : 'loss'}`}>{m.result}</span>
                <div className="match-body">
                  <div className="match-head">
                    <p className="match-title">{m.opponentName || 'Unknown opponent'}</p>
                    <span className="muted small">
                      {[m.date, where, team.versions.length > 1 && v ? `v${v}` : null].filter(Boolean).join(', ')}
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
            tournaments={tournaments}
            onCreateTournament={createTournament}
            onSubmit={update}
            submitLabel="Save changes"
          />
        </Modal>
      )}
    </section>
  )
}

const isEmptyDraft = d =>
  !d || (!d.opponentTeam?.length && !d.brought?.length && !d.notes && !d.opponentName)

/** Controlled when given value/onChange (the new-game draft), otherwise keeps its own state (editing). */
function LogForm({ value, onChange, initial, roster, last, species, events, tournaments, onCreateTournament, onSubmit, submitLabel }) {
  const [own, setOwn] = useState(initial)
  const g = value ?? own
  const setG = onChange ?? setOwn
  const [creating, setCreating] = useState(false)
  const set = (k, v) => setG(s => ({ ...s, [k]: v }))
  const tournament = tournaments.find(t => t.id === g.tournamentId)
  const sorted = [...tournaments].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  // Handy for Bo3: same player, same team preview, same round
  const sameOpponent = () =>
    setG(s => ({
      ...s,
      opponentName: last.opponentName || '',
      opponentTeam: [...(last.opponentTeam || [])],
      event: last.event || s.event,
      tournamentId: last.tournamentId || s.tournamentId,
      round: last.tournamentId ? last.round || '' : s.round,
    }))

  const pickTournament = value => {
    if (value === '__new') return setCreating(true)
    setG(s => ({ ...s, tournamentId: value, round: value ? s.round || 'R1' : '' }))
  }

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
          {tournament
            ? <input value={tournament.name} disabled title="Set by the tournament" />
            : <input list="events" value={g.event} onChange={e => set('event', e.target.value)} placeholder="Ladder, locals" />}
        </Field>
        <Field label="Opponent">
          <input value={g.opponentName} onChange={e => set('opponentName', e.target.value)} placeholder="Player name" />
        </Field>
      </div>

      <div className="tourney-row">
        <Field label="Tournament">
          <select value={g.tournamentId || ''} onChange={e => pickTournament(e.target.value)}>
            <option value="">Not a tournament game</option>
            {sorted.map(t => <option key={t.id} value={t.id}>{t.name}{t.date ? ` (${t.date})` : ''}</option>)}
            <option value="__new">New tournament…</option>
          </select>
        </Field>
        {tournament && (
          <div className="field">
            <span>Round {tournament.bestOf !== 1 && <small className="muted">games with the same round form a set</small>}</span>
            <div className="row nowrap">
              <input value={g.round} onChange={e => set('round', e.target.value)} placeholder="R1, Top 8" aria-label="Round" />
              <button type="button" className="btn sm" onClick={() => set('round', nextRound(g.round))}>Next round</button>
            </div>
          </div>
        )}
      </div>

      {creating && (
        <TournamentForm
          tournament={emptyTournament()}
          isNew
          onClose={() => setCreating(false)}
          onSave={t => {
            onCreateTournament(t)
            setG(s => ({ ...s, tournamentId: t.id, round: 'R1' }))
            setCreating(false)
          }}
        />
      )}

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
