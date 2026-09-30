import { useId } from 'react'
import type { ClimateMonth, WindRoseMonth } from './dataService'
import { DataDetails } from './DataDetails'

const WIDTH = 640
const HEIGHT = 300
const ML = 44
const MR = 16
const MT = 28
const MB = 40
const PLOT_W = WIDTH - ML - MR
const PLOT_H = HEIGHT - MT - MB

const SPARSE = new Set(['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'])
const CAP_W = 8

const DIR_KEYS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const
const DIR_FROM: Record<(typeof DIR_KEYS)[number], number> = {
  n: 0,
  ne: 45,
  e: 90,
  se: 135,
  s: 180,
  sw: 225,
  w: 270,
  nw: 315,
}
const DIR_LABEL: Record<(typeof DIR_KEYS)[number], string> = {
  n: 'N',
  ne: 'NE',
  e: 'E',
  se: 'SE',
  s: 'S',
  sw: 'SW',
  w: 'W',
  nw: 'NW',
}

function niceTicks(lo: number, hi: number, step: number) {
  const start = Math.ceil(lo / step) * step
  const end = Math.floor(hi / step) * step
  const out: number[] = []
  for (let v = start; v <= end + 1e-9; v += step) out.push(v)
  return out
}

function prevailing(rose: WindRoseMonth): { key: (typeof DIR_KEYS)[number]; pct: number } {
  let best: (typeof DIR_KEYS)[number] = 'n'
  let bestPct = -1
  for (const key of DIR_KEYS) {
    const pct = rose[key]
    if (pct > bestPct) {
      bestPct = pct
      best = key
    }
  }
  return { key: best, pct: bestPct }
}

export function WindChart({
  name,
  climate,
  windRose,
}: {
  name: string
  climate: ClimateMonth[]
  windRose?: WindRoseMonth[]
}) {
  const uid = useId()
  const captionId = `${uid}-caption`
  const descId = `${uid}-desc`
  const n = climate.length
  const slot = PLOT_W / n
  const barW = slot * 0.5
  const showArrows = Boolean(windRose && windRose.length === n)

  const avgs = climate.map((m) => m.wind)
  const lows = climate.map((m) => m.windBand[0])
  const highs = climate.map((m) => m.windBand[1])

  const dataHi = Math.max(...highs, ...avgs, 1)
  const step = dataHi > 12 ? 4 : dataHi > 6 ? 2 : 1
  const yHi = Math.max(step, Math.ceil(dataHi / step) * step)
  const grid = niceTicks(0, yHi, step)

  const xAt = (i: number) => ML + slot * (i + 0.5)
  const yIn = (v: number) => MT + ((yHi - v) / yHi) * PLOT_H

  const windiest = climate.reduce((a, b) => (b.wind > a.wind ? b : a))
  const calmest = climate.reduce((a, b) => (b.wind < a.wind ? b : a))

  return (
    <section className="hourly climate wind-chart" aria-labelledby={captionId}>
      <h2 className="forecast-title" id={captionId}>
        Average Wind Speed
      </h2>
      <p className="sr-only" id={descId}>
        {name} monthly mean wind speed in miles per hour from January through
        December, with 20th to 80th percentile whiskers
        {showArrows
          ? ', and an arrow on each bar pointing the way the prevailing wind blows'
          : ''}
        .
      </p>

      <ul className="hourly-legend">
        <li>
          <span className="swatch wind-bar-swatch" aria-hidden="true" />
          Monthly mean
        </li>
        <li>
          <span className="swatch wind-whisker-swatch" aria-hidden="true" />
          20th&ndash;80th percentile
        </li>
        {showArrows && (
          <li>
            <span className="swatch wind-arrow-swatch" aria-hidden="true" />
            Prevailing direction (blowing toward)
          </li>
        )}
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
                  {v} mph
                </text>
              </g>
            )
          })}

          {climate.map((m, i) => {
            const h = Math.max(1.5, (m.wind / yHi) * PLOT_H)
            const x = xAt(i)
            const rose = windRose?.[i]
            const prev = rose ? prevailing(rose) : null
            const toDeg = prev ? DIR_FROM[prev.key] + 180 : 0
            const arrowY = yIn(highs[i]) - 12
            return (
              <g key={`bar-${m.month}`}>
                <rect
                  className="wind-bar"
                  x={x - barW / 2}
                  y={MT + PLOT_H - h}
                  width={barW}
                  height={h}
                >
                  <title>
                    {prev
                      ? `${m.month}: ${m.wind.toFixed(1)} mph, prevailing ${DIR_LABEL[prev.key]} (${prev.pct.toFixed(0)}%)`
                      : `${m.month}: ${m.wind.toFixed(1)} mph`}
                  </title>
                </rect>
                <line
                  className="wind-whisker"
                  x1={x}
                  x2={x}
                  y1={yIn(highs[i])}
                  y2={yIn(lows[i])}
                />
                <line
                  className="wind-whisker"
                  x1={x - CAP_W / 2}
                  x2={x + CAP_W / 2}
                  y1={yIn(highs[i])}
                  y2={yIn(highs[i])}
                />
                <line
                  className="wind-whisker"
                  x1={x - CAP_W / 2}
                  x2={x + CAP_W / 2}
                  y1={yIn(lows[i])}
                  y2={yIn(lows[i])}
                />
                {prev && (
                  <g transform={`translate(${x} ${arrowY}) rotate(${toDeg})`}>
                    <path
                      className="wind-arrow"
                      d="M0,-7 L3.5,5 L0,2.5 L-3.5,5 Z"
                    />
                  </g>
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
        Windiest {windiest.month} ({windiest.wind.toFixed(1)} mph) &middot;{' '}
        Calmest {calmest.month} ({calmest.wind.toFixed(1)} mph)
      </p>

      <DataDetails filename={`${name} wind`}>
          <table>
            <caption className="sr-only">
              {name} monthly mean wind speed in miles per hour
              {showArrows ? ' and prevailing direction' : ''}
            </caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Mean</th>
                <th scope="col">20th</th>
                <th scope="col">80th</th>
                {showArrows && <th scope="col">Prevailing</th>}
              </tr>
            </thead>
            <tbody>
              {climate.map((m, i) => {
                const prev = windRose?.[i] ? prevailing(windRose[i]) : null
                return (
                  <tr key={m.month}>
                    <th scope="row">{m.month}</th>
                    <td>{m.wind.toFixed(1)} mph</td>
                    <td>{m.windBand[0].toFixed(1)} mph</td>
                    <td>{m.windBand[1].toFixed(1)} mph</td>
                    {prev && (
                      <td>
                        {DIR_LABEL[prev.key]} ({prev.pct.toFixed(0)}%)
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
      </DataDetails>
    </section>
  )
}
