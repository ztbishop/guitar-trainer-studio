# Guitar Trainer Studio: status and to-do

Updated 2026-10-08. This is the central status and priority list. Stage files retain implementation details and checks; DEV-NOTES records decisions. Proposed items below are not implemented or automatically authorized for the next change.

## Current status

- [x] Stage 1: foundation and MIDI normalization fixes.
- [x] Stage 2: occurrence-aware score/playback mapping.
- [x] Stage 3: Realtime attack matching and results.
- [x] Stage 4: Wait Mode, corrected to immediate silent stepping.
- [x] User confirmed repeat playback works.
- [x] User confirmed corrected Wait Mode works with their local setup.
- [ ] Finish broader local verification of Realtime timing, pause/seek/mode switching, hex input, and chord cases. Implementation tests do not prove every hardware/browser case.

## Next planned stage

- [ ] Stage 5: tempo and loop controls, preserving alphaTab transport ownership. Confirm exact scope when starting the stage.

## Deferred chord matching option

- [ ] Add Practice setting: **Together / Collect notes**.
- Current behavior: Collect notes. Correct pitches remain collected indefinitely, even after release.
- Proposed Together behavior: all required fresh attacks must arrive within an adjustable window, initially about 200 ms from the first correct attack. This value is a starting proposal requiring guitar/MIDI testing, not an established optimum.
- On expiry, clear the incomplete chord attempt and allow a new attempt at the same target. Keep single-note targets immediate; never require a written note's duration.
- Account for strums and MIDI detection latency; do not demand exact simultaneity or depend exclusively on notes remaining held.
- Show clear retry feedback. Decide scoring for expired partial attempts before implementation; avoid counting idle time as repeated errors.
- Test chord expiry, rolled strums, incorrect pitches, repeated attacks, hex unisons, pause/reset, and attacks during cursor repositioning.
- Suggested eventual default: Together, with Collect notes available for learning. Retain the working Collect notes default until this feature is implemented and tested.

## Other planned work

- [ ] Notation correctness feedback and a functional virtual fretboard.
- [ ] Exact-position/string grading for configured hex MIDI.
- [ ] Preference persistence and score-library improvements after core practice is stable.
- [ ] Articulation edge cases and normalization limitations recorded in STAGE-2.

## Longer-term ideas

Follow mode, scale/chord-tone overlays, bass/extended-range support, alternate-tuning depth, and LEDs remain ideas rather than committed stage work. Preserve the existing UI and native alphaTab capabilities; avoid broad refactoring for these additions.
