# Working in Wouncy

- Make exactly one descriptive Git commit per user-requested edit after its relevant checks pass. Group all changes needed for that edit in that single commit.
- Keep unrelated changes out of the edit’s commit. Push the completed commit to GitHub.
- Run `npm test` for game rule changes. For interface changes, run the local server and `npm run test:browser` after installing development dependencies.
- Keep the supplied Daven character and the established Haven-inspired visual style unless the user requests a change.
- The deployable game lives in `dist/`; it needs no build step or runtime dependencies.
