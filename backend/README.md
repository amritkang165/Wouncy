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
the Worker checks browser origins and rate-limits requests. This transport alone
does not yet run matches or accept leaderboard scores.

Deployment requires authorization of the official Wrangler CLI in the intended
Cloudflare account, followed by `npm run deploy:backend`. Keep tokens out of Git
and the game ZIP. The production API URL will be configured when online UI is ready.
