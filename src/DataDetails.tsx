import { useRef, useState, type ReactNode } from 'react'

function tableText(table: HTMLTableElement, sep: string) {
  return [...table.querySelectorAll('tr')]
    .map((row) =>
      [...row.querySelectorAll('th,td')]
        .map((cell) => {
          const t = (cell.textContent ?? '').trim().replace(/\s+/g, ' ')
          if (sep === ',' && /[",\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`
          return t
        })
        .join(sep),
    )
    .join('\n')
}

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function DataDetails({
  filename,
  children,
}: {
  filename: string
  children: ReactNode
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  function getTable() {
    return wrapRef.current?.querySelector('table') ?? null
  }

  async function copy(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const table = getTable()
    if (!table) return
    try {
      await navigator.clipboard.writeText(tableText(table, '\t'))
    } catch {
      return
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  function download(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const table = getTable()
    if (!table) return
    const blob = new Blob([tableText(table, ',')], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug(filename)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <details className="data-panel">
      <summary className="data-summary">
        <span className="data-prefix">Data:</span>
        <span className="data-link">view</span>
        <button
          type="button"
          className="data-link"
          onClick={copy}
        >
          {copied ? 'copied' : 'copy'}
        </button>
        <button
          type="button"
          className="data-link"
          onClick={download}
        >
          download
        </button>
      </summary>
      <div className="hourly-table-wrap" tabIndex={0} ref={wrapRef}>
        {children}
      </div>
    </details>
  )
}
