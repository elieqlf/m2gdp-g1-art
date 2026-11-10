import { describe, expect, it, vi } from 'vitest'
import { uploadCover, UploadError } from '../src/services/uploads'
import { centerCrop } from '../src/lib/image'

const API = 'https://projet-art-api.example.workers.dev'
const image = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' })

describe('photo de couverture', () => {
  it('envoie l’image réduite avec le jeton de connexion et renvoie son adresse', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ url: `${API}/files/covers/u/1-abc.webp` }, { status: 201 }))
    expect(await uploadCover(image, 'jeton', API, fetchImpl)).toBe(`${API}/files/covers/u/1-abc.webp`)
    expect(fetchImpl).toHaveBeenCalledWith(`${API}/uploads/cover`, expect.objectContaining({ method: 'POST', body: image, headers: { authorization: 'Bearer jeton', 'content-type': 'image/webp' } }))
  })
  it('traduit les refus de l’API en codes d’erreur', async () => {
    await expect(uploadCover(image, 'jeton', API, vi.fn(async () => Response.json({ error: 'too-many-requests' }, { status: 429 })))).rejects.toEqual(new UploadError('too-many-requests'))
    await expect(uploadCover(image, 'jeton', API, vi.fn(async () => { throw new TypeError('Failed to fetch') }))).rejects.toEqual(new UploadError('network'))
    await expect(uploadCover(image, 'jeton', '', vi.fn())).rejects.toEqual(new UploadError('not-configured'))
  })
  it('recadre au centre au format des couvertures (16:10)', () => {
    expect(centerCrop(2000, 1000)).toEqual({ sx: 200, sy: 0, sw: 1600, sh: 1000 }) // trop large
    expect(centerCrop(1000, 1000)).toEqual({ sx: 0, sy: 188, sw: 1000, sh: 625 }) // carré
    expect(centerCrop(1600, 1000)).toEqual({ sx: 0, sy: 0, sw: 1600, sh: 1000 })
  })
})
