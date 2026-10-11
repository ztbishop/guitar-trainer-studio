# Guitar Trainer Studio: status and to-do

Updated 2026-10-11. This is the central status and priority list. Stage files retain implementation details and checks; DEV-NOTES records decisions. Proposed items below are recommendations, not implemented changes. The next implementation stage should be scoped from this ordered list.

## Current workflow and specification — 2026-10-11

### Tempo menu refinement — implemented 2026-10-11

- [x] Compact Piano-style Tempo layout: editable BPM, linked speed slider/number box, and reset. Native speed range remains 25–200%; source tempo map is preserved. Realtime BPM shows effective tempo at the current position; missing initial tempo falls back to native 120 BPM.
- [x] Stacked five-step buttons for BPM, speed and volume; up from 103 goes to 105 then 110, down to 100 then 95. Direct entries can remain off-grid. Edited numbers commit on change, Enter or blur.
- [x] Native Sonivox metronome, linked volume controls, and functional Tempo-button visual pulse. Defaults: metronome off, volume 75% (saved volume overrides default), visual pulse checked. Volume/visual controls gray out with metronome off. Accented downbeat is a disabled, explicitly labeled placeholder. MIDI Out click is omitted.
- [x] Latest owner clarification: Wait metronome is independent of cursor/user pace. It runs at the selected BPM while Wait is active, stops on Pause/Reset/completion, and does not restart for solved notes or loop passes. Entering Wait latches the source tempo at that position; later score tempo changes do not change its rate. BPM/speed edits in Wait adjust the click without pausing/resetting results; Realtime retains its existing pause/reset behavior. Accompaniment remains paused in Wait.
- [x] Metronome volume persists in localStorage; other metronome preferences remain session-only. No output routing, grading changes, or version bump.
- [x] 152 automated tests pass after the timing/restart fix: native Sonivox click rendering, repeated Wait restarts, audio-clock/visual alignment calculations, cancellation and saved volume. Actual GP3 browser smoke checks verified 200 BPM, pulse in both modes, Wait restart and volume retention. Earlier desktop/390px layout checks remain applicable.
- [ ] Separately scope Realtime speaker/input latency calibration: current grading has manual input compensation but does not automatically account for speaker output latency. Grading unchanged in this task.
- [ ] Owner listening/Fishman checks: native click tone/volume and beat alignment; continue solving Wait targets across tempo changes/loops at a steady click; change BPM while retaining errors/partial chords; verify Pause/Resume, Reset, completion, and new-score loading.

The current baseline is **Beta v0.0.3**; `version.json` records `0.0.3`. The owner approved this checkpoint after the Tempo/metronome update and will create the `v0.0.3` tag after committing the metadata/documentation update. Earlier tags, including `v0.0.2`, remain unchanged. This version update changes no runtime behavior and does not establish full browser/Fishman acceptance.

Read root README.md and AGENTS.md when starting a task. Work directly in this folder, preserve VS Code Live Server and the owner's normal browser/Fishman Connect testing, and leave commits/tags/pushes/deployment to the owner unless requested. Documentation carries durable decisions between chats; full chat history is not assumed to be available. Earlier ChatGPT history is in **Guitar Trainer** if accessible.

Current feedback uses one Staff control, independent tab highlights/fret numbers, and optional default-off Poly inference. Hex numbers require configured channels and valid score interpretation, not a mandatory setup/verification button. Poly numeric inference is implemented for an unambiguous remaining written note; it is not physical string detection or strict-position grading. Both Hex and inferred Poly numbers are plain red numbers with translucent backing, native tab font size, and side placement; no tilde, numeric border, pointer, or custom staff spacing. Accepted tones stay green under the latest mode-specific rules; genuine wrong-pitch history is retained.

This summary and the latest user instructions override older dated entries below. Those entries and stage documents preserve historical ZIP instructions, control labels, whole-chord error rules, and earlier inference limitations; do not treat them as current requirements. The latest agreed Wait feedback table remains applicable with these clarifications.

