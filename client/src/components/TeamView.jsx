import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { useDex } from '../lib/dex'
import { record } from '../lib/model'
import MonImage from './MonImage'
import TeamInfoForm from './TeamInfoForm'
import Roster from './Roster'
import GamePlans from './GamePlans'
import Threats from './Threats'
import Notes from './Notes'
import Matches from './Matches'
import Stats from './Stats'
import Speed from './Speed'
import VersionBar from './Versions'
import ShareCard from './ShareCard'
import { Modal } from './ui'

const TABS = [
  ['team', 'Team'],
  ['plans', 'Game plans'],
  ['speed', 'Speed'],
  ['threats', 'Threats'],
  ['notes', 'Notes'],
  ['matches', 'Matches'],
  ['stats', 'Stats'],
]

export default function TeamView({ id }) {
  const [team, setTeam] = useState(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('team')
  const [status, setStatus] = useState('')
  const [modal, setModal] = useState(null)
  const [knownSpecies, setKnownSpecies] = useState([])
  const [allTags, setAllTags] = useState([])

  useEffect(() => {
    api.get(id).then(setTeam).catch(e => setError(e.message))
    api.species().then(setKnownSpecies).catch(() => {})
  }, [id])

  // Local state is the source of truth; every change is written straight to the API
  const save = useCallback(async next => {
    setTeam(next)
    setStatus('Saving')
    try {
      await api.update(id, next)
      setStatus('Saved')
    } catch (e) {
      setStatus(`Not saved: ${e.message}`)
    }
  }, [id])

  const rememberSpecies = useCallback(list => {
    setKnownSpecies(prev => {
      const have = new Set(prev.map(s => s.toLowerCase()))
      const add = list.filter(s => s && !have.has(s.toLowerCase()))
      return add.length ? [...prev, ...add].sort((a, b) => a.localeCompare(b)) : prev
    })
  }, [])

  const dex = useDex()
  // Pokémon you've used or faced come first, then the rest of the Pokédex
  const species = useMemo(() => {
    const map = new Map(knownSpecies.map(s => [s.toLowerCase(), s]))
    for (const m of team?.mons || []) if (m.species) map.set(m.species.toLowerCase(), m.species)
    for (const n of dex.names) if (!map.has(n.toLowerCase())) map.set(n.toLowerCase(), n)
    return [...map.values()]
  }, [knownSpecies, team?.mons, dex.names])

  if (error) {
    return (
      <div className="empty">
        <p>{error}</p>
        <a href="#/" className="btn">Back to teams</a>
      </div>
    )
  }
  if (!team) return <p className="muted">Loading team</p>

  const rec = record(team.matches)

  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify(team, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${team.name.replace(/[^\w-]+/g, '_')}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const tabProps = { team, save, species, rememberSpecies }

  // Tag suggestions come from every team
  const openInfo = () => {
    setModal('info')
    api.list().then(ts => setAllTags([...new Set(ts.flatMap(t => t.tags || []))])).catch(() => {})
  }

  return (
    <>
      <a href="#/" className="back">All teams</a>
      {team.archived && (
        <p className="archived-banner">
          This team is archived, so it's hidden from your main list.
          <button className="btn sm" onClick={() => save({ ...team, archived: false })}>Unarchive</button>
        </p>
      )}

      <header className="team-hero">
        <div>
          <h1>{team.name}</h1>
          {team.format && <p className="format">{team.format}</p>}
          {team.summary && <p className="summary">{team.summary}</p>}
          {team.tags?.length > 0 && (
            <div className="tags">{team.tags.map(g => <span key={g} className="tag">{g}</span>)}</div>
          )}
        </div>
        <div className="hero-record">
          <strong>{rec.w}–{rec.l}</strong>
          <span>{rec.total ? `${rec.rate}% over ${rec.total} games` : 'No games logged'}</span>
        </div>
      </header>

      <div className="hero-roster">
        {Array.from({ length: 6 }, (_, i) => (
          <div className="hero-slot" key={team.mons[i]?.id ?? i}>
            {team.mons[i] ? <MonImage mon={team.mons[i]} className="xl" /> : <span className="muted">Empty</span>}
          </div>
        ))}
      </div>

      <VersionBar team={team} save={save} />

      <div className="toolbar">
        <button className="btn sm" onClick={openInfo}>Edit details</button>
        <button className="btn sm" onClick={() => setModal('share')} disabled={!team.mons.length}>Share card</button>
        <button className="btn sm" onClick={downloadBackup}>Download team file</button>
        <button className="btn sm ghost" onClick={() => save({ ...team, archived: !team.archived })}>
          {team.archived ? 'Unarchive' : 'Archive team'}
        </button>
        <span className={`status ${status.startsWith('Not') ? 'bad' : ''}`} aria-live="polite">{status}</span>
      </div>

      <nav className="tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key}
            className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {label}
            {key === 'matches' && rec.total > 0 && <span className="tab-count">{rec.total}</span>}
            {key === 'threats' && team.threats.length > 0 && <span className="tab-count">{team.threats.length}</span>}
          </button>
        ))}
      </nav>

      <div className="tab-panel" role="tabpanel">
        {tab === 'team' && <Roster {...tabProps} />}
        {tab === 'plans' && <GamePlans {...tabProps} />}
        {tab === 'speed' && <Speed {...tabProps} />}
        {tab === 'threats' && <Threats {...tabProps} />}
        {tab === 'notes' && <Notes {...tabProps} />}
        {tab === 'matches' && <Matches {...tabProps} />}
        {tab === 'stats' && <Stats {...tabProps} />}
      </div>

      {modal === 'info' && (
        <Modal title="Edit team details" onClose={() => setModal(null)}>
          <TeamInfoForm
            initial={team}
            allTags={allTags}
            submitLabel="Save details"
            onSubmit={async v => {
              await save({ ...team, name: v.name, format: v.format, summary: v.summary, tags: v.tags })
              setModal(null)
            }}
          />
        </Modal>
      )}
      {modal === 'share' && <ShareCard team={team} onClose={() => setModal(null)} />}
    </>
  )
}
