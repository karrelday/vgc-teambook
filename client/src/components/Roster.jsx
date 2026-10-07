import { useState } from 'react'
import { emptyMon } from '../lib/model'
import MonCard from './MonCard'
import MonEditor from './MonEditor'

export default function Roster({ team, save }) {
  const [editing, setEditing] = useState(null)
  const isNew = editing && !team.mons.some(m => m.id === editing.id)

  const upsert = mon => {
    const mons = isNew ? [...team.mons, mon] : team.mons.map(m => (m.id === mon.id ? mon : m))
    save({ ...team, mons })
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

