import { writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { WORLD_CITIES } from '../../src/worldCities.ts'

// ---------------------------------------------------------------------------
// NASA POWER climatology builder for all 100 featured U.S. cities
//
// Fetches daily MERRA-2 reanalysis data (1991–2020) from the NASA POWER API
// (free, no key) for every city, aggregates it into the monthly ClimateMonth[]
// + windRose structure the frontend consumes, and writes data/<slug>.json.
//
// NASA POWER provides daily data directly (no hourly aggregation needed),
// and has much more generous rate limits than Open-Meteo.  All 100 cities
// can be fetched in ~3 minutes.
//
// Data source: MERRA-2 reanalysis (0.5° × 0.625°, daily, 1981-present)
//
// Usage:
//   npx tsx scripts/fetch/build-all-nasa.ts              # all 100 cities
//   npx tsx scripts/fetch/build-all-nasa.ts --limit 10    # first 10 only
//   npx tsx scripts/fetch/build-all-nasa.ts --force        # overwrite existing
//   npx tsx scripts/fetch/build-all-nasa.ts --city chicago
// ---------------------------------------------------------------------------

// ── City list (same as build-all-cities.ts) ─────────────────────────────────
const CITIES = [
  { slug: 'new-york', name: 'New York', region: 'New York', lat: 40.71, lon: -74.01 },
  { slug: 'los-angeles', name: 'Los Angeles', region: 'California', lat: 34.05, lon: -118.24 },
  { slug: 'chicago', name: 'Chicago', region: 'Illinois', lat: 41.88, lon: -87.63 },
  { slug: 'houston', name: 'Houston', region: 'Texas', lat: 29.76, lon: -95.37 },
  { slug: 'phoenix', name: 'Phoenix', region: 'Arizona', lat: 33.45, lon: -112.07 },
  { slug: 'philadelphia', name: 'Philadelphia', region: 'Pennsylvania', lat: 39.95, lon: -75.17 },
  { slug: 'san-antonio', name: 'San Antonio', region: 'Texas', lat: 29.42, lon: -98.49 },
  { slug: 'san-diego', name: 'San Diego', region: 'California', lat: 32.72, lon: -117.16 },
  { slug: 'dallas', name: 'Dallas', region: 'Texas', lat: 32.78, lon: -96.8 },
  { slug: 'san-jose', name: 'San Jose', region: 'California', lat: 37.34, lon: -121.89 },
  { slug: 'austin', name: 'Austin', region: 'Texas', lat: 30.27, lon: -97.74 },
  { slug: 'jacksonville', name: 'Jacksonville', region: 'Florida', lat: 30.33, lon: -81.66 },
  { slug: 'fort-worth', name: 'Fort Worth', region: 'Texas', lat: 32.76, lon: -97.33 },
  { slug: 'columbus', name: 'Columbus', region: 'Ohio', lat: 39.96, lon: -83.0 },
  { slug: 'charlotte', name: 'Charlotte', region: 'North Carolina', lat: 35.23, lon: -80.84 },
  { slug: 'indianapolis', name: 'Indianapolis', region: 'Indiana', lat: 39.77, lon: -86.16 },
  { slug: 'san-francisco', name: 'San Francisco', region: 'California', lat: 37.77, lon: -122.42 },
  { slug: 'seattle', name: 'Seattle', region: 'Washington', lat: 47.61, lon: -122.33 },
  { slug: 'denver', name: 'Denver', region: 'Colorado', lat: 39.74, lon: -104.99 },
  { slug: 'oklahoma-city', name: 'Oklahoma City', region: 'Oklahoma', lat: 35.47, lon: -97.52 },
  { slug: 'nashville', name: 'Nashville', region: 'Tennessee', lat: 36.16, lon: -86.78 },
  { slug: 'washington', name: 'Washington', region: 'District of Columbia', lat: 38.91, lon: -77.04 },
  { slug: 'el-paso', name: 'El Paso', region: 'Texas', lat: 31.76, lon: -106.49 },
  { slug: 'boston', name: 'Boston', region: 'Massachusetts', lat: 42.36, lon: -71.06 },
  { slug: 'las-vegas', name: 'Las Vegas', region: 'Nevada', lat: 36.17, lon: -115.14 },
  { slug: 'portland', name: 'Portland', region: 'Oregon', lat: 45.52, lon: -122.68 },
  { slug: 'louisville', name: 'Louisville', region: 'Kentucky', lat: 38.25, lon: -85.76 },
  { slug: 'detroit', name: 'Detroit', region: 'Michigan', lat: 42.33, lon: -83.05 },
  { slug: 'memphis', name: 'Memphis', region: 'Tennessee', lat: 35.15, lon: -90.05 },
  { slug: 'baltimore', name: 'Baltimore', region: 'Maryland', lat: 39.29, lon: -76.61 },
  { slug: 'albuquerque', name: 'Albuquerque', region: 'New Mexico', lat: 35.08, lon: -106.65 },
  { slug: 'milwaukee', name: 'Milwaukee', region: 'Wisconsin', lat: 43.04, lon: -87.91 },
  { slug: 'tucson', name: 'Tucson', region: 'Arizona', lat: 32.22, lon: -110.97 },
  { slug: 'fresno', name: 'Fresno', region: 'California', lat: 36.74, lon: -119.77 },
  { slug: 'sacramento', name: 'Sacramento', region: 'California', lat: 38.58, lon: -121.49 },
  { slug: 'kansas-city', name: 'Kansas City', region: 'Missouri', lat: 39.1, lon: -94.58 },
  { slug: 'mesa', name: 'Mesa', region: 'Arizona', lat: 33.42, lon: -111.83 },
  { slug: 'atlanta', name: 'Atlanta', region: 'Georgia', lat: 33.75, lon: -84.39 },
  { slug: 'omaha', name: 'Omaha', region: 'Nebraska', lat: 41.26, lon: -95.93 },
  { slug: 'colorado-springs', name: 'Colorado Springs', region: 'Colorado', lat: 38.83, lon: -104.82 },
  { slug: 'raleigh', name: 'Raleigh', region: 'North Carolina', lat: 35.78, lon: -78.64 },
  { slug: 'virginia-beach', name: 'Virginia Beach', region: 'Virginia', lat: 36.85, lon: -75.98 },
  { slug: 'long-beach', name: 'Long Beach', region: 'California', lat: 33.77, lon: -118.19 },
  { slug: 'miami', name: 'Miami', region: 'Florida', lat: 25.76, lon: -80.19 },
  { slug: 'oakland', name: 'Oakland', region: 'California', lat: 37.8, lon: -122.27 },
  { slug: 'minneapolis', name: 'Minneapolis', region: 'Minnesota', lat: 44.98, lon: -93.27 },
  { slug: 'tulsa', name: 'Tulsa', region: 'Oklahoma', lat: 36.15, lon: -95.99 },
  { slug: 'bakersfield', name: 'Bakersfield', region: 'California', lat: 35.37, lon: -119.02 },
  { slug: 'wichita', name: 'Wichita', region: 'Kansas', lat: 37.69, lon: -97.34 },
  { slug: 'arlington', name: 'Arlington', region: 'Texas', lat: 32.74, lon: -97.11 },
  { slug: 'tampa', name: 'Tampa', region: 'Florida', lat: 27.95, lon: -82.46 },
  { slug: 'new-orleans', name: 'New Orleans', region: 'Louisiana', lat: 29.95, lon: -90.07 },
  { slug: 'cleveland', name: 'Cleveland', region: 'Ohio', lat: 41.5, lon: -81.69 },
  { slug: 'honolulu', name: 'Honolulu', region: 'Hawaii', lat: 21.31, lon: -157.86 },
  { slug: 'anaheim', name: 'Anaheim', region: 'California', lat: 33.84, lon: -117.91 },
  { slug: 'lexington', name: 'Lexington', region: 'Kentucky', lat: 38.05, lon: -84.5 },
  { slug: 'stockton', name: 'Stockton', region: 'California', lat: 37.96, lon: -121.29 },
  { slug: 'henderson', name: 'Henderson', region: 'Nevada', lat: 36.04, lon: -114.98 },
  { slug: 'corpus-christi', name: 'Corpus Christi', region: 'Texas', lat: 27.8, lon: -97.4 },
  { slug: 'saint-paul', name: 'Saint Paul', region: 'Minnesota', lat: 44.94, lon: -93.09 },
  { slug: 'irvine', name: 'Irvine', region: 'California', lat: 33.68, lon: -117.83 },
  { slug: 'newark', name: 'Newark', region: 'New Jersey', lat: 40.74, lon: -74.17 },
  { slug: 'orlando', name: 'Orlando', region: 'Florida', lat: 28.54, lon: -81.38 },
  { slug: 'cincinnati', name: 'Cincinnati', region: 'Ohio', lat: 39.1, lon: -84.51 },
  { slug: 'pittsburgh', name: 'Pittsburgh', region: 'Pennsylvania', lat: 40.44, lon: -79.99 },
  { slug: 'greensboro', name: 'Greensboro', region: 'North Carolina', lat: 36.07, lon: -79.79 },
  { slug: 'st-louis', name: 'St. Louis', region: 'Missouri', lat: 38.63, lon: -90.19 },
  { slug: 'lincoln', name: 'Lincoln', region: 'Nebraska', lat: 40.81, lon: -96.7 },
  { slug: 'plano', name: 'Plano', region: 'Texas', lat: 33.02, lon: -96.7 },
  { slug: 'durham', name: 'Durham', region: 'North Carolina', lat: 35.99, lon: -78.9 },
  { slug: 'anchorage', name: 'Anchorage', region: 'Alaska', lat: 61.22, lon: -149.9 },
  { slug: 'chandler', name: 'Chandler', region: 'Arizona', lat: 33.31, lon: -111.84 },
  { slug: 'buffalo', name: 'Buffalo', region: 'New York', lat: 42.89, lon: -78.88 },
  { slug: 'chula-vista', name: 'Chula Vista', region: 'California', lat: 32.64, lon: -117.08 },
  { slug: 'madison', name: 'Madison', region: 'Wisconsin', lat: 43.07, lon: -89.4 },
  { slug: 'gilbert', name: 'Gilbert', region: 'Arizona', lat: 33.35, lon: -111.79 },
  { slug: 'toledo', name: 'Toledo', region: 'Ohio', lat: 41.65, lon: -83.56 },
  { slug: 'reno', name: 'Reno', region: 'Nevada', lat: 39.53, lon: -119.81 },
  { slug: 'fort-wayne', name: 'Fort Wayne', region: 'Indiana', lat: 41.08, lon: -85.14 },
  { slug: 'north-las-vegas', name: 'North Las Vegas', region: 'Nevada', lat: 36.2, lon: -115.12 },
  { slug: 'laredo', name: 'Laredo', region: 'Texas', lat: 27.51, lon: -99.51 },
  { slug: 'st-petersburg', name: 'St. Petersburg', region: 'Florida', lat: 27.77, lon: -82.64 },
  { slug: 'jersey-city', name: 'Jersey City', region: 'New Jersey', lat: 40.72, lon: -74.06 },
  { slug: 'lubbock', name: 'Lubbock', region: 'Texas', lat: 33.58, lon: -101.85 },
  { slug: 'irving', name: 'Irving', region: 'Texas', lat: 32.81, lon: -96.95 },
  { slug: 'winston-salem', name: 'Winston-Salem', region: 'North Carolina', lat: 36.1, lon: -80.24 },
  { slug: 'chesapeake', name: 'Chesapeake', region: 'Virginia', lat: 36.77, lon: -76.29 },
  { slug: 'glendale', name: 'Glendale', region: 'Arizona', lat: 33.54, lon: -112.19 },
  { slug: 'garland', name: 'Garland', region: 'Texas', lat: 32.91, lon: -96.64 },
  { slug: 'scottsdale', name: 'Scottsdale', region: 'Arizona', lat: 33.49, lon: -111.93 },
  { slug: 'norfolk', name: 'Norfolk', region: 'Virginia', lat: 36.85, lon: -76.29 },
  { slug: 'boise', name: 'Boise', region: 'Idaho', lat: 43.62, lon: -116.21 },
  { slug: 'fremont', name: 'Fremont', region: 'California', lat: 37.55, lon: -121.99 },
  { slug: 'spokane', name: 'Spokane', region: 'Washington', lat: 47.66, lon: -117.43 },
  { slug: 'santa-clarita', name: 'Santa Clarita', region: 'California', lat: 34.39, lon: -118.54 },
  { slug: 'richmond', name: 'Richmond', region: 'Virginia', lat: 37.54, lon: -77.44 },
  { slug: 'baton-rouge', name: 'Baton Rouge', region: 'Louisiana', lat: 30.45, lon: -91.15 },
  { slug: 'hialeah', name: 'Hialeah', region: 'Florida', lat: 25.86, lon: -80.28 },
  { slug: 'san-bernardino', name: 'San Bernardino', region: 'California', lat: 34.11, lon: -117.29 },
  { slug: 'tacoma', name: 'Tacoma', region: 'Washington', lat: 47.25, lon: -122.44 },
]

// ── Config ─────────────────────────────────────────────────────────────────
const START_DATE = '19910101'
const END_DATE = '20201231'
const INTER_REQUEST_MS = 500
const MAX_RETRIES = 3

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

// Unit conversions
const cToF = (c: number) => (c * 9) / 5 + 32
const mmToIn = (mm: number) => mm / 25.4
const msToMph = (ms: number) => ms * 2.23694
// NASA POWER PRECSNO is mm water equivalent; Open-Meteo snowfall is in cm.
// 7 cm snow = 10 mm water (per Open-Meteo docs), so mm * 0.7 = cm.
const mmWaterToInSnow = (mm: number) => (mm * 0.7) / 2.54

// ── Parse CLI flags ─────────────────────────────────────────────────────────
const args = process.argv.slice(2)
let limit = 0
let force = false
let cityFilter: string | null = null
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit' && args[i + 1]) { limit = parseInt(args[i + 1], 10); i++ }
  else if (args[i] === '--force') { force = true }
  else if (args[i] === '--city' && args[i + 1]) { cityFilter = args[i + 1]; i++ }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function pct(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const s = [...arr].sort((a, b) => a - b)
  const idx = (s.length - 1) * (p / 100)
  const lo = Math.floor(idx), hi = Math.ceil(idx)
  if (lo === hi) return s[lo]
  return s[lo] + (s[hi] - s[lo]) * (idx - lo)
}
function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}
function sectorOf(deg: number): number {
  const d = ((deg % 360) + 360) % 360
  return (Math.floor(((d + 22.5) % 360) / 45) | 0) % 8
}

