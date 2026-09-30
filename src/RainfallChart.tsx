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
  for (let v = start; v <= end + 1e-9; v += step) out.push(v)
  return out
}

function wettestWindow(climate: ClimateMonth[], span: number) {
  const n = climate.length
  let best = 0
  let bestSum = -1
  for (let i = 0; i < n; i++) {
    let sum = 0
    for (let k = 0; k < span; k++) sum += climate[(i + k) % n].precip
    if (sum > bestSum) {
      bestSum = sum
      best = i
    }
  }
  return { start: best, sum: bestSum }
}

export function RainfallChart({
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

  const avgs = climate.map((m) => m.precip)
  const lows = climate.map((m) => m.precipBand[0])
  const highs = climate.map((m) => m.precipBand[1])

  const dataHi = Math.max(...highs, ...avgs, 1)
  const yHi = Math.max(2, Math.ceil(dataHi))
  const step = yHi > 8 ? 2 : 1
  const grid = niceTicks(0, yHi, step)

  const xAt = (i: number) => ML + slot * (i + 0.5)
  const yIn = (v: number) => MT + ((yHi - v) / yHi) * PLOT_H

  const annual = avgs.reduce((a, b) => a + b, 0)
  const wettest = climate.reduce((a, b) => (b.precip > a.precip ? b : a))
  const driest = climate.reduce((a, b) => (b.precip < a.precip ? b : a))
  const window = wettestWindow(climate, 3)
  const windowShare = annual > 0 ? (window.sum / annual) * 100 : 0
  const windowLabel = `${climate[window.start].month}\u2013${
    climate[(window.start + 2) % n].month
  }`

  return (
    <section className="hourly climate rainfall-chart" aria-labelledby={captionId}>
      <h2 className="forecast-title" id={captionId}>
        Monthly Rainfall
      </h2>
      <p className="sr-only" id={descId}>
        {name} average monthly rainfall in inches from January through
        December, drawn as bars with whiskers spanning the 20th to 80th
        percentile range across years.
      </p>

      <ul className="hourly-legend">
        <li>
          <span className="swatch rain-bar-swatch" aria-hidden="true" />
          Monthly average
        </li>
        <li>
          <span className="swatch rain-whisker-swatch" aria-hidden="true" />
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
            const h = Math.max(1.5, (m.precip / yHi) * PLOT_H)
            const x = xAt(i)
            return (
              <g key={`bar-${m.month}`}>
                <rect
                  className="rain-bar"
                  x={x - barW / 2}
                  y={MT + PLOT_H - h}
                  width={barW}
                  height={h}
                >
                  <title>
                    {`${m.month}: ${m.precip.toFixed(2)} in (${lows[i].toFixed(1)}\u2013${highs[i].toFixed(1)} in)`}
                  </title>
                </rect>
                <line
                  className="rain-whisker"
                  x1={x}
                  x2={x}
                  y1={yIn(highs[i])}
                  y2={yIn(lows[i])}
                />
                <line
                  className="rain-whisker"
                  x1={x - CAP_W / 2}
                  x2={x + CAP_W / 2}
                  y1={yIn(highs[i])}
                  y2={yIn(highs[i])}
                />
                <line
                  className="rain-whisker"
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
        Wettest {wettest.month} ({wettest.precip.toFixed(1)} in) &middot; Driest{' '}
        {driest.month} ({driest.precip.toFixed(1)} in)
        {annual > 0 && (
          <>
            {' '}
            &middot; {windowShare.toFixed(0)}% of annual rain falls {windowLabel}
          </>
        )}
      </p>

      <DataDetails filename={`${name} rainfall`}>
          <table>
            <caption className="sr-only">
              {name} monthly rainfall totals in inches with 20th to 80th
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
                  <td>{m.precip.toFixed(1)} in</td>
                  <td>{m.precipBand[0].toFixed(1)} in</td>
                  <td>{m.precipBand[1].toFixed(1)} in</td>
                </tr>
              ))}
            </tbody>
          </table>
      </DataDetails>
    </section>
  )
}
