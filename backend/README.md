# Wouncy online service

The game stays static in `dist/`. This separate Cloudflare Worker provides secure
WebSocket rooms using SQLite-backed Durable Objects. Server clocks use absolute
timestamps; future persisted games must construct `Game` with `now: Date.now`.

```sh
npm install
npm run dev:backend
```

`GET /health` reports the shared rules version. Authenticated `POST /rooms` returns
a six-character private room code. `/rooms/CODE/join` issues a one-use, short-lived
WebSocket ticket. Two guests ready up, then race to five clears using the same
server-seeded words. Sequenced actions are duplicate-safe. A disconnect has a
10-second reconnect grace period; matches support results and mutual rematch.
Duel clocks keep running through help or hidden tabs. Rooms expire after 30 minutes.
The Worker checks browser origins and rate-limits HTTP and WebSocket traffic.

Guest sessions use hashed bearer tokens (no third-party cookies). `/runs` creates
server-owned solo or daily runs; sequenced actions are checked and scored by the
shared rules. Only finalized server runs write to D1. `/leaderboard` shows each
guest's best run for the current rules, or today's UTC daily challenge.
This prevents invented score submissions, but browser memory games cannot prevent
players inspecting words or automating input. Guest names are public and unverified.

Deployment requires authorization of the official Wrangler CLI in the intended
Cloudflare account, followed by `npm run deploy:backend`. Keep tokens out of Git
and the game ZIP. Before deployment, apply the checked-in schema with
`npx wrangler d1 migrations apply wouncy-scores --remote --config backend/wrangler.jsonc`.
The static client's API URL is configured in `dist/online.js`.
