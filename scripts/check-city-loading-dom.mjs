import './setup-jsdom.mjs'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { act, createElement, Profiler } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { rolldown } from 'rolldown'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (name) => join(projectRoot, 'src', name)
const entryId = '\0city-loading-check'
const serviceId = '\0city-loading-data-service'
const cssId = '\0city-loading-css'
const aqiSlugs = ['seattle', 'boston']
const climateTitles = [
  'Seasonal Climate Ribbon',
  'Average Hourly Temperature',
  'Average High and Low Temperature',
  'Wet vs Dry Days',
  'Monthly Rainfall',
  'Monthly Snowfall',
  'Dew Point Comfort',
  'Sky Conditions',
  'Average Wind Speed',
]
const aqiTitles = ['Air Quality', 'AQI category days by month']
const daylightTitle = 'Hours of Daylight'
const hourlyTitle = 'Average Hourly Temperature'

function deferred(metadata) {
  let resolve
  let reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { ...metadata, promise, resolve, reject }
}

function sectionFor(host, title) {
  const headings = [...host.querySelectorAll('h2')].filter(
    (heading) => heading.textContent.trim() === title,
  )
  assert.equal(headings.length, 1, `one h2 for ${title}`)
  const section = headings[0].closest('section')
  assert.ok(section, `${title} belongs to a section`)
  return section
}

function placeholder(host, title) {
  const section = sectionFor(host, title)
  assert.ok(section.classList.contains('chart-placeholder'), `${title} is pending`)
  const heading = section.querySelector('h2')
  assert.equal(heading.closest('[hidden], [aria-hidden="true"]'), null, `${title} is visible`)
  return section
}

function chart(host, title) {
  const section = sectionFor(host, title)
  assert.equal(section.classList.contains('chart-placeholder'), false, `${title} has settled`)
  assert.ok(section.querySelector('svg[role="img"], svg[role="group"]'), `${title} renders its real chart`)
  return section
}

function page(host, name, busy) {
  assert.deepEqual([...host.querySelectorAll('h1')].map((h) => h.textContent.trim()), [name])
  const weather = host.querySelector('div.weather')
  assert.ok(weather, 'city page has a weather container')
  assert.equal(weather.getAttribute('aria-busy'), String(busy), 'weather reflects climate loading')
}

function noPlaceholders(host) {
  assert.equal(host.querySelectorAll('.chart-placeholder').length, 0, 'no orphan placeholders')
}

function settledClimate(host, name, hourly = true) {
  page(host, name, false)
  assert.equal(host.querySelector('[role="alert"]'), null, 'successful climate has no error')
  const extremes = sectionFor(host, 'Climate extremes')
  assert.equal(extremes.classList.contains('chart-placeholder'), false)
  assert.equal(extremes.querySelectorAll('.climate-extremes-chip').length, 2)
  for (const title of climateTitles) {
    if (title !== hourlyTitle || hourly) chart(host, title)
  }
  if (!hourly) {
    assert.equal(host.querySelector('.heatmap-chart'), null, 'missing hourly data has no card')
    assert.equal([...host.querySelectorAll('h2')].some((h) => h.textContent.trim() === hourlyTitle), false)
  }
  chart(host, daylightTitle)
}

function normalizedPlaceholder(section) {
  const copy = section.cloneNode(true)
  for (const node of [copy, ...copy.querySelectorAll('*')]) {
    node.removeAttribute('id')
    node.removeAttribute('aria-labelledby')
    node.removeAttribute('aria-describedby')
  }
  return copy.outerHTML
}

