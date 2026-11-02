# GP Bet Buddy 🏁

A self-hosted Formula 1 prediction game for friends and family. Before every Grand Prix, each player makes three picks: the race winner, who finishes P10 and who retires first. After the race, the app fetches the official results and scores everyone automatically.

Built with [Lovable](https://lovable.dev) and [Claude Code](https://claude.com/claude-code).

## Features

- **Bets per race:** pick a GP winner, a P10 finisher and the first retirement (or bet that nobody retires).
- **Automatic scoring:** race calendars, drivers and results come from the [Jolpica F1 API](https://github.com/jolpica/jolpica-f1) (the successor to Ergast), so no manual entry of results.
- **Dashboard:** live standings and a season progress chart.
- **Uitslagen (results sheet):** a race-by-race table with a points breakdown per cell. During the season it shows the current standings; once the season is over it crowns the champion with a podium.
- **Multiple seasons:** switch between seasons with the season picker; older seasons stay available.
- **CSV import/export:** back up the whole poule or import earlier seasons. Imports are merged into the existing data instead of replacing it.
- **Live page (currently disabled):** follow a race as it happens, with each player's projected score based on the running order. See [Live page](#live-page) below.

## Scoring

Each race is worth up to **60 points** per player.

| Pick | How it scores | Max |
|---|---|---|
| **GP winner** | Points depend on how far your driver finished from P1, using the F1 points scale: exact = 25, one place off = 18, then 15, 12, 10, 8, 6, 4, 2, 1. Ten or more places off, or a DNF, scores 0. | 25 |
| **P10** | Same scale, measured from P10 in both directions, so P9 and P11 both score 18. | 25 |
| **First retirement** | 10 points if your driver is the first to retire (DNS doesn't count). If you bet that nobody retires, you get 10 points when every starter finishes. | 10 |

The first retirement is the retired driver with the lowest classification, i.e. the one who completed the fewest laps.

## Live page

The Live page shows the running order during a race and how many points each player would score if the race ended right now. It gets live timing from the [OpenF1 API](https://openf1.org), because Jolpica only publishes final results.

**You need a paid OpenF1 API key for this.** During a live session (from about 30 minutes before until about 30 minutes after), OpenF1 only answers authenticated requests, and a key costs about €9.90 per month at the time of writing. Without one, every request fails while the race is on.

The app can't use an API key yet, so the page is switched off: it has no menu item or route and never sends a request. The code is still in the repo (`src/pages/Live.tsx`, `src/hooks/useLiveRace.ts`, `src/lib/liveRace.ts` and `src/lib/openf1.ts`). Turning it back on means adding key support to `src/lib/openf1.ts` and putting the route and menu item back in `src/App.tsx` and `src/components/AppLayout.tsx`.

## Running it with Docker

The app ships as a single container: a small Express server that serves the app and stores all data in one JSON file.

```bash
docker build -t gp-bet-buddy .
```

```bash
docker run -d --name gp-bet-buddy --restart unless-stopped \
  -p 8080:3000 \
  -v /path/to/betbuddy-data:/data \
  gp-bet-buddy
```

Then open `http://<your-host>:8080`.

All players, bets and scores live in `/data/f1-poule.json` inside the container, so mount that folder somewhere you back up. The browser also keeps a copy in `localStorage` as a fallback when the server can't be reached.

### Updating

```bash
git pull
```

```bash
docker build -t gp-bet-buddy . && docker rm -f gp-bet-buddy
```

Then run the same `docker run` command as above. Your data stays in the mounted folder.

## Development

Requires Node.js 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

The dev server runs at `http://localhost:8080`. It doesn't include the Express API, so in dev mode data is stored in your browser's `localStorage` only.

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Production build into `dist/` |
| `npm run lint` | ESLint |
| `npm test` | Vitest |

## Tech stack

React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Recharts and Express.

## Enjoy!

Good luck with your picks, and may your P10 driver finish exactly in P10. 🏆
