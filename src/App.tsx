import { useEffect, useMemo, useState } from 'react'
import { AirQualityChart } from './AirQualityChart'
import { AqiCategoryDaysChart } from './AqiCategoryDaysChart'
import { ClimateChart } from './ClimateChart'
import { ClimateExtremes } from './ClimateExtremes'
import { CloudCoverChart } from './CloudCoverChart'
import { HourlyChart } from './HourlyChart'
import { PrecipChanceChart } from './PrecipChanceChart'
import { RainfallChart } from './RainfallChart'
import { SeasonalRibbonChart } from './SeasonalRibbonChart'
import { SnowfallChart } from './SnowfallChart'
import { HumidityComfortChart } from './HumidityComfortChart'
import { DaylightChart } from './DaylightChart'
import { WindChart } from './WindChart'
import { CityIndex } from './CityIndex'
import { loadCity, type CityData, type CityRef } from './dataService'
import { useHashRoute } from './useHashRoute'
import { routeToCity } from './router'
import './App.css'

function CityView({ city }: { city: CityRef }) {
  const [data, setData] = useState<CityData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setData(null)
    setError(null)
    setLoading(true)
    loadCity(city, ctrl.signal)
      .then((d) => {
        if (ctrl.signal.aborted) return
        setData(d)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) return
        setError(err instanceof Error ? err.message : 'Failed to load climate')
        setLoading(false)
      })
    return () => {
      ctrl.abort()
    }
  }, [city])

  return (
    <>
      {data ? (
        <div className="weather">
          <section className="card" aria-label="About this data">
            <p className="eyebrow">{data.region}</p>
            <h1>{data.name}</h1>
            <p className="panel-note">
              {data.source} &middot; {data.period}
            </p>
          </section>

          <ClimateExtremes climate={data.climate} />
          <SeasonalRibbonChart name={data.name} climate={data.climate} />
          <HourlyChart name={data.name} hourlyTemp={data.hourlyTemp} />
          <ClimateChart name={data.name} climate={data.climate} />
          <PrecipChanceChart name={data.name} climate={data.climate} />
          <RainfallChart name={data.name} climate={data.climate} />
          <SnowfallChart name={data.name} climate={data.climate} />
          <HumidityComfortChart name={data.name} climate={data.climate} />
          <CloudCoverChart name={data.name} climate={data.climate} />

          <AirQualityChart name={data.name} city={city} />
          <AqiCategoryDaysChart name={data.name} city={city} />

          <WindChart
            name={data.name}
            climate={data.climate}
            windRose={data.windRose}
          />
          <DaylightChart name={data.name} latitude={data.latitude} />
        </div>
      ) : (
        <article className="card muted">
          <h1>{loading ? 'Loading…' : 'Could not load city'}</h1>
          <p>
            {loading
              ? 'Fetching 1991–2020 ERA5 climate…'
              : error ?? 'Unable to load this city.'}
          </p>
        </article>
      )}
    </>
  )
}

function App() {
  const [route, navigate] = useHashRoute()

  const city = useMemo<CityRef | null>(() => routeToCity(route), [route])

  return (
    <div className="shell">
      {route.view !== 'index' && (
        <header className="header">
          <a
            className="brand"
            href="#/"
            onClick={(e) => {
              e.preventDefault()
              navigate({ view: 'index', query: '' })
            }}
          >
            <svg className="brand-icon" aria-hidden="true">
              <use href="/icons.svg#brand-icon" />
            </svg>
            Weatherfork
          </a>
          <a
            className="header-back"
            href="#/"
            onClick={(e) => {
              e.preventDefault()
              navigate({ view: 'index', query: '' })
            }}
          >
            ← All cities
          </a>
        </header>
      )}

      <main className="main">
        {route.view === 'index' ? (
          <CityIndex
            query={route.query}
            onQueryChange={(q) => navigate({ view: 'index', query: q })}
            onNavigate={(hash) => {
              window.location.hash = hash
            }}
          />
        ) : city ? (
          <CityView
            key={`${city.latitude.toFixed(2)},${city.longitude.toFixed(2)}`}
            city={city}
          />
        ) : (
          <article className="card muted">
            <h1>City not found</h1>
            <p>
              That city link is not available.{' '}
              <a
                href="#/"
                onClick={(e) => {
                  e.preventDefault()
                  navigate({ view: 'index', query: '' })
                }}
              >
                Browse all cities
              </a>
            </p>
          </article>
        )}
      </main>
    </div>
  )
}

export default App
