import { useCallback, useEffect, useState } from 'react'
import { parseRoute, serializeRoute, type Route } from './router'

function getCurrentRoute(): Route {
  if (typeof window === 'undefined') {
    return { view: 'index', query: '' }
  }
  if (window.location.hash && window.location.hash.length > 1) {
    const fromHash = parseRoute(window.location.hash)
    if (fromHash.view === 'city' || fromHash.query) {
      return fromHash
    }
  }
  return parseRoute(window.location.pathname + window.location.search)
}

export function useRoute(): [
  Route,
  (next: Route, options?: { replace?: boolean }) => void,
] {
  const [route, setRoute] = useState<Route>(getCurrentRoute)

  useEffect(() => {
    if (window.location.hash) {
      const canonical = serializeRoute(getCurrentRoute())
      window.history.replaceState(null, '', canonical)
    }

    function onPopState() {
      setRoute(getCurrentRoute())
    }

    function onHashChange() {
      if (window.location.hash) {
        const nextRoute = getCurrentRoute()
        setRoute(nextRoute)
        window.history.replaceState(null, '', serializeRoute(nextRoute))
      }
    }

    window.addEventListener('popstate', onPopState)
    window.addEventListener('hashchange', onHashChange)
    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])

  const navigate = useCallback(
    (next: Route, options?: { replace?: boolean }) => {
      const nextUrl = serializeRoute(next)
      const currentUrl = window.location.pathname + window.location.search
      if (nextUrl !== currentUrl || window.location.hash) {
        if (options?.replace) {
          window.history.replaceState(null, '', nextUrl)
        } else {
          window.history.pushState(null, '', nextUrl)
        }
      }
      setRoute(next)
    },
    [],
  )

  return [route, navigate]
}

export function pushRoute(routeOrPath: Route | string): void {
  if (typeof window === 'undefined') return
  const url =
    typeof routeOrPath === 'string'
      ? routeOrPath
      : serializeRoute(routeOrPath)
  const current = window.location.pathname + window.location.search
  if (url !== current || window.location.hash) {
    window.history.pushState(null, '', url)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
}
