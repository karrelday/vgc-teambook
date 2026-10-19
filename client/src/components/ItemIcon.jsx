import { useCalcMeta } from '../lib/calc'

const findIcon = (icons, item) => {
  if (!item) return null
  const key = Object.keys(icons).find(k => k.toLowerCase() === item.trim().toLowerCase())
  return key ? icons[key] : null
}

/** Item icon from Showdown's item sheet. `proxy` routes the sheet through our API so PNG export can include it. */
export default function ItemIcon({ item, proxy = false, className = '' }) {
  const meta = useCalcMeta()
  const pos = findIcon(meta.itemIcons || {}, item)
  if (!pos || !meta.itemSheet) return null
  const sheet = proxy ? `/api/sprite?url=${encodeURIComponent(meta.itemSheet)}` : meta.itemSheet
  return (
    <span
      className={`item-icon ${className}`}
      role="img"
      aria-label={item}
      title={item}
      style={{ backgroundImage: `url(${sheet})`, backgroundPosition: `${pos[0]}px ${pos[1]}px` }}
    />
  )
}

/** True when the item is legal in Champions (and so counts in calcs). */
export function useIsChampionsItem() {
  const meta = useCalcMeta()
  const names = new Set((meta.items || []).map(n => n.toLowerCase()))
  // Unknown until the list loads, so nothing is flagged before then
  return item => !item || !names.size || names.has(item.trim().toLowerCase())
}
