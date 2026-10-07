import { useRef, useState } from 'react'
import { compressImage } from '../lib/image'
import MonImage from './MonImage'

export default function ImagePicker({ mon, onChange }) {
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  const handleFile = async file => {
    setError('')
    try {
      onChange(await compressImage(file))
    } catch (e) {
      setError(e.message)
    }
  }

  const onPaste = e => {
    const item = [...e.clipboardData.items].find(i => i.type.startsWith('image/'))
    if (item) {
      e.preventDefault()
      handleFile(item.getAsFile())
      return
    }
    const text = e.clipboardData.getData('text').trim()
    if (/^(https?:\/\/|data:image\/)/.test(text)) {
      e.preventDefault()
      onChange(text)
    } else if (text) {
      setError('Paste an image or an image link.')
    }
  }

  const onDrop = e => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="image-picker">
      <div
        className={`drop ${dragging ? 'dragging' : ''}`}
        tabIndex={0}
        onPaste={onPaste}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        aria-label="Pokémon image. Focus and paste an image, or drop a file here."
      >
        <MonImage mon={mon} className="xl" />
        <p className="hint">Click here and paste (Ctrl+V) an image or link, or drop a file</p>
      </div>
      <div className="row">
        <button type="button" className="btn sm" onClick={() => fileRef.current.click()}>Upload image</button>
        {mon.image && (
          <button type="button" className="btn ghost sm" onClick={() => onChange('')}>Use auto sprite</button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden
        onChange={e => { e.target.files[0] && handleFile(e.target.files[0]); e.target.value = '' }} />
      {!mon.image && <p className="hint">Without an image, a sprite is loaded from the species name.</p>}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
