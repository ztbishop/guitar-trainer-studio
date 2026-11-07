# Development setup and checks

## Per-note Guitar Pro tapping checks

Run `node --test tests/right-hand-tap.test.js` and `node tests/run-right-hand-tap-browser.cjs`. The browser runner uses the existing Playwright/Chrome options, a temporary local server and an isolated browser profile. Set `GTS_TAP_REFERENCE` to the existing read-only Lesson Bridge root to include its six saved GPX cases and original-mask evidence. Set `GTS_TAP_BASELINE` to the pre-patch `alphaTab.js` to compare the old native connections and full MIDI event stream and reproduce the old loss on the same synthetic witness. Neither input is needed for the self-contained tests. `GTS_SCREENSHOT_DIR` optionally stores private screen/print evidence under an ignored output directory.

The tests inspect the actual GP archive's raw note masks independently of the importer, then reopen it and check note addresses, flags, musical connections, MIDI and repeated visits. The browser checks the rendered T against its notehead/fret bounds, native printing, and the real renderer worker. No test runs Lesson Bridge's converter or changes its saved inputs. An owner can hard-refresh Live Server and open a saved GPX to check the T beside the intended notes; legacy whole-beat T and left-hand marks still have their familiar forms. Physical MIDI, actual print destinations and audible playback are separate checks.

## Score text spacing checks

Run `node --test tests/*.test.js` and `node tests/run-text-layout-browser.cjs`, using the existing `GTS_PLAYWRIGHT_MODULE` and optional `GTS_BROWSER_CHANNEL` settings. The runner creates an original dense two-track GP fixture in memory and uses an isolated browser/profile and temporary loopback server. `GTS_TEXT_GPX` and `GTS_TEXT_GP` optionally point to existing external saved GPX/converted GP files; `GTS_TEXT_TIMING` optionally points to the GP's matching Soundslice timing JSON. These files are read only and are not copied into the repository. `GTS_SCREENSHOT_DIR` selects artifact output; the default is ignored `dist/text-layout-2026-11-05`. Outputs from external scores are private visual evidence, not redistributable fixtures.

The matrix covers 390/600/1600px, 75/100/150/200% zoom, notation/TAB/both, all source tracks, native clean printing and synth Play/Pause. Assertions compare original source/native MIDI and playback timelines, exact model labels/pitches/frets/ties/clocks across renders, nonlinear tick/time mappings and optional supplied timing. Text bounding boxes classify target-label intersections separately from unrelated header/footer/tuning intersections. Screenshots need visual review. `GTS_TEXT_BASELINE=1` disables installation through a test-only route response, running three screen controls at 600px/100%; it never edits production source and deliberately excludes printing. Keep existing display, sync/practice, Realtime, full-recording and import-timeline browser regressions applicable.

Owner acceptance: hard-refresh the normal Live Server/browser, open both affected scores, and check usual zoom/window sizes plus staff/TAB/combined and multiple visible tracks. At high zoom in a narrow window, use the score panel's horizontal scroll. Check Print / Save PDF with the actual destination, audible score/recording alignment, seeking/loops and Fishman feedback. Record this separately from automated synthetic input/audio. Header/footer/tuning collisions, composite chord diagrams and a general engraving rewrite remain outside this fix; large-score responsiveness should be assessed during ordinary use. This update is local only, without commit or publication.

## Full recording boundary acceptance