- [x] Document direct local editing and standing agent instructions; align version metadata with the existing beta baseline.
- [x] Baseline verification: 142 tests pass; all 23 application JavaScript modules pass syntax checks.
- [ ] Complete browser/Fishman acceptance for Realtime retention, chord timing, releases, channel identity, loops/seeks, and visual layout. Existing user confirmations are narrower than full acceptance.

## Dated feedback implementation history

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

User confirmed live circles work and clarified completed chord behavior: a clean lower tone must remain green when the higher tone had mistakes. This supersedes earlier whole-chord-red rules for configured Hex input. Wait now retains each slot's written string and publishes completed error colors only for slots whose string has a received-wrong-pitch record. Realtime tab summaries use the same per-string rule; Realtime standard notation retains its existing hit/missed colors. Unknown/invalid Hex string metadata keeps the conservative whole-target summary. Poly now preserves accepted green tones, with optional single-remaining-note inference as specified above. Errors on a detected string absent from the written target retain history/fret detail without accusing clean written tones. This is display attribution, not strict-position grading or an inferred intended pitch.

The measure 83 case was tested using both correct pitches on MIDI channel 4 in Wait and Realtime. Both are accepted, remain green, produce 100% accuracy and zero wrong-fret labels. This passed even against the previous version: there is no channel-mismatch rejection to remove. The supplied screenshot's retained fret 17 therefore cannot be explained by those two correct attacks alone; the original score/MIDI sequence is needed if it recurs. Do not erase genuine earlier wrong-pitch history just because all required tones were eventually satisfied. No special completion exception or scoring change was added.

131 tests pass. New regressions exercise measure 85's Bb dyad and measure 83's D dyad through normalized MIDI, Wait controller publication and Realtime finalization; three chord regressions fail against the prior update. Native tab geometry now verifies two green tones plus one red completed-error tone across four profiles and three scales. Browser/physical MIDI acceptance remains local. Apply this changed-files ZIP after the live-circles update. No version/tag bump, menu restructuring, deferred features or Piano Trainer changes.

## Earlier feedback update (superseded control labels and inference limits)

Live Hex wrong-pitch circles now appear immediately around pending expected frets on the detected string in Wait and Realtime. Accepted partial chord tones remain green. Release restores pending guidance; Hex completion retains red only on strings with recorded wrong pitches, while Poly accepted tones remain green by default; optional unambiguous inference is described above. A detected string absent from the written target gets no guessed expected-fret circle. Physical Poly string detection and guessed fret-number detail remain deferred; optional remaining-note inference is implemented above. Circles work with fret details hidden and are independent of notation options.

The notation switches were overlapping master/detail controls, not duplicate functions: **Show all notation feedback** controls expected colors plus live/history noteheads; **Notation: show held wrong pitches** and **Notation: show completed mistake history** filter only their respective noteheads within that master. Labels/help now explain this. Hiding completed history retains expected target colors and tab feedback; hiding all notation hides both. The Practice menu stays unchanged.

139 tests pass. Local acceptance: hold/release wrong Hex notes on pending chord strings, retain green accepted tones, solve with errors, test multiple independent releases, and toggle notation/circles/frets separately in both modes. Physical MIDI/browser acceptance remains pending.

## Current status

