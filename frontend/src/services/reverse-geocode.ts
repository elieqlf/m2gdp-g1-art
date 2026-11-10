interface ReverseAddress {
  city?: string
  town?: string
  village?: string
  municipality?: string
  hamlet?: string
  neighbourhood?: string
  suburb?: string
  quarter?: string
  city_district?: string
  district?: string
  county?: string
}

interface ReverseGeocodeResponse {
  address?: ReverseAddress
}

function approximateCoordinate(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2)
}

/**
 * Resolve only a city or neighbourhood. Coordinates are rounded to about a
 * kilometre before they leave the browser; exact coordinates are never saved
 * by this lookup.
 */
export async function suggestCityOrNeighborhood(latitude: number, longitude: number): Promise<string | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

  const query = new URLSearchParams({
    format: 'jsonv2',
    lat: approximateCoordinate(latitude),
    lon: approximateCoordinate(longitude),
    zoom: '14',
    addressdetails: '1',
    'accept-language': 'fr',
  })
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 7000)

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query.toString()}`, {
      headers: { Accept: 'application/json' },
      referrerPolicy: 'strict-origin-when-cross-origin',
      signal: controller.signal,
    })
    if (!response.ok) throw new Error('Suggestion de lieu indisponible')

    const result = await response.json() as ReverseGeocodeResponse
    const address = result.address
    if (!address) return null

    const city = address.city ?? address.town ?? address.village ?? address.municipality ?? address.hamlet
    const neighborhood = address.neighbourhood ?? address.suburb ?? address.quarter ?? address.city_district ?? address.district
    if (city && neighborhood && !city.toLocaleLowerCase('fr').includes(neighborhood.toLocaleLowerCase('fr'))) {
      return `${city}, ${neighborhood}`
    }
    return city ?? neighborhood ?? address.county ?? null
  } finally {
    window.clearTimeout(timeout)
  }
}
