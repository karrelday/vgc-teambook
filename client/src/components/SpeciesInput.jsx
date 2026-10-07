import { useState } from 'react'
import MonImage from './MonImage'

/** Chip input for species names, with type-ahead from Pokémon you've used before. */
export default function SpeciesInput({ value, onChange, suggestions = [], max = 6, placeholder, autoFocus, label }) {
  const [text, setText] = useState('')
  const [active, setActive] = useState(0)
  const [focused, setFocused] = useState(false)

  const q = text.trim().toLowerCase()
  const taken = new Set(value.map(v => v.toLowerCase()))
  const matches = q
    ? suggestions
        .filter(s => s.toLowerCase().includes(q) && !taken.has(s.toLowerCase()))
        .sort((a, b) => b.toLowerCase().startsWith(q) - a.toLowerCase().startsWith(q))
        .slice(0, 7)
    : []
  const exact = matches.some(m => m.toLowerCase() === q)
  const options = q ? [...matches, ...(exact || taken.has(q) ? [] : [{ raw: text.trim() }])] : []

  const add = name => {
    const v = name.trim()
    setText('')
    setActive(0)
    if (!v || value.length >= max || taken.has(v.toLowerCase())) return
    onChange([...value, v])
  }

  const onKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const pick = options[active]
      if (pick) add(typeof pick === 'string' ? pick : pick.raw)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(a => Math.min(a + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(a => Math.max(a - 1, 0))
    } else if (e.key === 'Backspace' && !text && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="species-input">
      <div className="chips">
        {value.map((s, i) => (
          <span className="chip" key={s}>
            <MonImage mon={{ species: s }} className="xs" />
            {s}
            <button type="button" aria-label={`Remove ${s}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>×</button>
          </span>
        ))}
        {value.length < max && (
          <input
            value={text}
            autoFocus={autoFocus}
            aria-label={label}
            placeholder={value.length ? '' : placeholder}
            onChange={e => { setText(e.target.value); setActive(0) }}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        )}
      </div>
      {focused && options.length > 0 && (
        <ul className="suggestions" role="listbox">
          {options.map((o, i) => {
            const name = typeof o === 'string' ? o : o.raw
            return (
              <li key={name + i} role="option" aria-selected={i === active}
                className={i === active ? 'active' : ''}
                onMouseDown={e => { e.preventDefault(); add(name) }}
                onMouseEnter={() => setActive(i)}>
                <MonImage mon={{ species: name }} className="xs" />
                {typeof o === 'string' ? name : <span>Add "{name}"</span>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
