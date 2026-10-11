# Guitar Trainer Studio Architecture

## Tempo/metronome contract — 2026-10-11

- `js/tempo-controls.js` owns BPM/speed/volume validation and presentation, five-step buttons, control availability, and the short visual pulse. It reads the normalized tempo map, dispatches injected intents and never calls alphaTab or grades MIDI. Numeric commits keep precise state separate from rounded display values.
- `js/transport-controls.js` composes Tempo controls with unchanged occurrence-aware Loop controls. `AppState.metronome` owns startup defaults (off, volume 75%, visual pulse true); tempo-preferences.js validates/restores/saves volume only in localStorage. Downbeat accent is only an explicitly disabled UI placeholder. MIDI output is absent.
- Realtime BPM is current score tempo × native playback speed; editing BPM derives that same multiplier, preserving the source tempo map. Bootstrap retains the existing Realtime pause/reset path. Wait tempo edits apply the multiplier without resetting/pausing the Wait attempt.
- Wait latches a reference score BPM on mode entry/score readiness. Its effective BPM is reference × speed and does not follow subsequent cursor movement, source tempo changes, note solving or loop rewinds. The click runs only for an active, non-paused Wait session; accompaniment stays paused and no grading event comes from it.
- `js/alphatab-host.js` is the sole alphaTab boundary. Main playback retains native metronome volume/filter/events; visual callbacks map the native event within its processed audio block to the speaker output timestamp (latency fallback), canceling pending pulses on pause/seek/disable/mode exit. Wait renders one native AlphaSynth/Sonivox click, then metronome-clock.js schedules copies on the main player audio context with matching visual callbacks. It cancels sources/timers on stop, skips stale beats after stalls, and never seeks or grades the score. Repeated UI sync/volume updates leave beat phase intact; BPM changes restart the independent clock. Async preparation consults the latest state; errors disable the metronome and surface player status. The bundled vendor is unchanged.
- Rendering, MIDI normalization, grade formulas, and deferred features are unchanged. Browser smoke checks cover desktop/narrow layout and actual Wait pulse; automated coverage includes the native output buffer and click samples. Physical Fishman and audible acceptance remain pending.

## Current maintenance contract — 2026-10-11

Root README.md describes running and checking the app; AGENTS.md records standing agent instructions. This remains a static browser app using bundled alphaTab and WebMIDI, edited directly in the local project folder and served through VS Code Live Server in the owner's normal browser with a Fishman Connect. This documentation/version cleanup introduces no runtime or build-system changes.

Current baseline: **Beta v0.0.3**, with `version.json` value `0.0.3`; owner creation of the `v0.0.3` tag follows the version-update commit. The previous `v0.0.2` tag remains a historical checkpoint. This metadata update introduces no runtime or architectural changes. Git publishing and deployment remain owner actions unless requested. Project documentation is the durable handoff between chats; earlier ChatGPT **Guitar Trainer** history is optional context if accessible.

Current feedback contract: one Staff visibility control; independent tab highlights and numbers; default-off conservative Poly inference; no mandatory Hex string-check gate. Numeric Hex/Poly feedback is plain red at the native tab font size beside the score string, with translucent backing and no prefix/border/pointer or custom spacing. Both input modes grade pitch; strict-position grading remains deferred. Historical entries below preserve earlier designs and validation results, not current instructions where superseded.

## Dated implementation history

## Plain inferred fret numbers — 2026-10-10

User's screenshot showed dashed numeric badges resembling extra scored frets. Removed the inferred-number badge border. Both Hex and inferred Poly feedback now use plain red numbers with the existing translucent backing, native tab font size and side placement. No tilde or numeric badge outline is drawn. The inference checkbox/help/status and SVG title retain the distinction; expected-note highlights are separate from the numeric feedback and unchanged. This supersedes the dashed-badge presentation in the preceding font update.

142 tests pass after applying the changed-files ZIP. Locally verify live and retained inferred numbers appear without borders while expected-note highlights still follow their separate switch. Inference, scoring, releases, native layout and transport are unchanged. Apply after the fret-font update; no version/tag change or deferred/Piano Trainer work.

