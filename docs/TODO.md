# Guitar Trainer Studio: status and to-do

Updated 2026-10-10. This is the central status and priority list. Stage files retain implementation details and checks; DEV-NOTES records decisions. Proposed items below are recommendations, not implemented changes. The next implementation stage should be scoped from this ordered list.

## Current status

- [x] Stage 1: foundation and MIDI normalization fixes.
- [x] Stage 2: occurrence-aware score/playback mapping.
- [x] Stage 3: Realtime attack matching and results.
- [x] Stage 4: Wait Mode, corrected to immediate silent stepping.
- [x] Stage 5: playback speed and occurrence-aware section loops implemented; user confirmed loop and tempo work locally.
- [x] Stage 6: notation outlines and six-string fretboard display implemented; user confirmed blue/green feedback with a MIDI piano. Other visual/hardware checks remain pending.
- [x] Stage 7: Wait chord matching options implemented, with configurable Together window; awaiting local validation.
- [x] Stage 8 first increments: Pause/Resume and completion-summary retention, occurrence/pass-aware Wait wrong-pitch history, red completed-target summaries, live/retained actual pitch labels and visibility options; 99 tests pass. New attempt here is available in both modes. Realtime Pause protection now follows the Pause action rather than a predicted beat and ignores queued non-seek rollback while paused; local acceptance remains required. Local acceptance and precise glyph/verified-Hex live fret increments remain pending (STAGE-8.md).
- [x] User confirmed repeat playback works.
- [x] User confirmed corrected Wait Mode works with their local setup.
- [x] User confirmed both hex and poly MIDI modes work with their setup.
- [x] User confirmed Realtime green/correct and red/missed feedback works locally.
- [ ] Finish broader verification of timing, pause/seek/mode switching, per-string identity, and Together chord cases. Implementation tests do not prove every hardware/browser case.

## Stage 8 progress against the agreed feedback specification

Implemented: unchanged-position native seek retention and native Pause beat-start snap retention through Pause/Resume; final Realtime summary through automatic completion rewind; Wait wrong-pitch history through solving/retries/pause; red completed target outlines versus clean green; independent live releases; standard-notation actual pitch-name/MIDI labels at target bounds; history visibility and previous-pass review with fresh pass scores. Scoring formulas remain unchanged; duplicate required-pitch penalties remain distinct from received-wrong pitch history.

Pending next increments: precise wrong-note staff glyphs and temporary detected-fret markers gated on **explicitly verified** Hex mapping. Existing channel selection alone is not verification. Current notation labels are accurate pitch detail, not positioned notehead glyphs. Run Stage 8 local acceptance before expanding these adapters. See STAGE-8.md for implemented behavior, edge cases, limits and next steps. The agreement below remains the intended final behavior; its latest rules still override older proposals.

## Ordered next priorities