async function runChecks(App, ChartPlaceholder) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const climateFixture = JSON.parse(readFileSync(join(projectRoot, 'data', 'seattle.json'), 'utf8'))
  const aqiFixture = JSON.parse(readFileSync(join(projectRoot, 'data', 'aqi', 'seattle.json'), 'utf8'))
  assert.equal(climateFixture.hourlyTemp.length, 12, 'fixture includes hourly data')
  assert.equal(aqiFixture.months.length, 12, 'fixture includes air quality data')

  const dataFor = (city) => ({ ...structuredClone(climateFixture), ...city, source: `Fixture for ${city.name}` })
  const aqiData = () => ({ default: structuredClone(aqiFixture) })
  let failures = 0
  let checks = 0

  async function check(label, run) {
    checks++
    try {
      await run()
      console.log(`  ok    ${label}`)
    } catch (error) {
      failures++
      console.error(`  FAIL  ${label}`)
      console.error(error)
    }
  }

  async function withApp(slug, run) {
    const climateRequests = []
    const aqiRequests = []
    globalThis.__cityLoadingChecks = {
      loadCity(city, signal) {
        const request = deferred({ city, signal })
        climateRequests.push(request)
        return request.promise
      },
      loadAirQuality(citySlug) {
        const request = deferred({ slug: citySlug })
        aqiRequests.push(request)
        return request.promise
      },
    }
    window.history.replaceState(null, '', `#/city/${slug}`)
    const host = document.createElement('div')
    document.body.appendChild(host)
    const errors = []
    const root = createRoot(host, { onUncaughtError: (error) => errors.push(error) })
    let mounted = true
    let initial
    async function unmount() {
      if (!mounted) return
      mounted = false
      await act(async () => root.unmount())
    }
    try {
      await act(async () => {
        root.render(createElement(Profiler, {
          id: 'city-loading',
          onRender: () => {
            if (!initial) initial = host.cloneNode(true)
          },
        }, createElement(App)))
      })
      await run({
        host,
        initial,
        climateRequests,
        aqiRequests,
        unmount,
        async navigate(hash) {
          await act(async () => {
            window.history.replaceState(null, '', hash)
            window.dispatchEvent(new window.HashChangeEvent('hashchange'))
          })
        },
      })
      assert.deepEqual(errors, [], 'React has no uncaught render errors')
    } finally {
      await unmount()
      host.remove()
      delete globalThis.__cityLoadingChecks
    }
  }

  function pending(host, name, withAqi = true) {
    page(host, name, true)
    assert.equal(host.querySelector('[role="alert"]'), null, 'pending city never flashes an error')
    const titles = withAqi ? [...climateTitles, ...aqiTitles] : climateTitles
    assert.deepEqual(
      [...host.querySelectorAll('.chart-placeholder h2')].map((h) => h.textContent.trim()).sort(),
      [...titles].sort(),
      'each pending card has its actual chart title',
    )
    for (const title of titles) placeholder(host, title)
    chart(host, daylightTitle)
  }

  function requestsFor(requests, slug) {
    const matches = requests.filter((request) => (request.city?.slug ?? request.slug) === slug)
    assert.ok(matches.length, `a deferred request exists for ${slug}`)
    return matches
  }

  function climateRequest(requests, slug) {
    const matches = requestsFor(requests, slug)
    assert.equal(matches.length, 1, `one climate request for ${slug}`)
    assert.ok(matches[0].signal instanceof AbortSignal, 'loadCity receives an abort signal')
    return matches[0]
  }

  await check('first committed render already shows the city, busy charts, and daylight', () =>
    withApp('seattle', async ({ host, initial, climateRequests, aqiRequests }) => {
      pending(initial, 'Seattle')
      pending(host, 'Seattle')
      assert.equal(climateRequest(climateRequests, 'seattle').signal.aborted, false)
      assert.equal(requestsFor(aqiRequests, 'seattle').length, 2, 'both AQI hooks mount before climate resolves')
      for (const [i, variant] of ['line', 'bars'].entries()) {
        const template = document.createElement('template')
        template.innerHTML = renderToStaticMarkup(createElement(ChartPlaceholder, { title: aqiTitles[i], variant }))
        const expected = template.content.querySelector('section.chart-placeholder')
        assert.ok(expected, 'ChartPlaceholder exports a titled section')
        assert.equal(
          normalizedPlaceholder(placeholder(initial, aqiTitles[i])),
          normalizedPlaceholder(expected),
          `${aqiTitles[i]} uses the ${variant} placeholder`,
        )
      }
    }),
  )

  await check('AQI hooks settle independently while climate remains deferred, then real climate charts replace placeholders', () =>
    withApp('seattle', async ({ host, climateRequests, aqiRequests }) => {
      pending(host, 'Seattle')
      const air = requestsFor(aqiRequests, 'seattle')
      assert.equal(air.length, 2)
      await act(async () => air[0].resolve(aqiData()))
      assert.equal(host.querySelectorAll('.aqi-chart, .aqi-days-chart').length, 1)
      assert.equal(aqiTitles.filter((title) => sectionFor(host, title).classList.contains('chart-placeholder')).length, 1)
      for (const title of climateTitles) placeholder(host, title)
      await act(async () => air[1].resolve(aqiData()))
      for (const title of aqiTitles) chart(host, title)
      page(host, 'Seattle', true)
      assert.equal(host.querySelectorAll('.chart-placeholder').length, climateTitles.length)
      const climate = climateRequest(climateRequests, 'seattle')
      await act(async () => climate.resolve(dataFor(climate.city)))
      settledClimate(host, 'Seattle')
      noPlaceholders(host)
      assert.ok(host.textContent.includes('Fixture for Seattle'), 'resolved source metadata is rendered')
      for (const title of aqiTitles) chart(host, title)
      assert.equal(aqiRequests.length, 2, 'climate success does not restart AQI loading')
    }),
  )

  await check('climate can finish before AQI without prematurely removing AQI placeholders', () =>
    withApp('seattle', async ({ host, climateRequests, aqiRequests }) => {
      const climate = climateRequest(climateRequests, 'seattle')
      await act(async () => climate.resolve(dataFor(climate.city)))
      settledClimate(host, 'Seattle')
      for (const title of aqiTitles) placeholder(host, title)
      assert.equal(host.querySelectorAll('.chart-placeholder').length, 2)
      await act(async () => aqiRequests.forEach((request) => request.resolve(aqiData())))
      noPlaceholders(host)
      for (const title of aqiTitles) chart(host, title)
    }),
  )

  await check('climate failure clears every placeholder, keeps the city header, and exposes an alert', () =>
    withApp('seattle', async ({ host, climateRequests, aqiRequests }) => {
      pending(host, 'Seattle')
      const climate = climateRequest(climateRequests, 'seattle')
      await act(async () => climate.reject(new Error('Climate fixture unavailable')))
      page(host, 'Seattle', false)
      noPlaceholders(host)
      assert.equal(host.querySelectorAll('[role="alert"]').length, 1)
      assert.match(host.querySelector('[role="alert"]').textContent, /Climate fixture unavailable/)
      assert.equal(host.querySelector('.heatmap-chart, .climate-extremes'), null)
      await act(async () => aqiRequests.forEach((request) => request.resolve(aqiData())))
      page(host, 'Seattle', false)
      noPlaceholders(host)
      assert.match(host.querySelector('[role="alert"]').textContent, /Climate fixture unavailable/)
    }),
  )

  await check('missing hourly data and empty AQI remove their cards instead of leaving placeholders', () =>
    withApp('seattle', async ({ host, climateRequests, aqiRequests }) => {
      placeholder(host, hourlyTitle)
      const climate = climateRequest(climateRequests, 'seattle')
      const data = dataFor(climate.city)
      delete data.hourlyTemp
      await act(async () => {
        climate.resolve(data)
        aqiRequests.forEach((request) => request.resolve({ default: { months: [] } }))
      })
      settledClimate(host, 'Seattle', false)
      noPlaceholders(host)
      assert.equal(host.querySelector('.aqi-chart, .aqi-days-chart'), null)
      for (const title of aqiTitles) {
        assert.equal([...host.querySelectorAll('h2')].some((h) => h.textContent.trim() === title), false)
      }
    }),
  )

  await check('AQI rejection settles its placeholders without failing pending climate', () =>
    withApp('seattle', async ({ host, climateRequests, aqiRequests }) => {
      for (const title of aqiTitles) placeholder(host, title)
      await act(async () => aqiRequests.forEach((request) => request.reject(new Error('AQI unavailable'))))
      pending(host, 'Seattle', false)
      assert.equal(host.querySelector('.aqi-chart, .aqi-days-chart'), null)
      const climate = climateRequest(climateRequests, 'seattle')
      await act(async () => climate.resolve(dataFor(climate.city)))
      settledClimate(host, 'Seattle')
      noPlaceholders(host)
    }),
  )

  await check('cities without an AQI loader never acquire AQI placeholders', () =>
    withApp('tokyo', async ({ host, initial, climateRequests, aqiRequests }) => {
      pending(initial, 'Tokyo', false)
      pending(host, 'Tokyo', false)
      assert.equal(aqiRequests.length, 0)
      const climate = climateRequest(climateRequests, 'tokyo')
      await act(async () => climate.resolve(dataFor(climate.city)))
      settledClimate(host, 'Tokyo')
      noPlaceholders(host)
      assert.equal(host.querySelector('.aqi-chart, .aqi-days-chart'), null)
    }),
  )

  for (const outcome of ['resolve', 'reject']) {
    await check(`navigation aborts old requests and ignores late ${outcome} results`, () =>
      withApp('seattle', async ({ host, climateRequests, aqiRequests, navigate }) => {
        const oldClimate = climateRequest(climateRequests, 'seattle')
        const oldAir = requestsFor(aqiRequests, 'seattle')
        await navigate('#/city/boston')
        pending(host, 'Boston')
        assert.equal(oldClimate.signal.aborted, true, 'leaving the city aborts its climate request')
        const current = climateRequest(climateRequests, 'boston')
        const currentAir = requestsFor(aqiRequests, 'boston')
        if (outcome === 'reject') {
          await act(async () => {
            current.resolve(dataFor(current.city))
            currentAir.forEach((request) => request.resolve(aqiData()))
          })
          settledClimate(host, 'Boston')
          noPlaceholders(host)
        }
        const before = host.innerHTML
        await act(async () => {
          if (outcome === 'resolve') {
            oldClimate.resolve({ ...dataFor(oldClimate.city), source: 'Stale Seattle response' })
            oldAir.forEach((request) => request.resolve(aqiData()))
          } else {
            oldClimate.reject(new Error('Stale Seattle error'))
            oldAir.forEach((request) => request.reject(new Error('Stale Seattle AQI error')))
          }
        })
        assert.equal(host.innerHTML, before, 'stale climate and AQI cannot change the current city')
        assert.equal(current.signal.aborted, false, 'new city request remains active')
        if (outcome === 'resolve') {
          await act(async () => {
            current.resolve(dataFor(current.city))
            currentAir.forEach((request) => request.resolve(aqiData()))
          })
          settledClimate(host, 'Boston')
          noPlaceholders(host)
        }
        assert.ok(host.textContent.includes('Fixture for Boston'))
        assert.equal(host.textContent.includes('Stale Seattle'), false)
      }),
    )
  }

  await check('leaving for the index prevents late results from restoring city cards', () =>
    withApp('seattle', async ({ host, climateRequests, aqiRequests, navigate }) => {
      const climate = climateRequest(climateRequests, 'seattle')
      await navigate('#/')
      assert.ok(host.querySelector('.index'))
      assert.equal(climate.signal.aborted, true)
      const before = host.innerHTML
      await act(async () => {
        climate.resolve(dataFor(climate.city))
        aqiRequests.forEach((request) => request.resolve(aqiData()))
      })
      assert.equal(host.innerHTML, before)
      assert.equal(host.querySelector('.weather'), null)
      noPlaceholders(host)
    }),
  )

  for (const outcome of ['resolve', 'reject']) {
    await check(`unmount aborts pending climate and tolerates late ${outcome} results`, () =>
      withApp('seattle', async ({ host, climateRequests, aqiRequests, unmount }) => {
        const climate = climateRequest(climateRequests, 'seattle')
        await unmount()
        assert.equal(climate.signal.aborted, true)
        await act(async () => {
          if (outcome === 'resolve') {
            climate.resolve(dataFor(climate.city))
            aqiRequests.forEach((request) => request.resolve(aqiData()))
          } else {
            climate.reject(new Error('Unmounted climate error'))
            aqiRequests.forEach((request) => request.reject(new Error('Unmounted AQI error')))
          }
        })
        assert.equal(host.childElementCount, 0, 'unmounted App stays empty')
      }),
    )
  }

  console.log(`\n${checks - failures}/${checks} city loading DOM checks passed.`)
  if (failures) process.exitCode = 1
}