- [x] Stage 1: foundation and MIDI normalization fixes.
- [x] Stage 2: occurrence-aware score/playback mapping.
- [x] Stage 3: Realtime attack matching and results.
- [x] Stage 4: Wait Mode, corrected to immediate silent stepping.
- [x] Stage 5: playback speed and occurrence-aware section loops implemented; user confirmed loop and tempo work locally.
- [x] Stage 6: notation outlines and six-string fretboard display implemented; user confirmed blue/green feedback with a MIDI piano. Other visual/hardware checks remain pending.
- [x] Stage 7: Wait chord matching options implemented, with configurable Together window; awaiting local validation.
- [x] Stage 8 first increments: Pause/Resume and completion-summary retention, occurrence/pass-aware Wait wrong-pitch history, red completed-target summaries, live/retained wrong-pitch feedback and visibility options; 124 tests pass. Wrong-pitch notation now uses staff-positioned red noteheads with key-aware explicit accidentals; expected notation feedback uses filled noteheads while tab keeps outlines. New attempt here is available in both modes. Realtime Pause protection now follows the Pause action rather than a predicted beat and ignores queued non-seek rollback while paused; local acceptance remains required. Live and retained Hex fret feedback for Wait/Realtime, configured Hex channel feedback and the tab display switch are implemented; physical MIDI/side-layout acceptance remains pending (STAGE-8-TAB.md).
- [x] User confirmed repeat playback works.
- [x] User confirmed corrected Wait Mode works with their local setup.
- [x] User confirmed both hex and poly MIDI modes work with their setup.
- [x] User confirmed Realtime green/correct and red/missed feedback works locally.
- [ ] Finish broader verification of timing, pause/seek/mode switching, per-string identity, and Together chord cases. Implementation tests do not prove every hardware/browser case.

- [x] Notation feedback correction: all live/retained wrong pitches stay in their own target’s horizontal cursor column, even when they overlap vertically. No sideways collision spreading; user confirmed the corrected alignment works.

## Stage 8 progress against the agreed feedback specification

Implemented: unchanged-position native seek retention and native Pause beat-start snap retention through Pause/Resume; final Realtime summary through automatic completion rewind; Wait wrong-pitch history through solving/retries/pause; red completed target outlines versus clean green; independent live releases; standard-notation red wrong-pitch noteheads at their played staff positions, key-aware explicit accidentals and ledger lines; filled expected-notehead feedback; history visibility and previous-pass review with fresh pass scores. Scoring formulas remain unchanged; duplicate required-pitch penalties remain distinct from received-wrong pitch history.

Implemented latest increments: larger live numbers remain visible regardless of crowding/digit count; retain only the last wrong fret per detected string/target beside its string, without pointers or custom staff spacing. Wait and Realtime are supported. Active wrong pitches now also circle pending expected frets on their detected Hex strings in red, preserving accepted green tones and releasing independently. The user rejected the mandatory string-check button: it and its feedback gate are removed. Selecting Hex and the correct base channel enables numbers immediately; **Show tab feedback (frets)** controls numbers and **Show tab feedback (circles)** controls outlines independently. No calibration or verification state is required. Tuning/capo/transposition validation remains; Poly inference and future strict-string grading are separate. The latest side-placement and active-circle decisions supersede earlier above-tab/pointer/verification requirements in historical notes.

## Ordered next priorities

