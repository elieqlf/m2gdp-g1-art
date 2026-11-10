export type ImageUploadKind = 'profile' | 'activity'

const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const maxInputBytes = 15 * 1024 * 1024

/** Redimensionne et convertit les images avant leur enregistrement dans Firestore. */
export async function prepareImageUpload(file: File, kind: ImageUploadKind): Promise<string> {
  if (!supportedTypes.has(file.type)) throw new Error('unsupported-type')
  if (file.size > maxInputBytes) throw new Error('input-too-large')

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('decode-failed'))
      image.src = objectUrl
    })

    const targetSide = kind === 'profile' ? 512 : 1440
    const canvas = document.createElement('canvas')
    if (kind === 'profile') {
      const side = Math.min(image.naturalWidth, image.naturalHeight)
      canvas.width = targetSide
      canvas.height = targetSide
      const context = canvas.getContext('2d')
      if (!context) throw new Error('canvas-failed')
      context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, targetSide, targetSide)
    } else {
      const scale = Math.min(1, targetSide / Math.max(image.naturalWidth, image.naturalHeight))
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
      const context = canvas.getContext('2d')
      if (!context) throw new Error('canvas-failed')
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
    }

    const maxCharacters = kind === 'profile' ? 180_000 : 700_000
    for (const quality of [.82, .72, .62]) {
      const dataUrl = canvas.toDataURL('image/webp', quality)
      if (!dataUrl.startsWith('data:image/webp;base64,')) throw new Error('webp-unsupported')
      if (dataUrl.length <= maxCharacters) return dataUrl
    }
    throw new Error('output-too-large')
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export function imageUploadError(error: unknown, kind: ImageUploadKind) {
  const code = error instanceof Error ? error.message : ''
  if (code === 'unsupported-type') return 'Utilise une image JPG, PNG, WebP ou AVIF.'
  if (code === 'input-too-large') return 'Le fichier dépasse 15 Mo. Choisis une image plus légère.'
  if (code === 'output-too-large') return kind === 'activity' ? 'Cette image reste trop lourde après compression. Essaie une photo plus légère.' : 'Cette photo reste trop lourde après compression. Essaie une autre image.'
  if (code === 'webp-unsupported') return 'Ce navigateur ne peut pas préparer cette image. Essaie avec un autre navigateur.'
  return 'Cette image n’a pas pu être ouverte. Essaie avec un autre fichier.'
}
