# Development setup and checks

The root README is the player guide, shared by GitHub and README.html. Implementation history belongs in DEV-NOTES.md and TODO.md; module contracts belong in ARCHITECTURE.md. Read AGENTS.md before editing. Beta version remains 0.0.3. The owner authorizes agents to commit and push completed, verified updates with descriptive messages; AGENTS.md defines the separate version/release workflow. The next version/tag/release is on hold pending the owner's documentation update; ordinary commits/pushes continue.

## Licensing maintenance

Original application content is AGPL-3.0-or-later with the exceptions and source references in [LICENSING.md](LICENSING.md). alphatab-host.js retains MPL-2.0 because it includes native alphaTab compatibility adaptations. Keep root LICENSE, vendor licenses and docs/licenses in downloadable/hosted copies. Help links through README.html to the same README license section; local-web-server.cjs explicitly serves LICENSE and plain-text notices. No new runtime module or frontend build is involved. The updater now requires and hashes seven notice/provenance files as well as ten runtime assets; its fixture tests reject missing licenses before any replacement. Review LICENSING.md/source links and integrated-library notices on every dependency upgrade. Licensing approval does not lift the current release/visibility hold.

## Running the app

Keep the owner's usual VS Code Live Server/browser/Fishman workflow. There is no frontend build, npm install or required helper. For ZIP users, Launchers contains a Windows `.bat` and Mac `.command`, both calling `node local-web-server.cjs --open` from the project root. Node 22+ is required only for these launchers and development checks, not for hosted browser use.

The optional dependency-free CommonJS server binds to `127.0.0.1:8081`. It starts the default browser only after listening succeeds. Keep its terminal open; Ctrl+C stops it. It serves allowlisted app assets/docs and checks decoded paths and real paths for containment; it never serves `.git`, launchers, tests, tools or arbitrary root files. It supports GET/HEAD and correct JS/module/font MIME types. There is no LAN, LED, conversion or MIDI helper. `GTS_PORT` overrides the port; changing ports creates a different browser storage origin. Port-in-use failures do not open an unrelated existing server. On Mac the `.command` may need `chmod +x`; `.gitattributes` preserves LF endings. Actual Finder/Terminal/security behavior must be accepted on a Mac.

Examples from the project root:

```sh
node local-web-server.cjs
node local-web-server.cjs --open
node --test tests/*.test.js
node --check js/demo-scores.js
node --check js/readme-guide.js
node --check js/app-bootstrap.js
node --check local-web-server.cjs
node --check tools/generate-demo-scores.cjs
git diff --check
```

## Guide

`node tests/run-loop-media-repeats-browser.cjs` checks long-score paused loop scrolling (Synth/Recording × playback Auto-scroll on/off) and actual media-clock traversal through repeats, alternate endings, D.C. al Coda, D.S. al Coda and D.C. al Fine. It owns a temporary loopback server, isolated Chrome profile and in-memory WAV; synthetic native fixtures/expected orders live in tests/media-repeat-fixtures.js and are shared with Node mapping tests. It does not use the owner's browser, library, recordings or MIDI hardware. Use the same GTS_PLAYWRIGHT_MODULE/GTS_BROWSER_CHANNEL options below.

For sync preview/practice transitions, run `node tests/run-sync-practice-browser.cjs` with the same GTS_PLAYWRIGHT_MODULE/GTS_BROWSER_CHANNEL options below. It starts/closes a temporary local server and isolated Chrome profile, loads a bundled demo and in-memory WAV, and injects synthetic MIDI. It checks restored native loop/cursor/shading, staff/tab/fretboard feedback under both sources, Recording Wait gating, placement persistence and phone width. Optional GTS_SCREENSHOT_DIR captures desktop/phone screenshots outside the repository. It no longer waits for the worklet before Pause; the host cancels pending native audio startup. Physical/video acceptance remains separate.

`node tests/run-fast-pause-browser.cjs` deliberately holds AudioWorklet module loading in an isolated Chrome profile and temporary loopback server. It checks immediate count-in cancellation, delayed native startup followed by Pause/Reset/score replacement, no late audio-node resurrection and normal subsequent playback/Pause. `tests/audio-startup.test.js` uses bundled native output classes with controlled audio nodes/promises to cover rapid restart ordering, sample delivery, destruction, rejected loads and upgrade guards. These are audio lifecycle checks, not physical MIDI or listening evidence.

For tolerance-default/guidance changes, `node tests/run-tolerance-defaults-browser.cjs` starts/closes its own temporary local server and verifies fresh and saved preference profiles plus desktop/phone Practice/Help layout. It uses the same GTS_PLAYWRIGHT_MODULE/GTS_BROWSER_CHANNEL options as the other browser runners, without physical MIDI or the owner's browser storage.

The launcher prints its local URL and, in an interactive terminal, accepts C followed by Enter to copy it using Windows clip.exe or macOS pbcopy. Success is confirmed; missing/failed clipboard tools leave the displayed address available for manual copying. It never changes browser/MIDI settings. Clipboard tests inject a fake process so automated runs do not overwrite the owner's clipboard. Real terminal/clipboard acceptance remains a Windows/Mac local check.

README.html fetches README.md and uses locally pinned Marked 15.0.12; js/readme-guide.js owns rendering, GitHub-style anchors for this guide's plain headings, initial hash navigation and a readable fetch-failure fallback. guide.css is standalone and never affects app layout. The input is trusted repository documentation, never an uploaded/user-selected Markdown file. No CDN/network is needed at runtime. Keep the vendor license/provenance in assets/vendor/marked when updating. Verify README links/anchors and the page at desktop/phone widths when changing content. A new published app URL should be added only when supplied/verified; the current guide describes hosted use without inventing an address.

## Demos

assets/demos contains original CC0 exercises and editable AlphaTex sources. `node tools/generate-demo-scores.cjs` rebuilds native Guitar Pro files through bundled alphaTab; this is optional authoring, not a runtime build step. Source/native representations must stay in sync. js/demo-scores.js owns the fixed catalog, local fetch, busy/error/status UI and injected load intent. Bootstrap supplies loadScoreFile; only alphatab-host.js integrates with runtime alphaTab. Demos never seed IndexedDB or localStorage. Saving uses the ordinary existing Save to Library control. They have no special grading rules.

tests/guide-launchers.test.js covers real HTTP serving/boundaries and native score import, notation/tab render, MIDI generation and practice targets. tests/run-guide-demos-browser.cjs runs with an isolated Playwright profile against a supplied server URL, or starts/closes a temporary loopback server when no URL is supplied; it does not change the owner's browser/profile/library. It checks the actual demo buttons, optional save/reopen, guide navigation, offline local assets and narrow layout. Set GTS_PLAYWRIGHT_MODULE to an installed Playwright module path if needed:

```sh
node tests/run-guide-demos-browser.cjs http://127.0.0.1:8081
```

Automated native/browser checks do not establish audible balance, physical Fishman tracking, Mac launcher permissions, Windows Explorer launch/security prompts or every score/provider combination. Ask the owner to try the extracted-folder launcher, all demos, the help link and a familiar MIDI session; separately test the Mac launcher on actual macOS. Do not claim those checks passed from this Windows environment.
