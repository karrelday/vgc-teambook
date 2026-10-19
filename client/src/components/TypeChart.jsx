import { useCalcMeta } from '../lib/calc'
import { useDex } from '../lib/dex'
import { defensiveMatrix, multClass, multLabel, offensiveCoverage } from '../lib/types'
import MonImage from './MonImage'

export default function TypeChart({ mons }) {
  const dex = useDex()
  const meta = useCalcMeta()
  if (!mons.length || !dex.loaded) return null

  const rows = defensiveMatrix(mons, dex)
  const problems = rows.filter(r => r.problem)
  const coverage = meta.loaded && !meta.failed ? offensiveCoverage(mons, meta.movesByName) : null
  const unhit = coverage?.filter(c => c.best !== null && c.best <= 1) || []
  const unknown = mons.filter((m, i) => rows[0].cells[i].mult === null)

  return (
    <section className="type-chart">
      <div className="section-head">
        <h2>Type matchups</h2>
      </div>

      <div className="type-summary">
        <p>
          {problems.length
            ? <><strong className="bad">Watch out for {problems.map(p => p.type).join(', ')}.</strong> {problems.length === 1 ? 'It hits' : 'They hit'} several of your Pokémon super effectively with few resists to switch into.</>
            : <strong className="good">No type hits 3 or more of your Pokémon super effectively.</strong>}
        </p>
        {coverage && (
          <p className="small">
            {unhit.length
              ? <>Your moves don't hit <strong>{unhit.map(u => u.type).join(', ')}</strong> super effectively.</>
              : 'Your moves hit every type super effectively.'}
          </p>
        )}
        {unknown.length > 0 && (
          <p className="hint">Left out (not in the Pokédex): {unknown.map(m => m.species || 'unnamed').join(', ')}.</p>
        )}
      </div>

      <div className="table-wrap">
        <table className="type-table">
          <thead>
            <tr>
              <th scope="col">Attacking type</th>
              {mons.map(m => (
                <th key={m.id} scope="col" title={m.species}><MonImage mon={m} className="sm" /></th>
              ))}
              <th scope="col">Weak</th>
              <th scope="col">Resist</th>
              {coverage && <th scope="col">Your best hit</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.type} className={r.problem ? 'problem' : ''}>
                <th scope="row"><span className={`type-pill t-${r.type.toLowerCase()}`}>{r.type}</span></th>
                {r.cells.map(c => (
                  <td key={c.mon.id} className={`mult ${multClass(c.mult)}`}>{multLabel(c.mult)}</td>
                ))}
                <td className={`count ${r.weak >= 3 ? 'bad' : ''}`}>{r.weak || ''}</td>
                <td className="count">{r.resist || ''}</td>
                {coverage && (
                  <td className={`best ${coverage[i].best > 1 ? 'good' : 'muted'}`}
                    title={coverage[i].hitters.map(h => `${h.mon.species}: ${h.move.name}`).join('\n')}>
                    {coverage[i].best === null ? '' : coverage[i].best > 1 ? `${coverage[i].best}×` : coverage[i].best === 0 ? 'Immune' : coverage[i].best < 1 ? 'Resisted' : 'Neutral'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">Abilities like Levitate count when you've entered them, or when the Pokémon only has one (Megas).</p>
    </section>
  )
}
