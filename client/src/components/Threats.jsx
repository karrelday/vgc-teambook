import { useState } from 'react'
import { uid } from '../lib/model'
import { currentVersion, norm, opponentStats, recordVs } from '../lib/stats'
import MonImage from './MonImage'
import SpeciesInput from './SpeciesInput'
import { Field, Modal } from './ui'

export default function Threats({ team, save, species, rememberSpecies }) {
  const [editing, setEditing] = useState(null)
  const cur = currentVersion(team)
  const curMatches = team.matches.filter(m => m.versionId === cur?.id)
  const multiVersion = team.versions.length > 1

  // Pokémon you keep losing to that aren't on the list yet
  const suggested = opponentStats(team.matches).rows
    .filter(r => r.games >= 3 && r.w / r.games < 0.5 && !team.threats.some(t => norm(t.species) === r.key))
    .sort((a, b) => a.w / a.games - b.w / b.games)
    .slice(0, 6)

  const upsert = threat => {
    const exists = team.threats.some(t => t.id === threat.id)
    save({ ...team, threats: exists ? team.threats.map(t => (t.id === threat.id ? threat : t)) : [...team.threats, threat] })
    rememberSpecies([threat.species])
    setEditing(null)
  }
  const remove = id => {
    if (!confirm('Remove this threat?')) return
    save({ ...team, threats: team.threats.filter(t => t.id !== id) })
    setEditing(null)
  }

  return (
    <section>
      <div className="section-head">
        <h2>Threats</h2>
        <button className="btn primary" onClick={() => setEditing({ id: uid(), species: '', howToPlay: '' })}>Add threat</button>
      </div>

      {suggested.length > 0 && (
        <div className="suggested">
          <p className="small"><strong>Giving you trouble:</strong> <span className="muted">3+ games, under 50% against</span></p>
          <div className="row">
            {suggested.map(r => (
              <button key={r.key} className="toggle" onClick={() => setEditing({ id: uid(), species: r.species, howToPlay: '' })}>
                <MonImage mon={{ species: r.species }} className="sm" />
                <span>{r.species} ({r.w}–{r.games - r.w})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {team.threats.length === 0 ? (
        <div className="empty">
          <p>List the Pokémon this team struggles with and how you play into each one. Your record against them fills in from your match log.</p>
        </div>
      ) : (
        <div className="threats">
          {team.threats.map(t => {
            const all = recordVs(team.matches, t.species)
            const now = recordVs(curMatches, t.species)
            return (
              <article className="threat" key={t.id}>
                <MonImage mon={{ species: t.species }} className="lg" />
                <div className="threat-body">
                  <div className="threat-head">
                    <h3>{t.species}</h3>
                    <button className="btn ghost sm" onClick={() => setEditing(t)}>Edit</button>
                  </div>
                  <p className="threat-rec">
                    {all.total ? (
                      <>
                        <span className={all.rate < 45 ? 'bad' : all.rate >= 60 ? 'good' : ''}>{all.w}–{all.l} against it ({all.rate}%)</span>
                        {multiVersion && now.total > 0 && <span className="muted"> · v{cur.number}: {now.w}–{now.l}</span>}
                      </>
                    ) : (
                      <span className="muted">Not faced yet</span>
                    )}
                  </p>
                  <p className="prewrap">{t.howToPlay || <span className="muted">No game plan written yet.</span>}</p>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {editing && (
        <ThreatEditor
          threat={editing}
          isNew={!team.threats.some(t => t.id === editing.id)}
          species={species}
          onSave={upsert}
          onDelete={() => remove(editing.id)}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}

function ThreatEditor({ threat, isNew, species, onSave, onDelete, onClose }) {
  const [draft, setDraft] = useState(threat)
  return (
    <Modal title={isNew ? 'Add threat' : `Edit ${threat.species}`} onClose={onClose}>
      <form className="stack" onSubmit={e => { e.preventDefault(); if (draft.species) onSave(draft) }}>
        <div className="field">
          <span>Pokémon</span>
          <SpeciesInput label="Threat Pokémon" value={draft.species ? [draft.species] : []} max={1} autoFocus={!draft.species}
            suggestions={species} placeholder="Type a Pokémon, press Enter"
            onChange={v => setDraft(d => ({ ...d, species: v[0] || '' }))} />
        </div>
        <Field label="How to play into it">
          <textarea rows={6} value={draft.howToPlay} onChange={e => setDraft(d => ({ ...d, howToPlay: e.target.value }))}
            placeholder="What to lead, what to target first, what to avoid" />
        </Field>
        <div className="actions spread-actions">
          {!isNew && <button type="button" className="btn ghost danger" onClick={onDelete}>Remove threat</button>}
          <div className="row">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" disabled={!draft.species}>{isNew ? 'Add threat' : 'Save changes'}</button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