Run node --test tests/*.test.js, node tests/run-full-recording-browser.cjs and node tests/run-sync-practice-browser.cjs with the existing GTS_PLAYWRIGHT_MODULE/GTS_BROWSER_CHANNEL settings. The full-recording runner owns an isolated Chrome profile/server and generates an in-memory WAV; GTS_SCREENSHOT_DIR optionally saves waveform/outro screenshots outside the repository. It checks introduction/outro classification, grading suppression, natural score completion without media stop, Pause/Resume position/result retention, music reentry, exact file-end completion and explicit loops. No private lesson files are fixtures.

Owner acceptance: load the actual GP and matching synced video; verify Start/End anchors describe the music rather than the full video. In Realtime with Loop off, watch from before Start through End and the remaining outro. Check shaded ranges and Before/After synced music notices. Play MIDI outside the music: no new grading should occur. Pause/resume in both outside sections; the video position and completed result must remain. Seek back into music and verify normal seek-reset/grading. Enable a practice loop and verify it loops rather than entering the outro. Confirm Wait remains silent and advances by its existing rules. Repeat with real video/YouTube as applicable; audible/provider/hardware checks are distinct from automated audio fixtures. Missing or inaccurate sync boundaries require alignment correction; shaded regions do not detect instructional speech automatically.


## Realtime recording seek acceptance

Run node tests/run-sync-practice-browser.cjs with the existing GTS_PLAYWRIGHT_MODULE/GTS_BROWSER_CHANNEL options. The shared seek path is exercised through recording-slider input using a generated in-memory WAV: active Realtime seeks forward/backward must keep playing and advancing; paused seeks must remain paused. Existing sync-editor and silent Wait checks remain included. The Realtime regression fails against the old host condition.

Owner check: in the usual Live Server/browser, select a synced recording/video and start Realtime. Seek forward and backward on its timeline; playback should continue from each chosen point. Pause and seek again; it should stay paused. Verify actual video/YouTube behavior, audible sync, existing loop/seek result resets and Fishman feedback separately. Wait mode and editing sync points retain their previous behavior.


## Custom track selection acceptance

Run node --test tests/*.test.js and node tests/run-score-display-browser.cjs (GTS_PLAYWRIGHT_MODULE may point to the existing local Playwright installation; GTS_BROWSER_CHANNEL defaults to installed Chrome). track-visibility.test.js covers labels/source-name retention, source-order selection independent of practice/audio, byte-fingerprint identity, rename, invalid membership and unavailable storage. The browser runner uses a generated private-free score, isolated profile/server and synthetic MIDI to verify native measure alignment and partial Wait result retention under Custom, plus existing print/display regression checks. It never uses the owner's browser profile or Fishman.

For manual acceptance in the normal Live Server/browser/Fishman setup:

1. Load a score with separate guitar and Chords tracks. Select the intended guitar under Practice, then Display → Visible tracks → Custom; check guitar and Chords. Verify aligned bars and readable diagrams under Score Default, Above Chord and Top of Score. The diagrams stay on their own track.
2. In Wait, collect part of a chord, toggle visible tracks, then complete it. Check that partial credit/results survive, and that hiding the practice staff does not change grading. Repeat display changes during Realtime and verify feedback, scrolling, loop and Pause/Resume.
3. Set audio mutes/volumes and listen while changing visibility. Only the display should change. Change the active practice track deliberately and confirm Custom membership stays fixed while existing practice-reset behavior remains.
4. Try keyboard Space on checkboxes and the final selected checkbox, then a narrow window. Reopen/reload the same file, switch to another song and back, and try a renamed byte-identical copy. Mode/membership should return per song. Practice-track selection is independent and is not newly persisted by this feature.

Browser-origin storage and library backup exclusions remain unchanged. A score with different bytes gets a new identity. Cross-track chord overlays remain deferred. Record physical MIDI/audible/user acceptance separately from automated native/browser results.


The root README is the player guide, shared by GitHub and README.html. Implementation history belongs in DEV-NOTES.md and TODO.md; module contracts belong in ARCHITECTURE.md. Read AGENTS.md before editing. Current beta is 0.0.4, explicitly authorized on 2026-10-24 after documentation/licensing work. The owner authorizes agents to commit and push completed, verified updates with descriptive messages; AGENTS.md defines the separate version/release workflow. The previous release hold is lifted for this beta. Routine pushes do not create new releases. [PUBLISHING.md](PUBLISHING.md) covers license verification and owner-controlled public visibility/Pages activation.

## Licensing maintenance

Original application content is AGPL-3.0-or-later with the exceptions and source references in [LICENSING.md](LICENSING.md). alphatab-host.js retains MPL-2.0 because it includes native alphaTab compatibility adaptations. Keep root LICENSE, vendor licenses and docs/licenses in downloadable/hosted copies. Help links through README.html to the same README license section; local-web-server.cjs explicitly serves LICENSE and plain-text notices. No new runtime module or frontend build is involved. The updater now requires and hashes seven notice/provenance files as well as ten runtime assets; its fixture tests reject missing licenses before any replacement. Review LICENSING.md/source links and integrated-library notices on every dependency upgrade. The later explicit Beta v0.0.4 request lifts the release hold; repository visibility remains owner-controlled.

## Running the app

Keep the owner's usual VS Code Live Server/browser/Fishman workflow. There is no frontend build, npm install or required helper. For ZIP users, Launchers contains a Windows `.bat` and Mac `.command`, both calling `node local-web-server.cjs --open` from the project root. Node 22+ is required only for these launchers and development checks, not for hosted browser use.

The optional dependency-free CommonJS server binds to `127.0.0.1:8081`. It opens/copies `http://localhost:<port>/` while still printing the bound IP and port; this avoids the reproduced numeric-IP YouTube embedding failure. It starts the default browser only after listening succeeds. Keep its terminal open; Ctrl+C stops it. It serves allowlisted app assets/docs and checks decoded paths and real paths for containment; it never serves `.git`, launchers, tests, tools or arbitrary root files. It supports GET/HEAD and correct JS/module/font MIME types. There is no LAN, LED, conversion or MIDI helper. `GTS_PORT` overrides the port; changing ports creates a different browser storage origin. Port-in-use failures do not open an unrelated existing server. On Mac the `.command` may need `chmod +x`; `.gitattributes` preserves LF endings. Actual Finder/Terminal/security behavior must be accepted on a Mac.

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
node tests/run-guide-demos-browser.cjs http://localhost:8081
```

Automated native/browser checks do not establish audible balance, physical Fishman tracking, Mac launcher permissions, Windows Explorer launch/security prompts or every score/provider combination. Ask the owner to try the extracted-folder launcher, all demos, the help link and a familiar MIDI session; separately test the Mac launcher on actual macOS. Do not claim those checks passed from this Windows environment.

## Realtime written-span checks

Run node --test tests/realtime-windows.test.js for timing boundaries, tempo/speed, rests/repeats/ties and recording/loop projections. Run node tests/run-realtime-windows-browser.cjs with GTS_PLAYWRIGHT_MODULE set to an installed Playwright module when needed. The browser runner starts/closes an ephemeral local server and isolated headless Chrome profile, imports an original generated score and supplies synthetic Poly/Hex MIDI. It checks delayed notation misses and late spread-chord green feedback without accessing the owner's normal browser or devices. Real Fishman/listening acceptance remains separate.


## Lesson import timeline rebuild regression

Run node tests/run-import-timeline-browser.cjs with GTS_PLAYWRIGHT_MODULE. GTS_TRIMMED_SCORE optionally points to an external private converted GP; otherwise the bundled first-notes demo is used. The isolated browser serves a synthetic WAV and deliberately replaces timeline identity during its response to test equivalent rebuilds and changed structure/tempo/score cancellation. It checks exact anchors, native nonzero playback start and no autoplay/save. Run the retained lesson-import, sync-practice and full-recording browser runners plus all Node tests for receiver changes. No provider login, owner browser or hardware is used.
