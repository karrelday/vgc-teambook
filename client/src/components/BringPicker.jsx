import MonImage from './MonImage'

/** Tap a Pokémon to bring it, tap again to make it a lead, again to clear. */
export default function BringPicker({ mons, brought, leads, onChange }) {
  const cycle = id => {
    if (leads.includes(id)) return onChange(brought.filter(x => x !== id), leads.filter(x => x !== id))
    if (brought.includes(id)) {
      return leads.length < 2
        ? onChange(brought, [...leads, id])
        : onChange(brought.filter(x => x !== id), leads)
    }
    if (brought.length < 4) onChange([...brought, id], leads)
  }

  return (
    <div className="bring">
      {mons.map(m => {
        const state = leads.includes(m.id) ? 'lead' : brought.includes(m.id) ? 'back' : 'none'
        return (
          <button
            type="button"
            key={m.id}
            className={`bring-slot ${state}`}
            disabled={state === 'none' && brought.length >= 4}
            onClick={() => cycle(m.id)}
            aria-label={`${m.species}: ${state === 'lead' ? 'lead' : state === 'back' ? 'brought' : 'not brought'}`}
          >
            <MonImage mon={m} className="md" />
            <span className="bring-tag">{state === 'lead' ? 'Lead' : state === 'back' ? 'Back' : m.species}</span>
          </button>
        )
      })}
    </div>
  )
}
