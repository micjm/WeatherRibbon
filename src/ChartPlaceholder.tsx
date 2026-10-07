import { useId } from 'react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function ChartPlaceholder({
  title,
  variant = 'bars',
}: {
  title: string
  variant?: 'line' | 'bars' | 'ribbon' | 'heatmap'
}) {
  const titleId = useId()
  const heatmap = variant === 'heatmap'

  return (
    <section className="hourly climate chart-placeholder" aria-labelledby={titleId} aria-busy="true">
      <h2 className="forecast-title" id={titleId}>{title}</h2>
      <p className="sr-only">Loading {title.toLowerCase()} data.</p>
      <div aria-hidden="true">
        {!heatmap && (
          <div className="placeholder-legend">
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
        )}
        <svg className="hourly-svg" viewBox={`0 0 640 ${heatmap ? 332 : 300}`} focusable="false">
          {[20, 80, 140, 200, 260].map((y) => (
            <g key={y}>
              <line className="hourly-grid" x1={44} x2={624} y1={y} y2={y} />
              <rect className="placeholder-fill" x={10} y={y - 4} width={24} height={8} rx={4} />
            </g>
          ))}
          <g className="placeholder-plot">
            {variant === 'bars' && MONTHS.map((month, i) => (
              <rect key={month} className="placeholder-fill" x={54 + i * 48} y={100} width={28} height={160} rx={4} />
            ))}
            {variant === 'line' && (
              <>
                <path className="placeholder-line" d="M44 160 C140 160 175 80 290 80 S470 160 624 110" />
                <path className="placeholder-line" d="M44 210 C140 210 175 150 290 150 S470 225 624 185" />
              </>
            )}
            {variant === 'ribbon' && (
              <path className="placeholder-fill" d="M44 112 C160 70 225 125 335 110 S500 70 624 112 L624 168 C500 210 430 165 335 170 S160 210 44 168 Z" />
            )}
            {heatmap && MONTHS.map((month, i) => (
              <g key={month}>
                {Array.from({ length: 12 }, (_, hour) => (
                  <rect key={hour} className="placeholder-fill" x={44 + i * 48.3} y={14 + hour * 21} width={46} height={19} rx={2} />
                ))}
              </g>
            ))}
          </g>
          {MONTHS.map((month, i) => (
            <text
              key={month}
              className={`hourly-axis${i % 2 ? ' hourly-tick-minor' : ''}`}
              x={68 + i * 48.3}
              y={282}
              textAnchor="middle"
            >
              {month}
            </text>
          ))}
          {heatmap && <rect className="placeholder-fill" x={160} y={302} width={340} height={12} rx={6} />}
        </svg>
        {!heatmap && (
          <div className="placeholder-notes">
            {variant === 'ribbon' && <span className="skeleton" />}
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
        )}
      </div>
    </section>
  )
}