## Fret feedback size and compact inferred numbers — 2026-10-10

User requested larger Hex/Poly fret numbers closer to the expected on-score frets and questioned the wide tilde prefix. Feedback now uses alphaTab's configured tablature font size (14px by default, previously 12px), scaled with the score, for both live and retained Hex/Poly numbers. Badge height/width follow the selected font and full digit count; custom native font sizes are supported. Native score layout and original fret glyphs are unchanged.

Removed the **~** prefix from inferred Poly numbers. Their translucent badge has a dashed red border, and its tooltip identifies the estimated fret on the expected string. Hex badges keep their existing borderless appearance. Updated help/status text explains the distinction. The inference checkbox, attribution, scoring and release/history rules are unchanged.

142 tests pass, including default and custom tab font sizes, three score scales, compact inferred double-digit width, host rendering without a prefix, and prior live/retained inference/Hex checks. Browser/physical MIDI acceptance remains local. Apply the changed-files ZIP after the Visual Feedback/fret-number update. Locally compare feedback size against written frets at normal zoom and test dense chords, double digits, resize/zoom and dashed inferred badges. No version/tag bump or deferred/Piano Trainer work.

## Unified Staff control and actual inferred fret numbers — 2026-10-10

User requested a single Piano Trainer-style Staff checkbox and reported that inference never displayed a fret number. The prior Poly increment implemented only inferred target highlights; it did not render numeric fret estimates. This increment supplies those numbers and supersedes the earlier no-Poly-fret-detail limitation.

Display's Viewer card is now **Visual Feedback**. Staff and Tabs are separated with a divider. The single **Staff: Highlight correct / incorrect notes** control replaces all three notation options and controls target colors/current guidance plus live and retained wrong-pitch noteheads together. Removed the two obsolete UI/state switches and their filtering. Practice's textual mistake review stays available independently of visual visibility. Tab labels are now **Tabs: Highlight correct / incorrect notes**, **Tabs: Show incorrect fret numbers**, and **Tabs: Infer incorrect frets for non-hex pickups**. The last option defaults off, retains its conservative display-only attribution, and does not enable string grading.

`buildPolyWrongFretMarks` in poly-feedback.js derives an estimated fret from a genuine received-wrong MIDI pitch and the uniquely associated expected note's scored string/tuning/capo/transposition. It builds temporary projected records only, reusing tab-feedback's existing score validation, latest-per-string policy and native side placement. It never attaches an invented detected string to actual MIDI/history. Numeric estimates are prefixed with **~** (for example **~12**) and titled as inferred on the expected string. Geometry allows room for the prefix and full digits. Live estimates disappear on release and retained estimates remain after target completion; Wait and Realtime are supported. The fret-number and inference switches must both be on for Poly numbers. Staff and tab-circle visibility remain independent.

Single-note targets work because their sole pending written note is eligible immediately. Chords work when all but one required written note have already been accepted at the wrong attack. Multiple remaining notes, duplicate written unisons, wrong-first ambiguous chord attacks, unavailable/inconsistent score positions and inferred frets outside 0–36 remain omitted. There is still no nearest-pitch assignment or retrospective guessing. All actual pitch history and scoring survive toggling; Realtime accepted tones remain green, and corrected Wait errors can retain their existing optional inferred summary.

142 tests pass, including actual single-note/chord sessions to native fret geometry across four tab profiles and three scales, ~12 width/rendering, live release and retained estimates in both modes, invalid score mapping/ambiguity/repeat suppression, host visibility with Staff/circles off, and all prior Hex/scoring/transport checks. Browser/physical MIDI acceptance remains local. Apply this changed-files ZIP after the previous Poly update. Locally verify the new labels/grouping, toggle the single Staff control, then enable both tab fret switches and test one wrong single note and a chord with one correct tone before a wrong tone. Confirm ~ numbers disappear on release, return as retained history after correction, and remain hidden in ambiguous chord cases. No version/tag bump, deferred features or Piano Trainer edits.

## Poly correct-tone feedback and optional inference — 2026-10-10

