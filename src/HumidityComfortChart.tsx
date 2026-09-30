import { useId } from 'react'
import type { ClimateMonth } from './dataService'
import { DataDetails } from './DataDetails'

const WIDTH = 640
const HEIGHT = 300
const ML = 44
const MR = 16
const MT = 14
const MB = 40
const PLOT_W = WIDTH - ML - MR
const PLOT_H = HEIGHT - MT - MB

const SPARSE = new Set(['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'])
const Y_MAX = 100
const Y_TICKS = [0, 25, 50, 75, 100]

const SIGMA = 5

interface Band {
  key: string
  label: string
  cls: string
}

const BANDS: Band[] = [
  { key: 'dry', label: 'Dry', cls: 'dry' },
  { key: 'comfortable', label: 'Comfortable', cls: 'comfortable' },
  { key: 'humid', label: 'Humid', cls: 'humid' },
  { key: 'muggy', label: 'Muggy', cls: 'muggy' },
]

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * ax)
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-ax * ax)
  return sign * y
}

function phi(x: number, mean: number): number {
  return 0.5 * (1 + erf((x - mean) / (SIGMA * Math.SQRT2)))
}

function bandFractions(dewPoint: number): number[] {
  const edges = [55, 65, 75]
  const cdfs = edges.map((edge) => phi(edge, dewPoint))
  return [
    cdfs[0] * 100,
    (cdfs[1] - cdfs[0]) * 100,
    (cdfs[2] - cdfs[1]) * 100,
    (1 - cdfs[2]) * 100,
  ]
}

export function HumidityComfortChart({
  name,
  climate,
}: {
  name: string
  climate: ClimateMonth[]
}) {
  const uid = useId()
  const captionId = `${uid}-caption`
  const descId = `${uid}-desc`
  const n = climate.length
  const slot = PLOT_W / n
  const barW = slot * 0.55

  const xAt = (i: number) => ML + slot * (i + 0.5)
  const yPct = (p: number) => MT + ((Y_MAX - p) / Y_MAX) * PLOT_H

  const fractions = climate.map((m) => bandFractions(m.dewPoint))

  const driestMonth = climate.reduce((a, b) =>
    b.dewPoint < a.dewPoint ? b : a,
  )
  const muggiestMonth = climate.reduce((a, b) =>
    b.dewPoint > a.dewPoint ? b : a,
  )

  return (
    <section
      className="hourly climate humidity-chart"
      aria-labelledby={captionId}
    >
      <h2 className="forecast-title" id={captionId}>
        Dew Point Comfort
      </h2>
      <p className="sr-only" id={descId}>
        {name} percentage of time spent in each dew-point comfort band &mdash;
        dry below 55 degrees, comfortable 55 to 65, humid 65 to 75, and muggy
        75 and above &mdash; from January through December. Categories stack
        to 100%.
      </p>

      <ul className="hourly-legend">
        {BANDS.slice()
          .reverse()
          .map((band) => (
            <li key={band.key}>
              <span
                className={`swatch hc-swatch ${band.cls}`}
                aria-hidden="true"
              />
              {band.label}
            </li>
          ))}
      </ul>

      <div className="hourly-chart-wrap">
        <svg
          className="hourly-svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-labelledby={`${captionId} ${descId}`}
        >
          {Y_TICKS.map((p) => {
            const y = yPct(p)
            return (
              <g key={`grid-${p}`}>
                <line
                  className="hourly-grid"
                  x1={ML}
                  x2={ML + PLOT_W}
                  y1={y}
                  y2={y}
                />
                <text
                  className="hourly-axis"
                  x={ML - 8}
                  y={y + 4}
                  textAnchor="end"
                >
                  {p}%
                </text>
              </g>
            )
          })}

          {climate.map((m, i) => {
            const x = xAt(i) - barW / 2
            let bottom = 0
            return (
              <g key={`bar-${m.month}`}>
                {BANDS.map((band, bi) => {
                  const p = fractions[i][bi]
                  if (p <= 0) return null
                  const yTop = yPct(bottom + p)
                  const yBot = yPct(bottom)
                  bottom += p
                  return (
                    <rect
                      key={band.key}
                      className={`hc-bar ${band.cls}`}
                      x={x}
                      y={yTop}
                      width={barW}
                      height={Math.max(0, yBot - yTop)}
                    >
                      <title>
                        {`${m.month} ${band.label.toLowerCase()}: ${p.toFixed(0)}%`}
                      </title>
                    </rect>
                  )
                })}
              </g>
            )
          })}

          {climate.map((m, i) => (
            <text
              key={`x-${m.month}`}
              className={
                SPARSE.has(m.month)
                  ? 'hourly-axis hourly-tick'
                  : 'hourly-axis hourly-tick climate-tick-minor'
              }
              x={xAt(i)}
              y={MT + PLOT_H + 20}
              textAnchor="middle"
            >
              {m.month}
            </text>
          ))}
        </svg>
      </div>

      <p className="panel-note cc-note">
        Driest {driestMonth.month} ({driestMonth.dewPoint}&deg; dew point)
        &middot; Muggiest {muggiestMonth.month} ({muggiestMonth.dewPoint}&deg;
        dew point)
      </p>

      <DataDetails filename={`${name} humidity`}>
          <table>
            <caption className="sr-only">
              {name} monthly percentage of time in each dew-point comfort band
            </caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                {BANDS.map((band) => (
                  <th key={band.key} scope="col">
                    {band.label}
                  </th>
                ))}
                <th scope="col">Dew point</th>
              </tr>
            </thead>
            <tbody>
              {climate.map((m, i) => (
                <tr key={m.month}>
                  <th scope="row">{m.month}</th>
                  {fractions[i].map((f, bi) => (
                    <td key={BANDS[bi].key}>{f.toFixed(0)}%</td>
                  ))}
                  <td>{m.dewPoint}&deg;</td>
                </tr>
              ))}
            </tbody>
          </table>
      </DataDetails>
    </section>
  )
}