1. **Validate score retention around Pause/resume.** The reported Realtime reset was reproduced through the full alphaTab API Pause handler and fixed (94 automated tests pass); user confirmed Wait retention, while this Realtime follow-up still needs local acceptance. Preserve results and feedback on Pause and ordinary Resume. Practice → **New attempt here** clears the percentage, outlines, and Wait history/partial chord without moving the cursor or changing running/paused state; targets before the current position are excluded from the new attempt. Clear when Reset/restart, a new score, or this explicitly new attempt starts; replay after completion starts a new attempt. Do not reset on every Play click, because Play also resumes. Investigate native seek/state notifications before assigning a cause. Keep the existing fresh score per loop pass for now; retaining the previous pass summary is a separate enhancement.
2. **Retain Wait mistake history, with different notation and tab displays.** Eventually solving a target must not erase earlier incorrect attempts. On tablature, circle the completed target red if any wrong pitch was attempted while that target was active; use green only for completion without wrong pitches. Red replaces green at an error target: do not stack both colors or draw every historical wrong pitch on tab lines. This must communicate mistakes even when standard notation is hidden. For a chord, use one target-level error outcome rather than guessing which chord tone an incorrect pitch was intended to replace. On standard notation, show the actual wrong pitches in red while held, hide those live markers on release, and show retained wrong-pitch history at the corresponding target position once the target is completed. Offer feedback visibility options. Implement reliable history and tab error markers first, then actual wrong-pitch notation where placement is reliable. Separate repeated occurrences and loop passes in the history. Keep Together timeouts/retries distinct from wrong pitches, and keep scoring rules explicit rather than silently changing the percentage formula.
3. **Validate hardware/transport and define tracking tolerance.** Hex/poly basic operation is confirmed; validate every string's channel identity, Together strums/latency, pause/resume, seeks, repeats, loop boundaries, resizing, and note release. Cover the reported score reset and Wait-history scenarios as they are fixed. For audio-to-MIDI input, distinguish received wrong pitches from expected pitches not received; do not pretend MIDI alone can establish whether a missing pitch was a playing error or a tracking omission. Test dense/classical chords, overlapping notes, repeated attacks, and duplicate pitches. Consider an explicit, adjustable tracking-tolerance profile after tests, without silently accepting missing chord tones or weakening every user's grading. Existing Collect/Together settings already provide chord accumulation/window options.
4. **Refine menus and feedback layout against Piano Trainer Studio.** Preserve the deferred Tempo/Loop refinement below. Capture the user's actual menu logic and examples before copying controls. Keep notation readable and tab fret numbers unobscured. Instrument-specific controls should appear only for the relevant instrument if a unified app is later chosen.
5. **Persist useful preferences and guitar profiles.** MIDI device/channel block, channel order, latency, chord mode/window, and display preferences are candidates; validate saved settings against the current device/score. Do not restore stale grading as a new attempt. Score library improvements remain a separate follow-up.
6. **Add optional reversed hex mapping and exact-string grading.** Preserve the current working channel-1 default. Reverse the mapping inside the selected six-channel block (e.g. channels 1–6), rather than subtracting from channel 1. A string-by-string calibration/display check should confirm direction. UI fretboard mirroring is a different setting. Exact-string grading remains opt-in and requires verified channel mapping. App remapping does not establish that a physically reversed pickup is supported by its manufacturer.
7. **Evaluate a piano alphaTab prototype before a rewrite or merger.** Keep the current OSMD piano application working. Test a separate small prototype against representative piano MusicXML: two staves, hand selection, dense chords/voices, repeats/endings, ties, pedal behavior, and stable feedback positioning through resize/zoom. Compare actual results with the current piano app. Only then decide whether migration and a shared instrument-selector app are worthwhile; hide hand/LED/MIDI-output controls by instrument where appropriate. MIDI input channels and score staves are separate concepts: two piano staves need not require two keyboard input channels.

Recommended next stage: priorities 1–2, with focused validation from priority 3. The later items are ordered follow-ups, not a commitment to implement them all in one stage.

## Latest agreed Wait feedback specification

This specification includes the user's final clarification and overrides earlier tab mockups/inference proposals for the default feedback flow. Stage 8 implements the history/summary and pitch-label increments documented above; precise notation glyphs and verified-Hex live fret labels remain pending.

| Moment/view | Planned behavior |
| --- | --- |
| Active target | Keep the original expected tab fret numbers readable. Preserve current-target guidance without obscuring the score. |
| Wrong note held, verified Hex | Show a temporary red detected fret beside the expected fret on the detected string; for example, expected B-string fret 1, detected fret 2. Never replace the written 1. Derive fret only when channel/string, tuning/capo/transposition, and pitch interpretation are valid. |
| Wrong note released, verified Hex | Remove its temporary wrong-fret marker. Keep the internal error record. Multiple held notes require independent release handling. |
| Wrong note, Poly/unverified mapping | Do not display a guessed fret as confirmed. Use target-level tab error feedback and actual received-pitch feedback on notation. Contextual inference remains optional later detail, not the default live tab marker. |
| Target completed, tab | Remove temporary wrong-fret markers; circle the original expected target red if any wrong pitch was attempted, otherwise green. Red means completed after errors, not that the target was never solved. Do not retain the list of wrong fret numbers. |
| Wrong note held/released, standard notation | Show its actual pitch in red while held; hide that live marker on release. |
| Target completed, standard notation | Show the retained wrong-pitch history at that target's score position for later review. Keep this independent of the compact tab summary and feedback visibility settings. |