User approved implementing confirmed-green Poly feedback and placing **Infer Poly mistake positions** with the Display feedback options. This supersedes all earlier whole-chord-red Poly summaries. Correct Poly pitches stay green on notation and their corresponding written tab frets by default, including completed Wait chords. Actual received wrong pitches remain in live/retained notation history and Practice review; no scoring or transport rule changes.

Inference defaults off and is a display-only preference for the page session. `poly-feedback.js` captures a candidate only when exactly one unhit/unmissed slot with exactly one written note ID remains at the wrong attack. Sessions attach `inferredNoteIds` to genuine wrong-pitch records irrespective of visibility, so toggling can review the same stored evidence without rescoring. Multiple pending pitches, duplicate written unisons, duplicate required attacks and out-of-window inputs do not invent an association. This is a remaining-note hypothesis, not proof of intended pitch or physical string. A wrong attack arriving before the other correct tones remains unassigned; later corrections do not retrospectively guess its intent.

When enabled, only the associated written note/fret gets an inferred red overlay. Live markers release independently. Wait preserves that one note's inferred error summary after completion, with clean tones green. Realtime accepted notes always stay green; pending/missing notes can carry an inferred red overlay, while ordinary misses still turn red after their deadline without requiring inference. Ambiguous cases retain actual pitch history but no guessed target circles. Tab inferred circles are dashed and SVG titles identify inference; notation uses existing filled target feedback. This increment does not derive guessed Poly wrong-fret numbers. Existing notation master and tab-circle switches independently hide their category; live/history notation switches still govern actual played-pitch noteheads, not target colors.

Validation: 139 tests pass, including unique/ambiguous attribution, release, repeats, default-off/toggle invariance, duplicate/unison handling, Wait Pause/new attempt, Realtime correction/miss behavior, host redraw/visibility, and native overlay geometry across five profiles and three scales. Hex per-string feedback remains covered. Browser/physical MIDI acceptance remains local. Apply this changed-files ZIP after the chord-feedback update. Test a dyad with correct first tone then wrong second tone, release/correction with inference off/on, wrong-first ambiguous input, a three-tone chord with several pending pitches, Realtime deadlines, and Pause/Resume. No version/tag bump, deferred features, Piano Trainer changes or menu restructuring.

## Hex chord completion by detected string — 2026-10-10

User confirmed live circles work and clarified completed chord behavior: a clean lower tone must remain green when the higher tone had mistakes. This supersedes earlier whole-chord-red rules for configured Hex input. Wait now retains each slot's written string and publishes completed error colors only for slots whose string has a received-wrong-pitch record. Realtime tab summaries use the same per-string rule; Realtime standard notation retains its existing hit/missed colors. Poly or unknown/invalid string metadata keeps the conservative whole-target summary. Errors on a detected string absent from the written target retain history/fret detail without accusing clean written tones. This is display attribution, not strict-position grading or an inferred intended pitch.

The measure 83 case was tested using both correct pitches on MIDI channel 4 in Wait and Realtime. Both are accepted, remain green, produce 100% accuracy and zero wrong-fret labels. This passed even against the previous version: there is no channel-mismatch rejection to remove. The supplied screenshot's retained fret 17 therefore cannot be explained by those two correct attacks alone; the original score/MIDI sequence is needed if it recurs. Do not erase genuine earlier wrong-pitch history just because all required tones were eventually satisfied. No special completion exception or scoring change was added.

131 tests pass. New regressions exercise measure 85's Bb dyad and measure 83's D dyad through normalized MIDI, Wait controller publication and Realtime finalization; three chord regressions fail against the prior update. Native tab geometry now verifies two green tones plus one red completed-error tone across four profiles and three scales. Browser/physical MIDI acceptance remains local. Apply this changed-files ZIP after the live-circles update. No version/tag bump, menu restructuring, deferred features or Piano Trainer changes.

## Active Hex tab outlines and notation control scope — 2026-10-10

`tab-feedback.js` now prepares live `tab-error` marks with state `wrong` for pending expected frets on strings identified by active received-wrong Hex events. It consumes published live errors, note states and occurrence history; it does not grade, alter MIDI, or infer Poly positions. Accepted chord tones retain green. Completed error summaries take precedence, independent note releases remove only the live marks, and current repeat occurrences override older feedback. Realtime can retain attribution to an earlier event until finalization, using session event IDs.

