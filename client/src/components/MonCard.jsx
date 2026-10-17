import MonImage from './MonImage'
import { STATS, TERA_ENABLED, spreadText } from '../lib/model'
import { finalStats, natureMods, useDex } from '../lib/dex'

export default function MonCard({ mon, onOpen }) {
  const spread = spreadText(mon)
  const dex = useDex()
  const { stats } = finalStats(mon, dex)
  const [plus, minus] = natureMods(mon.nature)
  const hasStats = STATS.some(([k]) => stats?.[k] != null)
  const meta = [
    ['Item', mon.item],
    ['Ability', mon.ability],
    ['Tera', TERA_ENABLED && mon.teraType],
    ['Nature', mon.nature],
  ].filter(([, v]) => v)

  return (
    <div
      className="mon-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())}
      aria-label={`Edit ${mon.species}`}
    >
      <div className="mon-card-top">
        <MonImage mon={mon} className="lg" />
        <div>
          <h3>{mon.nickname || mon.species || 'Unnamed'}</h3>
          {mon.nickname && <p className="muted small">{mon.species}</p>}
          {meta.length > 0 && (
            <dl className="mon-meta">
              {meta.map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          )}
        </div>
      </div>

      {mon.moves?.some(Boolean) && (
        <ul className="moves">
          {mon.moves.filter(Boolean).map((m, i) => <li key={i}>{m}</li>)}
        </ul>
      )}

      {spread && <p className="spread">{spread} SP</p>}

      {hasStats && (
        <div className="stat-row">
          {STATS.map(([k, l]) => (
            <div key={k} className={k === plus ? 'plus' : k === minus ? 'minus' : ''}>
              <span>{l}</span><strong>{stats?.[k] ?? '–'}</strong>
            </div>
          ))}
        </div>
      )}

      {mon.notes && <p className="mon-notes">{mon.notes}</p>}
    </div>
  )
}
