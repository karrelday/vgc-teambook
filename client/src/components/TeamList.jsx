import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { record } from '../lib/model'
import MonImage from './MonImage'
import TeamInfoForm from './TeamInfoForm'
import { Modal, RecordBar } from './ui'

export default function TeamList() {
  const [teams, setTeams] = useState(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('')
  const [archivedView, setArchivedView] = useState(false)
  const fileRef = useRef()

  const load = () => api.list().then(setTeams).catch(e => setError(e.message))
  useEffect(() => { load() }, [])

  const create = async ({ name, format, summary, tags }) => {
    const team = await api.create({ name, format, summary, tags })
    window.location.hash = `#/team/${team._id}`
  }

  const duplicate = async id => {
    try { await api.duplicate(id); load() } catch (e) { setError(e.message) }
  }

  const toggleArchive = async team => {
    try { await api.update(team._id, { ...team, archived: !team.archived }); load() } catch (e) { setError(e.message) }
  }

  const remove = async team => {
    if (!confirm(`Delete "${team.name}"? Its match history is deleted too.`)) return
    try { await api.remove(team._id); load() } catch (e) { setError(e.message) }
  }

  const importFile = async file => {
    setError('')
    try {
      const data = JSON.parse(await file.text())
      for (const t of Array.isArray(data) ? data : [data]) await api.create(t)
      load()
    } catch (e) {
      setError(`Could not import that file: ${e.message}`)
    }
  }

  const all = teams || []
  const active = all.filter(t => !t.archived)
  const archived = all.filter(t => t.archived)
  const pool = archivedView ? archived : active
  // Tags with counts, most used first
  const tagCounts = {}
  for (const t of pool) for (const g of t.tags || []) tagCounts[g] = (tagCounts[g] || 0) + 1
  const tagList = Object.entries(tagCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const allTags = [...new Set(all.flatMap(t => t.tags || []))]
  const activeTag = tagCounts[tag] ? tag : ''

  const q = query.trim().toLowerCase()
  const shown = pool.filter(t =>
    (!activeTag || (t.tags || []).includes(activeTag)) &&
    (!q ||
      t.name.toLowerCase().includes(q) ||
      (t.format || '').toLowerCase().includes(q) ||
      (t.tags || []).some(g => g.toLowerCase().includes(q)) ||
      t.mons.some(m => m.species.toLowerCase().includes(q)))
  )

  return (
    <>
      <div className="list-head">
        <h1>Your teams</h1>
        <div className="row">
          <button className="btn" onClick={() => fileRef.current.click()}>Import team file</button>
          <button className="btn primary" onClick={() => setCreating(true)}>New team</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden
            onChange={e => { e.target.files[0] && importFile(e.target.files[0]); e.target.value = '' }} />
        </div>
      </div>

      {teams?.length > 0 && (
        <div className="filters">
          <input className="search" type="search" placeholder="Search by team, tag or Pokémon"
            value={query} onChange={e => setQuery(e.target.value)} aria-label="Search teams" />
          {tagList.length > 0 && (
            <div className="tag-filter" role="radiogroup" aria-label="Filter by tag">
              <button role="radio" aria-checked={!activeTag} className={`btn sm ${!activeTag ? 'on' : 'ghost'}`} onClick={() => setTag('')}>All</button>
              {tagList.map(([g, n]) => (
                <button key={g} role="radio" aria-checked={activeTag === g}
                  className={`btn sm ${activeTag === g ? 'on' : 'ghost'}`} onClick={() => setTag(g)}>
                  {g} <span className="muted">{n}</span>
                </button>
              ))}
            </div>
          )}
          {(archived.length > 0 || archivedView) && (
            <button className={`btn sm archived-toggle ${archivedView ? 'on' : 'ghost'}`} aria-pressed={archivedView}
              onClick={() => { setArchivedView(v => !v); setTag('') }}>
              {archivedView ? 'Back to active teams' : `Archived (${archived.length})`}
            </button>
          )}
        </div>
      )}
      {archivedView && <p className="hint archived-note">Archived teams keep everything. Unarchive one to bring it back to your main list.</p>}

      {error && <p className="error">{error}</p>}
      {!teams && !error && <p className="muted">Loading teams</p>}

      {teams?.length === 0 && (
        <div className="empty">
          <p>No teams yet. Create one to start documenting your roster, game plans and results.</p>
          <button className="btn primary" onClick={() => setCreating(true)}>New team</button>
        </div>
      )}

      {teams?.length > 0 && shown.length === 0 && (
        <p className="muted">
          {archivedView && !archived.length ? 'No archived teams.' : query ? `No teams match "${query}".` : 'No teams with this tag.'}
        </p>
      )}

      <div className="team-grid">
        {shown.map(team => {
          const rec = record(team.matches)
          return (
            <article className="team-card" key={team._id}>
              <a href={`#/team/${team._id}`} className="team-card-link">
                <div className="strip">
                  {Array.from({ length: 6 }, (_, i) => (
                    <MonImage key={team.mons[i]?.id ?? i} mon={team.mons[i]} className="md" />
                  ))}
                </div>
                <div className="team-card-body">
                  <h2>{team.name}</h2>
                  <p className="format">
                    {team.format}
                    {team.versions?.length > 1 && <span className="version-chip">v{team.versions.at(-1).number}</span>}
                  </p>
                  {team.summary && <p className="summary">{team.summary}</p>}
                  {team.tags?.length > 0 && (
                    <div className="tags">{team.tags.map(g => <span key={g} className="tag">{g}</span>)}</div>
                  )}
                  <div className="card-record">
                    <span>{rec.total ? `${rec.w}–${rec.l}` : 'No games yet'}</span>
                    {rec.total > 0 && <span className="muted">{rec.rate}%</span>}
                  </div>
                  <RecordBar rec={rec} />
                </div>
              </a>
              <div className="card-actions">
                <button className="btn ghost sm" onClick={() => duplicate(team._id)}>Duplicate</button>
                <button className="btn ghost sm" onClick={() => toggleArchive(team)}>{team.archived ? 'Unarchive' : 'Archive'}</button>
                <button className="btn ghost sm danger" onClick={() => remove(team)}>Delete</button>
              </div>
            </article>
          )
        })}
      </div>

      {creating && (
        <Modal title="New team" onClose={() => setCreating(false)}>
          <TeamInfoForm submitLabel="Create team" onSubmit={create} allTags={allTags} />
        </Modal>
      )}
    </>
  )
}
