import { GOOGLE_PLACES_API_KEY } from '../../../public/places-config.js'
export interface Prediction { placeId: string; text: { text: string } }
export interface AddressSelection { address: string; lat: number | null; lng: number | null }
export async function suggestAddresses(input: string, sessionToken: string, signal: AbortSignal): Promise<Prediction[]> {
  const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY },
    body: JSON.stringify({ input, languageCode: 'fr', regionCode: 'FR', sessionToken }),
  })
  if (!response.ok) throw new Error('Suggestions indisponibles')
  const data = await response.json()
  return (data.suggestions || []).map((item: { placePrediction?: Prediction }) => item.placePrediction).filter(Boolean)
}
export async function resolveAddress(prediction: Prediction, sessionToken: string): Promise<AddressSelection> {
  const address = prediction.text.text
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(prediction.placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`, {
      headers: { 'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY, 'X-Goog-FieldMask': 'location' },
    })
    if (!response.ok) throw new Error('Coordonnées indisponibles')
    const details = await response.json()
    return { address, lat: details.location?.latitude ?? null, lng: details.location?.longitude ?? null }
  } catch {
    return { address, lat: null, lng: null }
  }
}