For ambiguous chord errors use a target-level summary, not an invented assignment to a specific expected chord tone. Hex live markers identify the detected string, not necessarily the intended target string. These rules describe pitch grading; wrong-position feedback for future strict string grading must be separately defined. Pending/missing notes and Together retries are not wrong-pitch attempts. Keep history occurrence/pass-aware and preserve it on Pause/Resume under priority 1. Build stable history/tab summary first; live wrong-fret and actual wrong-note glyph placement may be separate increments if needed.

## Starting a new development chat

Upload the latest complete GuitarTrainerStudio project ZIP with these updated docs included. This documentation-only ZIP is not the application source. Read TODO.md for priorities/specification, DEV-NOTES.md for decisions, ARCHITECTURE.md for boundaries, and STAGE-1 through STAGE-8 for prior implementation/tests. Current source and user confirmations govern status; pending proposals must not be reported as already implemented. Unresolved choices such as Follow semantics, harmony rules, exact-string behavior, scoring formula changes, and precise glyph layout require a focused scope rather than assumptions.

Suggested prompt:

> Continue Guitar Trainer Studio from the attached latest project. First read docs/TODO.md, docs/DEV-NOTES.md, docs/ARCHITECTURE.md, and the relevant stage notes. Preserve the existing UI and native alphaTab behavior; make small modular changes and deliver a verified project ZIP. Begin with score retention through Pause/Resume, then the documented Wait mistake-history feedback. Preserve expected tab fret numbers: temporary red wrong-fret guidance only with verified Hex mapping, disappearing on release; after completion leave red on the original target if wrong pitches occurred, green otherwise. Poly must not claim a known string/fret. Standard notation gets live and retained actual wrong-pitch feedback. Inspect the current source before fixing behavior, run relevant checks, and update the docs. Keep deferred chord/harmony/media features and the piano app outside this stage.

## Screenshot clarification and core release checks

Reviewed all 13 supplied screenshots in filename order on 2026-10-10 (2026-10-09 234820 through 2026-10-10 000637). They provide direct excerpts beyond the earlier conversation-search summaries; the 000005 screenshot is the project sidebar, not an additional feature request. Earlier assistant recommendations are proposals, not automatically agreed requirements. The following details supplement priorities 2–6; the later feature ladder below remains deferred.

- [ ] **Separate input capability, grading policy, and score display.** Keep pitch grading the default for both Poly and Hex; adding string information must not silently enable stricter grading. Future selectable Pitch / String-position grading is independent of notation/tab/both viewing. Gate string-position grading on verified physical-string mapping. Green in pitch mode confirms pitch, not necessarily the written fingering.
- [ ] **Do not equate MPE channels with physical strings.** Per-note channel allocation is not a verified string mapping. Use explicit source/mapping configuration; do not automatically route an MPE poly stream through the six-string hex mapping just because it uses several channels. Preserve the common normalized pitch/time/velocity/optional-string contract and one shared practice engine rather than implementing separate Fishman/MIDI Guitar scoring engines.
- [ ] **Normalize expected targets to sounding pitch.** Include guitar octave-transposing notation, tuning, capo, and track transposition in Guitar Pro/MusicXML regression checks. Displayed written pitch and sounding MIDI pitch can differ.
- [ ] **Evaluate the chord as a whole before attributing a wrong pitch.** Match already-correct tones first; any later inferred expected-note association must have an unambiguous explanation. Do not use nearest-pitch matching to assign arbitrary wrong frets in dense chords/overlapping voices. Optional semitone/fret-offset details belong in a clearly labeled detail view; Poly inference is not confirmed position. Retained tab feedback continues to use the latest red/green target summary, not the older red detected-fret mockup.
- [ ] **Calibrate latency and tracking tolerance per setup.** Retain the implemented latency control and Together window, then validate with real input. The screenshots propose 150–250 ms chord settling as another starting range, not an agreed replacement for the current 200 ms Together default or a reason to add mandatory note duration. Any brief/low-velocity stray-note filter must be optional and must not discard legitimate soft/short/repeated notes. Preserve distinct received-wrong, not-received, and retry outcomes.
- [ ] **Run a small real-practice acceptance set.** One TrueFire lick, one jazz chord/voicing exercise, and one classical/fingerstyle passage on the intended guitars, including the Cordoba's existing piezo/audio-to-MIDI setup where available. Compare usable practice results and setup effort, not just whether MIDI arrives. Record notation-only, tab-only, repeats, chords, score retention, and input mode outcomes before recommending major new hardware/content conversion or feature expansion.
- [ ] **Scope Follow mode separately.** A screenshot includes Follow in a proposed core checklist, but current validated stages establish Wait/Realtime. Define whether Follow means cursor following received notes, accompaniment following the player, or another behavior before implementation. Do not silently add it to the next bug/feedback stage or claim it is complete.

