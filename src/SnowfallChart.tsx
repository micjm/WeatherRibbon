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
const CAP_W = 8

function niceTicks(lo: number, hi: number, step: number) {
  const start = Math.ceil(lo / step) * step
  const end = Math.floor(hi / step) * step
  const out: number[] = []
  for (let v = start; v <= end + 1e-9; v += step) out.push(Math.round(v * 100) / 100)
  return out
}

export function SnowfallChart({
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
  const barW = slot * 0.5

  const avgs = climate.map((m) => m.snowfall)
  const lows = climate.map((m) => m.snowBand[0])
  const highs = climate.map((m) => m.snowBand[1])

  const dataHi = Math.max(...highs, ...avgs, 0.05)
  const step = dataHi <= 1 ? 0.25 : dataHi <= 3 ? 0.5 : 1
  const yHi = Math.max(step, Math.ceil(dataHi / step) * step)
  const grid = niceTicks(0, yHi, step)

  const xAt = (i: number) => ML + slot * (i + 0.5)
  const yIn = (v: number) => MT + ((yHi - v) / yHi) * PLOT_H

  const snowiest = climate.reduce((a, b) => (b.snowfall > a.snowfall ? b : a))
  const least = climate.reduce((a, b) => (b.snowfall < a.snowfall ? b : a))

  return (
    <section className="hourly climate snowfall-chart" aria-labelledby={captionId}>
      <h2 className="forecast-title" id={captionId}>
        Monthly Snowfall
      </h2>
      <p className="sr-only" id={descId}>
        {name} average monthly snowfall in inches from January through
        December, drawn as bars with whiskers spanning the 20th to 80th
        percentile range across years.
      </p>

      <ul className="hourly-legend">
        <li>
          <span className="swatch snow-bar-swatch" aria-hidden="true" />
          Monthly average
        </li>
        <li>
          <span className="swatch snow-whisker-swatch" aria-hidden="true" />
          20th&ndash;80th percentile
        </li>
      </ul>

      <div className="hourly-chart-wrap">
        <svg
          className="hourly-svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-labelledby={`${captionId} ${descId}`}
        >
          {grid.map((v) => {
            const y = yIn(v)
            return (
              <g key={`grid-${v}`}>
                <line
                  className="hourly-grid"
                  x1={ML}
                  x2={ML + PLOT_W}
                  y1={y}
                  y2={y}
                />
                <text className="hourly-axis" x={ML - 8} y={y + 4} textAnchor="end">
                  {v} in
                </text>
              </g>
            )
          })}

          {climate.map((m, i) => {
            const h = Math.max(m.snowfall > 0 ? 1.5 : 0, (m.snowfall / yHi) * PLOT_H)
            const x = xAt(i)
            return (
              <g key={`bar-${m.month}`}>
                {h > 0 && (
                  <rect
                    className="snow-bar"
                    x={x - barW / 2}
                    y={MT + PLOT_H - h}
                    width={barW}
                    height={h}
                  >
                    <title>{`${m.month}: ${m.snowfall.toFixed(2)} in (${lows[i].toFixed(2)}\u2013${highs[i].toFixed(2)} in)`}</title>
                  </rect>
                )}
                <line
                  className="snow-whisker"
                  x1={x}
                  x2={x}
                  y1={yIn(highs[i])}
                  y2={yIn(lows[i])}
                />
                <line
                  className="snow-whisker"
                  x1={x - CAP_W / 2}
                  x2={x + CAP_W / 2}
                  y1={yIn(highs[i])}
                  y2={yIn(highs[i])}
                />
                <line
                  className="snow-whisker"
                  x1={x - CAP_W / 2}
                  x2={x + CAP_W / 2}
                  y1={yIn(lows[i])}
                  y2={yIn(lows[i])}
                />
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
        Snowiest {snowiest.month} ({snowiest.snowfall.toFixed(2)} in) &middot;{' '}
        Least {least.month} ({least.snowfall.toFixed(2)} in)
      </p>

      <DataDetails filename={`${name} snowfall`}>
          <table>
            <caption className="sr-only">
              {name} monthly snowfall totals in inches with 20th to 80th
              percentile range
            </caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Average</th>
                <th scope="col">20th</th>
                <th scope="col">80th</th>
              </tr>
            </thead>
            <tbody>
              {climate.map((m) => (
                <tr key={m.month}>
                  <th scope="row">{m.month}</th>
                  <td>{m.snowfall.toFixed(2)} in</td>
                  <td>{m.snowBand[0].toFixed(2)} in</td>
                  <td>{m.snowBand[1].toFixed(2)} in</td>
                </tr>
              ))}
            </tbody>
          </table>
      </DataDetails>
    </section>
  )
}
