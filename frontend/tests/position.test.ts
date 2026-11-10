import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/services/firebase', () => ({ listMembers: vi.fn(async () => []), setFavorite: vi.fn() }))
vi.mock('../src/services/activities', () => ({ listActivities: vi.fn(async () => []), getActivity: vi.fn(), watchMyOffers: vi.fn(() => () => {}), watchMyActivities: vi.fn(() => () => {}) }))
vi.mock('../src/services/messages', () => ({ watchMyChats: vi.fn(() => () => {}), isUnread: () => false, otherMember: () => '' }))
import { requestPosition, store } from '../src/lib/store'

// Position de l'appareil : rapide d'abord, puis précision GPS en arrière-plan.
type Options = PositionOptions & { enableHighAccuracy: boolean }
const at = (lat: number, lng: number) => ({ coords: { latitude: lat, longitude: lng } }) as GeolocationPosition
const failure = (code: number) => ({ code, PERMISSION_DENIED: 1 }) as GeolocationPositionError
function fakeGeolocation(answer: (options: Options) => GeolocationPosition | GeolocationPositionError) {
  const calls: Options[] = []
  const getCurrentPosition = vi.fn((ok: PositionCallback, ko: PositionErrorCallback, options: Options) => {
    calls.push(options)
    const result = answer(options)
    queueMicrotask(() => 'coords' in result ? ok(result) : ko(result))
  })
  Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true })
  return calls
}
afterEach(() => { store.gps = null; store.gpsStatus = 'idle' })

describe('position de l’appareil', () => {
  it('accepte une position rapide puis l’affine avec le GPS sans attendre', async () => {
    const calls = fakeGeolocation(o => o.enableHighAccuracy ? at(45.7701, 4.8401) : at(45.7600, 4.8300))
    expect(await requestPosition()).toBe(true)
    expect(calls[0]!.enableHighAccuracy).toBe(false)
    expect(store.gps).toEqual({ lat: 45.76, lng: 4.83 })
    await new Promise(r => setTimeout(r, 0))
    expect(store.gps).toEqual({ lat: 45.7701, lng: 4.8401 })
  })
  it('ne déplace pas la carte pour un écart de quelques mètres', async () => {
    fakeGeolocation(o => o.enableHighAccuracy ? at(45.76001, 4.83001) : at(45.76, 4.83))
    await requestPosition()
    await new Promise(r => setTimeout(r, 0))
    expect(store.gps).toEqual({ lat: 45.76, lng: 4.83 })
  })
  it('se rabat sur le GPS si la position rapide expire (cas constaté sur téléphone)', async () => {
    fakeGeolocation(o => o.enableHighAccuracy ? at(45.75, 4.85) : failure(3))
    expect(await requestPosition()).toBe(true)
    expect(store.gpsStatus).toBe('granted')
    expect(store.gps).toEqual({ lat: 45.75, lng: 4.85 })
  })
  it('distingue le refus de l’absence de position', async () => {
    fakeGeolocation(() => failure(1))
    expect(await requestPosition()).toBe(false)
    expect(store.gpsStatus).toBe('denied')
    fakeGeolocation(() => failure(2))
    expect(await requestPosition()).toBe(false)
    expect(store.gpsStatus).toBe('unavailable')
  })
})
