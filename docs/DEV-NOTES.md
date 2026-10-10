# Development notes

Use TODO.md for current status and priorities, ARCHITECTURE.md for module boundaries, and STAGE-1 through STAGE-8 for implementation and validation details. Update these files in future packages so project decisions survive a new chat.

## 2026-10-10 — Realtime Pause protection without predicted beats

User reported Realtime still clears on Pause after the first follow-up. That fix relied on guessing the API's current cursor beat from the host's last received tick. Those can differ because worker position delivery and native cursor rendering are asynchronous. Added regression coverage invokes the actual bundled native Pause handler with a cursor beat different from the received position; it fails against the previous host. A second regression reproduces a queued non-seek backward position update clearing results while already paused; it fails against the previous engine.

Manual Pause now immediately freezes app-side grading and marks one pending native Pause seek, without guessing its destination. The acknowledgement reanchors without clearing results. Play, stopped events and deliberate score mouse-down clear unused protection, so a later user seek is not swallowed. Non-seek backward updates while paused reanchor without starting a new attempt; explicit seeks and backward playback while running retain reset semantics. Native alphaTab cursor/audio behavior is unchanged. New attempt here remains available and Play/Resume remains retention-preserving.

99 tests pass, with both new regression scenarios demonstrated failing against the previous implementation and passing now. Tests also cover native synchronous and worker-style Pause delivery, intentional score clicks after a pause without a snap, Reset, completion/replay and all existing Wait/new-attempt behavior. No browser/physical-MIDI validation has been performed here; this correction still needs user acceptance with the original failing setup. Deliver only the eight files changed since New attempt here, including the updated project notes.

## 2026-10-10 — New attempt at current position

User agreed to preserve Play/Resume retention and add an explicit **New attempt here** action in Practice. It clears grading, outlines, and Wait live/retained/pass history without moving the cursor or changing running/paused state. Wait retains the active gate (including an outstanding cursor acknowledgement), clears partial chord hits/retries and resets its Together clock; prior targets are skipped for this new attempt. Realtime rebuilds results at the current tick and reanchors its clock, so it can continue immediately when already playing. Existing reset/seek/loop behavior and score formulas remain unchanged. At a completed/end position the action clears the summary in place; Play still follows the existing completed replay behavior.

`attempt-controls.js` owns the button wiring/readiness only; bootstrap routes the intent and clears stale held MIDI display; the engine/controller own the session reset. The action is disabled until the native player and practice targets are ready. 98 tests pass, including 4 new tests for paused partial Together chords, clearing previous loop-pass review, in-flight gate preservation, Realtime running/paused continuation, and button readiness. Local browser/MIDI acceptance is still required. Deliver only this update's changed/new files and a git commit description.

## 2026-10-10 — Realtime Pause beat-snap correction

User confirmed Wait retains its percentage but reported Realtime still clears on Pause. The bundled full AlphaTabApi `_onPlayerStateChanged` seeks to the current beat start for a non-stopped Paused event. This can move backward from mid-beat and was absent from the earlier synth-only test. The host now identifies the expected one-shot Pause seek using the rendered tracks and native tick lookup, marks it `isPauseSnap`, and keeps input paused. The engine reanchors the clock/cursor without clearing results, percentage, or note states. Native beat snapping is preserved; deliberate seeks, Reset, loop rewinds and completed replay retain their reset rules. No UI or scoring formula changes.

94 tests pass. The host regression invokes the bundled API's actual Pause handler mid-beat with a mixed 50% score and covers both synchronous seek-before-state and worker-style state-before-seek delivery. Engine regression verifies retained mixed results, ignored paused attacks, Resume and subsequent explicit seek reset. Browser/physical MIDI acceptance remains pending: pause mid-beat several times in Realtime, including within a loop, resume, and confirm Reset clears the score. Deliver only files changed since the Stage 8 ZIP, with a git commit description.

## 2026-10-10 — Stage 8 retention and first Wait feedback increments

Inspected the bundled native synthesizer: ordinary Pause changes player state without seeking; no failing ordinary Pause sequence was reproduced by the baseline tests. The prior engine nevertheless reset on every `isSeek` notification. Stage 8 preserves unchanged-position seek acknowledgements through Pause/Resume, while actual seeks/loop rewinds still reset. A native integration test also exposed/covered Finished → automatic rewind → Paused; the final summary now survives that rewind until replay. No claim is made that all hardware causes of the user's original report have been reproduced.

Wait now stores received wrong pitches by event occurrence, retains them through completion/expiry/Pause, and uses one completed-with-errors outcome for every note in an error chord. Original score/tab content is untouched. Live errors release independently by channel/pitch, including while paused, and clear on completion. Current/latest occurrences own written-score overlays; previous loop passes retain review history while new pass scoring stays fresh.

First notation increment uses red actual pitch-name/MIDI text at native standard-notation target bounds, live while held and retained after completion. Display can hide live labels or history independently. Practice lists completed mistakes by pass/measure/occurrence/target. Precise staff notehead glyphs and verified-Hex temporary fret labels remain explicit next increments: do not guess glyph y from unlaid-out accidental-helper values or equate configured channels/MPE with verified physical strings. The latest TODO specification is still the final intended behavior.

