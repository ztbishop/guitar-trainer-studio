# Development notes

Use TODO.md for current status and priorities, ARCHITECTURE.md for module boundaries, and STAGE-1 through STAGE-6 for implementation and validation details. Update these files in future packages so project decisions survive a new chat.

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
