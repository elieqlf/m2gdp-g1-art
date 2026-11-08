// Météo du jour de l'activité via Open-Meteo (gratuit, sans clé, données Météo-France / ECMWF).
export interface Forecast { label: string; min: number; max: number; rain: number; icon: 'sun' | 'cloud-sun' | 'cloud' | 'rain' | 'snow' | 'storm' | 'fog' }
function describe(code: number): Pick<Forecast, 'label' | 'icon'> {
  if (code === 0) return { label: 'Ensoleillé', icon: 'sun' }
  if (code <= 2) return { label: 'Éclaircies', icon: 'cloud-sun' }
  if (code === 3) return { label: 'Couvert', icon: 'cloud' }
  if (code === 45 || code === 48) return { label: 'Brouillard', icon: 'fog' }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: 'Neige', icon: 'snow' }
  if (code >= 95) return { label: 'Orages', icon: 'storm' }
  return { label: 'Pluie', icon: 'rain' }
}
export async function dayForecast(lat: number, lng: number, day: string, signal?: AbortSignal): Promise<Forecast | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FParis&start_date=${day}&end_date=${day}`
  const response = await fetch(url, { signal })
  if (!response.ok) return null
  const data = await response.json()
  const daily = data.daily
  if (!daily?.time?.length) return null
  return { ...describe(Number(daily.weather_code[0])), min: Math.round(daily.temperature_2m_min[0]), max: Math.round(daily.temperature_2m_max[0]), rain: Number(daily.precipitation_probability_max?.[0] ?? 0) }
}
