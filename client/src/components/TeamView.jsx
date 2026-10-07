import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { record } from '../lib/model'
import MonImage from './MonImage'
import TeamInfoForm from './TeamInfoForm'
import Roster from './Roster'
import GamePlans from './GamePlans'
import Notes from './Notes'
import Matches from './Matches'
import { Modal } from './ui'

const TABS = [
  ['team', 'Team'],
  ['plans', 'Game plans'],
  ['notes', 'Notes'],
  ['matches', 'Matches'],
]

export default function TeamView({ id }) {
  const [team, setTeam] = useState(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('team')
  const [status, setStatus] = useState('')
  const [editingInfo, setEditingInfo] = useState(false)

  useEffect(() => {
    api.get(id).then(setTeam).catch(e => setError(e.message))
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
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <a href="#/" className="back">All teams</a>

      <header className="team-hero">
        <div>
          <h1>{team.name}</h1>
          {team.format && <p className="format">{team.format}</p>}
          {team.summary && <p className="summary">{team.summary}</p>}
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

      <div className="toolbar">
        <button className="btn sm" onClick={() => setEditingInfo(true)}>Edit details</button>
        <button className="btn sm" onClick={downloadBackup}>Download team file</button>
        <span className={`status ${status.startsWith('Not') ? 'bad' : ''}`} aria-live="polite">{status}</span>
      </div>

      <nav className="tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key}
            className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {label}
            {key === 'matches' && rec.total > 0 && <span className="tab-count">{rec.total}</span>}
          </button>
        ))}
      </nav>

      <div className="tab-panel" role="tabpanel">
        {tab === 'team' && <Roster team={team} save={save} />}
        {tab === 'plans' && <GamePlans team={team} save={save} />}
        {tab === 'notes' && <Notes team={team} save={save} />}
        {tab === 'matches' && <Matches team={team} save={save} />}
      </div>

      {editingInfo && (
        <Modal title="Edit team details" onClose={() => setEditingInfo(false)}>
          <TeamInfoForm
            initial={team}
            submitLabel="Save details"
            onSubmit={async v => {
              await save({ ...team, name: v.name, format: v.format, summary: v.summary })
              setEditingInfo(false)
            }}
          />
        </Modal>
      )}
    </>
  )
}
