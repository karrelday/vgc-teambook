import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import Calcs from './Calcs'
import VersionBar from './Versions'
import ShareCard from './ShareCard'
import { Modal } from './ui'

const TABS = [
  ['team', 'Team'],
  ['plans', 'Game plans'],
  ['speed', 'Speed'],
  ['calcs', 'Calcs'],
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
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState(null)
  const [knownSpecies, setKnownSpecies] = useState([])
  const [allTags, setAllTags] = useState([])

  // updatedAt of the last copy the server confirmed. Every save sends it, so a save
  // made from an out-of-date copy (another tab or device) is refused instead of erasing newer data.
  const rev = useRef(null)
  const pending = useRef(null)
  const running = useRef(false)

  useEffect(() => {
    api.get(id)
      .then(t => { rev.current = t.updatedAt; setTeam(t) })
      .catch(e => setError(e.message))
    api.species().then(setKnownSpecies).catch(() => {})
  }, [id])

  // Saves go out one at a time; if several changes pile up, only the newest is sent
  const flush = useCallback(async () => {
    if (running.current) return
    running.current = true
    while (pending.current) {
      const next = pending.current
      pending.current = null
      setStatus('Saving')
      try {
        const saved = await api.update(id, { ...next, updatedAt: rev.current })
        rev.current = saved.updatedAt
        if (!pending.current) { setStatus('Saved'); setNotice('') }
      } catch (e) {
        if (e.status === 409 && e.body?.team) {
          pending.current = null
          rev.current = e.body.team.updatedAt
          setTeam(e.body.team)
          setStatus('Reloaded')
          setNotice("This team was changed in another tab or device, so the newest copy was loaded. Your last change wasn't saved, so redo it if you still want it.")
        } else {
          setStatus('Not saved')
          setNotice(`Couldn't save: ${e.message}`)
        }
      }
    }
    running.current = false
  }, [id])

  // Local state updates instantly; the server catches up in the background
  const save = useCallback(next => {
    setTeam(next)
    pending.current = next
    flush()
  }, [flush])

  // The game you're logging survives tab switches and refreshes until you log it or clear it
  const draftKey = `teambook:draft:${id}`
  const [draft, setDraftState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(draftKey)) } catch { return null }
  })
  const setDraft = useCallback(update => {
    setDraftState(prev => {
      const next = typeof update === 'function' ? update(prev) : update
      try {
        if (next) localStorage.setItem(draftKey, JSON.stringify(next))
        else localStorage.removeItem(draftKey)
      } catch { /* storage unavailable: the draft still lives until the page closes */ }
      return next
    })
  }, [draftKey])

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

  const tabProps = { team, save, species, rememberSpecies, draft, setDraft }

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
        <span className={`status ${status === 'Saved' || status === 'Saving' ? '' : 'bad'}`} aria-live="polite">{status}</span>
      </div>

      {notice && (
        <div className="notice" role="alert">
          <p>{notice}</p>
          <button className="btn ghost sm" onClick={() => setNotice('')}>Dismiss</button>
        </div>
      )}

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
        {tab === 'calcs' && <Calcs {...tabProps} />}
        {tab === 'threats' && <Threats {...tabProps} />}
        {tab === 'notes' && <Notes {...tabProps} key={team.updatedAt} />}
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
