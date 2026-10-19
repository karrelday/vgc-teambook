import { useEffect, useRef, useState } from 'react'
import { toBlob } from 'html-to-image'
import { record, spreadText } from '../lib/model'
import { currentVersion } from '../lib/stats'
import MonImage from './MonImage'
import ItemIcon from './ItemIcon'
import { Modal } from './ui'

const W = 1200
const H = 675

export default function ShareCard({ team, onClose }) {
  const cardRef = useRef()
  const wrapRef = useRef()
  const [scale, setScale] = useState(0.5)
  const [opts, setOpts] = useState({ spreads: false, record: true })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const cur = currentVersion(team)
  const rec = record(team.matches)

  useEffect(() => {
    const ro = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / W)))
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  const render = async () => {
    const node = cardRef.current
    try {
      return await toBlob(node, { pixelRatio: 2, width: W, height: H })
    } catch {
      // Font embedding can fail on some setups; retry with system fonts
      return toBlob(node, { pixelRatio: 2, width: W, height: H, skipFonts: true })
    }
  }

  const run = async action => {
    setBusy(true)
    setMsg('')
    try {
      const blob = await render()
      await action(blob)
    } catch (e) {
      setMsg(e.message || 'Could not create the image.')
    }
    setBusy(false)
  }

  const download = () =>
    run(async blob => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${team.name.replace(/[^\w-]+/g, '_')}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    })

  const copy = () =>
    run(async blob => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        setMsg('Copied. Paste it straight into Discord or Messenger.')
      } catch {
        throw new Error('Your browser blocked copying images. Use Download instead.')
      }
    })

  const toggle = k => setOpts(o => ({ ...o, [k]: !o[k] }))

  return (
    <Modal title="Share card" onClose={onClose} wide>
      <div className="stack">
        <div className="row">
          <label className="check"><input type="checkbox" checked={opts.spreads} onChange={() => toggle('spreads')} /> Show SP spreads</label>
          <label className="check"><input type="checkbox" checked={opts.record} onChange={() => toggle('record')} /> Show record</label>
        </div>

        <div className="share-wrap" ref={wrapRef} style={{ height: H * scale }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: W }}>
            <div className="share-card" ref={cardRef}>
              <div className="sc-head">
                <div>
                  <h1>{team.name}</h1>
                  <p className="sc-format">
                    {team.format && <span>{team.format}</span>}
                    {cur && <span className="sc-chip">v{cur.number}</span>}
                  </p>
                </div>
                {opts.record && rec.total > 0 && (
                  <div className="sc-record">
                    <strong>{rec.w}–{rec.l}</strong>
                    <span>{rec.rate}% win rate</span>
                  </div>
                )}
              </div>

              <div className="sc-grid">
                {Array.from({ length: 6 }, (_, i) => {
                  const mon = team.mons[i]
                  if (!mon) return <div className="sc-mon empty" key={i} />
                  const spread = spreadText(mon)
                  return (
                    <div className="sc-mon" key={mon.id}>
                      <MonImage mon={mon} proxy className="sc-sprite" />
                      <div className="sc-info">
                        <h2>{mon.species}</h2>
                        {mon.item && <p className="sc-item"><ItemIcon item={mon.item} proxy className="sc-item-icon" />{mon.item}</p>}
                        <p className="sc-sub">{[mon.ability, mon.nature].filter(Boolean).join('  /  ')}</p>
                        <ul className="sc-moves">
                          {(mon.moves || []).filter(Boolean).map((m, j) => <li key={j}>{m}</li>)}
                        </ul>
                        {opts.spreads && spread && <p className="sc-sp">{spread} SP</p>}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="sc-foot">
                <span>{team.summary}</span>
                <span className="sc-brand">Teambook</span>
              </div>
            </div>
          </div>
        </div>

        {msg && <p className={msg.startsWith('Copied') ? 'hint' : 'error'}>{msg}</p>}
        <div className="actions">
          <button className="btn" disabled={busy} onClick={copy}>Copy image</button>
          <button className="btn primary" disabled={busy} onClick={download}>{busy ? 'Working' : 'Download PNG'}</button>
        </div>
      </div>
    </Modal>
  )
}