1. **Validate score retention around Pause/resume.** The reported Realtime reset was reproduced through the full alphaTab API Pause handler and fixed (94 automated tests pass); user confirmed Wait retention, while this Realtime follow-up still needs local acceptance. Preserve results and feedback on Pause and ordinary Resume. Practice → **New attempt here** clears the percentage, outlines, and Wait history/partial chord without moving the cursor or changing running/paused state; targets before the current position are excluded from the new attempt. Clear when Reset/restart, a new score, or this explicitly new attempt starts; replay after completion starts a new attempt. Do not reset on every Play click, because Play also resumes. Investigate native seek/state notifications before assigning a cause. Keep the existing fresh score per loop pass for now; retaining the previous pass summary is a separate enhancement.
2. **Retain Wait mistake history, with different notation and tab displays.** Eventually solving a target must not erase earlier incorrect attempts. On tablature, circle the completed target red if any wrong pitch was attempted while that target was active; use green only for completion without wrong pitches. Red replaces green at an error target: do not stack both colors or draw every historical wrong pitch on tab lines. This must communicate mistakes even when standard notation is hidden. For unknown Hex strings use one target-level error outcome. Poly keeps confirmed correct tones green and shows received wrong pitches separately, with optional single-remaining-note inference. Configured Hex summaries now mark only expected tones on strings with recorded wrong pitches, preserving clean tones green without guessing intended replacement pitches. On standard notation, show the actual wrong pitches in red while held, hide those live markers on release, and show retained wrong-pitch history at the corresponding target position once the target is completed. Offer feedback visibility options. Implement reliable history and tab error markers first, then actual wrong-pitch notation where placement is reliable. Separate repeated occurrences and loop passes in the history. Keep Together timeouts/retries distinct from wrong pitches, and keep scoring rules explicit rather than silently changing the percentage formula.
3. **Validate hardware/transport and define tracking tolerance.** Hex/poly basic operation is confirmed; validate every string's channel identity, Together strums/latency, pause/resume, seeks, repeats, loop boundaries, resizing, and note release. Cover the reported score reset and Wait-history scenarios as they are fixed. For audio-to-MIDI input, distinguish received wrong pitches from expected pitches not received; do not pretend MIDI alone can establish whether a missing pitch was a playing error or a tracking omission. Test dense/classical chords, overlapping notes, repeated attacks, and duplicate pitches. Consider an explicit, adjustable tracking-tolerance profile after tests, without silently accepting missing chord tones or weakening every user's grading. Existing Collect/Together settings already provide chord accumulation/window options.
4. **Refine menus and feedback layout against Piano Trainer Studio.** Preserve the deferred Tempo/Loop refinement below. Capture the user's actual menu logic and examples before copying controls. Keep notation readable and tab fret numbers unobscured. Instrument-specific controls should appear only for the relevant instrument if a unified app is later chosen.
5. **Persist useful preferences and guitar profiles.** MIDI device/channel block, channel order, latency, chord mode/window, and display preferences are candidates; validate saved settings against the current device/score. Do not restore stale grading as a new attempt. Score library improvements remain a separate follow-up.
6. **Add optional reversed hex mapping and exact-string grading.** Preserve the current working channel-1 default. Reverse the mapping inside the selected six-channel block (e.g. channels 1–6), rather than subtracting from channel 1. A string-by-string calibration/display check should confirm direction. UI fretboard mirroring is a different setting. Exact-string grading remains opt-in and requires verified channel mapping. App remapping does not establish that a physically reversed pickup is supported by its manufacturer.
7. **Evaluate a piano alphaTab prototype before a rewrite or merger.** Keep the current OSMD piano application working. Test a separate small prototype against representative piano MusicXML: two staves, hand selection, dense chords/voices, repeats/endings, ties, pedal behavior, and stable feedback positioning through resize/zoom. Compare actual results with the current piano app. Only then decide whether migration and a shared instrument-selector app are worthwhile; hide hand/LED/MIDI-output controls by instrument where appropriate. MIDI input channels and score staves are separate concepts: two piano staves need not require two keyboard input channels.

Recommended next stage: priorities 1–2, with focused validation from priority 3. Notation-first visual refinement is implemented in STAGE-8-NOTATION.md; validate it before adding Hex tab detail. The later items are ordered follow-ups, not a commitment to implement them all in one stage.

## Latest agreed Wait feedback specification

This specification includes the user's final clarification and overrides earlier tab mockups/inference proposals for the default feedback flow. Stage 8 implements the history/summary and notation feedback increments documented above; notation noteheads/accidentals are implemented; configured-Hex live/retained fret labels are implemented in both modes; physical MIDI and retained-lane layout acceptance remain pending.

