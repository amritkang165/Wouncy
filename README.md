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
- The run has a total limit of three bounces. The first miss adds 5 seconds of memorization for a retry, and the second adds 3. The third miss ends the run immediately with a game-over summary. Bounces carry across cleared levels; a new run resets them.
- Level score is typing speed (WPM) × accuracy (0–1) × streak multiplier. Clean clears raise the multiplier by 0.5×, up to 3×. Clears after 2+ bounces add 100 points per bounce. After each clear, the results stay open until you press Enter or the next-level button.
- Escape pauses. Leaving the tab or opening instructions automatically pauses an active timer.
- Finish run shows your score, levels, bounces, comeback, and per-level results. Your best score saves in this browser when storage is available.
- Sound starts enabled on each visit and can be toggled with the sound button. After the first click or key press, bundled CC0 electronic tracks play on the menu, during a run, and on the summary. Short recorded effects mark starting, hiding words, locking a word, clearing, retrying, and finishing. The existing “BOUNCE BACK” chant plays on failure, and gameplay music and the chant distort progressively with bounce count. Music continues through pause, instructions, and game over. Mute and hidden tabs stop audio; returning continues the music from its saved position while an active run stays paused. All audio loads from local assets.
- Daven appears throughout the game using original Haven artwork: greeting, pondering, typing, bouncing back, celebrating, resting, guiding, and cheering at the summary. On the menu, Daven gently follows the mouse, stretches as it approaches, and sparkles on click. Animations respect reduced-motion preferences and keep a quiet touch fallback.

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
- Background music: [“Singularity” by vitalezzz](https://opengameart.org/content/singularity-0), CC0. The menu uses its calm version; gameplay blends 60% calm with 40% action for a steady rhythmic pulse over the synth bed. Both retain the full loop and are normalized to comfortable background levels.
- Sound effects: Kenney’s [UI Audio](https://kenney.nl/assets/ui-audio) and [Music Jingles](https://kenney.nl/assets/music-jingles), CC0. Selected samples are converted to WAV, with short fades on trimmed jingles.
- Exact asset mappings, modifications, source links, and included license files are listed in [asset credits](dist/assets/CREDITS.txt).
- Landscape art: existing imagery served by [Hack Club Haven](https://haven.hackclub.com), reused as a visual reference for this prototype. No AI image generation was used. Asset reuse permission should be confirmed before distributing a jam submission.
- Jua typeface: Woowahan Brothers, SIL Open Font License. Bundled from Google Fonts; see `dist/assets/OFL.txt`.

The game is independently made and is not an official Hack Club product.

The PRD's Python/Pygame distribution was adapted to a browser game at the user's request. The primary Continuous Climb mode is implemented; optional fixed rounds are outside this version. The user-requested three-bounce run limit replaces the PRD’s unlimited/scuffed retries.

## Contribution workflow

Make exactly one descriptive commit per user-requested edit. Include all changes needed for that edit, run the relevant checks, and push the completed commit to GitHub. Keep unrelated changes out of the commit.

The failure chant is bundled as a short PCM recording synthesized with the macOS Eddy voice. It needs no speech service or network request beyond loading the local asset.

Scoring now follows the PRD formula. Personal bests use a new storage key so the prototype’s old word-count bonuses do not inflate the leaderboard.

Game over shows the last level reached, preserves your score, and saves a new personal best automatically. The summary provides a restart button; there is no third retry or scuffed-bounce continuation.
