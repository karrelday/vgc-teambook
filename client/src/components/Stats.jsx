import { useState } from 'react'
import { record } from '../lib/model'
import { currentVersion, leadStats, matchesIn, monStats, opponentStats, pct } from '../lib/stats'
import MonImage from './MonImage'
import VersionFilter from './VersionFilter'

const rateClass = (w, n) => {
  const p = pct(w, n)
  if (p === null || n < 2) return ''
  return p >= 60 ? 'good' : p < 45 ? 'bad' : ''
}

function Rate({ w, n }) {
  if (!n) return <span className="muted">–</span>
  return <span className={`rate ${rateClass(w, n)}`}>{pct(w, n)}%</span>
}

export default function Stats({ team }) {
  const [versionId, setVersionId] = useState(currentVersion(team)?.id || '')
  const [oppSort, setOppSort] = useState('seen')
  const [showAll, setShowAll] = useState(false)

  const matches = matchesIn(team, versionId)
  const rec = record(matches)
  const mons = monStats(team, matches)
  const leads = leadStats(team, matches)
  const opp = opponentStats(matches)

  const oppRows = [...opp.rows].sort((a, b) =>
    oppSort === 'seen'
      ? b.games - a.games || a.w / a.games - b.w / b.games
      : (b.games >= 2) - (a.games >= 2) || a.w / a.games - b.w / b.games || b.games - a.games
  )
  const oppShown = showAll ? oppRows : oppRows.slice(0, 12)

  if (!team.matches.length) {
    return <div className="empty"><p>Log some games in the Matches tab and your stats show up here.</p></div>
  }

  return (
    <section className="stats">
      <div className="stats-head">
        <div>
          <strong className="big-record">{rec.w}–{rec.l}</strong>
          <span className="muted"> {rec.total ? `${rec.rate}% over ${rec.total} games` : 'No games in this version'}</span>
        </div>
        <VersionFilter team={team} value={versionId} onChange={setVersionId} />
      </div>

      <div className="stats-grid">
        <div className="panel">
          <h2>Your Pokémon</h2>
          <p className="hint">From {mons.logged} of {rec.total} games with your bring logged</p>
          {mons.rows.length === 0 ? (
            <p className="muted small">Tap your bring when logging games to see this.</p>
          ) : (
            <div className="table-wrap">
              <table className="stat-table-view">
                <thead>
                  <tr><th>Pokémon</th><th>Brought</th><th>Record</th><th>Win</th><th>Led</th><th>Lead win</th></tr>
                </thead>
                <tbody>
                  {mons.rows.map(r => (
                    <tr key={r.id}>
                      <td><span className="who"><MonImage mon={r.mon} className="sm" />{r.mon.species}</span></td>
                      <td>{r.games}</td>
                      <td>{r.w}–{r.games - r.w}</td>
                      <td><Rate w={r.w} n={r.games} /></td>
                      <td>{r.leadGames}</td>
                      <td><Rate w={r.leadW} n={r.leadGames} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel">
          <h2>Lead pairs</h2>
          <p className="hint">From {leads.logged} games with both leads logged</p>
          {leads.rows.length === 0 ? (
            <p className="muted small">Mark two leads when logging games to see this.</p>
          ) : (
            <ul className="lead-list">
              {leads.rows.map(r => (
                <li key={r.key}>
                  <span className="pair">
                    {r.mons.map(m => <MonImage key={m.id} mon={m} className="md" />)}
                  </span>
                  <span className="lead-names">{r.mons.map(m => m.species).join(' + ')}</span>
                  <span className="lead-rec">{r.w}–{r.games - r.w}</span>
                  <Rate w={r.w} n={r.games} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="section-head">
          <div>
            <h2>Against</h2>
            <p className="hint">Your record when each Pokémon was in their team preview, from {opp.logged} games</p>
          </div>
          {opp.rows.length > 0 && (
            <div className="seg" role="radiogroup" aria-label="Sort">
              {[['seen', 'Most seen'], ['worst', 'Worst record']].map(([v, l]) => (
                <button key={v} role="radio" aria-checked={oppSort === v}
                  className={`btn sm ${oppSort === v ? 'on' : 'ghost'}`} onClick={() => setOppSort(v)}>{l}</button>
              ))}
            </div>
          )}
        </div>
        {opp.rows.length === 0 ? (
          <p className="muted small">Add their team preview when logging games to see this.</p>
        ) : (
          <>
            <div className="opp-grid">
              {oppShown.map(r => (
                <div className="opp" key={r.key}>
                  <MonImage mon={{ species: r.species }} className="md" />
                  <div>
                    <p className="opp-name">{r.species}</p>
                    <p className="small">
                      {r.w}–{r.games - r.w} <Rate w={r.w} n={r.games} />
                      <span className="muted"> in {r.games}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {oppRows.length > 12 && (
              <button className="btn ghost sm" onClick={() => setShowAll(s => !s)}>
                {showAll ? 'Show fewer' : `Show all ${oppRows.length}`}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )
}
