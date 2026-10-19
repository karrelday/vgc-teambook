import { useCallback, useState } from 'react'

/** useState that also keeps its value in this browser, so it survives tab switches and refreshes. */
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : typeof initial === 'function' ? initial() : initial
    } catch {
      return typeof initial === 'function' ? initial() : initial
    }
  })
  const set = useCallback(update => {
    setValue(prev => {
      const next = typeof update === 'function' ? update(prev) : update
      try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* storage unavailable */ }
      return next
    })
  }, [key])
  return [value, set]
}
