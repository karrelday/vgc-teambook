import { useState } from 'react'
import { Field } from './ui'

export default function TeamInfoForm({ initial = {}, onSubmit, submitLabel }) {
  const [v, setV] = useState({
    name: initial.name || '',
    format: initial.format || '',
    summary: initial.summary || '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k, x) => setV(s => ({ ...s, [k]: x }))

  const submit = async e => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSubmit(v)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <Field label="Team name">
        <input required autoFocus value={v.name} onChange={e => set('name', e.target.value)} placeholder="Sableye Altaria balance" />
      </Field>
      <Field label="Format or regulation">
        <input value={v.format} onChange={e => set('format', e.target.value)} placeholder="Reg M-A, MBL qualifier" />
      </Field>
      <Field label="One-line summary">
        <input value={v.summary} onChange={e => set('summary', e.target.value)} placeholder="Gravity Sing into spread damage" />
      </Field>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button className="btn primary" disabled={busy}>{busy ? 'Saving' : submitLabel}</button>
      </div>
    </form>
  )
}
