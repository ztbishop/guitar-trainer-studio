# Stage 3: realtime attack grading

Built from Stage 2. No deployment or Git push was performed. Existing score rendering, alphaTab cursor, MIDI routing, menus and CSS remain in place. The Practice panel gains a latency input and displays actual results; the toolbar now displays a calculated percentage.

## How to try it

1. Copy these files into your existing GuitarTrainerStudio folder. Keep your `.git` directory.
2. Run Live Server at http://127.0.0.1:5500/index.html (or its actual port), refresh and allow MIDI access. Use localhost/127.0.0.1 rather than a plain-HTTP network address.
3. Load a short, familiar score. Select its practice track and your MIDI input in Options. The MIDI debug view should show fresh note-on/note-off events.
4. Open Practice and press Play. Follow the score. Correct, Wrong, Missed and Pending counts update in the existing panel. The toolbar percentage is correct / (correct + missed + wrong). Pending notes do not reduce the percentage until they become missed.
5. Try a correct note, a deliberately wrong note and an omitted note. Try repeating the same pitch: holding it from the previous occurrence must not count again. For chords, play fresh attacks for each pitch.
6. Pause: new MIDI input is not graded while paused. Resume to keep the current results. Stop/reset, seeking, changing practice track/input settings/device, loading a new score, and backward loop jumps start a fresh result set. Earlier passages skipped by seeking are excluded, not marked missed.
7. If correctly timed playing consistently appears late, increase MIDI input latency under Practice. This subtracts the configured tracking delay from incoming-note timing and delays miss finalization accordingly. Start with 0; use observed hardware behavior to adjust it. The setting is not saved across page reloads.
8. Complete the score and check final counts. A new Play after completion starts fresh. Check that loading/playback and repeats still work.

## Grading policy

- Only new note-on attacks are graded. Held notes, note-offs, pitch bends and controllers cannot satisfy a new target. Ringing strings do not produce wrong notes merely because they remain held.
- Initial timing defaults: 120 ms early, 160 ms late, 60 ms maximum chord spread between the first and subsequent accepted attacks. Each chord attack must also be inside its own onset window. Timing constants remain in `practice-timing.js`; slow arpeggiated chords are not interpreted as simultaneous strums.
- A wrong attack adds a wrong-note result; it does not erase a correct attack. Missing chord notes become missed after the late deadline. Excess repeated attacks are wrong unless another nearby unmatched target accepts them.
- The nearest eligible unmatched pitch target accepts each attack once. Very fast same-pitch passages with overlapping tolerance windows use this rule; intent cannot always be inferred from pitch and timing alone.
- Single-channel pitch-only input counts one target per unique pitch in a simultaneous chord. Unisons cannot be distinguished reliably in that mode. Hex mode retains distinct pitch/string slots and requires different channels for simultaneous same-pitch targets. It still evaluates pitch rather than enforcing exact string/fret position.
- Ties are represented by Stage 2's continuation model and do not require another attack. Duration/release correctness and articulation grading are not implemented.

## Architecture

`realtime-session.js` is a pure evaluator accepting normalized score events and note attacks. It retains per-target hits/misses, individual wrong attacks and aggregate statistics. It has no alphaTab, device or DOM dependency.

`practice-engine.js` bridges playback and MIDI timestamps. A playback-position callback anchors score time to `performance.now()`; incoming MIDI uses its normalized event timestamp. Between callbacks, score time advances by elapsed time times playback speed. A 50 ms update while playing finalizes misses even when the player is silent. Pause freezes grading. Forward seek flags, backward jumps and speed changes invalidate stale clock/result state.

`alphatab-host.js` forwards position timestamps, speed, seek flags and player completion. `app-bootstrap.js` displays results, wires latency and reset controls, and avoids clearing results when only display or backing-track toggles change.

The clock is an estimate based on player callbacks; it is not sample-accurate audio synchronization. Main-thread stalls, synthesizer output buffering and MIDI tracking differences must still be assessed with physical hardware. Existing Stage 2 limits for grace notes, simile bars, specialized backing audio/count-in and advanced articulations remain.

## Verification

Run with Node 22 or newer:

```sh
node --test tests/stage1.test.js tests/stage2.test.js tests/stage3.test.js
```

31 tests pass, plus syntax checks for every application JavaScript module. Tests cover earlier foundations/actual alphaTab playback mapping plus timing edges, new attacks for repeated pitches, chord accumulation/spread, wrong-note penalties, overlapping windows, single/hex unisons, latency, playback speed, completion, seeks, paused input and pause/resume. Browser audio and physical MIDI are not available in this environment; the local checks above remain required.

## Commit after local validation

```powershell
git add index.html js/alphatab-host.js js/app-bootstrap.js js/app-state.js js/practice-engine.js js/realtime-session.js tests/stage1.test.js tests/stage3.test.js docs/STAGE-3.md
git commit -m "Stage 3: add realtime note attack grading and session results"
git push origin main
```

Next: Stage 4 Wait Mode, beginning with a controlled alphaTab pause/seek/resume experiment. Tempo/loop controls and score-note coloring remain later work.
