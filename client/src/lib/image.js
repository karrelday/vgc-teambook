/** Resize an image file and return a small webp data URL (keeps Mongo documents light). */
export function compressImage(file, max = 320) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('That file is not an image.'))
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/webp', 0.85))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// Names whose hyphen is part of the species, not a forme
const JOINED = ['porygon-z', 'ho-oh', 'jangmo-o', 'hakamo-o', 'kommo-o', 'chi-yu', 'chien-pao', 'ting-lu', 'wo-chien']
const toId = s => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Showdown sprite id, e.g. "Basculegion-F" -> "basculegion-f", "Mr. Mime" -> "mrmime" */
export function spriteId(species = '') {
  const s = species.trim().toLowerCase()
  if (!s) return ''
  if (JOINED.includes(s)) return toId(s)
  const [base, ...forme] = s.split('-')
  return forme.length ? `${toId(base)}-${toId(forme.join(''))}` : toId(base)
}

export function spriteSources(species) {
  const id = spriteId(species)
  if (!id) return []
  const root = 'https://play.pokemonshowdown.com/sprites'
  return [`${root}/home-centered/${id}.png`, `${root}/dex/${id}.png`, `${root}/gen5/${id}.png`]
}