| Moment/view | Planned behavior |
| --- | --- |
| Active target | Keep original expected frets readable. Configured Hex wrong pitches held on pending written strings circle those expected frets red immediately; accepted partial chord tones stay green. Release restores pending guidance. No expected fret on the detected string means no invented circle. Poly does not identify physical strings. Optional remaining-note inference can mark a pending expected note/fret red without claiming string detection. |
| Wrong note held, configured Hex | Show one latest active red detected fret per string beside the expected fret, with a translucent background. Use the native tablature font size (14px by default) at normal zoom; keep full digits visible even when crowded; no live pointer; for example, expected B-string fret 1, detected fret 2. Never replace the written 1. Derive fret only when configured channel/string, tuning/capo/transposition, and pitch interpretation are valid. |
| Wrong note released, configured Hex | Remove its temporary wrong-fret marker. Keep the internal error record. Multiple held notes require independent release handling. |
| Wrong note, Poly/unverified mapping | Do not display a guessed fret as confirmed. Poly retains green accepted tones and actual received-pitch notation history. Optional inference marks only the sole remaining written note captured at a wrong attack; ambiguous cases stay unassigned. Unknown Hex string metadata retains its target-level summary. |
| Target completed, tab | Remove temporary wrong-fret markers; in Hex circle only expected tones on detected strings with wrong-pitch history red; clean tones remain green. Unknown Hex string errors keep the whole-target red summary. Poly accepted tones stay green by default; when inference is enabled, only uniquely associated wrong-note targets retain red in Wait. Red means completed after errors, not that the target was never solved. Retain only the last wrong fret per detected string beside that string, without pointers. Do not accumulate all attempts. |
| Wrong note held/released, standard notation | Show its actual pitch in red while held; hide that live marker on release. |
| Target completed, standard notation | Show the retained wrong-pitch history at that target's score position for later review. Keep this independent of the compact tab summary and feedback visibility settings. |

For ambiguous Poly chord errors keep confirmed green tones and show actual wrong-pitch history, without assigning a guessed red target. Unknown Hex string errors retain target-level summaries. Configured Hex uses detected-string history for per-string completed colors. Hex live markers identify the detected string, not necessarily the intended target string. These rules describe pitch grading; wrong-position feedback for future strict string grading must be separately defined. Pending/missing notes and Together retries are not wrong-pitch attempts. Keep history occurrence/pass-aware and preserve it on Pause/Resume under priority 1. History/tab summaries and actual wrong-note staff placement are implemented. The user confirmed notation placement and approved testing retained fret lanes. Validate both modes using STAGE-8-TAB.md.

## Starting a new development chat

Start a new chat in this same local project for each major task; keep implementation and follow-up testing for that task together. Read AGENTS.md, README.md, TODO.md for current priorities/specification, DEV-NOTES.md for decisions, ARCHITECTURE.md for boundaries, and relevant stage notes. Check Git status and inspect current source before editing. Edit this folder directly; ZIP exchanges are no longer required. Keep one coding chat actively editing the shared folder at a time.

Current source, the latest specification, and user confirmations govern status; pending proposals must not be reported as already implemented. Store decisions and validation results in the relevant documentation so future chats can recover context without relying on full transcripts. Unresolved choices such as Follow semantics, harmony rules, exact-string behavior, scoring formula changes, and unsupported notation layouts require a focused scope rather than assumptions.

Suggested prompt:

> Read AGENTS.md and the project documentation, check Git status, and continue with: [task description]. Edit this project directly, preserve the UI, native alphaTab behavior, and Live Server/browser WebMIDI workflow. Follow the latest agreed feedback specification, run appropriate checks, update relevant documentation, and explain what I should test locally. Provide a suggested commit description; leave commits, tags, pushes, and deployment to me. Keep deferred features and Piano Trainer changes outside this task.

## Screenshot clarification and core release checks

Reviewed all 13 supplied screenshots in filename order on 2026-10-10 (2026-10-09 234820 through 2026-10-10 000637). They provide direct excerpts beyond the earlier conversation-search summaries; the 000005 screenshot is the project sidebar, not an additional feature request. Earlier assistant recommendations are proposals, not automatically agreed requirements. The following details supplement priorities 2–6; the later feature ladder below remains deferred.

