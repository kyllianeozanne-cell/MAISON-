import type { GeoPoint, Weather } from '../types'

const CACHE_KEY = 'maison-weather-cache'
const CACHE_MS = 20 * 60 * 1000

export function weatherLabel(code: number): string {
  if (code === 0) return 'Ciel dégagé'
  if (code === 1) return 'Plutôt dégagé'
  if (code === 2) return 'Partiellement nuageux'
  if (code === 3) return 'Couvert'
  if (code === 45 || code === 48) return 'Brouillard'
  if (code >= 51 && code <= 57) return 'Bruine'
  if (code >= 61 && code <= 65) return 'Pluie'
  if (code === 66 || code === 67) return 'Pluie verglaçante'
  if (code >= 71 && code <= 77) return 'Neige'
  if (code >= 80 && code <= 82) return 'Averses'
  if (code === 85 || code === 86) return 'Averses de neige'
  if (code >= 95) return 'Orage'
  return 'Variable'
}

export function isWet(w: Weather | null): boolean {
  if (!w) return false
  return w.rainProb >= 50 || (w.code >= 51 && w.code <= 67) || (w.code >= 80 && w.code <= 82) || w.code >= 95
}

export async function fetchWeather(point: GeoPoint, force = false): Promise<Weather> {
  if (!force) {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const c = JSON.parse(raw) as { lat: number; lon: number; data: Weather }
        if (
          Math.abs(c.lat - point.lat) < 0.05 &&
          Math.abs(c.lon - point.lon) < 0.05 &&
          Date.now() - c.data.fetchedAt < CACHE_MS
        ) {
          return c.data
        }
      }
    } catch {
      /* cache illisible */
    }
  }

  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${point.lat}&longitude=${point.lon}` +
    '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day' +
    '&hourly=temperature_2m,precipitation_probability' +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
    '&timezone=auto&forecast_days=2&wind_speed_unit=kmh'

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Météo indisponible (${res.status})`)
  const j = await res.json()

  const nowIso: string = j.current.time
  const hours: string[] = j.hourly.time
  const startIdx = Math.max(0, hours.findIndex((t) => t >= nowIso.slice(0, 13)))
  const today = nowIso.slice(0, 10)
  const hourly: Weather['hourly'] = []
  for (let i = startIdx; i < hours.length && hourly.length < 24; i++) {
    if (!hours[i].startsWith(today) && hourly.length >= 12) break
    hourly.push({
      time: hours[i],
      temp: Math.round(j.hourly.temperature_2m[i]),
      rain: j.hourly.precipitation_probability?.[i] ?? 0,
    })
  }

  const data: Weather = {
    temp: Math.round(j.current.temperature_2m),
    feels: Math.round(j.current.apparent_temperature),
    code: j.current.weather_code,
    label: weatherLabel(j.current.weather_code),
    rainProb: j.daily.precipitation_probability_max?.[0] ?? 0,
    wind: Math.round(j.current.wind_speed_10m),
    isDay: j.current.is_day === 1,
    hourly,
    min: Math.round(j.daily.temperature_2m_min[0]),
    max: Math.round(j.daily.temperature_2m_max[0]),
    fetchedAt: Date.now(),
  }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ lat: point.lat, lon: point.lon, data }))
  } catch {
    /* quota */
  }
  return data
}

/** Demande la position à l'appareil (avec l'autorisation de l'utilisateur). */
export function locate(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Géolocalisation non disponible sur cet appareil.'))
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(3))
        const lon = Number(pos.coords.longitude.toFixed(3))
        let label = 'Ma position'
        try {
          const r = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=fr`,
          )
          if (r.ok) {
            const g = await r.json()
            label = g.city || g.locality || g.principalSubdivision || label
          }
        } catch {
          /* libellé facultatif */
        }
        resolve({ lat, lon, label })
      },
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? 'Autorisation refusée. Tu peux choisir une ville manuellement.'
              : 'Position introuvable. Tu peux choisir une ville manuellement.',
          ),
        ),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    )
  })
}

export async function searchCity(q: string): Promise<GeoPoint[]> {
  if (q.trim().length < 2) return []
  const r = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=fr&format=json`,
  )
  if (!r.ok) throw new Error('Recherche de ville indisponible.')
  const j = await r.json()
  return (j.results ?? []).map((x: { latitude: number; longitude: number; name: string; admin1?: string; country?: string }) => ({
    lat: x.latitude,
    lon: x.longitude,
    label: [x.name, x.admin1, x.country].filter(Boolean).join(', '),
  }))
}

/** Prévision pour une destination à une date (utilisé par la valise). Max ~16 jours. */
export async function fetchTripWeather(
  point: GeoPoint,
  start: string,
  end: string,
): Promise<{ min: number; max: number; rainDays: number; days: number } | null> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${point.lat}&longitude=${point.lon}` +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
    `&timezone=auto&start_date=${start}&end_date=${end}`
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const j = await r.json()
    const max: number[] = j.daily.temperature_2m_max
    const min: number[] = j.daily.temperature_2m_min
    const rain: number[] = j.daily.precipitation_probability_max
    if (!max?.length) return null
    return {
      min: Math.round(Math.min(...min)),
      max: Math.round(Math.max(...max)),
      rainDays: rain.filter((p) => p >= 50).length,
      days: max.length,
    }
  } catch {
    return null
  }
}
