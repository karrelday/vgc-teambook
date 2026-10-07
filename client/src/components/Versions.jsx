import { useState } from 'react'
import { record, uid } from '../lib/model'
import { currentVersion, diffMons, rosterOf } from '../lib/stats'
import MonImage from './MonImage'
import { Field, Modal } from './ui'

const fmtDate = iso => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '')

export default function VersionBar({ team, save }) {
  const [mode, setMode] = useState(null)
  const [note, setNote] = useState('')
  const cur = currentVersion(team)
  if (!cur) return null

  const startNew = e => {
    e.preventDefault()
    // Freeze the current roster into the version that's ending
    const versions = team.versions.map(v => (v.id === cur.id ? { ...v, mons: structuredClone(team.mons) } : v))
    versions.push({ id: uid(), number: cur.number + 1, note: note.trim(), startedAt: new Date().toISOString(), mons: [] })
    save({ ...team, versions })
    setNote('')
    setMode(null)
  }

  return (
    <div className="version-bar">
      <div className="version-now">
        <span className="version-chip">v{cur.number}</span>
        <span className="muted">{cur.note || 'No description'}</span>
      </div>
      <div className="row">
        {team.versions.length > 1 && (
          <button className="btn ghost sm" onClick={() => setMode('history')}>History</button>
        )}
        <button className="btn sm" onClick={() => setMode('new')}>New version</button>
      </div>

      {mode === 'new' && (
        <Modal title={`Start v${cur.number + 1}`} onClose={() => setMode(null)}>
          <form className="stack" onSubmit={startNew}>
            <p className="muted">
              This locks v{cur.number}'s roster and record. Games you log from now on count toward v{cur.number + 1}.
              Make your team changes after this.
            </p>
            <Field label="What are you changing?">
              <input autoFocus value={note} onChange={e => setNote(e.target.value)} placeholder="Kingambit over Sneasler" />
            </Field>
            <div className="actions">
              <button type="button" className="btn ghost" onClick={() => setMode(null)}>Cancel</button>
              <button className="btn primary">Start v{cur.number + 1}</button>
            </div>
          </form>
        </Modal>
      )}

      {mode === 'history' && (
        <Modal title="Version history" onClose={() => setMode(null)} wide>
          <div className="version-list">
            {[...team.versions].reverse().map(v => {
              const i = team.versions.indexOf(v)
              const roster = rosterOf(team, v.id)
              const changes = i > 0 ? diffMons(rosterOf(team, team.versions[i - 1].id), roster) : null
              const rec = record(team.matches.filter(m => m.versionId === v.id))
              const isCurrent = v.id === cur.id
              return (
                <article className="version-item" key={v.id}>
                  <header>
                    <span className="version-chip">v{v.number}</span>
                    {isCurrent && <span className="tag">Current</span>}
                    <span className="muted small">{fmtDate(v.startedAt)}</span>
                    <span className="rec">{rec.total ? `${rec.w}–${rec.l} (${rec.rate}%)` : 'No games'}</span>
                  </header>
                  {v.note && <p>{v.note}</p>}
                  <div className="pair">
                    {roster.map(m => <MonImage key={m.id} mon={m} className="sm" />)}
                  </div>
                  {changes === null ? (
                    <p className="muted small">Starting roster</p>
                  ) : changes.length ? (
                    <ul className="changes">
                      {changes.map((c, j) => <li key={j} className={c.type}>{c.text}</li>)}
                    </ul>
                  ) : (
                    <p className="muted small">No roster changes{isCurrent ? ' yet' : ''}</p>
                  )}
                </article>
              )
            })}
          </div>
        </Modal>
      )}
    </div>
  )
}
