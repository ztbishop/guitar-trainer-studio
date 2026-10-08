# Guitar Trainer Studio Architecture

## Overview

Implementation status and priorities are tracked in `TODO.md`; development decisions and user validation are recorded in `DEV-NOTES.md`. The v1 scope below is a design goal, not a list of completed features.

Guitar Trainer Studio should be a sibling app to Piano Trainer Studio, not an instrument mode inside it.
The app should preserve native alphaTab features wherever possible and layer custom trainer logic on top.

### Core split

**alphaTab owns**
- score loading
- notation/tab rendering
- zoom and layout
- track rendering and track visibility
- playback transport and playback timing
- per-track mute / solo / volume behavior
- repeat and ending playback behavior

**Custom app code owns**
- MIDI input normalization
- single-channel vs hex MIDI interpretation
- practice track selection
- correctness and scoring
- realtime / wait-for-me mode behavior
- fretboard rendering and overlays
- saved preferences and app-specific UI

## Module responsibilities

### `js/app-state.js`
- Source of truth for app session state, user preferences, selected tracks, and trainer mode.
- Holds normalized data shared across modules.
- Must not contain renderer logic or correctness rules.

### `js/alphatab-host.js`
- Owns all alphaTab integration.
- Initializes alphaTab, loads files, reads track data, updates rendering settings, and forwards playback events.
- Must be the only module that talks directly to alphaTab APIs.

### `js/midi-router.js`
- Owns MIDI device setup and note event normalization.
- Emits normalized note-on/note-off events for the practice engine.
- Must not decide whether an event is correct.

### `js/practice-engine.js`
- Owns trainer correctness logic, scoring, and active-target management.
- Reads expected note events from the selected practice track only.
- Consumes normalized MIDI input and playback position updates.

### `js/score-playback.js`
- Normalizes alphaTab's generated playback occurrences, including repeats and endings.
- Exposes required attack groups and tempo conversion helpers; tied continuations do not become new attacks.

### `js/practice-range.js` and `js/transport-controls.js`
- Practice-range validates measure occurrence selections and filters attacks by onset within the selected tick range.
- Transport-controls owns Tempo/Loop form wiring and invokes bootstrap actions. All alphaTab speed/range operations remain in alphatab-host.
- AppState.practiceLoop records the applied range. Realtime uses native looping; Wait loops its filtered target list without starting score playback.

### `js/realtime-session.js`
- Owns attack matching, chord timing, misses, and scoring for Realtime.
- Receives normalized events and clock values without directly calling alphaTab.

### `js/wait-session.js` and `js/wait-controller.js`
- WaitSession collects required attacks and computes untimed results.
- WaitController owns target progression and manual pause state through injected transport operations.
- A completed target immediately seeks to the next target while native playback remains paused. No duration requirement or backing playback is used.
- Current chord behavior accumulates pitches without a time limit. A configurable chord attack window is deferred; see `TODO.md`.
- Loop completion starts a fresh Wait pass; Realtime native loop seeks reset grading for the next pass. Score loading clears section selection, while playback speed is retained for the session.

### `js/practice-timing.js`
- Owns timing thresholds and helper rules such as early/late windows and chord grouping tolerance.
- Keeps timing math out of rendering and UI files.

### `js/fretboard-ui.js`
- Owns visual neck rendering and display overlays.
- Renders expected notes, played notes, and correctness feedback.
- Must not contain correctness rules.

### `js/practice-visuals.js`
- Converts published grading records into per-note display states and resolves repeat occurrences onto written source-note IDs.
- Prepares six-string target and possible played positions using score tuning/capo, without enforcing string correctness.
- Maps prepared marks to native note bounds supplied by the host. Current occurrence feedback takes priority over earlier results for the same written note.

### `js/toolbar-ui.js`
- Owns menu wiring and user controls.
- Updates state and dispatches intents to other modules.
- Must not contain trainer or alphaTab business logic.

### `js/score-library.js`
- Owns file-browser and score-library behavior.
- Can later mirror the Piano Trainer Studio library model.

### `js/app-bootstrap.js`
- Owns startup wiring.
- Initializes modules in the correct order and attaches cross-module events.

## Data flow

1. User loads a score.
2. `alphatab-host.js` loads the file and exposes track data.
3. `app-state.js` stores available tracks and the current practice/playback selections.
4. `toolbar-ui.js` lets the user choose a single practice track and optional playback tracks.
5. `alphatab-host.js` mutes/unmutes tracks and forwards playback position updates.
6. `score-playback.js` normalizes the generated timeline; `practice-engine.js` selects expected events for the configured practice scope.
7. `midi-router.js` emits normalized user input events.
8. Bootstrap routes input to the Realtime engine or Wait controller/session. Those modules evaluate correctness.
9. Bootstrap prepares visual data through practice-visuals.js. Fretboard-ui renders the neck, while alphatab-host places non-interactive SVG outlines at native note bounds. These displays do not grade input.

## Key rules

- Only `alphatab-host.js` may talk directly to alphaTab.
- Never mix MIDI parsing with correctness logic.
- Never let UI files decide whether a note is correct.
- Never let fretboard rendering own trainer rules.
- Practice logic should operate on normalized score data and normalized MIDI data.
- V1 should allow exactly one practice track.
- V1 should support zero or more playback tracks.
- Drum tracks may be playable as backing tracks later, but should not be valid practice tracks in v1.

## MIDI modes

### Single-channel MIDI
- Typically provides pitch and timing only.
- Does not reliably identify string or fret.
- Best paired with `Pitch Only` correctness.

### Hex 6-channel MIDI
- Maps one channel per string.
- Can provide string identity when configured correctly.
- Enables `Exact Position` correctness.

## Correctness modes

### Pitch Only
- Accept if pitch and timing match.
- Best for single-channel input or looser practice.

### Exact Position
- Accept only if pitch, string, and position requirements match.
- Best for hex MIDI and fretboard-specific practice.
- Planned: current hex handling distinguishes same-pitch attacks by channel, but does not yet enforce the required string/fret position.

## Recommended v1 scope

### Keep in v1
- alphaTab rendering
- track selection
- app playback
- realtime mode
- wait-for-me mode
- virtual fretboard
- left-handed display option
- single-channel and hex MIDI input modes
- pitch-only and exact-position correctness modes

### Defer
- follow-me mode
- MIDI import
- LED integration
- live scale recommendation overlays
- chord-tone theory overlays
- advanced articulation grading
- bass / 7-string / alternate tuning depth beyond basic architecture support

## Future extensions

- Alternate tunings and capo-aware fretboard transforms
- Bass mode
- Scale / chord-tone overlays
- LED hardware integration
- Deeper alphaTab preference persistence
- More advanced track practice combinations
