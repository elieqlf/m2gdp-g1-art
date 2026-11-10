// Réduction d'une photo avant envoi : recadrage au centre au format des couvertures (16:10),
// 1600 × 1000 px au plus, WebP (JPEG si le navigateur ne sait pas encoder le WebP).

export const COVER = { width: 1600, height: 1000 }

const load = (file: Blob) => new Promise<HTMLImageElement>((resolve, reject) => {
  const url = URL.createObjectURL(file)
  const image = new Image()
  image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('invalid-image')) }
  image.src = url
})
const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, quality))

/** Zone source à recadrer pour obtenir le ratio voulu, centrée. */
export function centerCrop(width: number, height: number, ratio = COVER.width / COVER.height) {
  if (width / height > ratio) { const w = Math.round(height * ratio); return { sx: Math.round((width - w) / 2), sy: 0, sw: w, sh: height } }
  const h = Math.round(width / ratio)
  return { sx: 0, sy: Math.round((height - h) / 2), sw: width, sh: h }
}

export async function toCoverImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('not-an-image')
  const image = await load(file)
  const { sx, sy, sw, sh } = centerCrop(image.naturalWidth, image.naturalHeight)
  const scale = Math.min(1, COVER.width / sw)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sw * scale))
  canvas.height = Math.max(1, Math.round(sh * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas-unavailable')
  context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  const webp = await encode(canvas, 'image/webp', 0.82)
  if (webp?.type === 'image/webp') return webp
  const jpeg = await encode(canvas, 'image/jpeg', 0.85)
  if (!jpeg) throw new Error('encode-failed')
  return jpeg
}
