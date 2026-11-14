# Wouncy online service

The game stays static in `dist/`. This separate Cloudflare Worker provides secure
WebSocket rooms using SQLite-backed Durable Objects. Server clocks use absolute
timestamps; future persisted games must construct `Game` with `now: Date.now`.

```sh
npm install
npm run dev:backend
```

`GET /health` reports the shared rules version. `POST /rooms` returns a six-character
room code. Two clients can connect to `/rooms/CODE/ws`, receive presence updates,
and submit `{ "type": "ready", "ready": true }`. Connections and rooms are bounded;
the Worker checks browser origins and rate-limits requests.

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
