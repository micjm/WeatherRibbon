# Weather ribbon

Climate charts for cities around the world. Each city page shows 30-year normals
(1991–2020) for temperature, precipitation, snowfall, humidity, cloud cover, wind,
daylight, and recent air quality, rendered as static SVG charts with no runtime API calls.

Live at [weatherribbon.com](https://weatherribbon.com)

## Data sources

- Climate normals: [MERRA-2 via NASA POWER](https://power.larc.nasa.gov/)
- Air quality: [CAMS Global via Open-Meteo](https://open-meteo.com/)

All data is pre-fetched into `data/` and committed, so the site is fully static.

## Development

Requires Node 24 (see `.nvmrc`).

```sh
npm install
npm run dev
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Typecheck and build to `dist/` |
| `npm run lint` | Run oxlint |
| `npm run validate` | Validate the city collection and data files |
| `npm run ribbons` | Regenerate the ribbon thumbnails in `public/ribbons/` |
| `npm run fetch:all` | Re-fetch climate and air-quality data |

CI runs `lint`, `validate`, and `build` on every push.

## Contributing

Contributions are welcome. Bug reports, chart improvements, new cities, and
data corrections are all useful.

1. Open an [issue](https://github.com/micjm/WeatherRibbon/issues) to discuss anything non-trivial.
2. Fork, branch, and make your change.
3. Run `npm run lint`, `npm run validate`, and `npm run build` before opening a PR.

Adding a city: add it to `src/cities.ts` (US) or `src/worldCities.ts`, fetch its data
with `npm run fetch:climate -- --city <slug>` and `npm run fetch:aqi -- --city <slug>`,
then run `npm run ribbons` to generate its thumbnail.

## Sponsorship

Weatherribbon was built using [Agent Duel](https://github.com/bottomless/agent-duel).
Agent Duel supports the cost of hosting WeatherRibbon.com.

## License

[MIT](./LICENSE)
