# Guitar Trainer Studio: status and to-do

Updated 2026-10-08. This is the central status and priority list. Stage files retain implementation details and checks; DEV-NOTES records decisions. Proposed items below are not implemented or automatically authorized for the next change.

## Current status

- [x] Stage 1: foundation and MIDI normalization fixes.
- [x] Stage 2: occurrence-aware score/playback mapping.
- [x] Stage 3: Realtime attack matching and results.
- [x] Stage 4: Wait Mode, corrected to immediate silent stepping.
- [x] Stage 5: playback speed and occurrence-aware section loops implemented; user confirmed loop and tempo work locally.
- [x] Stage 6: notation outlines and six-string fretboard display implemented; user confirmed blue/green feedback with a MIDI piano. Other visual/hardware checks remain pending.
- [x] Stage 7: Wait chord matching options implemented, with configurable Together window; awaiting local validation.
- [x] User confirmed repeat playback works.
- [x] User confirmed corrected Wait Mode works with their local setup.
- [ ] Finish broader local verification of Realtime timing, pause/seek/mode switching, hex input, and chord cases. Implementation tests do not prove every hardware/browser case.

## Next checks and proposed stage

- [ ] Complete Stage 5 edge-case checks as needed: pause/Stop, disabling loops, mode changes, loading a new score, and repeated-measure selection. Basic loop and tempo behavior is user-confirmed; individual edge cases have not all been explicitly confirmed.
- [ ] Validate Stage 6: notation alignment, repeats/loop resets, chord feedback, fretboard tuning/capo/string labels, note release, left-handed orientation, resize/scroll, and mode changes.
- [ ] Validate Stage 7: Together expiry/retry, chords within the window, Pause/resume, mode changes, and section loops. Check guitar strum/MIDI timing when guitar hardware is available.
- [ ] Choose the next stage after validation; exact-position grading and the deferred menu/visual refinements remain candidates rather than an agreed sequence.

## Deferred Tempo and Loop menu refinement

- [ ] Tune Tempo and Loop menu layout, labels, options, and control placement to match Piano Trainer Studio where appropriate for guitar.
- User requested this refinement after confirming Stage 5 loop and tempo work. Detailed reference screenshots and intended logic are still to be supplied; do not assume which piano controls should be copied.
- Schedule a focused UI pass after core notation/fretboard feedback is working. Preserve the functional Stage 5 controls while building that core framework.
- Capture context whenever the user supplies it. If it changes tempo or loop behavior, range semantics, or transport requirements, review it before dependent development rather than treating it as cosmetic work.
- During the refinement, verify Realtime/Wait behavior, repeat-occurrence selection, accessibility, and narrow-screen layout.

## Chord matching option: implemented, tuning pending

- [x] Add Wait Practice setting: **Together / Collect notes**.
- Collect notes remains the default: correct pitches remain collected indefinitely, even after release.
- Together requires all fresh chord attacks within 200 ms by default, adjustable from 50–1000 ms. Tune this with guitar/MIDI tests; 200 ms is not an established optimum.
- [x] Expiry clears provisional chord hits and permits a new attempt at the same target. Single notes remain immediate; duration/held-note requirements are unchanged.
- [x] Pause freezes the chord window. Incorrect pitches still count as wrong; expiry increments a separate retry counter without missed/wrong penalties. Idle time cannot repeatedly increment retries.
- [x] Automated expiry, chord-edge, hex-unison, pause/reset, cursor-positioning, and setting-form tests.
- [ ] Validate with a real guitar, especially rolled strums and unequal string detection latency. Consider changing the default to Together only after local feedback.

## Deferred notation appearance refinement

- [ ] Consider outlines for tab numbers and Piano Trainer-style dots for standard notation during a later visual pass.
- Current recommendation: retain outlines so tab fret numbers remain readable. User confirmed blue/green behavior using a MIDI piano; no alternate marker style has been implemented.

## Other planned work

- [x] Initial notation correctness feedback and functional six-string virtual fretboard.
- [ ] Refine visual feedback and fretboard ergonomics based on Stage 6 local testing.
- [ ] Exact-position/string grading for configured hex MIDI.
- [ ] Preference persistence and score-library improvements after core practice is stable.
- [ ] Articulation edge cases and normalization limitations recorded in STAGE-2.

## Longer-term ideas

Follow mode, scale/chord-tone overlays, bass/extended-range support, alternate-tuning depth, and LEDs remain ideas rather than committed stage work. Preserve the existing UI and native alphaTab capabilities; avoid broad refactoring for these additions.
