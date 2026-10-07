import { bySlug, type CityRef } from './cities.ts'

export type Route =
  | { view: 'index'; query: string }
  | { view: 'city'; slug: string }

const CITY_RE = /^\/city\/([^/?#]+)/

export function parseRoute(raw: string): Route {
  let s = (raw ?? '').trim()
  if (!s) {
    return { view: 'index', query: '' }
  }

  // Handle full URL if passed
  try {
    if (s.startsWith('http://') || s.startsWith('https://')) {
      const u = new URL(s)
      s = u.pathname + u.search + u.hash
    }
  } catch {
    // ignore
  }

  // Inspect legacy hash if present (e.g. #/city/london or #/?q=foo)
  if (s.includes('#')) {
    const hashPart = s.slice(s.indexOf('#') + 1)
    if (hashPart.startsWith('/') || hashPart.startsWith('?')) {
      s = hashPart
    } else {
      s = s.slice(0, s.indexOf('#'))
    }
  }

  // Separate path and search
  const qIndex = s.indexOf('?')
  const path = qIndex >= 0 ? s.slice(0, qIndex) : s
  const search = qIndex >= 0 ? s.slice(qIndex) : ''

  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  const cityMatch = normalizedPath.match(CITY_RE)
  if (cityMatch) {
    const rawSlug = cityMatch[1].replace(/\/+$/, '')
    if (rawSlug) {
      return { view: 'city', slug: decodeURIComponent(rawSlug) }
    }
  }

  if (search || normalizedPath === '/search') {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    return { view: 'index', query: params.get('q') ?? '' }
  }

  if (normalizedPath === '/' || normalizedPath === '') {
    return { view: 'index', query: '' }
  }

  return { view: 'index', query: '' }
}

export function parsePath(pathname: string, search: string = ''): Route {
  const query = search ? (search.startsWith('?') ? search : `?${search}`) : ''
  return parseRoute(`${pathname}${query}`)
}

export function parseHash(hash: string): Route {
  return parseRoute(hash)
}

export function serializeRoute(route: Route): string {
  if (route.view === 'index') {
    if (!route.query) return '/'
    return `/?q=${encodeURIComponent(route.query)}`
  }
  return `/city/${encodeURIComponent(route.slug)}`
}

export function routeToCity(route: Route): CityRef | null {
  if (route.view !== 'city') return null
  return bySlug.get(route.slug) ?? null
}
