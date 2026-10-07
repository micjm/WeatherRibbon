import { useEffect, useMemo, useState } from 'react'
import { AirQualityChart } from './AirQualityChart'
import { AqiCategoryDaysChart } from './AqiCategoryDaysChart'
import { ClimateChart } from './ClimateChart'
import { ChartPlaceholder } from './ChartPlaceholder'
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
import { useRoute } from './useRoute'
import { parseRoute, routeToCity } from './router'
import './App.css'

function CityView({ city }: { city: CityRef }) {
  const [data, setData] = useState<CityData | null>(null)
  const [loading, setLoading] = useState(true)
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
      <p className="sr-only" role="status">
        {loading ? `Loading climate data for ${city.name}.` : ''}
      </p>
      <div className="weather" aria-busy={loading}>
        <section className="card" aria-label="About this data">
          <p className="eyebrow">{city.region}</p>
          <h1>{city.name}</h1>
          <p className="panel-note">
            {data ? (
              <>{data.source} &middot; {data.period}</>
            ) : loading ? (
              <span className="skeleton placeholder-source" aria-hidden="true" />
            ) : 'Climate data unavailable.'}
          </p>
        </section>

        {!loading && !data ? (
          <article className="card" role="alert">
            <h2 className="forecast-title">Could not load city</h2>
            <p>{error || 'Unable to load this city.'}</p>
          </article>
        ) : (
          <>
            {data ? (
              <>
                <ClimateExtremes climate={data.climate} />
                <SeasonalRibbonChart name={data.name} climate={data.climate} />
                <HourlyChart name={data.name} hourlyTemp={data.hourlyTemp} />
                <ClimateChart name={data.name} climate={data.climate} />
                <PrecipChanceChart name={data.name} climate={data.climate} />
                <RainfallChart name={data.name} climate={data.climate} />
                <SnowfallChart name={data.name} climate={data.climate} />
                <HumidityComfortChart name={data.name} climate={data.climate} />
                <CloudCoverChart name={data.name} climate={data.climate} />
              </>
            ) : (
              <>
                <section className="climate-extremes" aria-hidden="true">
                  <h2 className="climate-extremes-title">Climate extremes</h2>
                  <ul className="climate-extremes-chips">
                    {['Hottest', 'Wettest'].map((label) => (
                      <li key={label}>
                        <span className="climate-extremes-chip">
                          <span className="climate-extremes-kind">{label}</span>
                          <span className="skeleton placeholder-extreme" />
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
                <ChartPlaceholder title="Seasonal Climate Ribbon" variant="ribbon" />
                <ChartPlaceholder title="Average Hourly Temperature" variant="heatmap" />
                <ChartPlaceholder title="Average High and Low Temperature" variant="line" />
                <ChartPlaceholder title="Wet vs Dry Days" />
                <ChartPlaceholder title="Monthly Rainfall" />
                <ChartPlaceholder title="Monthly Snowfall" />
                <ChartPlaceholder title="Dew Point Comfort" />
                <ChartPlaceholder title="Sky Conditions" variant="line" />
              </>
            )}

            <AirQualityChart name={city.name} city={city} />
            <AqiCategoryDaysChart name={city.name} city={city} />

            {data ? (
              <WindChart
                name={data.name}
                climate={data.climate}
                windRose={data.windRose}
              />
            ) : <ChartPlaceholder title="Average Wind Speed" />}
            <DaylightChart name={city.name} latitude={city.latitude} />
          </>
        )}
      </div>
    </>
  )
}

function App() {
  const [route, navigate] = useRoute()

  const city = useMemo<CityRef | null>(() => routeToCity(route), [route])

  return (
    <div className="shell">
      {route.view !== 'index' && (
        <header className="header">
          <a
            className="brand"
            href="/"
            onClick={(e) => {
              e.preventDefault()
              navigate({ view: 'index', query: '' })
            }}
          >
            <svg className="brand-icon" aria-hidden="true">
              <use href="/icons.svg#brand-icon" />
            </svg>
            Weather ribbon
          </a>
          <a
            className="header-back"
            href="/"
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
            onNavigate={(href) => {
              navigate(parseRoute(href))
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
                href="/"
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
