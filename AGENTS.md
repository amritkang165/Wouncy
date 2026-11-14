# Working in Wouncy

- Implement each feature or fix as a separate, descriptive Git commit once its relevant checks pass.
- Keep unrelated changes out of feature commits.
- Run `npm test` for game rule changes. For interface changes, run the local server and `npm run test:browser` after installing development dependencies.
- Keep the supplied Daven character and the established Haven-inspired visual style unless the user requests a change.
- The deployable game lives in `dist/`; it needs no build step or runtime dependencies.
