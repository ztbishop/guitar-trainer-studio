# Guitar Trainer Studio

A browser-based guitar practice app using bundled alphaTab for native score rendering and playback, with WebMIDI input for Realtime and Wait practice.

Current baseline: **Beta v0.0.3**; `version.json` records `0.0.3`. This checkpoint includes the Tempo menu, metronome timing/Wait restart fixes, and saved metronome volume. The owner will create the `v0.0.3` Git tag after committing the version update. Earlier tags remain historical checkpoints; broader browser and physical MIDI acceptance remains pending.

Repository: [ztbishop/guitar-trainer-studio](https://github.com/ztbishop/guitar-trainer-studio).

## Run locally

1. Open this project folder in VS Code.
2. Start your existing Live Server for `index.html`.
3. Open its localhost or 127.0.0.1 address in your normal WebMIDI-capable browser, for example `http://127.0.0.1:5500/index.html` (use Live Server's actual port).
4. Connect the Fishman Connect, allow MIDI access, and select its input in MIDI settings. Choose Poly/single-channel or Hex mode and the appropriate channel settings for the actual device output.
5. Load a Guitar Pro or MusicXML score, select one practice track, and choose Realtime or Wait practice.

No build step or npm dependency installation is required to run the app. Serve the folder rather than opening `index.html` as a local file so browser modules, workers, and assets can load. Hard-refresh the browser after updates if it retains old files.

## Current capabilities

To update bundled alphaTab assets, open `tools/alphatab` and run `update-alphatab.cmd`. See [Updater instructions](tools/alphatab/README.md) for version selection, download-only verification, backups and post-update checks. This is optional maintenance tooling; the app still runs from local assets without a build step. The owner reviews, commits and pushes updates.

- Native alphaTab score/tab rendering, playback, track display, and selected/backing track routing.
- Repeat-aware Realtime pitch/timing grading and silent Wait stepping as each target is solved. A repeated MIDI Note-On for the same channel/pitch is ignored while that note is held; a Note-Off is required before it can count as another attack.
- Linked BPM/speed controls, native metronome volume and visual pulse, occurrence-aware section loops, MIDI latency adjustment, and Wait Collect notes/Together chord settings. Wait's metronome runs independently at the set BPM.
- Piano-style Loop menu uses the shared touch-friendly sliders and horizontal arrows (one-measure steps). Enable Loop and Loop Count-in default off on page/score load and are not saved. Play/resume gets a one-bar count-in; Loop Count-in adds one at each repeat. Native score dragging selects whole measures and enables looping; sliders remain precise for repeat occurrences. Out-of-range written measures are shaded, and cursor seeks remain inside an enabled loop.
- Pause/Resume retention, compact **Clear practice results** at the current position, completion summaries, and mistake history.
- Piano-style toolbar sizing and responsive collapse/stacking. Practice owns visual feedback; Display owns track visibility/fretboard orientation; Audio provides separate saved synth and synced-media master volumes plus native track volume/mute alongside practice/backing switches. Audio also shifts alphaTab synthesized score playback by -12 to +12 semitones for the loaded score; notation, tab and MIDI grading targets are unchanged. Full score transposition remains deferred. Settings has collapsed MIDI/practice diagnostics. Browser library supports original score files, folders, search, bulk import, rename/move/delete and JSON backup/merge; see [Library and audio guide](docs/SCORE-LIBRARY.md).
- Staff correctness feedback and actual wrong-pitch noteheads, compact red tab error highlights, green correct-fret highlights on the active target, incorrect fret numbers, and an optional left-handed-capable fretboard whose string count/tuning follow the selected tablature. Blue expected-note outlines are omitted; a narrow, faded light-blue cursor marks the active beat. Historical correct tab frets stay unmarked. See [Fretboard guide](docs/FRETBOARD.md).
- Opt-in MIDI/feedback recording in Settings diagnostics, with screenshot markers, a copyable text report and .txt download. Recording changes no grading and is cleared on refresh.
- Configured Hex string-channel feedback; optional Poly fret estimates only for an unambiguous remaining written note. Estimates are display feedback, not detected string identity.

Both MIDI modes currently use pitch grading. Hex supports ascending or descending channels from the lowest-string base, with valid base choices and a visible channel sequence. Display provides native zoom (50–200%), auto-scroll, fullscreen on Play, and chord diagram placement (Score Default, Above Chord, Top of Score or Off). These viewing preferences persist across sessions and score loads; fullscreen still activates only on Play. Practice exposes Realtime/Wait and Wait chord choices as radio buttons. Practice mode, Wait chord choice/window and all four Score feedback switches persist in localStorage. First use defaults to Realtime, One at a time/200 ms and all feedback checked; later sessions and score loads retain your choices. Track mix lasts for the loaded score; master/metronome volume and the score library persist. Library storage belongs to this browser/address/port; keep downloaded backups. Exact-string grading and broader preference persistence remain planned. Follow mode, harmony/exercise tools, LEDs and deeper instrument support remain deferred. Piano Trainer changes require a separate task.

## Tests and local acceptance

More → Media Sync supports local audio/video, direct media URLs, YouTube and GP embedded audio, with a compact editor and managed sync profiles. Main Play/Pause uses the selected Synth audio or Recording source; Tempo percentage controls both. Realtime grades MIDI against the recording's aligned timing. Wait keeps audio paused/muted while advancing the video with solved targets. Choose a measure/beat and Add / update point to capture the recording playhead; grouped seconds/Use typed time is the alternative. Magnifier zoom, nudges and automatic local waveforms support fine tuning; clicking the waveform seeks both audio and score. Save stays directly in the editor. Audio-only sources do not need a separate player panel; visible video retains its panel. See [Media guide](docs/MEDIA-SYNC.md). Bundled alphaTab is 1.8.4, with a narrow runtime compatibility guard for its recursive worker getter and intact vendor assets. Latest checks: 221 Node tests, 65 desktop / 64 phone app checks, and 17 native/storage browser checks. Actual Fishman/provider acceptance remains local.

With Node 22 or newer, run from the project root:

```sh
node --test tests/*.test.js
```

The current 2026-10-13 suite passes 201 automated tests (142 at the v0.0.2 checkpoint), including native multi-string GP imports, mirrored neck geometry and held-note feedback. The fretboard browser harness adds 56 scenarios at desktop/phone widths; native track switching covers 1/4/5/6/7/8/12 strings. Earlier coverage includes native looping/selection, count-in, MIDI, grading, Tempo, preferences, mixer and library behavior. Library/mixer checks include 12 real IndexedDB cases and Live Server MusicXML save/reopen, folders, rename/move/search, backup/merge, Audio and Display. Full listening, physical tablet and Fishman acceptance remain local; automated checks do not establish them.

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