Bootstrap calls this projection in both modes independently of the wrong-fret-number switch. Existing `notation-feedback.js` geometry limits `tab-error` to native tab bounds and suppresses the corresponding normal outline, so there is one red outline without recoloring standard notation. CSS adds solid red for live `wrong`; missed/done states retain their prior styles. alphaTab owns all layout and transport; scoring and native spacing remain unchanged.

Notation visibility remains a master plus two detail filters: **Show all notation feedback** hides expected note colors and actual played-pitch overlays; held/history toggles select only those mistake noteheads under the master. Tab circles/frets are separate categories, and full internal history survives every visibility change. UI labels/help clarify this existing contract. 127 automated tests pass; native geometry is covered across four tab profiles and three scales. Browser/physical MIDI acceptance remains pending.

## Side fret feedback and independent display switches — 2026-10-10

Live and retained Hex wrong-fret numbers now share the same position beside their detected string, with no connector lines or placement routing. The latest wrong fret per string remains after completion in Wait and Realtime. Double digits remain visible at 12px scaled with the score. Native score spacing and pitch grading are unchanged. Dense adjacent targets may overlap; users can hide fret details independently while keeping circles.

Display now groups three default-on switches: **Show notation feedback**, **Show tab feedback (circles)** and **Show tab feedback (frets)**. Each affects only its overlay category. Existing live/history notation controls remain. No Practice menu reorganization or string verification is introduced. 124 tests pass, including independent host visibility, pointer-free retained rendering and six-string side geometry at three scales.


## Remove mandatory string setup — 2026-10-10

User explicitly rejected the check-string button and its feedback gate. Removed its UI, runtime import/wiring, MIDI interception and verification state. Configured Hex channels now enable live/retained fret numbers immediately; **Show mistakes on tab** remains the display option. No verification flag, saved setup, checkbox or calibration is required or consulted. Existing channel-base mapping and score tuning/capo/transposition validation remain. Poly positional inference is still deferred. Native spacing stays restored. The old standalone setup helper/tests are inactive historical code; no browser module imports it.

124 tests pass, including normalized Hex MIDI → Wait live/retained geometry and Realtime feedback without verification. The user's Four On Six GP3 was imported and its first target exercised end-to-end: live and retained fret 12 both produced visible geometry without setup. This decision supersedes all earlier mandatory setup/verification requirements for tab feedback; optional future strict-position grading remains separate.


## Tab setup usability and native spacing correction — 2026-10-10

The user's Four On Six GP3 reproduced the spacing regression: native first-system notation-to-tab gap is 56 units; the prior 108-unit padding raised it to 164. Removed all custom staff padding. Retained markers now use at most two compact rows in native inter-staff space, trying neighboring horizontal placements with pointers before allowing overlap in extremely dense feedback. No empty six-row lane is reserved. Live two-digit visibility remains unchanged.

The guided-check button was disabled during active practice, preventing the user from reaching the required verification. It now stays enabled for a selected Hex device; clicking pauses via the existing Wait/Realtime pause path and starts the guide, preserving grading. Display shows a clear status when Hex selection or string verification is needed. Fret feedback still requires completed physical-string/channel verification; Poly is not guessed. Native rendering of the supplied song was inspected with live 16 and retained 12. 122 tests pass, including a running-practice setup-button regression. Physical MIDI setup/feedback acceptance remains local.


## Live/retained tab lanes and Realtime feedback — 2026-10-10

Latest user agreement supersedes the earlier disappearing-history and collision-omission rules. Live wrong frets are 12px, translucent-backed, directly on the detected string beside the target; no pointer, and no suppression for crowding or double digits. Retained detail is the last wrong fret per detected string/target in a six-row lane above the tab, with a thin string pointer. Native alphaTab display padding reserves the lane, increasing vertical score spacing. Retained collisions try another row; extreme density may overlap within the lane, a deliberate prototype limitation requiring local acceptance. Native black frets remain unchanged; live overlap is temporary and intentional.

