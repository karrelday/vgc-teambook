import { useState } from 'react'

const FIELDS = [
  ['howItPlays', 'How the team plays', 'Win conditions, speed control, what you want to happen each game'],
  ['weaknesses', 'General weaknesses', 'Structural problems: speed control, Fairy resists, lack of damage. Specific Pokémon go in Threats.'],
  ['piloting', 'Piloting notes', 'What you have learned from actually playing it: mistakes, reads, habits'],
]

export default function Notes({ team, save }) {
  const [draft, setDraft] = useState(() => ({ ...team.notes }))

  const commit = () => {
    const changed = FIELDS.some(([k]) => (draft[k] || '') !== (team.notes?.[k] || ''))
    if (changed) save({ ...team, notes: draft })
  }

  return (
    <section className="notes">
      {FIELDS.map(([key, label, hint]) => (
        <div className="note-block" key={key}>
          <label htmlFor={`note-${key}`}><h2>{label}</h2></label>
          <p className="hint">{hint}</p>
          <textarea
            id={`note-${key}`}
            rows={8}
            value={draft[key] || ''}
            onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
            onBlur={commit}
          />
        </div>
      ))}
      <p className="hint">Notes save when you click away from the box.</p>
    </section>
  )
}
