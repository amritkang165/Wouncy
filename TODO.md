# Wouncy implementation order

- [x] Gentler, staggered difficulty progression.
- [x] Seeded shared rules, versioned runs, and separate lives/mistake tracking.
- [ ] Prove online room connectivity from the itch.io iframe in two browsers. Local transport verified and Cloudflare deployed; final iframe proof accompanies multiplayer.
- [x] Guest sessions and server-validated leaderboard.
- [ ] Peek, Echo, capped inventory, and rare checkpoint rewards.
- [ ] Earned, once-per-run memory rescue.
- [ ] Daven Duel: room codes, five-level race, reconnect, results, rematch.
- [ ] Occasional fog and decoy blockers, with kinder retries.
- [ ] Anchor, only after the core features are working.

Keep the static game in `dist/`. Backend deployment requires a Cloudflare account.

Deadline scope: finish leaderboard and Daven Duel, publish the stable release to
itch.io, then stop. Powerups, rescue, blockers and Anchor are deferred.