- [ ] **Separate input capability, grading policy, and score display.** Keep pitch grading the default for both Poly and Hex; adding string information must not silently enable stricter grading. Future selectable Pitch / String-position grading is independent of notation/tab/both viewing. Gate string-position grading on verified physical-string mapping. Green in pitch mode confirms pitch, not necessarily the written fingering.
- [ ] **Do not equate MPE channels with physical strings.** Per-note channel allocation is not a verified string mapping. Use explicit source/mapping configuration; do not automatically route an MPE poly stream through the six-string hex mapping just because it uses several channels. Preserve the common normalized pitch/time/velocity/optional-string contract and one shared practice engine rather than implementing separate Fishman/MIDI Guitar scoring engines.
- [ ] **Normalize expected targets to sounding pitch.** Include guitar octave-transposing notation, tuning, capo, and track transposition in Guitar Pro/MusicXML regression checks. Displayed written pitch and sounding MIDI pitch can differ.
- [ ] **Evaluate the chord as a whole before attributing a wrong pitch.** Match already-correct tones first; any later inferred expected-note association must have an unambiguous explanation. Do not use nearest-pitch matching to assign arbitrary wrong frets in dense chords/overlapping voices. Optional semitone/fret-offset details belong in a clearly labeled detail view; Poly inference is not confirmed position. Retained Hex tab feedback adds the last detected wrong fret per string/target beside its string without pointers, alongside target colors. Conservative Poly remaining-note inference is now implemented as an optional display setting.
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
| Wait completed tab target | Accepted tones green by default; optional inference retains red only at the uniquely associated note. No detected fret numbers. | Red on expected strings with recorded wrong pitches; clean strings green. Last detected wrong fret per string stays beside that string, without pointers. |
| Tab pitch grading with notation hidden | Compare received pitches with scored target pitches; visible standard notation is not required. | Same pitch grading, with optional stricter string criteria only when implemented/configured. |
| Correct pitch on a different string | Cannot establish the played string from pitch-only input; do not grade it as a wrong string. | Can compare channel-derived string with expected string after mapping validation; exact-string grading remains deferred/opt-in. |
| Played fret display | A pitch can have several fret/string positions; show candidates or clearly labeled inference, not an exact detected position. | Can derive a candidate fret from received pitch and known string/tuning; validate capo, transpose, bends, and channel direction before calling it exact. |
| Expected chord pitch not received | Pending in Wait; once a Realtime window closes it may be missed/not detected, distinct from a received wrong pitch. | Same outcome distinction; per-string sensing does not eliminate all input errors. |

- [ ] Apply these rules to both feedback views, including tab-only viewing and toggling notation mid-attempt. Preserve the source score's fret numbers; do not replace them with guessed wrong frets. The latest user decision retains only the last Hex wrong fret per detected string/target beside that string without pointers; Poly inference marks expected positions without claiming detected frets.
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
- [x] Stage 8 implements retention and the first Wait-history/display increments; follow STAGE-8.md and STAGE-8-NOTATION.md for notation validation and temporary verified-Hex markers and their hardware acceptance, following the latest specification.

## Deferred Tempo and Loop menu refinement

- [x] Tempo refinement implemented from the owner's screenshots and clarification above.
- [ ] Loop menu refinement remains a separate task; its existing occurrence-aware controls are preserved.
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

## Notation appearance: implemented, local validation pending

- [ ] Validate the implemented Piano Trainer-style filled notation noteheads and separate wrong-pitch red dots/accidentals; retain tab outlines.
- Tab retains outlines so fret numbers remain readable. Standard notation now uses filled green/red noteheads with blue current-target guidance. New browser/hardware acceptance remains pending.

## Other planned work

- [x] Initial notation correctness feedback and functional six-string virtual fretboard.
- [ ] Refine visual feedback and fretboard ergonomics based on Stage 6 local testing.
- [ ] Exact-position/string grading for configured hex MIDI.
- [ ] Preference persistence and score-library improvements after core practice is stable.
- [ ] Articulation edge cases and normalization limitations recorded in STAGE-2.

## Longer-term ideas

Follow mode, scale/chord-tone overlays, bass/extended-range support, alternate-tuning depth, and LEDs remain ideas rather than committed stage work. Preserve the existing UI and native alphaTab capabilities; avoid broad refactoring for these additions.