const nodeModules = join(projectRoot, 'node_modules')
assert.ok(statSync(nodeModules).isDirectory(), 'temporary bundle parent must be node_modules')
const dir = mkdtempSync(join(nodeModules, '.city-loading-dom-'))
try {
  const bundle = await rolldown({
    input: entryId,
    cwd: projectRoot,
    tsconfig: join(projectRoot, 'tsconfig.app.json'),
    platform: 'node',
    external: (id) => !id.startsWith('.') && !isAbsolute(id) && !id.startsWith('\0'),
    plugins: [{
      name: 'city-loading-fixtures',
      resolveId(id) {
        if (id === entryId) return entryId
        if (/(?:^|\/)dataService(?:\.ts)?$/.test(id)) return serviceId
        if (id.endsWith('.css')) return cssId
      },
      load(id) {
        if (id === entryId) {
          return `export { default as App } from ${JSON.stringify(src('App.tsx'))};
export { ChartPlaceholder } from ${JSON.stringify(src('ChartPlaceholder.tsx'))};`
        }
        if (id === serviceId) {
          return 'export const loadCity = (city, signal) => globalThis.__cityLoadingChecks.loadCity(city, signal)'
        }
        if (id === cssId) return 'export default ""'
      },
      transform(code, id) {
        if (id !== src('airQuality.ts')) return
        const glob = /import\.meta\.glob(?:<AirQualityModule>)?\(\s*['"]\.\.\/data\/aqi\/\*\.json['"]\s*\)/g
        assert.equal([...code.matchAll(glob)].length, 1, 'replace only the AQI asset glob, retaining the real hook')
        const loaders = aqiSlugs.map((slug) =>
          `${JSON.stringify(`../data/aqi/${slug}.json`)}: () => globalThis.__cityLoadingChecks.loadAirQuality(${JSON.stringify(slug)})`,
        )
        return { code: code.replace(glob, `({${loaders.join(',')}})`), map: null }
      },
    }],
  })
  const out = join(dir, 'app.mjs')
  try {
    await bundle.write({ file: out, format: 'esm' })
  } finally {
    await bundle.close()
  }
  const { App, ChartPlaceholder } = await import(pathToFileURL(out).href)
  await runChecks(App, ChartPlaceholder)
} finally {
  delete globalThis.__cityLoadingChecks
  delete globalThis.IS_REACT_ACT_ENVIRONMENT
  globalThis.__JSDOM__.window.close()
  rmSync(dir, { recursive: true, force: true })
}