`string-setup.js` replaces the manual checkbox with a guided **Check string setup** action, low-to-high channel checks, and browser-storage verification keyed by MIDI device ID/base channel. The Display **Show mistakes on tab** switch defaults on and controls live/retained numbers independently of string setup and notation-history visibility. Setup must be run paused; its attacks do not grade, while releases still clear prior live errors. Saved configurations can be restored; recheck after external hardware-routing changes.

`RealtimeSession` now stores target-attributed received-wrong pitch/channel/string records, independently released live markers and finalized history. `practice-engine.js` publishes them and handles releases while paused. Existing timing attribution, accuracy and notation correct/missed colors remain unchanged. Finalized Realtime wrong-pitch targets now retain a red tab outline, even with detail hidden, so errors remain marked in place. Duplicate required tones/out-of-time attacks do not fabricate wrong-fret positions; Poly string inference and strict-position grading remain deferred. Wrong-pitch notation and Practice review now consume both modes' histories. `tab-feedback.js` owns occurrence-aware latest-per-string projection and geometry; the alphaTab host owns SVG badges/pointers and native padding. All feedback follows score scale. See STAGE-8-TAB.md for behavior/acceptance. 121 tests pass; native SVG visual checks completed; physical MIDI testing remains local.


## Temporary Hex tab detail — 2026-10-10

`tab-feedback.js` implements display-only Wait wrong-fret markers. MIDI settings now include a manually confirmed **String mapping checked** checkbox. It defaults off, is not persisted, and clears on input-device, input-mode, or base-channel changes. Verify every physical string using MIDI Debug before enabling; configured channels or MPE alone are not verification.

The adapter accepts only six-string non-percussion tuning, valid capo/sounding transposition, and expected notes whose MIDI agrees with their written fret. It derives one latest active wrong fret per detected string (0–36), using occurrence-specific live records. Native alphaTab reverses string numbering relative to trainer events; geometry converts explicitly. It prefers the expected fret on that string as the horizontal anchor, otherwise the target column, and projects onto the detected string's native tab line. A small red number with a white background sits to the right; original black frets remain unchanged. Native fret bounds, bar edges, inter-string spacing and badge collisions gate placement; crowded/unsupported cases omit the badge. No retained wrong-fret list is painted.

Release updates the live markers independently; completion removes them and preserves existing red/green expected-target outlines. Existing live-errors and score-feedback visibility controls apply. Pause/Resume, grading, full pitch history, Poly behavior and Piano Trainer are unchanged. This increment is Wait-only, not Realtime wrong-note attribution or strict-position grading. Poly inference remains deferred; a future experiment may start with ±1 fret and require a unique remaining assignment, but must not treat inference as detected position.

Validation: 110 automated tests; native tab geometry across Default/ScoreTab/Tab/TabMixed and zoom, all six detected-string lines, capo/transposition, latest-active selection, release/completion gates and collision omission. Native SVG visual check confirms expected black frets remain readable. Physical MIDI and Chrome local acceptance remain required; see STAGE-8-TAB.md.


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

### Realtime transport retention
- alphatab-host freezes app-side playing state on manual Pause and forwards one-shot `isPauseSnap` metadata for the native Pause seek; it does not predict the cursor beat from delayed playback ticks. Play, stopped events and score mouse-down clear unused protection. practice-engine reanchors the Pause position without resetting grades and retains results through non-seek position rollback while paused.
- practice-engine preserves grades on unchanged-position native seek acknowledgements and the non-loop Finished → rewind → Paused sequence; actual seeks, loop passes, explicit resets and completed replay start fresh grading.

### `js/attempt-controls.js`
- Owns Practice → New attempt here button wiring/readiness only. Bootstrap routes the intent to `newRealtimeAttemptHere` or `WaitController.newAttemptHere` and clears held MIDI display.
- Session modules clear results/feedback at the current position without issuing transport calls; preserve running/paused state and exclude earlier targets. Wait clears partial chord/retry/live/history/pass data while retaining the gate and any outstanding cursor acknowledgement.