// Steadman apparent temperature (°C input, returns °C)
function apparentTemp(tempC: number, rh: number, windMs: number): number {
  const e = (rh / 100) * 6.105 * Math.exp((17.27 * tempC) / (237.7 + tempC))
  return tempC + 0.33 * e - 0.7 * windMs - 4.0
}

// Estimate sunshine hours from cloud cover and latitude
function estSunshineHours(monthIdx: number, cloudPct: number, lat: number): number {
  const season = -Math.cos((monthIdx / 12) * Math.PI * 2)
  const absLat = Math.abs(lat)
  const dayHours = 12 + 4.5 * season * Math.min(1, Math.max(0, (absLat - 15) / 45))
  return DAYS_IN_MONTH[monthIdx] * dayHours * (1 - cloudPct / 100)
}

// ── API ────────────────────────────────────────────────────────────────────
const PARAMS = [
  'T2M_MAX', 'T2M_MIN', 'T2MDEW', 'PRECTOTCORR', 'PRECSNO',
  'WS10M', 'WD10M', 'ALLSKY_SFC_SW_DWN', 'CLOUD_AMT', 'RH2M',
].join(',')

interface NasaResponse {
  properties: {
    parameter: Record<string, Record<string, number>>
  }
}

async function fetchCity(lat: number, lon: number): Promise<NasaResponse> {
  const url =
    `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${PARAMS}` +
    `&community=AG&longitude=${lon}&latitude=${lat}` +
    `&start=${START_DATE}&end=${END_DATE}&format=JSON`

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as NasaResponse
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err
      console.error(`    retry ${attempt}/${MAX_RETRIES}: ${err}`)
      await new Promise((r) => setTimeout(r, 3000 * attempt))
    }
  }
  throw new Error('unreachable')
}