Percentage formulas are unchanged. Duplicate attacks of an already-collected required pitch retain the previous wrong-attack penalty, but are not received-wrong pitches and do not enter pitch history or turn solved targets red. Together timeouts remain retries without wrong/missed penalties. This distinction is documented rather than silently changing scoring.

93 tests pass, including native synth transport integration and native SVG bounds across supported profiles/zoom, host redraw/visibility, independent releases, chords, retries, resets and occurrence/pass isolation. Browser alignment and physical MIDI remain pending; see STAGE-8.md for local checks and limits. Deferred features and Piano Trainer are untouched.

## 2026-10-08 — Stage 7 Wait chord options

The deferred Together / Collect notes option is implemented for Wait. Collect remains the default for continuity. Together starts a real-millisecond window on the first correct chord attack, default 200 ms and configurable 50–1000 ms. Expiry clears provisional hits and increments one retry, without wrong/missed penalties. A late pitch may start the next attempt. Wrong pitches retain their normal penalty and do not start/extend the window.

Pause excludes elapsed paused time and ignores input, preserving an in-window partial chord. Single-note targets remain immediate. Loop/session resets preserve selected settings but clear attempt state. Realtime retains its prior 60 ms chord grouping and timing windows. Preferences remain page-session only.

79 automated tests pass, including strict window boundaries, idle expiry, retry scoring, unisons, multiple channels, pause, loop/settings reset, and form validation. Keyboard/guitar browser testing remains pending.

## 2026-10-08 — Stage 6 user check and marker recommendation

User confirmed blue/green feedback while testing with a MIDI piano. This confirms those colors work locally, not complete fretboard/hex/resize validation. Recommendation: keep outlines for tabs to preserve fret-number readability; consider Piano Trainer-style dots on standard notation later. Logged in TODO; no marker-style change is included in Stage 7.

## 2026-10-08 — Stage 6 visual feedback implemented

Native alphaTab note bounds (core.includeNoteBounds) are used for blue current-target, green accepted, and red dashed missed-note outlines over staff/tab notation. Original renderer elements are not recolored or rewritten. Overlays are non-interactive and rebuilt after native post-render completion. Current repeat occurrences override old results on shared written notes.

Display now exposes notation feedback, virtual fretboard, and left-handed orientation toggles. Six-string fretboard targets use scored string/fret; played markers show possible pitch positions for single-channel input or configured channel-derived string positions for hex. The selected staff's tuning, capo, and pitch transposition are used. Exact-position grading remains deferred.

Stage 5 tempo/loop behavior was user-confirmed before this stage. The deferred Tempo/Loop menu refinement remains in TODO.md. Stage 6 has 66 passing tests, including actual alphaTab note IDs/tuning/repeats and scaled native bounds, mocked overlay redraw/toggle behavior, grading resets, and fretboard DOM output. Actual Chrome alignment/scroll/resize and physical MIDI visual testing are pending.

## 2026-10-08 — Stage 5 implemented, local validation pending

Tempo now sets a 25–200% multiplier on native alphaTab playback speed, preserving score tempo changes. Loop selects inclusive start/end measure occurrences in generated playback order. Applying changes pauses practice and resets results.

Realtime repeats the native tick range and grades only attacks in that range. Wait immediately wraps its scoped target list, with native accompaniment still paused. Each pass has fresh grading; no cumulative session score is implemented. Loading a new score clears the selected loop. Speed remains a session setting; persistence across page reloads is deferred.

56 tests pass, including bundled synthesizer half-speed looping with future attacks excluded, Realtime scoped grading/reset, Wait wraparound, host setting restoration, and form validation. Chrome UI/audio and physical MIDI validation are pending. The chord-timing option remains deferred.

## 2026-10-08 — Wait Mode correction validated

The initial Stage 4 transport played each interval between solved targets. The user observed repeated-note attempts and backing-track catch-up. The correction removes timed playback between targets, keeps accompaniment paused, and accepts attacks before the native cursor seek acknowledgement.

User feedback: corrected Wait Mode works. Correct chord pitches can be collected with a break between them. This is the implemented behavior, not a duration requirement.

47 automated tests passed in the corrected package, including native synthesizer cursor stepping without Play, chord collection, long notes/gaps, seek acknowledgement, and pause/reset. User confirmation is a local functional check, not complete coverage of every score, hardware mode, or browser condition.

## 2026-10-08 — Chord timing recommendation, deferred

Recommendation: retain the stable Collect notes behavior for now; add a Together / Collect notes practice setting later. Together should use a forgiving attack window suitable for guitar strums, initially proposed at about 200 ms and adjustable after testing. Exact simultaneity is not the desired rule.

The supplied PianoApp ZIP uses per-note `hit` flags and advances when all expected notes are hit. Note-off does not clear those flags. The current GitHub code could not be retrieved, so this comparison applies only to that supplied ZIP.

This note records a recommendation for later development. No chord timing option has been implemented. See TODO.md for proposed behavior and unresolved scoring choices.
