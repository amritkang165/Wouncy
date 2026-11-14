# Wouncy — Bounce Back

A browser memory typing arcade for the Haven game jam. Memorize a word sequence, type it back, and bounce back after a miss. Daven is your slightly sarcastic cheerleader.

## Run locally

Requires Node.js 20 or later. The game has no runtime dependencies.

```sh
git clone https://github.com/amritkang165/Wouncy.git
cd Wouncy
npm run dev
```

Open http://localhost:4173. The deployable game is entirely inside `dist/` and works on any static web host.

## Play

- Enter starts a run and moves from memorizing to recall.
- Type a word and press Space or Enter to lock it in.
- The first bounce adds 5 seconds of memorization; the second adds 3. From the third bounce onward, no time is added: one shared clock covers memorization and typing. Looking uses up typing time, and hiding the words does not reset the timer. There is no speed multiplier.
- Level score is typing speed (WPM) × accuracy (0–1) × streak multiplier. Clean clears raise the multiplier by 0.5×, up to 3×. Clears after 2+ bounces add 100 points per bounce. Clears automatically advance after an 850 ms celebration.
- Escape pauses. Leaving the tab or opening instructions automatically pauses an active timer.
- Finish run shows your score, levels, bounces, comeback, and per-level results. Your best score saves in this browser when storage is available.
- Sound is optional. The bundled “BOUNCE BACK” chant plays on failure. A chiptune loop, warped stings, and the chant distort progressively with bounce count. Clean clears get a quiet sting. Pause, mute, and hidden tabs stop audio.

## Development

`dist/config.js` holds timing, difficulty, and scoring constants. `dist/engine.js` contains the state machine and word pools. `dist/app.js` handles the browser interface. `dist/style.css` holds the responsive design. No build step is required.

```sh
npm test
npm install
npm run test:browser
```

Browser verification uses Playwright with an installed Google Chrome, or a Playwright Chromium installation. Launch the local server first. No online leaderboard or account system is included.

## Art and design credits

- Daven character: exact `daven.webp` supplied by the project owner, originally from [Hack Club Haven](https://haven.hackclub.com).
- Landscape art: existing imagery served by [Hack Club Haven](https://haven.hackclub.com), reused as a visual reference for this prototype. No AI image generation was used. Asset reuse permission should be confirmed before distributing a jam submission.
- Jua typeface: Woowahan Brothers, SIL Open Font License. Bundled from Google Fonts; see `dist/assets/OFL.txt`.

The game is independently made and is not an official Hack Club product.

The PRD's Python/Pygame distribution was adapted to a browser game at the user's request. The primary Continuous Climb mode is implemented; optional fixed rounds and hard mode are outside this first version.

## Contribution workflow

Commit each completed feature or fix separately with a descriptive message. Run the relevant checks before committing. Keep unrelated changes out of feature commits.

The failure chant is bundled as a short PCM recording synthesized with the macOS Eddy voice. It needs no speech service or network request beyond loading the local asset.

Scoring now follows the PRD formula. Personal bests use a new storage key so the prototype’s old word-count bonuses do not inflate the leaderboard.

On scuffed bounces, the retained memorization allowance becomes one shared attempt budget. This resolves the PRD’s “timer drains while words are still shown” rule: looking consumes time available for recall, with no refill or speed multiplier.
