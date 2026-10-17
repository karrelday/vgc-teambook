import { useState } from 'react'

/** Free-text chips. Enter or comma adds a tag; suggestions come from tags used on other teams. */
export default function TagInput({ value, onChange, suggestions = [], placeholder, label }) {
  const [text, setText] = useState('')
  const has = t => value.some(v => v.toLowerCase() === t.toLowerCase())

  const add = raw => {
    const t = raw.trim().replace(/,$/, '').trim()
    setText('')
    if (t && !has(t)) onChange([...value, t])
  }

  const unused = suggestions.filter(s => !has(s))

  return (
    <div className="tag-input">
      <div className="chips">
        {value.map(t => (
          <span className="chip tag-chip" key={t}>
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter(v => v !== t))}>×</button>
          </span>
        ))}
        <input
          value={text}
          aria-label={label}
          placeholder={value.length ? '' : placeholder}
          onChange={e => (e.target.value.endsWith(',') ? add(e.target.value) : setText(e.target.value))}
          onKeyDown={e => {
            if (e.key === 'Enter' && text.trim()) { e.preventDefault(); add(text) }
            else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1))
          }}
          onBlur={() => text && add(text)}
        />
      </div>
      {unused.length > 0 && (
        <div className="tag-suggest">
          {unused.slice(0, 8).map(s => (
            <button type="button" key={s} className="btn ghost sm" onClick={() => add(s)}>+ {s}</button>
          ))}
        </div>
      )}
    </div>
  )
}