// ── Build climate data ─────────────────────────────────────────────────────
async function buildCity(city: { slug: string; name: string; region: string; lat: number; lon: number }) {
  const data = await fetchCity(city.lat, city.lon)
  const p = data.properties.parameter
  const dates = Object.keys(p.T2M_MAX).sort()

  // Per-month accumulators
  const dailyMaxT: number[][] = Array.from({ length: 12 }, () => [])
  const dailyMinT: number[][] = Array.from({ length: 12 }, () => [])
  const dailyMaxApp: number[][] = Array.from({ length: 12 }, () => [])
  const dailyMinApp: number[][] = Array.from({ length: 12 }, () => [])
  const dailyDew: number[][] = Array.from({ length: 12 }, () => [])
  const dailyWind: number[][] = Array.from({ length: 12 }, () => [])
  const dailyShortwave: number[][] = Array.from({ length: 12 }, () => [])
  const dailyCloud: number[][] = Array.from({ length: 12 }, () => [])

  const monthlyPrecip: Map<number, number>[] = Array.from({ length: 12 }, () => new Map())
  const monthlySnow: Map<number, number>[] = Array.from({ length: 12 }, () => new Map())

  const rainDays = new Array(12).fill(0)
  const snowDays = new Array(12).fill(0)
  const mixedDays = new Array(12).fill(0)
  const totalDays = new Array(12).fill(0)

  const windRoseSectors: number[][] = Array.from({ length: 12 }, () => [0, 0, 0, 0, 0, 0, 0, 0])
  const windRoseTotal: number[] = new Array(12).fill(0)

  for (const date of dates) {
    const maxT = p.T2M_MAX[date]
    const minT = p.T2M_MIN[date]
    if (maxT === undefined || minT === undefined) continue

    const year = parseInt(date.slice(0, 4), 10)
    const month = parseInt(date.slice(4, 6), 10) - 1

    const dew = p.T2MDEW[date] ?? minT
    const precip = p.PRECTOTCORR[date] ?? 0
    const snowMm = p.PRECSNO[date] ?? 0
    const windMs = p.WS10M[date] ?? 0
    const windDir = p.WD10M[date] ?? 0
    const sw = p.ALLSKY_SFC_SW_DWN[date] ?? 0
    const cloud = p.CLOUD_AMT[date] ?? 0
    const rh = p.RH2M[date] ?? 50
    const meanT = (maxT + minT) / 2

    dailyMaxT[month].push(maxT)
    dailyMinT[month].push(minT)
    dailyMaxApp[month].push(apparentTemp(maxT, rh, windMs))
    dailyMinApp[month].push(apparentTemp(minT, rh, windMs))
    dailyDew[month].push(dew)
    dailyWind[month].push(windMs)
    dailyShortwave[month].push(sw)
    dailyCloud[month].push(cloud)

    totalDays[month]++

    if (precip > 0.1) {
      if (meanT > 3) rainDays[month]++
      else if (meanT < -1) snowDays[month]++
      else mixedDays[month]++
    }

    monthlyPrecip[month].set(year, (monthlyPrecip[month].get(year) ?? 0) + precip)
    monthlySnow[month].set(year, (monthlySnow[month].get(year) ?? 0) + snowMm)

    if (windMs > 0.447) { // > 1 mph
      windRoseSectors[month][sectorOf(windDir)]++
      windRoseTotal[month]++
    }
  }

  const climate = MONTH_NAMES.map((month, m) => {
    const precipVals = [...monthlyPrecip[m].values()]
    const snowVals = [...monthlySnow[m].values()]
    const cloudAvg = avg(dailyCloud[m])

    return {
      month,
      high: Math.round(cToF(avg(dailyMaxT[m])) * 10) / 10,
      low: Math.round(cToF(avg(dailyMinT[m])) * 10) / 10,
      feelsHigh: Math.round(cToF(avg(dailyMaxApp[m])) * 10) / 10,
      feelsLow: Math.round(cToF(avg(dailyMinApp[m])) * 10) / 10,
      highBand: [Math.round(cToF(pct(dailyMaxT[m], 20)) * 10) / 10, Math.round(cToF(pct(dailyMaxT[m], 80)) * 10) / 10] as [number, number],
      lowBand: [Math.round(cToF(pct(dailyMinT[m], 20)) * 10) / 10, Math.round(cToF(pct(dailyMinT[m], 80)) * 10) / 10] as [number, number],
      precip: Math.round(mmToIn(avg(precipVals)) * 100) / 100,
      precipBand: [Math.round(mmToIn(pct(precipVals, 20)) * 100) / 100, Math.round(mmToIn(pct(precipVals, 80)) * 100) / 100] as [number, number],
      sunshine: Math.round(estSunshineHours(m, cloudAvg, city.lat) * 10) / 10,
      cloud: Math.round(cloudAvg * 10) / 10,
      rain: Math.round((rainDays[m] / Math.max(1, totalDays[m])) * 100 * 10) / 10,
      snow: Math.round((snowDays[m] / Math.max(1, totalDays[m])) * 100 * 10) / 10,
      mixed: Math.round((mixedDays[m] / Math.max(1, totalDays[m])) * 100 * 10) / 10,
      snowfall: Math.round(mmWaterToInSnow(avg(snowVals)) * 100) / 100,
      snowBand: [Math.round(mmWaterToInSnow(pct(snowVals, 20)) * 100) / 100, Math.round(mmWaterToInSnow(pct(snowVals, 80)) * 100) / 100] as [number, number],
      wind: Math.round(msToMph(avg(dailyWind[m])) * 10) / 10,
      windBand: [Math.round(msToMph(pct(dailyWind[m], 20)) * 10) / 10, Math.round(msToMph(pct(dailyWind[m], 80)) * 10) / 10] as [number, number],
      dewPoint: Math.round(cToF(avg(dailyDew[m])) * 10) / 10,
      shortwave: Math.round(avg(dailyShortwave[m]) * 100) / 100,
      shortwaveBand: [Math.round(pct(dailyShortwave[m], 20) * 100) / 100, Math.round(pct(dailyShortwave[m], 80) * 100) / 100] as [number, number],
    }
  })

  const windRose = MONTH_NAMES.map((month, m) => {
    const total = windRoseTotal[m] || 1
    const sectors = windRoseSectors[m].map((c) => Math.round((c / total) * 1000) / 10)
    return { month, n: sectors[0], ne: sectors[1], e: sectors[2], se: sectors[3], s: sectors[4], sw: sectors[5], w: sectors[6], nw: sectors[7] }
  })

  return {
    name: city.name,
    region: city.region,
    latitude: city.lat,
    longitude: city.lon,
    source: 'MERRA-2 (via NASA POWER API)',
    period: '1991-2020',
    climate,
    windRose,
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  mkdirSync('data', { recursive: true })

  let cities = CITIES
  if (cityFilter) {
    const worldCities = WORLD_CITIES.map((c) => ({
      slug: c.slug, name: c.name, region: c.region, lat: c.latitude, lon: c.longitude,
    }))
    cities = [...CITIES, ...worldCities].filter((c) => c.slug === cityFilter || c.name.toLowerCase() === cityFilter.toLowerCase())
    if (cities.length === 0) {
      console.error(`City "${cityFilter}" not found.`)
      process.exit(1)
    }
  }
  if (!force) {
    cities = cities.filter((c) => !existsSync(`data/${c.slug}.json`))
  }
  if (limit > 0) cities = cities.slice(0, limit)

  if (cities.length === 0) {
    console.log('All cities already have data files. Use --force to overwrite.')
    return
  }

  console.log(`\nBuilding climate data from NASA POWER for ${cities.length} city(ies)…\n`)

  let done = 0
  let failed = 0
  const startTime = Date.now()

  for (const city of cities) {
    const pctVal = Math.round((done / cities.length) * 100)
    console.log(`[${pctVal}%] (${done + 1}/${cities.length}) ${city.name}`)

    try {
      const result = await buildCity(city)
      const outPath = `data/${city.slug}.json`
      writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n')
      console.log(`  ✓ wrote ${outPath}`)
      done++
    } catch (err) {
      console.error(`  ✗ FAILED: ${err}`)
      failed++
      done++
    }

    await new Promise((r) => setTimeout(r, INTER_REQUEST_MS))
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
  console.log(`\nDone in ${elapsed}s. ${done - failed} succeeded, ${failed} failed.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