## Deferred feature ladder after reliable piece practice

These are captured proposals, not additions to the next stage. Keep Guitar Trainer and Piano Trainer independently usable; sharing selected practice logic later does not require merging their UIs or rewriting the working piano app. The optional piano alphaTab experiment above is a separate evaluation, not a prerequisite for this ladder.

1. **Flexible chord practice.** Distinct from Collect/Together, which only changes attack collection timing. Offer Exact written voicing, Guide tones, and Flexible allowed voicings from explicit chord symbols/definitions. Define required 3rd/7th, permitted omissions/extensions, bass requirements, minimum note counts, octave treatment, and handling of extra tones. Do not accept arbitrary two chord tones as a complete seventh chord. Keep classical note-for-note grading exact; jazz harmony rules must be a deliberate mode. Example: an explicitly configured Cmaj7 guide-tone exercise may accept E and B without requiring C/G.
2. **Generated technique exercises.** Scales, triads/inversions, arpeggios, and chord inversions from a small shared exercise module; configurable guitar string sets/fretboard positions. Pitch checks work with Poly; position checks require validated Hex. These need not depend on importing every exercise as Guitar Pro/MusicXML. Scope one exercise type first.
3. **Harmony Explorer.** Use explicit chord symbols or a chord timeline to update chord tones, guide tones, and optional scale choices over progressions. Guitar can show positions/CAGED regions; piano can use keyboard highlights in a separate interface. Start as a separate module, not a full improvisation tutor or audio chord-recognition project. Do not grade free improvisation as binary right/wrong; any later observations should explain target selection/resolution.
4. **Local media synchronization research.** Investigate alphaTab-version support for synchronized local audio/video, Guitar Pro backing-track timing, and editing sync points. The screenshots describe this opportunity; compatibility with the bundled build has not been verified in this update. No automatic integration with hosted TrueFire/Soundslice playback is assumed. Prototype a score plus a user-provided recording only after core practice is useful.

Release focus: a practical companion for learning known pieces, not a replacement for course instruction or an entire learning platform. Scale/chord/harmony expansion should follow real practice benefit, not postpone fixing core feedback.

## Recovered cross-chat items: Hex/Poly feedback and tracking

Relevant portions of “Guitar Trainer Strategy Shift” and “Midi Guitar 3 Licenses” were recovered from conversation search on 2026-10-10, then supplemented by the user's chronological screenshots. Complete transcripts were not available. Current implementation and the user's latest tab rule supersede older recommendations.

| Feedback/grading | Poly / single-channel input | Hex / verified per-string channels |
| --- | --- | --- |
| Standard notation wrong-note detail | Actual received MIDI pitch; no string claim. | Actual received MIDI pitch, optionally associated with its channel-derived string. |
| Wait completed tab target | Red after a wrong-pitch attempt, otherwise green; no historical wrong fret numbers. | Same red/green summary; no historical wrong fret numbers. |
| Tab pitch grading with notation hidden | Compare received pitches with scored target pitches; visible standard notation is not required. | Same pitch grading, with optional stricter string criteria only when implemented/configured. |
| Correct pitch on a different string | Cannot establish the played string from pitch-only input; do not grade it as a wrong string. | Can compare channel-derived string with expected string after mapping validation; exact-string grading remains deferred/opt-in. |
| Played fret display | A pitch can have several fret/string positions; show candidates or clearly labeled inference, not an exact detected position. | Can derive a candidate fret from received pitch and known string/tuning; validate capo, transpose, bends, and channel direction before calling it exact. |
| Expected chord pitch not received | Pending in Wait; once a Realtime window closes it may be missed/not detected, distinct from a received wrong pitch. | Same outcome distinction; per-string sensing does not eliminate all input errors. |

