import { writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { WORLD_CITIES } from '../../src/worldCities.ts'

// ---------------------------------------------------------------------------
// Air Quality builder for all 100 featured U.S. cities
//
// Fetches hourly air-quality data from the Open-Meteo Air Quality API
// (free, no key) for every city in src/cities.ts, aggregates it into the
// monthly AirQualityMonth[] structure the frontend consumes, and writes
// data/aqi/<slug>.json.
//
// Data source: CAMS Global Atmospheric Composition Forecasts (45 km, 3-hourly,
// available from August 2022 onward).  We fetch the full available range and
// compute monthly climatological averages.
//
// Usage:
//   npx tsx scripts/fetch/build-air-quality.ts              # all 100 cities
//   npx tsx scripts/fetch/build-air-quality.ts --limit 10    # first 10 only
//   npx tsx scripts/fetch/build-air-quality.ts --force       # overwrite existing
//   npx tsx scripts/fetch/build-air-quality.ts --city chicago
// ---------------------------------------------------------------------------

// ── City list (same as build-all-cities.ts) ─────────────────────────────────
const CITIES = [
  { slug: 'new-york', name: 'New York', lat: 40.71, lon: -74.01 },
  { slug: 'los-angeles', name: 'Los Angeles', lat: 34.05, lon: -118.24 },
  { slug: 'chicago', name: 'Chicago', lat: 41.88, lon: -87.63 },
  { slug: 'houston', name: 'Houston', lat: 29.76, lon: -95.37 },
  { slug: 'phoenix', name: 'Phoenix', lat: 33.45, lon: -112.07 },
  { slug: 'philadelphia', name: 'Philadelphia', lat: 39.95, lon: -75.17 },
  { slug: 'san-antonio', name: 'San Antonio', lat: 29.42, lon: -98.49 },
  { slug: 'san-diego', name: 'San Diego', lat: 32.72, lon: -117.16 },
  { slug: 'dallas', name: 'Dallas', lat: 32.78, lon: -96.8 },
  { slug: 'san-jose', name: 'San Jose', lat: 37.34, lon: -121.89 },
  { slug: 'austin', name: 'Austin', lat: 30.27, lon: -97.74 },
  { slug: 'jacksonville', name: 'Jacksonville', lat: 30.33, lon: -81.66 },
  { slug: 'fort-worth', name: 'Fort Worth', lat: 32.76, lon: -97.33 },
  { slug: 'columbus', name: 'Columbus', lat: 39.96, lon: -83.0 },
  { slug: 'charlotte', name: 'Charlotte', lat: 35.23, lon: -80.84 },
  { slug: 'indianapolis', name: 'Indianapolis', lat: 39.77, lon: -86.16 },
  { slug: 'san-francisco', name: 'San Francisco', lat: 37.77, lon: -122.42 },
  { slug: 'seattle', name: 'Seattle', lat: 47.61, lon: -122.33 },
  { slug: 'denver', name: 'Denver', lat: 39.74, lon: -104.99 },
  { slug: 'oklahoma-city', name: 'Oklahoma City', lat: 35.47, lon: -97.52 },
  { slug: 'nashville', name: 'Nashville', lat: 36.16, lon: -86.78 },
  { slug: 'washington', name: 'Washington', lat: 38.91, lon: -77.04 },
  { slug: 'el-paso', name: 'El Paso', lat: 31.76, lon: -106.49 },
  { slug: 'boston', name: 'Boston', lat: 42.36, lon: -71.06 },
  { slug: 'las-vegas', name: 'Las Vegas', lat: 36.17, lon: -115.14 },
  { slug: 'portland', name: 'Portland', lat: 45.52, lon: -122.68 },
  { slug: 'louisville', name: 'Louisville', lat: 38.25, lon: -85.76 },
  { slug: 'detroit', name: 'Detroit', lat: 42.33, lon: -83.05 },
  { slug: 'memphis', name: 'Memphis', lat: 35.15, lon: -90.05 },
  { slug: 'baltimore', name: 'Baltimore', lat: 39.29, lon: -76.61 },
  { slug: 'albuquerque', name: 'Albuquerque', lat: 35.08, lon: -106.65 },
  { slug: 'milwaukee', name: 'Milwaukee', lat: 43.04, lon: -87.91 },
  { slug: 'tucson', name: 'Tucson', lat: 32.22, lon: -110.97 },
  { slug: 'fresno', name: 'Fresno', lat: 36.74, lon: -119.77 },
  { slug: 'sacramento', name: 'Sacramento', lat: 38.58, lon: -121.49 },
  { slug: 'kansas-city', name: 'Kansas City', lat: 39.1, lon: -94.58 },
  { slug: 'mesa', name: 'Mesa', lat: 33.42, lon: -111.83 },
  { slug: 'atlanta', name: 'Atlanta', lat: 33.75, lon: -84.39 },
  { slug: 'omaha', name: 'Omaha', lat: 41.26, lon: -95.93 },
  { slug: 'colorado-springs', name: 'Colorado Springs', lat: 38.83, lon: -104.82 },
  { slug: 'raleigh', name: 'Raleigh', lat: 35.78, lon: -78.64 },
  { slug: 'virginia-beach', name: 'Virginia Beach', lat: 36.85, lon: -75.98 },
  { slug: 'long-beach', name: 'Long Beach', lat: 33.77, lon: -118.19 },
  { slug: 'miami', name: 'Miami', lat: 25.76, lon: -80.19 },
  { slug: 'oakland', name: 'Oakland', lat: 37.8, lon: -122.27 },
  { slug: 'minneapolis', name: 'Minneapolis', lat: 44.98, lon: -93.27 },
  { slug: 'tulsa', name: 'Tulsa', lat: 36.15, lon: -95.99 },
  { slug: 'bakersfield', name: 'Bakersfield', lat: 35.37, lon: -119.02 },
  { slug: 'wichita', name: 'Wichita', lat: 37.69, lon: -97.34 },
  { slug: 'arlington', name: 'Arlington', lat: 32.74, lon: -97.11 },
  { slug: 'tampa', name: 'Tampa', lat: 27.95, lon: -82.46 },
  { slug: 'new-orleans', name: 'New Orleans', lat: 29.95, lon: -90.07 },
  { slug: 'cleveland', name: 'Cleveland', lat: 41.5, lon: -81.69 },
  { slug: 'honolulu', name: 'Honolulu', lat: 21.31, lon: -157.86 },
  { slug: 'anaheim', name: 'Anaheim', lat: 33.84, lon: -117.91 },
  { slug: 'lexington', name: 'Lexington', lat: 38.05, lon: -84.5 },
  { slug: 'stockton', name: 'Stockton', lat: 37.96, lon: -121.29 },
  { slug: 'henderson', name: 'Henderson', lat: 36.04, lon: -114.98 },
  { slug: 'corpus-christi', name: 'Corpus Christi', lat: 27.8, lon: -97.4 },
  { slug: 'saint-paul', name: 'Saint Paul', lat: 44.94, lon: -93.09 },
  { slug: 'irvine', name: 'Irvine', lat: 33.68, lon: -117.83 },
  { slug: 'newark', name: 'Newark', lat: 40.74, lon: -74.17 },
  { slug: 'orlando', name: 'Orlando', lat: 28.54, lon: -81.38 },
  { slug: 'cincinnati', name: 'Cincinnati', lat: 39.1, lon: -84.51 },
  { slug: 'pittsburgh', name: 'Pittsburgh', lat: 40.44, lon: -79.99 },
  { slug: 'greensboro', name: 'Greensboro', lat: 36.07, lon: -79.79 },
  { slug: 'st-louis', name: 'St. Louis', lat: 38.63, lon: -90.19 },
  { slug: 'lincoln', name: 'Lincoln', lat: 40.81, lon: -96.7 },
  { slug: 'plano', name: 'Plano', lat: 33.02, lon: -96.7 },
  { slug: 'durham', name: 'Durham', lat: 35.99, lon: -78.9 },
  { slug: 'anchorage', name: 'Anchorage', lat: 61.22, lon: -149.9 },
  { slug: 'chandler', name: 'Chandler', lat: 33.31, lon: -111.84 },
  { slug: 'buffalo', name: 'Buffalo', lat: 42.89, lon: -78.88 },
  { slug: 'chula-vista', name: 'Chula Vista', lat: 32.64, lon: -117.08 },
  { slug: 'madison', name: 'Madison', lat: 43.07, lon: -89.4 },
  { slug: 'gilbert', name: 'Gilbert', lat: 33.35, lon: -111.79 },
  { slug: 'toledo', name: 'Toledo', lat: 41.65, lon: -83.56 },
  { slug: 'reno', name: 'Reno', lat: 39.53, lon: -119.81 },
  { slug: 'fort-wayne', name: 'Fort Wayne', lat: 41.08, lon: -85.14 },
  { slug: 'north-las-vegas', name: 'North Las Vegas', lat: 36.2, lon: -115.12 },
  { slug: 'laredo', name: 'Laredo', lat: 27.51, lon: -99.51 },
  { slug: 'st-petersburg', name: 'St. Petersburg', lat: 27.77, lon: -82.64 },
  { slug: 'jersey-city', name: 'Jersey City', lat: 40.72, lon: -74.06 },
  { slug: 'lubbock', name: 'Lubbock', lat: 33.58, lon: -101.85 },
  { slug: 'irving', name: 'Irving', lat: 32.81, lon: -96.95 },
  { slug: 'winston-salem', name: 'Winston-Salem', lat: 36.1, lon: -80.24 },
  { slug: 'chesapeake', name: 'Chesapeake', lat: 36.77, lon: -76.29 },
  { slug: 'glendale', name: 'Glendale', lat: 33.54, lon: -112.19 },
  { slug: 'garland', name: 'Garland', lat: 32.91, lon: -96.64 },
  { slug: 'scottsdale', name: 'Scottsdale', lat: 33.49, lon: -111.93 },
  { slug: 'norfolk', name: 'Norfolk', lat: 36.85, lon: -76.29 },
  { slug: 'boise', name: 'Boise', lat: 43.62, lon: -116.21 },
  { slug: 'fremont', name: 'Fremont', lat: 37.55, lon: -121.99 },
  { slug: 'spokane', name: 'Spokane', lat: 47.66, lon: -117.43 },
  { slug: 'santa-clarita', name: 'Santa Clarita', lat: 34.39, lon: -118.54 },
  { slug: 'richmond', name: 'Richmond', lat: 37.54, lon: -77.44 },
  { slug: 'baton-rouge', name: 'Baton Rouge', lat: 30.45, lon: -91.15 },
  { slug: 'hialeah', name: 'Hialeah', lat: 25.86, lon: -80.28 },
  { slug: 'san-bernardino', name: 'San Bernardino', lat: 34.11, lon: -117.29 },
  { slug: 'tacoma', name: 'Tacoma', lat: 47.25, lon: -122.44 },
]

// ── Config ─────────────────────────────────────────────────────────────────
// CAMS global data available from 2022-08 onward; use a fixed end date
// so re-runs produce identical output.
const START_DATE = '2022-08-01'
const END_DATE = '2025-12-31'
const INTER_REQUEST_MS = 300
const INTER_CITY_MS = 500
const MAX_RETRIES = 5

// Fetch in 6-month chunks to keep response sizes manageable
const CHUNKS: [string, string][] = [
  ['2022-08-01', '2023-01-31'],
  ['2023-02-01', '2023-07-31'],
  ['2023-08-01', '2024-01-31'],
  ['2024-02-01', '2024-07-31'],
  ['2024-08-01', '2025-01-31'],
  ['2025-02-01', '2025-07-31'],
  ['2025-08-01', '2025-12-31'],
]

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// AQI categories (U.S. EPA)
const AQI_CATEGORY_RANGES: [number, number][] = [
  [0, 50],
  [51, 100],
  [101, 150],
  [151, 200],
  [201, 300],
  [301, 500],
]

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

// ── API types ──────────────────────────────────────────────────────────────
interface AqHourlyResponse {
  hourly: {
    time: string[]
    pm2_5: (number | null)[]
    pm10: (number | null)[]
    ozone: (number | null)[]
    us_aqi: (number | null)[]
  }
}

async function fetchChunk(lat: number, lon: number, start: string, end: string): Promise<AqHourlyResponse> {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
    `&start_date=${start}&end_date=${end}` +
    `&hourly=pm2_5,pm10,ozone,us_aqi&timezone=auto&domains=cams_global`

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url)
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status}`)
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as AqHourlyResponse
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err
      const backoff = Math.min(30000, 2000 * Math.pow(2, attempt - 1))
      console.error(`    retry ${attempt}/${MAX_RETRIES} for ${start}→${end}: ${err} — waiting ${backoff}ms`)
      await new Promise((r) => setTimeout(r, backoff))
    }
  }
  throw new Error('unreachable')
}

function aqiCategoryIndex(aqi: number): number {
  for (let i = 0; i < AQI_CATEGORY_RANGES.length; i++) {
    if (aqi >= AQI_CATEGORY_RANGES[i][0] && aqi <= AQI_CATEGORY_RANGES[i][1]) return i
  }
  return AQI_CATEGORY_RANGES.length - 1
}

interface AirQualityMonth {
  month: string
  aqi: number
  pm25: number
  pm10: number
  ozone: number
  days: number[]
}

async function buildAqi(city: { slug: string; name: string; lat: number; lon: number }) {
  // Accumulators per calendar month (0-11)
  const pm25Sum = new Array(12).fill(0)
  const pm10Sum = new Array(12).fill(0)
  const ozoneSum = new Array(12).fill(0)
  const aqiSum = new Array(12).fill(0)
  const counts = new Array(12).fill(0)
  // For day-level AQI category distribution
  const dayAqiByMonth: number[][] = Array.from({ length: 12 }, () => [])

  for (const [start, end] of CHUNKS) {
    const data = await fetchChunk(city.lat, city.lon, start, end)
    const h = data.hourly

    // Group hourly data by date for daily AQI
    const byDate = new Map<string, { aqis: number[]; pm25s: number[]; pm10s: number[]; ozones: number[] }>()
    for (let i = 0; i < h.time.length; i++) {
      const date = h.time[i].slice(0, 10)
      if (!byDate.has(date)) byDate.set(date, { aqis: [], pm25s: [], pm10s: [], ozones: [] })
      const d = byDate.get(date)!
      if (h.us_aqi[i] !== null) d.aqis.push(h.us_aqi[i]!)
      if (h.pm2_5[i] !== null) d.pm25s.push(h.pm2_5[i]!)
      if (h.pm10[i] !== null) d.pm10s.push(h.pm10[i]!)
      if (h.ozone[i] !== null) d.ozones.push(h.ozone[i]!)
    }

    for (const [date, vals] of byDate) {
      const month = parseInt(date.slice(5, 7), 10) - 1
      if (vals.pm25s.length > 0) {
        pm25Sum[month] += vals.pm25s.reduce((a, b) => a + b, 0) / vals.pm25s.length
      }
      if (vals.pm10s.length > 0) {
        pm10Sum[month] += vals.pm10s.reduce((a, b) => a + b, 0) / vals.pm10s.length
      }
      if (vals.ozones.length > 0) {
        ozoneSum[month] += vals.ozones.reduce((a, b) => a + b, 0) / vals.ozones.length
      }
      if (vals.aqis.length > 0) {
        const dailyAqi = vals.aqis.reduce((a, b) => a + b, 0) / vals.aqis.length
        aqiSum[month] += dailyAqi
        dayAqiByMonth[month].push(dailyAqi)
      }
      counts[month]++
    }

    await new Promise((r) => setTimeout(r, INTER_REQUEST_MS))
  }

  const months: AirQualityMonth[] = MONTH_NAMES.map((month, m) => {
    const n = counts[m] || 1
    const aqi = Math.round(aqiSum[m] / n)
    const pm25 = Math.round((pm25Sum[m] / n) * 10) / 10
    const pm10 = Math.round((pm10Sum[m] / n) * 10) / 10
    const ozone = Math.round(ozoneSum[m] / n)

    // Count days in each AQI category
    const days = new Array(6).fill(0)
    for (const d of dayAqiByMonth[m]) {
      days[aqiCategoryIndex(d)]++
    }

    return { month, aqi, pm25, pm10, ozone, days }
  })

  return {
    name: city.name,
    source: 'CAMS Global (via Open-Meteo Air Quality API)',
    period: `${START_DATE} to ${END_DATE}`,
    months,
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  mkdirSync('data/aqi', { recursive: true })

  let cities = CITIES
  if (cityFilter) {
    const worldCities = WORLD_CITIES.map((c) => ({
      slug: c.slug, name: c.name, lat: c.latitude, lon: c.longitude,
    }))
    cities = [...CITIES, ...worldCities].filter((c) => c.slug === cityFilter || c.name.toLowerCase() === cityFilter.toLowerCase())
    if (cities.length === 0) {
      console.error(`City "${cityFilter}" not found.`)
      process.exit(1)
    }
  }
  if (!force) {
    cities = cities.filter((c) => !existsSync(`data/aqi/${c.slug}.json`))
  }
  if (limit > 0) cities = cities.slice(0, limit)

  if (cities.length === 0) {
    console.log('All cities already have AQI data. Use --force to overwrite.')
    return
  }

  console.log(`\nBuilding air-quality data for ${cities.length} city(ies)…\n`)

  let done = 0
  let failed = 0
  const startTime = Date.now()

  for (const city of cities) {
    const pct = Math.round((done / cities.length) * 100)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
    console.log(`[${pct}%] (${done + 1}/${cities.length}) ${city.name} — elapsed ${elapsed}s`)

    try {
      const result = await buildAqi(city)
      const outPath = `data/aqi/${city.slug}.json`
      writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n')
      console.log(`  ✓ wrote ${outPath}`)
      done++
    } catch (err) {
      console.error(`  ✗ FAILED: ${err}`)
      failed++
      done++
    }

    await new Promise((r) => setTimeout(r, INTER_CITY_MS))
  }

  console.log(`\nDone. ${done - failed} succeeded, ${failed} failed.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
