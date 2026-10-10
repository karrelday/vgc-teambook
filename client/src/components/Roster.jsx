import { useState } from 'react'
import { emptyMon } from '../lib/model'
import { currentVersion, norm, startNewVersion } from '../lib/stats'
import MonCard from './MonCard'
import MonEditor from './MonEditor'

export default function Roster({ team, save }) {
  const [editing, setEditing] = useState(null)
  const isNew = editing && !team.mons.some(m => m.id === editing.id)

  const upsert = mon => {
    let base = team
    const old = team.mons.find(m => m.id === mon.id)
    const cur = currentVersion(team)
    const swapped = old && norm(old.species) !== norm(mon.species)
    const hasGames = cur && team.matches.some(m => m.versionId === cur.id)
    // Swapping a Pokémon mid-version would rewrite the games already logged with it
    if (swapped && hasGames &&
        confirm(`You have games logged on v${cur.number}. Start v${cur.number + 1} for ${old.species} → ${mon.species}?\n\nOK = new version (recommended). Cancel = change v${cur.number} in place.`)) {
      base = startNewVersion(team, `${mon.species} over ${old.species}`)
    }
    const mons = isNew ? [...base.mons, mon] : base.mons.map(m => (m.id === mon.id ? mon : m))
    save({ ...base, mons })
    setEditing(null)
  }

  const remove = id => {
    if (!confirm('Remove this Pokémon from the team?')) return
    save({
      ...team,
      mons: team.mons.filter(m => m.id !== id),
      plans: team.plans.map(p => ({
        ...p,
        leads: p.leads.filter(x => x !== id),
        back: p.back.filter(x => x !== id),
      })),
    })
    setEditing(null)
  }

  const move = (index, dir) => {
    const mons = [...team.mons]
    const to = index + dir
    if (to < 0 || to >= mons.length) return
    ;[mons[index], mons[to]] = [mons[to], mons[index]]
    save({ ...team, mons })
  }

  return (
    <section>
      <div className="section-head">
        <h2>Team</h2>
        <div className="row">
          {team.mons.length < 6 && (
            <button className="btn primary" onClick={() => setEditing(emptyMon())}>Add Pokémon</button>
          )}
        </div>
      </div>

      {team.mons.length === 0 ? (
        <div className="empty">
          <p>This team has no Pokémon yet. Add up to six.</p>
        </div>
      ) : (
        <div className="roster">
          {team.mons.map((m, i) => (
            <div className="roster-slot" key={m.id}>
              <MonCard mon={m} onOpen={() => setEditing(m)} />
              <div className="reorder">
                <button className="btn ghost sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${m.species} earlier`}>◀</button>
                <button className="btn ghost sm" disabled={i === team.mons.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${m.species} later`}>▶</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <MonEditor mon={editing} isNew={isNew} onSave={upsert}
          onDelete={() => remove(editing.id)} onClose={() => setEditing(null)} />
      )}

    </section>
  )
}

