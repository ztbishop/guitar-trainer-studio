# Guitar Trainer Studio

A browser-based guitar practice app using bundled alphaTab for native score rendering and playback, with WebMIDI input for Realtime and Wait practice.

Current baseline: **Beta v0.0.2** (Git tag `v0.0.2`). This is an early development checkpoint; broader browser and physical MIDI acceptance remains pending. The tag is the baseline identifier; `version.json` records `0.0.2`. The older foundation suffix and v0.0.1 wording in the tagged commit message are historical labels, not different builds.

Repository: [ztbishop/guitar-trainer-studio](https://github.com/ztbishop/guitar-trainer-studio).

## Run locally

1. Open this project folder in VS Code.
2. Start your existing Live Server for `index.html`.
3. Open its localhost or 127.0.0.1 address in your normal WebMIDI-capable browser, for example `http://127.0.0.1:5500/index.html` (use Live Server's actual port).
4. Connect the Fishman Connect, allow MIDI access, and select its input in MIDI settings. Choose Poly/single-channel or Hex mode and the appropriate channel settings for the actual device output.
5. Load a Guitar Pro or MusicXML score, select one practice track, and choose Realtime or Wait practice.

No build step or npm dependency installation is required to run the app. Serve the folder rather than opening `index.html` as a local file so browser modules, workers, and assets can load. Hard-refresh the browser after updates if it retains old files.

## Current capabilities

- Native alphaTab score/tab rendering, playback, track display, and selected/backing track routing.
- Repeat-aware Realtime pitch/timing grading and silent Wait stepping as each target is solved.
- Tempo adjustment, occurrence-aware section loops, MIDI latency adjustment, and Wait Collect notes/Together chord settings.
- Pause/Resume retention, explicit **New attempt here**, completion summaries, and mistake history.
- Staff target feedback and actual wrong-pitch noteheads, independent tab highlights and incorrect fret numbers, and an optional six-string fretboard with left-handed display.
- Configured Hex string-channel feedback; optional Poly fret estimates only for an unambiguous remaining written note. Estimates are display feedback, not detected string identity.

Both MIDI modes currently use pitch grading. Exact-string grading, reversed Hex mapping, broader preference persistence, and a persistent score library remain planned. Follow mode, harmony/exercise tools, media synchronization, LEDs, and deeper instrument support remain deferred. Piano Trainer changes require a separate task.

## Tests and local acceptance

With Node 22 or newer, run from the project root:

```sh
node --test tests/*.test.js
```

The 2026-10-11 baseline passes 142 automated tests. Tests cover normalization, native score/playback integration, transport retention, session grading, and visual geometry; they do not establish physical Fishman or browser acceptance.

Use your normal Live Server/browser setup to check Realtime Pause/Resume, Wait mistake retention and note releases, Together strums, per-string channel identity, repeats/loops/seeks, and overlay alignment through zoom/resize. Relevant stage notes provide detailed scenarios; the current specification below overrides their older instructions.

## Project guidance and next tasks

- [AGENTS.md](AGENTS.md): standing instructions for coding agents.
- [TODO](docs/TODO.md): current requirements, status, priorities, and pending acceptance.
- [Development notes](docs/DEV-NOTES.md): dated decisions and validation history.
- [Architecture](docs/ARCHITECTURE.md): module boundaries and data flow.
- `docs/STAGE-*.md`: historical implementation and acceptance details.

Start a separate chat in this local project for each major task, keeping related implementation and testing in that chat. New chats should read the files above and check Git status. Keep one coding chat actively editing the shared folder at a time. Earlier discussions live in the ChatGPT project **Guitar Trainer**; their availability must be checked, and full history is not assumed to carry into a new chat.

Suggested starting prompt:

> Read AGENTS.md and the project documentation, check Git status, and continue with: [task description].

Agents edit this folder directly, update relevant documentation, run appropriate checks, and provide a brief summary, local test instructions, and suggested commit description. The owner handles commits, tags, pushes, and deployment unless explicitly requested otherwise. After reviewing/testing an update, commit a checkpoint and push it to GitHub when ready; a commit saves local history and a push copies it to the remote repository.
