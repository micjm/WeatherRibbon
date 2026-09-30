import { useId } from 'react'
import { daylightHours, YEAR } from './solar'
import { DataDetails } from './DataDetails'

const WIDTH = 640
const HEIGHT = 300
const ML = 44
const MR = 16
const MT = 14
const MB = 40
const PLOT_W = WIDTH - ML - MR
const PLOT_H = HEIGHT - MT - MB
const STEP = 2

const SPARSE = new Set(['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'])
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
const MID_DAY = (() => {
  const out: number[] = []
  let acc = 0
  for (let i = 0; i < 12; i++) {
    out.push(acc + DAYS_IN_MONTH[i] / 2)
    acc += DAYS_IN_MONTH[i]
  }
  return out
})()

const GRID_HOURS = [0, 6, 12, 18, 24]

function formatHours(h: number): string {
  const total = Math.round(h * 60)
  const hr = Math.floor(total / 60)
  const min = total % 60
  return `${hr}h ${String(min).padStart(2, '0')}m`
}

export function DaylightChart({
  name,
  latitude,
}: {
  name: string
  latitude: number
}) {
  const uid = useId()
  const captionId = `${uid}-caption`
  const descId = `${uid}-desc`

  const samples: number[] = []
  for (let d = 0; d < YEAR; d += STEP) {
    samples.push(daylightHours(latitude, d))
  }

  const xDay = (d: number) => ML + (d / YEAR) * PLOT_W
  const yHour = (h: number) => MT + ((24 - h) / 24) * PLOT_H
  const slot = PLOT_W / 12

  const line = samples
    .map((h, i) => {
      const x = xDay(i * STEP)
      const y = yHour(h)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')

  const area = `${line} L${xDay(YEAR - STEP).toFixed(1)} ${yHour(0).toFixed(1)} L${xDay(0).toFixed(1)} ${yHour(0).toFixed(1)} Z`

  const monthly = MID_DAY.map((d) => daylightHours(latitude, d))
  const longest = samples.reduce((a, b) => (b > a ? b : a))
  const shortest = samples.reduce((a, b) => (b < a ? b : a))
  const hemisphere = latitude >= 0 ? 'north' : 'south'

  return (
    <section className="hourly climate daylight-chart" aria-labelledby={captionId}>
      <h2 className="forecast-title" id={captionId}>
        Hours of Daylight
      </h2>
      <p className="sr-only" id={descId}>
        {name} hours of daylight from January through December at latitude{' '}
        {Math.abs(latitude).toFixed(2)}&deg;{latitude >= 0 ? 'N' : 'S'}. Longest
        day {formatHours(longest)}, shortest day {formatHours(shortest)}.
      </p>

      <ul className="hourly-legend">
        <li>
          <span className="swatch dl-curve daylight" aria-hidden="true" />
          Daylight
        </li>
      </ul>

      <div className="hourly-chart-wrap">
        <svg
          className="hourly-svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-labelledby={`${captionId} ${descId}`}
        >
          {GRID_HOURS.map((h) => {
            const y = yHour(h)
            return (
              <g key={`grid-${h}`}>
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
                  {h}h
                </text>
              </g>
            )
          })}

          <path className="dl-daylight-fill" d={area} />
          <path className="dl-curve-line daylight" d={line}>
            <title>Hours of daylight</title>
          </path>

          {MONTHS.map((mon, i) => (
            <text
              key={`x-${mon}`}
              className={
                SPARSE.has(mon)
                  ? 'hourly-axis hourly-tick'
                  : 'hourly-axis hourly-tick climate-tick-minor'
              }
              x={ML + slot * (i + 0.5)}
              y={MT + PLOT_H + 20}
              textAnchor="middle"
            >
              {mon}
            </text>
          ))}
        </svg>
      </div>

      <p className="panel-note cc-note">
        Longest {formatHours(longest)} &middot; Shortest {formatHours(shortest)}{' '}
        &middot; {hemisphere}ern hemisphere
      </p>

      <DataDetails filename={`${name} daylight`}>
          <table>
            <caption className="sr-only">
              {name} mid-month hours of daylight
            </caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Daylight</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((h, i) => (
                <tr key={MONTHS[i]}>
                  <th scope="row">{MONTHS[i]}</th>
                  <td>{formatHours(h)}</td>
                </tr>
              ))}
            </tbody>
          </table>
      </DataDetails>
    </section>
  )
}
