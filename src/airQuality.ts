import { useEffect, useState } from 'react'
import { FEATURED, sameCity, type CityRef } from './cities'

export interface AirQualityMonth {
  month: string
  aqi: number
  pm25: number
  pm10: number
  ozone: number
  days: number[]
}

export interface AqiCategory {
  name: string
  shortName: string
  range: [number, number]
  cssVar: string
  advice: string
}

export const AQI_CATEGORIES: AqiCategory[] = [
  {
    name: 'Good',
    shortName: 'Good',
    range: [0, 50],
    cssVar: '--aqi-good',
    advice:
      'Air quality is satisfactory. Outdoor activity is safe for everyone.',
  },
  {
    name: 'Moderate',
    shortName: 'Moderate',
    range: [51, 100],
    cssVar: '--aqi-moderate',
    advice:
      'Air quality is acceptable. Unusually sensitive people should consider reducing prolonged outdoor exertion.',
  },
  {
    name: 'Unhealthy for Sensitive Groups',
    shortName: 'Sensitive',
    range: [101, 150],
    cssVar: '--aqi-usg',
    advice:
      'Sensitive groups—including children, older adults, and those with respiratory conditions—should limit prolonged outdoor exertion.',
  },
  {
    name: 'Unhealthy',
    shortName: 'Unhealthy',
    range: [151, 200],
    cssVar: '--aqi-unhealthy',
    advice:
      'Everyone may experience health effects. Sensitive groups should avoid outdoor exertion; everyone else should reduce it.',
  },
  {
    name: 'Very Unhealthy',
    shortName: 'Very Unh.',
    range: [201, 300],
    cssVar: '--aqi-very',
    advice:
      'Health alert: everyone may experience more serious effects. Avoid outdoor activity.',
  },
  {
    name: 'Hazardous',
    shortName: 'Hazardous',
    range: [301, 500],
    cssVar: '--aqi-hazardous',
    advice:
      'Health warning of emergency conditions. Everyone should stay indoors and keep activity levels low.',
  },
]

export function aqiCategory(aqi: number): AqiCategory {
  return (
    AQI_CATEGORIES.find((c) => aqi >= c.range[0] && aqi <= c.range[1]) ??
    AQI_CATEGORIES[AQI_CATEGORIES.length - 1]
  )
}

interface AirQualityModule {
  default: { months: AirQualityMonth[] }
}

const aqiGlob = import.meta.glob<AirQualityModule>('../data/aqi/*.json')

const AQI_STATIC: Record<string, () => Promise<AirQualityModule>> = {}
for (const [path, loader] of Object.entries(aqiGlob)) {
  const slug = path.match(/\/([^/]+)\.json$/)?.[1]
  if (slug) AQI_STATIC[slug] = loader
}

function aqiSlug(city: CityRef): string | undefined {
  if (city.slug && AQI_STATIC[city.slug]) return city.slug
  return FEATURED.find((f) => f.slug && AQI_STATIC[f.slug] && sameCity(f, city))?.slug
}

export async function loadAirQuality(city: CityRef): Promise<AirQualityMonth[] | null> {
  const slug = aqiSlug(city)
  if (!slug) return null
  const data = await AQI_STATIC[slug]()
  return data.default.months
}

export function useAirQuality(city: CityRef): {
  months: AirQualityMonth[] | null
  loading: boolean
} {
  const [state, setState] = useState<{
    city: CityRef
    months: AirQualityMonth[] | null
    loading: boolean
  }>(() => ({ city, months: null, loading: !!aqiSlug(city) }))

  useEffect(() => {
    let active = true
    setState({ city, months: null, loading: !!aqiSlug(city) })
    void loadAirQuality(city).then(
      (data) => {
        if (active) setState({ city, months: data, loading: false })
      },
      () => {
        if (active) setState({ city, months: null, loading: false })
      },
    )
    return () => {
      active = false
    }
  }, [city])

  return state.city === city
    ? { months: state.months, loading: state.loading }
    : { months: null, loading: !!aqiSlug(city) }
}