### `js/realtime-session.js`
- Owns attack matching, chord timing, misses, and scoring for Realtime.
- Receives normalized events and clock values without directly calling alphaTab.

### `js/wait-session.js` and `js/wait-controller.js`
- WaitSession collects required attacks and computes untimed results. It stores occurrence-specific wrong-pitch attack history and live channel/pitch errors separately from retry/duplicate-required penalties; note-off removes only the corresponding live error.
- WaitController owns target progression and manual pause state through injected transport operations.
- A completed target immediately seeks to the next target while native playback remains paused. No duration requirement or backing playback is used.
- Collect notes accumulates pitches without a time limit. Together uses a configurable active-time attack window, expires incomplete attempts, and keeps retries separate from wrong-note scoring. WaitController subtracts paused time from the MIDI/controller clock.
- WaitController publishes history/live feedback and archives completed pass records for review, preserving grading/history through Pause/Resume and clearing live markers at target completion.
- Loop completion starts a fresh Wait pass; Realtime native loop seeks reset grading for the next pass. Score loading clears section selection, while playback speed is retained for the session.

### `js/practice-timing.js`
- Owns timing thresholds and helper rules such as early/late windows and chord grouping tolerance.
- Keeps timing math out of rendering and UI files.
- Validates Wait chord setting limits; Realtime retains its separate existing chord tolerance.

### `js/chord-controls.js`
- Owns Wait chord-setting form wiring and validation feedback. Bootstrap pauses/resets the Wait session when settings change.

### `js/fretboard-ui.js`
- Owns visual neck rendering and display overlays.
- Renders expected notes, played notes, and correctness feedback.
- Must not contain correctness rules.

### `js/practice-visuals.js`
- Converts published grading records into per-note display states and resolves repeat occurrences onto written source-note IDs.
- Prepares six-string target and possible played positions using score tuning/capo, without enforcing string correctness.
- Prepares occurrence-aware live/retained wrong-pitch records separately from target red/green summaries and identifies supported standard-notation bounds; it never guesses Poly frets.
- Maps prepared marks to native note bounds supplied by the host. Current occurrence feedback takes priority over earlier results for the same written note.

### `js/notation-feedback.js`
- Owns pure wrong-pitch spelling and notation-overlay geometry. Host supplies native note bounds, stave profile, zoom and engraving metrics; this module never calls alphaTab.
- Chooses spelling using the local bar key signature. Explicit vector accidentals (including naturals), notehead-sized red dots and ledger lines show wrong pitches without long score text. All wrong pitches use the target anchor’s single horizontal cursor column, with a fixed adjacent accidental position. Same-line/neighboring pitches may overlap; never spread them horizontally into other targets. Repeated identical pitches share a dot, while Practice retains the complete attack history.
- Projects sounding MIDI to displayed pitch with beat/clef ottava and staff display transposition, using native five-line treble/bass/alto/tenor staff coordinates. Checks the projection against actual rendered original notehead bounds and omits unsupported/inconsistent wrong-note geometry. Never uses the native accidental helper's unregistered-pitch fallback or mutates renderer/model accidental state.
- Returns filled-overlay bounds for standard expected noteheads and unchanged outlines for tab targets. The host renders SVG and rebuilds on native post-render completion; grading/lifecycle stay in Wait/Realtime modules.

### `js/tab-feedback.js` and `js/poly-feedback.js`
- Tab-feedback projects live/completed Hex errors to expected strings and validates sounding pitch, tuning/capo/transposition, and native tab bounds before deriving wrong-fret display geometry. Accepted clean tones retain their mode-specific green feedback; unknown Hex string metadata uses conservative target summaries.
- Poly-feedback captures an association only when one pending slot with one written note remains at the wrong attack. It prepares optional inferred target/fret overlays from genuine wrong-pitch records, without changing grading or attaching an invented detected string to stored MIDI/history. Ambiguous attacks remain unassigned.
- The host renders these pure projections through independent Staff, tab highlight, and fret-number visibility settings. Numeric estimates use the same native font-size/side geometry as Hex numbers; SVG titles and the inference control explain their estimated status. `js/string-setup.js` is inactive historical code, not a runtime prerequisite.

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
