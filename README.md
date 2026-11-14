# Wouncy

Wouncy is a browser memory typing arcade for the Haven game jam, with a matte sage, clay, and paper palette. Memorize a word sequence, type it back, and bounce back after a miss. Daven is your slightly sarcastic cheerleader.

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
- Sound is optional and remembers your preference. After the first click or key press, bundled CC0 chiptune tracks play on the menu, during a run, and on the summary. Short recorded effects mark starting, hiding words, locking a word, clearing, retrying, and finishing. The existing “BOUNCE BACK” chant plays on failure, and gameplay music and the chant distort progressively with bounce count. Pause, instructions, mute, and hidden tabs stop audio; resuming continues the music from its saved position. All audio loads from local assets.
- Daven appears throughout the game using original Haven artwork: greeting, pondering, typing, bouncing back, celebrating, resting, guiding, and cheering at the summary. Animations respect reduced-motion preferences.

## Development

`dist/config.js` holds timing, difficulty, and scoring constants. `dist/engine.js` contains the state machine and word pools. `dist/app.js` handles the browser interface. `dist/style.css` holds the responsive design. No build step is required.

```sh
npm test
npm install
npm run test:browser
```

Browser verification uses Playwright with an installed Google Chrome, or a Playwright Chromium installation. Launch the local server first. No online leaderboard or account system is included.

## Art and design credits

- Daven character: the exact owner-supplied `daven.webp`, plus original `excited-daven.webp` and `hedgehog.webp` from [Hack Club Haven](https://haven.hackclub.com). CSS provides motion and small props; the character images are unchanged. No AI image generation was used.
- Background music: “Stage 1” and “Stage Select” from Juhani Junkala’s [4 Chiptunes (Adventure)](https://opengameart.org/content/4-chiptunes-adventure), CC0.
- Sound effects: Kenney’s [UI Audio](https://kenney.nl/assets/ui-audio) and [Music Jingles](https://kenney.nl/assets/music-jingles), CC0. Selected samples are converted to WAV, with short fades on trimmed jingles.
- Exact asset mappings, modifications, source links, and included license files are listed in [asset credits](dist/assets/CREDITS.txt), also linked in the game footer.
- Landscape art: existing imagery served by [Hack Club Haven](https://haven.hackclub.com), reused as a visual reference for this prototype. No AI image generation was used. Asset reuse permission should be confirmed before distributing a jam submission.
- Jua typeface: Woowahan Brothers, SIL Open Font License. Bundled from Google Fonts; see `dist/assets/OFL.txt`.

The game is independently made and is not an official Hack Club product.

The PRD's Python/Pygame distribution was adapted to a browser game at the user's request. The primary Continuous Climb mode is implemented; optional fixed rounds and hard mode are outside this first version.

## Contribution workflow

Make exactly one descriptive commit per user-requested edit. Include all changes needed for that edit, run the relevant checks, and push the completed commit to GitHub. Keep unrelated changes out of the commit.

The failure chant is bundled as a short PCM recording synthesized with the macOS Eddy voice. It needs no speech service or network request beyond loading the local asset.

Scoring now follows the PRD formula. Personal bests use a new storage key so the prototype’s old word-count bonuses do not inflate the leaderboard.

On scuffed bounces, the retained memorization allowance becomes one shared attempt budget. This resolves the PRD’s “timer drains while words are still shown” rule: looking consumes time available for recall, with no refill or speed multiplier.