- [ ] Apply these rules to both feedback views, including tab-only viewing and toggling notation mid-attempt. Preserve the source score's fret numbers; do not replace them with guessed wrong frets. The older suggestion to display actual wrong frets on tabs is superseded for retained history by the latest user decision.
- [ ] Store distinct received-wrong, pending/not-received, completed-with-errors, and completed-clean outcomes. Define how these affect the percentage before changing its formula. A missing MIDI note does not carry a trustworthy cause/confidence score by itself.
- [ ] Test source-appropriate chord tolerance with Fishman and MIDI Guitar 3, using the same representative passages. Existing Collect/Together mechanics are implemented; adjustable filtering/settling or additional profiles are proposals, not existing features. Reassess the previously suggested 100–200 ms settling range from measured behavior rather than imposing it globally. Avoid filtering intentional short/repeated notes.
- [ ] Retain clean separation between Practice Track, visible tracks, and playback/mute choices during UI changes; displaying all tracks must not automatically grade all tracks.
- [ ] During the menu pass, verify older UI requests: Play/Pause toggle, song name/score percentage, optional fretboard via Display, vertical score scrolling, functional/styled fullscreen, responsive Tempo/Loop controls, and menus appearing above the playback cursor. Check current behavior before labeling any of these a new missing feature.
- [ ] Keep Jam Origin SDK/WebSocket integration as optional research only. Ordinary MIDI remains the current integration path. Consider an adapter only if verified API capabilities provide useful information absent from the existing MIDI stream; do not assume standard poly input gains reliable string identity or confidence metadata.

Already addressed in Stages 1–7: MIDI normalization/held-note tracking, repeat-aware targets, Realtime and Wait foundations, chord collection and Together window, tempo/loops, and basic score/fretboard overlays. These remain regression/edge-case checks, not requests to rebuild them. Future scale/chord-tone/improvisation tools remain later ideas after reliable note-for-note training.

## Format and Fishman findings

- The bundled alphaTab importer list includes Guitar Pro 3–8, MusicXML, Capella, and alphaTex. It does not include a MIDI-file-to-score importer. MIDI synthesis/playback/export support is not evidence that this app can load a .mid file as sheet music.
- alphaTab documents mature MusicXML support, but not complete MusicXML feature/layout support. Piano migration needs a repertoire-based trial, not an assumption that alphaTab will solve every OSMD issue.
- Fishman's TriplePlay Utility manual documents poly on channel 1 and mono/hex on channels 1–6, with high E on 1 and low E on 6. No pickup-orientation/channel-reversal setting was found in that manual. Do not claim that every Fishman software/firmware version lacks one; confirm the user's exact model/software before advising a physical reversal.
- Sources checked 2026-10-10: https://www.alphatab.net/docs/formats/musicxml ; https://fishman.com/wp-content/uploads/2025/01/TriplePlayUtility-UserGuide.pdf (channel-mode section, printed page 13); bundled assets/vendor/alphatab/alphaTab.js, Environment.buildImporters().

## Next checks and proposed stage

- [ ] Complete Stage 5 edge-case checks as needed: pause/Stop, disabling loops, mode changes, loading a new score, and repeated-measure selection. Basic loop and tempo behavior is user-confirmed; individual edge cases have not all been explicitly confirmed.
- [ ] Validate Stage 6: notation alignment, repeats/loop resets, chord feedback, fretboard tuning/capo/string labels, note release, left-handed orientation, resize/scroll, and mode changes.
- [ ] Validate Stage 7: Together expiry/retry, chords within the window, Pause/resume, mode changes, and section loops. Check guitar strum/MIDI timing when guitar hardware is available.
- [x] Stage 8 implements retention and the first Wait-history/display increments; follow STAGE-8.md for remaining precise-glyph and verified-Hex marker work, following the latest specification.

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
