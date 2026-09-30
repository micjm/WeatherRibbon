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

interface Segment {
  key: 'rain' | 'mixed' | 'snow' | 'dry'
  label: string
  pct: (m: ClimateMonth) => number
}

const SEGMENTS: Segment[] = [
  { key: 'rain', label: 'Rainy', pct: (m) => m.rain },
  { key: 'mixed', label: 'Mixed', pct: (m) => m.mixed },
  { key: 'snow', label: 'Snowy', pct: (m) => m.snow },
]

export function PrecipChanceChart({
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
  const yPct = (v: number) => MT + ((Y_MAX - v) / Y_MAX) * PLOT_H

  const wetPct = climate.map((m) =>
    Math.min(100, m.rain + m.mixed + m.snow),
  )
  const wettestIdx = wetPct.indexOf(Math.max(...wetPct))
  const driestIdx = wetPct.indexOf(Math.min(...wetPct))

  return (
    <section
      className="hourly climate precip-chart"
      aria-labelledby={captionId}
    >
      <h2 className="forecast-title" id={captionId}>
        Wet vs Dry Days
      </h2>
      <p className="sr-only" id={descId}>
        {name} share of days that are rainy, mixed, snowy, or dry in each
        month from January through December. Each bar is 100% of the month.
      </p>

      <ul className="hourly-legend">
        {SEGMENTS.map((s) => (
          <li key={s.key}>
            <span className={`swatch wd-swatch ${s.key}`} aria-hidden="true" />
            {s.label}
          </li>
        ))}
        <li>
          <span className="swatch wd-swatch dry" aria-hidden="true" />
          Dry
        </li>
      </ul>

      <div className="hourly-chart-wrap">
        <svg
          className="hourly-svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-labelledby={`${captionId} ${descId}`}
        >
          {Y_TICKS.map((v) => (
            <g key={`grid-${v}`}>
              <line
                className="hourly-grid"
                x1={ML}
                x2={ML + PLOT_W}
                y1={yPct(v)}
                y2={yPct(v)}
              />
              <text
                className="hourly-axis"
                x={ML - 8}
                y={yPct(v) + 4}
                textAnchor="end"
              >
                {v}%
              </text>
            </g>
          ))}

          {climate.map((m, i) => {
            const wet = wetPct[i]
            const dry = Math.max(0, 100 - wet)
            const x = xAt(i) - barW / 2
            let bottom = 0
            return (
              <g key={`bar-${m.month}`}>
                {SEGMENTS.map((s) => {
                  const p = s.pct(m)
                  if (p <= 0) return null
                  const yTop = yPct(bottom + p)
                  const yBot = yPct(bottom)
                  bottom += p
                  return (
                    <rect
                      key={s.key}
                      className={`wd-bar ${s.key}`}
                      x={x}
                      y={yTop}
                      width={barW}
                      height={Math.max(0, yBot - yTop)}
                    >
                      <title>{`${m.month} ${s.label.toLowerCase()}: ${p.toFixed(0)}%`}</title>
                    </rect>
                  )
                })}
                {dry > 0 && (
                  <rect
                    className="wd-bar dry"
                    x={x}
                    y={yPct(100)}
                    width={barW}
                    height={Math.max(0, yPct(wet) - yPct(100))}
                  >
                    <title>{`${m.month} dry: ${dry.toFixed(0)}%`}</title>
                  </rect>
                )}
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
        Wettest {climate[wettestIdx].month} ({wetPct[wettestIdx].toFixed(0)}% of
        days wet) &middot; Driest {climate[driestIdx].month} (
        {wetPct[driestIdx].toFixed(0)}%)
      </p>

      <DataDetails filename={`${name} wet vs dry`}>
          <table>
            <caption className="sr-only">
              {name} share of rainy, mixed, snowy, and dry days per month
            </caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Rainy</th>
                <th scope="col">Mixed</th>
                <th scope="col">Snowy</th>
                <th scope="col">Dry</th>
              </tr>
            </thead>
            <tbody>
              {climate.map((m, i) => (
                <tr key={m.month}>
                  <th scope="row">{m.month}</th>
                  <td>{m.rain.toFixed(0)}%</td>
                  <td>{m.mixed.toFixed(0)}%</td>
                  <td>{m.snow.toFixed(0)}%</td>
                  <td>{Math.max(0, 100 - wetPct[i]).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
      </DataDetails>
    </section>
  )
}
