import { useEffect } from 'react'

export function Field({ label, children, wide }) {
  return (
    <label className={`field ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="btn ghost icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function RecordBar({ rec }) {
  return (
    <div className="recbar" role="img" aria-label={rec.total ? `${rec.rate}% win rate` : 'No games logged'}>
      {rec.total > 0 && <div className="recbar-win" style={{ width: `${rec.rate}%` }} />}
      {rec.total === 0 && <div className="recbar-none" />}
    </div>
  )
}
