import { useMemo } from 'react'
import { record } from '../lib/model'
import { sideSpecies, useCalcMeta, useCalcResults } from '../lib/calc'
import { finalStats, lookup, speedBenchmarks, useDex } from '../lib/dex'
import { leadStats, norm, recordVs } from '../lib/stats'
import { knownAbility, monTyping, multAgainst } from '../lib/types'
import MonImage from './MonImage'

const hasScarf = mon => /choice\s*scarf/i.test(mon.item || '')

/** Everything the app knows about the team preview you're facing, in one place. */
export default function MatchupPanel({ team, preview }) {
  const dex = useDex()
  const meta = useCalcMeta()

  // Games against teams that shared at least 3 of these Pokémon
  const wanted = new Set(preview.map(norm))
  const similar = team.matches.filter(m => (m.opponentTeam || []).filter(s => wanted.has(norm(s))).length >= Math.min(3, preview.length))
  const simRec = record(similar)
  const leads = leadStats(team, similar).rows.slice(0, 3)

  // Your speed and attacks, worked out once
  const mine = team.mons.map(mon => {
    const spe = finalStats(mon, dex).stats?.spe
    return {
      mon,
      speed: spe == null ? null : hasScarf(mon) ? Math.floor(spe * 1.5) : spe,
      typing: monTyping(mon, dex),
      attacks: (mon.moves || [])
        .map(n => meta.movesByName?.[(n || '').toLowerCase()])
        .filter(mv => mv && mv.category !== 'Status' && mv.bp > 0),
    }
  })

  // Saved calcs that involve any of these Pokémon
  const calcs = useMemo(
    () => (team.calcs || []).filter(c => [c.attacker, c.defender].some(s => s.source === 'theirs' && wanted.has(norm(s.species)))),
    [team.calcs, preview.join('|')] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const calcResults = useCalcResults(calcs, team, 0)

  return (
    <section className="panel matchup">
      <div className="section-head">
        <h2>Matchup</h2>
        <p className="small">
          {similar.length
            ? <>You're <strong>{simRec.w}–{simRec.l}</strong> against teams with {Math.min(3, preview.length)}+ of these.</>
            : <span className="muted">No logged games against teams like this yet.</span>}
        </p>
      </div>

      {leads.length > 0 && (
        <div className="matchup-leads">
          <span className="control-label">Leads you used</span>
          {leads.map(l => (
            <span key={l.key} className="lead-chip">
              {l.mons.map(m => <MonImage key={m.id} mon={m} className="xs" />)}
              {l.mons.map(m => m.species).join(' + ')} <strong>{l.w}–{l.games - l.w}</strong>
            </span>
          ))}
        </div>
      )}

      <div className="matchup-grid">
        {preview.map(sp => {
          const entry = lookup(dex, sp)
          const threat = (team.threats || []).find(t => norm(t.species) === norm(sp))
          const rec = recordVs(team.matches, sp)
          const ability = entry ? knownAbility({}, entry) : ''

          const fastest = entry ? speedBenchmarks(entry.base.spe).max : null
          const faster = fastest == null ? [] : mine.filter(x => x.speed != null && x.speed > fastest)
          const ties = fastest == null ? [] : mine.filter(x => x.speed === fastest)

          // Your Pokémon with a move that's super effective on it
          const hitters = entry
            ? mine
                .map(x => ({ ...x, best: x.attacks.reduce((b, mv) => {
                  const mult = multAgainst(mv.type, entry.types, ability)
                  return mult > (b?.mult ?? 1) ? { mv, mult } : b
                }, null) }))
                .filter(x => x.best)
            : []
          // Your Pokémon weak to its own types (its likely STAB moves)
          const weakTo = entry
            ? mine.filter(x => x.typing && entry.types.some(t => multAgainst(t, x.typing.types, x.typing.ability) > 1))
            : []
          const myCalcs = calcs.map((c, i) => [c, calcResults.list[i]]).filter(([c]) =>
            [c.attacker, c.defender].some(s => s.source === 'theirs' && norm(s.species) === norm(sp)))

          return (
            <article className={`mu-card ${threat ? 'is-threat' : ''}`} key={sp}>
              <header className="mu-head">
                <MonImage mon={{ species: sp }} className="md" />
                <div>
                  <h3>{sp}</h3>
                  <p className="small">
                    {entry?.types.map(t => <span key={t} className={`type-pill t-${t.toLowerCase()}`}>{t}</span>)}
                    {rec.total > 0 && <span className={`mu-rec ${rec.rate < 45 ? 'bad' : rec.rate >= 60 ? 'good' : ''}`}>{rec.w}–{rec.l} vs</span>}
                  </p>
                </div>
              </header>

              {!entry && <p className="small muted">Not in the Pokédex, so no speed or type info.</p>}

              {entry && (
                <dl className="mu-facts">
                  <div>
                    <dt>Speed</dt>
                    <dd>
                      Up to {fastest}.{' '}
                      {faster.length
                        ? <>You outspeed with {faster.map(x => x.mon.species).join(', ')}.</>
                        : <span className="muted">None of yours outspeed its fastest set.</span>}
                      {ties.length > 0 && <span className="tie"> Ties {ties.map(x => x.mon.species).join(', ')}.</span>}
                    </dd>
                  </div>
                  <div>
                    <dt>You hit it</dt>
                    <dd>
                      {hitters.length
                        ? hitters.map(x => `${x.mon.species} (${x.best.mv.name}${x.best.mult > 2 ? ', 4×' : ''})`).join(', ')
                        : <span className="muted">Nothing super effective.</span>}
                    </dd>
                  </div>
                  <div>
                    <dt>It hits</dt>
                    <dd>
                      {weakTo.length
                        ? <span className="bad">{weakTo.map(x => x.mon.species).join(', ')}</span>
                        : <span className="muted">None of yours are weak to its types.</span>}
                    </dd>
                  </div>
                </dl>
              )}

              {threat?.howToPlay && (
                <div className="mu-note">
                  <span className="control-label">Your threat notes</span>
                  <p className="prewrap small">{threat.howToPlay}</p>
                </div>
              )}

              {myCalcs.length > 0 && (
                <ul className="mu-calcs">
                  {myCalcs.map(([c, r]) => (
                    <li key={c.id} className="small">
                      {sideSpecies(c.attacker, team)} {c.move}: {r?.ok ? <strong>{r.minPct}–{r.maxPct}%</strong> : <span className="muted">{r?.error || '…'}</span>}
                      {r?.ok && r.ko && <span className="muted"> {r.ko}</span>}
                      {c.note && <span className="muted">. {c.note}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
