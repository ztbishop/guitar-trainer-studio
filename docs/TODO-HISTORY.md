# Historical to-do entries

These entries record earlier plans, test results, and decisions through the v1.0.2 release. Checkboxes and labels such as pending or local only describe the status at the time. For the active checklist, use [Current status and to-do](TODO.md).

## v1.0.2 release preparation — 2026-11-20

- [x] Prepare high-level release notes and matching app version; verify regression tests and installed 1.9.0 asset hashes.
- [x] Owner selected v1.0.2 stable; publication uses the configured main branch and a new annotated tag, preserving existing releases.

## Native score layout restored — 2026-11-20

For the next alphaTab version, use the [saved-fixture qualification command](ALPHATAB-UPGRADES.md#qualifying-19-and-later-releases). A failed gate identifies what needs investigation.

Hard-refresh Trainer to use native beat placement. Hummingbird and the late-label fixture retain the written beat order. Dense annotations may overlap on the pinned 1.8.4 renderer. The 1.9 upgrade remains a separate qualification task. Start with the TAB string-line gap patch conflict and use the saved marked-score controls before retiring reader support. [Upgrade status](ALPHATAB-UPGRADES.md)

## Draft review and recording recovery complete — 2026-11-17

Use Clear reviewed notices → Use reviewed timing → Play when the reviewed candidate passes timing checks. The two review actions are adjacent and genuine boundary errors remain guarded. Terminal HTML recording errors now show Reload recording, retaining source/score/timing and paused position for an explicit retry. The owner's stall was a confirmed media read error at an unbuffered time; provider retry with the update is not yet a live acceptance. Preserve unsaved alignment before refreshing. Targeted automated checks pass; no catalog work is needed for this task. [Report and harness limitation](<../../../Lesson Bridge/docs/DRAFT-REVIEW-PLAYBACK.md>).

## Native repeat-bar batch complete — 2026-11-17

Native repeat-bar batch complete: 81421 and 81459/81460 now work directly from their original GPX files with complete Wait targets. That is three lesson references / two distinct recovered originals. Tapped/hammer notes, independent voices, let-ring guidance and internal tied sustains are retained. All actual notes and native playback remain unchanged; no alphaTab patch was added. All three affected lesson references pass actual local native import, complete Wait and cursor/fretboard checks; retained Soundslice routes remain verified. Hard-refresh Trainer and use the original GPX. No remaining native-practice blocker in these two files. Unproved boundary ties retain clear recovery guidance. This bounded task is at its stopping point. [Report](<../../../Lesson Bridge/docs/NATIVE-REPEAT-RECOVERY.md>).

## Targeted saved repeat/Soundslice checks complete — 2026-11-17

Targeted saved-repeat follow-up: three additional GPX originals plus 97826 control, seven Soundslice practice routes and eleven actual local imports checked. 97826 and Open D repeat sections pass complete native Wait; 81421’s tapped donors and 81459’s polyphonic let-ring donors retain explicit native guards and verified complete Soundslice practice fallbacks. All sampled Soundslice options pass with notes/ties intact. No runtime changes, video sync or catalog replay. Use complete Soundslice practice for 81421/81459; use native GPX for 97826 and 49482’s repeat sections. No new capture-generated success is counted. [Results and verification limits](<../../../Lesson Bridge/docs/REPEAT-SAMPLE-QA.md>).

## Native GPX simile Wait fix complete — 2026-11-17

97826’s native GPX now directly supplies all **214 played notes / 56 Wait groups**, recovering 79 notes in 14 repeat bars without changing its 135 written notes or the loaded score. The shared Trainer host fix supports proved simple/chained similes, including plain ties wholly inside a donor bar. Unsupported shapes clearly request an expanded practice score instead of silently omitting targets. Capture-only counts stay 499/500; the C/G source conflict remains unresolved. Hard-refresh Trainer; the raw original works directly. Targeted local import, five reader paths, genuine internal ties and six unchanged ordinary controls pass. No video sync/catalog replay. This task is at its stopping point. [Scope and evidence](NATIVE-SIMILE-PRACTICE.md).

## Node-4 shared reader fix complete — 2026-11-17

The approved marked native-duration Tap/node-4 pitch support is implemented and qualified in classic/core and both worker paths. 94723/94724 preserve all 295 notes/38 ties/257 Wait groups through actual local imports. Ordinary/unmarked originals remain native. All 43 patches and updater maintenance pass; no video sync or version/publication change. Hard-refresh both readers. [Use, targeted checks and source inventory](<../../../Lesson Bridge/docs/NODE4-HARMONIC-RECOVERY.md>). The remaining source slash-voicing ambiguity in 97826 is not a receiver defect; do not guess its music. Earlier inventories below are dated history.

## Consolidated offline practice regression — 2026-11-17

The complete saved practice corpus passes: 419 capture-generated score routes and 252 distinct original GPX/GP files representing 289 lesson/file references. Classic, core, classic-worker and core-worker readbacks preserve complete native pitches, string/fret, tuning/capo, clocks and ties; 2684 reader/worker cases pass. Real Trainer WaitSession with synthetic correct Poly input completes 79613 generated-score groups and 51782 original-file groups. All 364 qualified explicit Wait exports separately pass source/native/full-release readback. Other explicit Wait guards retain complete normal/native-grace/written-order score routes; no parts are silently dropped. No new runtime, reader, grading or vendor changes were needed.

Three retained GP5 fingerprints (20930/20963/20978) predated the approved nonadjacent grace-sustain fix. Replaying the frozen older timeline reproduces each old hash exactly. Current native tie endpoints prove four longer, correct releases; every other pitch, note, attack, tie and clock is unchanged. The practice baseline records are reconciled with that proof; this is not a new repair. Other 285 retained original comparisons are exact. Original recording-timing statuses/evidence remain unchanged and were not revalidated. No provider requests, live browser, audible alignment or hardware test occurred.

The user will continue additional courses: use targeted per-course GPX and Soundslice checks next and defer another consolidated run until a meaningful batch or shared runtime change. [Full offline result and limits](<../../../Lesson Bridge/docs/CONSOLIDATED-PRACTICE-REGRESSION.md>).

## Countrified marked-course transfer audit — 2026-11-17

All seven Countrified Rock Guitar Guidebook marked lessons have complete generated practice scores and readable original GPX files. The coordinated source fixes one narrowly proved v2 orphan start before an explicit different-fret hammer handoff at an exact barline, recovering 48993 with all 230 notes/21 actual connected ties retained. It reports the one unconnected start mark; provider playback and the native original confirm no tie there. No destination, attack or pitch is removed. Strict/default/timing qualification remains unchanged.

Fifteen actual local imports pass: all seven originals untimed, all five available original drafts, two Soundslice practice imports and normal Soundslice timing for 48990 with 18 supplied/applied points. Draft activation stays disabled. Full original bytes, notes, tuning/capo, clocks and tie links compare exactly; the course retains 1714 notes/57 ties. 72 source Node checks pass (two optional skips); nine exact practice controls and classic/core/stock readbacks pass. No Trainer runtime, alphaTab, receiver/grading/protocol/version change. Original timing still has zero accepted/five draft-only/two guarded pairs; the Soundslice ordinary-timing result is a separate route. Current source inventory: 419 complete generated scores; original timing 95 accepted/143 draft-only/50 blocked across 288 pairs. No full-catalog, live-audio or hardware acceptance is claimed. [Complete course evidence and options](<../../../Lesson Bridge/docs/COUNTRIFIED-COURSE-AUDIT.md>).

## Open D original GPX coverage completed — 2026-11-17

All 13 marked-course GPX originals now pass actual local Trainer untimed imports, expanding the initial two-file coverage. Original bytes, all 6703 notes/519 ties, source tuning/capo, native beat clocks and complete tie links compare exactly after import. Nine original timing routes pass native validation; 49467 needs draft review because its supplied timing lacks the final sounding endpoint. The three performances (49482/49487/49494) retain original untimed/manual imports; source-witness grammar prevents verified recording sync. An additional timed-original import (49458) and draft-review import (49467) pass, with draft activation paused and no autoplay/save. The two earlier originals have identical native fingerprints.

This completion changes documentation/evidence only; no new Trainer/runtime/reader/grading/protocol/version change. Both original GPX and generated practice availability are 13/13; earlier generated-score results remain valid. Overall source inventory stays 412 complete generated scores; original timing is now 95 accepted/138 draft-only/48 blocked across 281 pairs. Other courses were not replayed. The earlier two-original limitation is superseded. [Complete GPX status and scope](<../../../Lesson Bridge/docs/OPEN-D-GPX-AUDIT.md>).

## Open D marked-course practice audit — 2026-11-17

All 13 Soundslice-marked lessons in Acoustic Coffeehouse: Open D now provide complete generated practice scores; three new performance recoveries retain 4523 notes/452 ties. Full course proof retains 6703 notes/519 ties. The first ten captures use Open D; performances explicitly capture tuning one semitone lower with capos 3/0/5. The coordinated source preserves all tuning, capo, pitch/string/fret, attacks and ties while allowing the explicit v2 fretted TAB geometry to retain its captured piano sound preset and writing known navigation signs as guidance. Practice visits each written bar once, without jumps or recording sync. No instrument or tuning is guessed from the course title.

Five actual local imports pass: three recovered practice scores with full Wait/release checks, generated explanation/Skip for 49473, and original GPX timing for 49469. All nine classic/core/stock readbacks match; 32 source tests and 13 exact practice controls pass. The browser harness had confused same-string/same-pitch notes at one onset in different voices; matching source measure/voice/beat resolves that false duration failure without weakening any sustain assertion. The receiver was already correct: no Trainer runtime, reader, alphaTab, grading, protocol or version change. No live audible or hardware acceptance is inferred. The owner requested a bounded practice-first audit, excluding 37 unmarked lessons and deferring catalog replay. Current source inventory: 412 complete generated-score IDs; original timing 87 accepted/137 draft-only/46 blocked across 270 pairs. [Course baseline and verified options](<../../../Lesson Bridge/docs/OPEN-D-COURSE-AUDIT.md>).

## Jazz Discovery Vol. 3 held-out transfer audit — 2026-11-17

All 25 course GPX originals read in the unchanged Trainer; 22 of 24 paired originals pass recording-timing compilation. Original 98100 has musical correspondence differences and 98109 retains an ambiguous boundary hold; original drafts/untimed import remain separate from verified activation. Both can use the generated Soundslice timed score instead. The coordinated source now recognizes explicitly labelled literal full-measure rests without optional fr metadata, preserving native silence, music/ties and supplied boundaries. All 24 generated timing routes pass; 6302 notes and 1021 ties remain. Existing 24 practice GP and 18 practice XML routes are unchanged.

Seven actual local Trainer imports pass across original timing/draft, generated explanation/Skip, practice GP/XML, including earlier successful 87753. Eight older generated preparations and seven original results compare exactly; 55 source Node checks pass, one optional skip. The owner confirmed live extension video/timing access separately; fixture media do not establish audible alignment or hardware acceptance. No Trainer runtime, reader, alphaTab, grading, protocol or version changes. Retained source inventory is now 399 complete capture-generated scores; original timing totals are 86 accepted/137 draft-only/45 blocked across 268 pairs. Earlier rows were retained, not replayed. Defer long regressions until several unfamiliar courses, as requested. [Source baseline, lesson table and limits](<../../../Lesson Bridge/docs/JAZZ-DISCOVERY-3-AUDIT.md>).

## Original bend-timing batch — 2026-11-17

The coordinated source’s timing-only finite-bend witness and mapped bend/whammy curve checks recover four accepted original timing routes (46636/46643/46653/46663) and 19 explicit draft-review routes. All 23 affected local Trainer imports passed before pause; resume finished reconciliation/documentation without repeating them or catalog QA. Original bytes, 704 notes/171 tied continuations and all musical events remain intact. Source/original curve differences are retained as unresolved draft alternatives, with activation/grading paused. No pitch, note, attack, tie or endpoint is removed to fit a recording.

All 35 original native musical fingerprints/features and five prior timing controls remain unchanged. 125 distinct source Node checks pass, five optional skips; eight Python checks pass. The existing receiver/native timing validation remains final authority. No Trainer runtime/alphaTab/host/grading/protocol/version change was needed. Reconciled inventory: 64 accepted, 135 draft-only, 45 strict/draft-blocked original pairs, out of 244; 375 saved complete generated practice-score routes remain. Only 35 affected rows were freshly replayed; other pair evidence is retained. This batch is complete, overall recording synchronization is not. Next recommended phase is held-out unfamiliar-course material when supplied. [Source evidence and remaining limits](<../../../Lesson Bridge/docs/ORIGINAL-BEND-TIMING.md>). No publication or live-provider/audible/physical MIDI acceptance is claimed.

## Original navigation timing batch — 2026-11-16

The coordinated source fixes shared traversal qualification for exact opening pickup markers, initial implicit repeats and existing GP-validated jump/terminal-ending profiles. Strict source music, endpoint/order and native sustain/omission guards remain. Ten original-score pairs now prepare and import explicit v5 drafts: 20970, 81419, 95562, 95576, 97196, 97200, 97212, 97222, 98086 and 98089. All original bytes, 4572 notes/127 tied continuations and native musical fingerprints are retained; unresolved issues remain and timing activation/recording grading stay paused. No new strict timing is accepted.

All 31 investigated originals retain exact native event hashes/features; five prior controls keep their plan hashes and musical events. Fifteen actual Trainer imports pass, including the strict and genuine let-ring draft controls. 133 distinct source Node tests pass, five optional skips; eight final Python checks pass after one transient host-aborted loopback connection. This Trainer runtime/reader/host/grading/protocol/version is unchanged. Source inventory now has 60 accepted, 116 draft-only, 68 strict/draft-blocked pairs; 375 complete generated practice-score routes remain. Only 31 original rows are freshly replayed; other pair evidence remains dated. Overall timing work is not complete: the next largest remaining group is 35 bend contexts. [Source batch and remaining work](<../../../Lesson Bridge/docs/ORIGINAL-NAVIGATION-TIMING.md>). No publication or provider/audio/physical MIDI acceptance is claimed.

## Final coordinated fallback QA — 2026-11-16

The current local sender/receiver combination passes 33 saved browser checks across 19 lessons, including 27 actual imports. Verified flows include strict/draft originals, generated explanation/optional skip, complete GP/selected parts, independent URL/local video with active Wait, partial passages/omissions, qualified XML and explicit untimed manual alignment. One session moves timed GP → XML → passage → reference passage → full GP without stale anchors/reference or changed musical events. No autoplay/save or note/tie removal. The final test compares musical events rather than regenerated IDs/omitted expression metadata. No receiver/reader/host/grading/runtime fix was required.

117 source Node checks pass (three named optional skips), 89 Trainer receiver/media checks pass and nine Python checks pass. The source inventory retains 375 complete generated-score IDs with unchanged capture hashes; no fresh whole-catalog conversion replay is claimed. Retained original-timing audit: 60 accepted, 106 draft-only, 78 strict/draft-blocked pairs, out of 244. These limits do not mean unavailable practice scores. XML expressiveness and conservative passage boundary limitations remain documented. All requested checklist features have qualified implementations; manual timing repair and broader notation support remain evidence-led follow-ups. No new score/sync count, version, package build or publication. No live provider/audible/physical MIDI acceptance inferred. [Final source QA matrix and remaining limits](<../../../Lesson Bridge/docs/FINAL-FALLBACK-QA.md>). This reconciliation is at its stopping point.

## Qualified source practice MusicXML — 2026-11-16

The coordinated source now supplies explicit practice MusicXML only after complete per-part source-proved GP/XML signature equality. This unchanged receiver handles it through ordinary v2 score-only import and exact existing reader proofs. Default display is rhythmic TAB, written bars once, no recording anchors; actual pitch elements, source tuning/string/fret, chord attacks and ties remain. Native expression is omitted with supported written guidance. Existing independent reference-video v6 is separate.

Two actual local XML imports (87750, 98074) preserve 433 notes, one tie, 426 Wait groups, every source pitch/position and full sustain endpoint; offered/loaded XML bytes match, no autoplay/timing. Three reserved expressive cases stay XML-blocked, with GP recovery intact. A 95578 retry preserves earlier GP preparation. A two-part chord/tie reader regression passes. 38 source Node and four focused Python checks pass. Initial string-number mapping and non-guitar HTTP fixture assumptions were corrected without reader changes. No alphaTab/receiver runtime/grading/version change, no new complete-song or verified-sync count; no live provider/audio/physical MIDI acceptance inferred. [Source MusicXML contract and evidence](<../../../Lesson Bridge/docs/PRACTICE-MUSICXML.md>). Restart the visible source helper/reload Bridge; this Trainer needs no new runtime update for this task. This bounded task is at its stopping point.

## Explicit source passage practice — 2026-11-16

The coordinated private source now prepares an explicitly selected original written-measure range with included/omitted ranges in the offer and score titles. All source parts remain by default; explicitly selected parts name omitted parts. Tied cut-edge bars, similes, missing meters and unsupported source content are conservatively guarded. No note/tie flags are removed to force a cut. The existing practice GP/reader proofs and score-only version-2 receiver remain unchanged; optional reference video uses the existing independent v6 route.

Actual local imports of 87750 measures 2–15 and 95578 measures 2–9 preserve all 95 notes, 11 connected ties, 72 Wait groups, source pitches/positions and full sustained endpoints. Loaded bytes equal offered bytes; no timing/autoplay. The loaded title itself discloses omissions. Tested 97232 tie-boundary cut stays blocked. A two-part reader regression retains both tied parts; 39 targeted source tests pass. Range edits invalidate Send. No receiver runtime, alphaTab, grading, protocol or version changes; no new complete-song or verified-sync count. No live provider/audio/physical MIDI acceptance inferred. [Source passage contract and evidence](<../../../Lesson Bridge/docs/PARTIAL-PASSAGE.md>). This task is at its stopping point.

## Source blocker reporting — 2026-11-16

The coordinated private source now displays independent attempted conversion/timing/practice failures and the fallback actually verified. Score-only or independent-reference practice, normal untimed manual alignment, pending choices and full failure are distinguished. Individually verified parts disclose omitted others; partial passages are not promised. Report changes do not alter GP bytes, source proofs, notes, ties, timing, readiness or this receiver runtime.

Five saved controls and three actual local imports retain 1773 notes, 80 ties and 1415 performed Wait groups, full sustained endpoints, source positions and exact applied anchors for the timed case. 97222’s missing endpoint and 95578’s unsupported timed bend retain complete score-only practice. 82233 remains a normal timing mismatch; 87750/98074 retain success. 39 targeted source tests and isolated restoration/stale-state controls pass. No new reader/grading/protocol/version change, new score recovery or new synchronized lesson; no live provider/audio/physical MIDI acceptance inferred. [Source reporting contract and evidence](<../../../Lesson Bridge/docs/BLOCKER-REPORTING.md>). This task is at its stopping point.

## Source capability-based timing recovery — 2026-11-16

The coordinated private source now chooses timed-practice recovery by the existing strict exporter’s complete source/native musical proof and repeat order rather than its first normal-error string. All timing boundaries/endpoints remain mandatory. This Trainer runtime, reader and grading are unchanged; existing version-2 validation still owns final timing application. Three actual local imports preserve full notes/pitches/attacks/ties/releases and complete Wait groups: 87750 retains its exact active media anchors; 97222 (missing endpoint) and 95578 (unsupported timed bend) remain score-only. Two normal controls retain their behavior. 82 source Node tests pass, two optional skips, plus isolated UI error/summary-independent recovery and refusal controls. No new saved synchronized lesson or practice-score count is claimed; 375 complete-score routes remain. No provider/audible/physical MIDI acceptance, version change or publication. [Source contract and evidence](<../../../Lesson Bridge/docs/CAPABILITY-TIMING-RECOVERY.md>). This bounded task is at its stopping point.

## Practice score reference video — 2026-11-16

- [x] Keep an explicitly selected recording alongside simplified practice scores through strict v6/reference-only capability, with no estimated or supplied sync.
- [x] Preserve all notes/pitches/attacks/ties/releases and existing automatic-import/local-file review choices.
- [x] Verify six real local imports, linked/local MP4 controls, independent active Wait, unload/new-score cleanup and old/schema/permission controls.
- [x] Update both projects' dev notes and the imported broader QA status; keep alphaTab, versions and the 375-score inventory unchanged.

[Bridge reference-video contract and saved-case evidence](<../../../Lesson Bridge/docs/PRACTICE-REFERENCE-VIDEO.md>). This bounded task is complete locally. Authenticated provider playback, live YouTube, audible timing and physical MIDI acceptance remain separate; no synchronization is claimed.

## Generated source explanation/skip acceptance — 2026-11-16

- [x] Verify five generated Soundslice score imports and existing optional Skip to music, retaining every actual note/tie/target.
- [x] Keep missing-endpoint cases guarded and explicit score-only recovery available; preserve original-file preparation.
- [x] Record strict scope and source/destination/native checks in both project notes.

[Bridge saved-source explanation/skip evidence](<../../../Lesson Bridge/docs/SOUNDSLICE-EXPLANATION-RECOVERY.md>). This bounded task is complete locally. Multi-part/unsupported notation expansion and incomplete timing recovery remain separate, evidence-led work.

## Both 97232 parts recovered — 2026-11-16

- [x] Apply the separately approved shared terminal-clock extension, preserving all 338 notes/104 ties/225 groups and final rest across both parts.
- [x] Verify classic/core/worker, normal/SMF MIDI, ordinary unmarked GP, old/mixed refusal, actual Trainer imports and 52 prior timelines.
- [x] Register/replay 42 patches and update source notices, manifests and future alphaTab port instructions.
- [x] Reconcile inventory: all 375 saved IDs have a complete generated score route.

[Bridge terminal evidence and inventory](<../../../Lesson Bridge/docs/TERMINAL-PART-RECOVERY.md>). This score task is complete; the broader imported QA/product checklist remains separate.

## Terminal first-part sustain investigated — 2026-11-16

- [x] Diagnose 97232’s genuine final tied overflow and prove the current tick lookup clips it.
- [x] Stage an isolated both-part terminal-clock proof preserving 338 notes, 104 ties and 225 groups.
- [ ] Separate reader authorization, then bounded source/reader integration and full classic/core/worker/Trainer/updater verification.

[Bridge proposal and isolated evidence](<../../../Lesson Bridge/docs/TERMINAL-PART-RECOVERY.md>). Production still offers complete part 2; diagnostic output is not an accepted arrangement.

## Last saved-score-only pair recovered — 2026-11-16

- [x] Verify 95582/95586 complete imports: 2105 notes, 288 ties, 1083 groups; native tied pickup, written navigation and disclosed trill instruction preserved.
- [x] Retain 50 prior complete timelines; update the two inventory rows and imported QA status.
- [ ] Remaining complete-arrangement gap, if requested: 97232 first-part overfull measure; complete second part is already available.

[Bridge evidence and current inventory](<../../../Lesson Bridge/docs/DIRECTIONS-ORNAMENT-RECOVERY.md>). The broader imported QA checklist is not fully implemented; see the linked status record.

## Approved clock/valley recovery complete — 2026-11-16

- [x] Apply the explicitly approved shared short 12/8 clock and zero-midpoint bend-valley fixes to classic/core, keeping every actual note, pitch, attack and tie.
- [x] Verify 95578 and both earlier tie fixes through complete source readback and actual local Trainer imports; retain 49 prior complete timelines.
- [x] Register/replay 41 patches, manifests/hashes and source notices; document required future alphaTab ports and tests.
- [x] Reconcile requested rows: 372 complete generated, one selected-part-only, two saved-score-only.

This approved batch is complete locally. Next source investigation, if requested: 95582 directions and 95586 tro. [Bridge evidence and current inventory](<../../../Lesson Bridge/docs/TIE-CLOCK-RECOVERY.md>). Hardware/audio acceptance remains separate. The earlier unchecked authorization item below is superseded.

## Tie-start recovery and remaining short-bar reader proposal — 2026-11-16

- [x] Verify complete 95567/95572 imports: 4557 notes, 426 connected ties, 1806 groups and full releases, with unchanged Trainer runtime.
- [x] Reconcile the three saved rows: inventory now 371 complete generated, one selected-part-only, three saved-score-only.
- [ ] Obtain separate authorization before integrating 95578's 5520-tick internal clock and zero-midpoint bend-valley reader corrections; isolated full-score feasibility passes only.

[Bridge evidence and isolated proposal](<../../../Lesson Bridge/docs/TIE-CLOCK-RECOVERY.md>). Hardware/audio/live-provider acceptance remains separate.

## Harmonic recovery and updater qualification — 2026-11-16 (local only)

- [x] Preserve exact sounding pitches/notes/attacks/ties for 91151 and 97125/97126, including the expressly authorized captured-pinch reader extension.
- [x] Keep unmarked GP native; verify classic/core, both worker codecs, normal/SMF MIDI, repeated ties, invalid-marker and old/mixed-reader controls.
- [x] Register the replayable MPL patch, qualified hashes and manifest; document required porting/tests in both alphaTab updater documents. All 39 patches replay; updater maintenance checks pass.
- [x] Refresh the three saved inventory rows; no lesson ID remains without a verified saved route. Five still need their saved score and one has only a complete selected part.

This harmonic batch is at its stopping point. [Bridge harmonic evidence and current inventory](<../../../Lesson Bridge/docs/HARMONIC-RECOVERY.md>). Physical MIDI, audible and live-provider acceptance remain separate.

## Shared bend acceptance and saved inventory — 2026-11-16 (local only)

- [x] Verify nine newly recovered Wait scores: all 5259 notes, 370 ties, 3586 groups and full releases; keep existing Trainer runtime unchanged.
- [x] Verify prepared-practice Send, explicit Wait imports, reader/worker roundtrips, written-range controls and 35 prior complete timelines.
- [x] Reconcile 375 saved lesson IDs; preserve separate generated/selected-part/saved-original/timing evidence.
- [ ] Next coordinated investigation: non-octave harmonic patterns in 91151 and 97125/97126, with full pitch/attack/tie proof; no blind TAB-only simplification.

[Bridge evidence and reconciled inventory](<../../../Lesson Bridge/docs/BEND-FAMILY-RECOVERY.md>). This bend batch is at its stopping point. Installed-provider, physical MIDI and audible acceptance remain separate.

## Nonadjacent grace sustain qualification — 2026-11-16 (local only)

- [x] Repair the shared practice sustain for complete same-group on-beat/before-beat grace ties, preserving every native note, attack and tie.
- [x] Verify 20930/20963/20978 explicit Wait imports: 664 notes, four ties, 281 Wait groups and full releases. Compare retained normal GP5 and Wait outputs through current/stock/worker readers.
- [x] Keep repeat/rest/reattack/missing-event guards and recording timing evidence; retain 32 prior complete timelines and eight independent source guards.
- [ ] Owner acceptance: hard-refresh Trainer/reload Bridge/restart its visible helper, hold the first grace through the intervening other-string grace, and check the tied release with the MIDI guitar. Audible/live-provider acceptance remains separate.

See [shared fix and test scope](DEV-NOTES.md#shared-nonadjacent-grace-tie-sustain--2026-11-16-local-only). Three Wait fallbacks were repaired; these lessons already had normal conversions.

## Tremolo and beam practice qualification — 2026-11-16 (local only)

- [x] Verify complete generated 97218/97230 practice imports: 432 source notes plus 89 required repeated occurrences, 65 ties and 353 Wait groups.
- [x] Prove repeated chords, grace slide, exact clocks and full sustained releases through current/stock readers and worker roundtrips; retain 30 prior successful reports and eleven independent guards.
- [x] Keep normal/native-shorthand imports and strict timing separate; no Trainer grading/runtime/vendor patch.
- [ ] Owner acceptance: restart the visible source helper/reload Bridge, Prepare the Soundslice score and use Wait with written bend ranges enabled. Strike every displayed tremolo repetition; hardware/audio acceptance remains separate.

See [qualification and limits](DEV-NOTES.md#shared-tremolo-and-beam-practice-acceptance--2026-11-16-local-only).

## Native grace-tie practice qualification — 2026-11-16 (local only)

- [x] Verify eight complete saved practice scores in the unchanged Trainer, including the previously blocked 97226/97253 captures: 4,714 notes, 587 ties and 2,901 Wait groups retained.
- [x] Prove full tied releases, actual pre-bent pitch acceptance and outside-range rejection through classic/core/stock readers and worker roundtrips; no vendor/runtime/grading change.
- [x] Keep explicit score-only disclosure, strict timing isolation, nonadjacent/dangling/unknown-content guards and the 22 prior exact practice controls.
- [ ] Owner acceptance: restart the visible source helper/reload Bridge, select the Soundslice score and use Wait with written bend ranges enabled. Provider audio and physical MIDI remain separate.

See [full qualification](DEV-NOTES.md#shared-native-grace-tie-acceptance--2026-11-16-local-only). No new TAB-only mode; possible future simplified TAB still requires proved notes/ties and readable disclosed rhythm.

## Complete practice parts and short-grace qualification — 2026-11-16 (local only)

- [x] Qualify the unchanged receiver with four two-part scores, one explicitly selected complete second part and two complete short-grace scores; preserve every included source note/tie and every Wait attack.
- [x] Keep failed/omitted parts explicit, per-part preflight proofs, ordinary score-only lesson-v2 offers, no autoplay/saving and no inferred sync. Verify source-choice invalidation and independent selected-part download.
- [x] Record 17 isolated browser results and coordinated tests without copying private capture data here. No Trainer runtime or vendor changes were needed.
- [ ] Owner acceptance: reload the local extension/restart its visible helper; try a recovered score in Wait using the existing practice-track selector. Native expression, physical MIDI and real provider media remain separate from automated proof.

See [shared import evidence](DEV-NOTES.md#shared-practice-part-and-short-grace-imports--2026-11-16-local-only). Remaining pre-bent grace ties, repeated tremolo attacks and overfull source parts need source-side investigation; no blanket receiver bypass.

## Shared finite carry saved audit — 2026-11-16 (local only)

- [x] Prove complete ordinary tie chains through actual contiguous performed bars and finite standalone vibrato, preserving every native note/tie/event. Keep actual cross-break sustain, repeat-jump/malformed links and let-ring guarded.
- [x] Check all 244 saved original practice event arrays against the previous normalizer, with no changes. 98063 now passes; the older within-bar fix also covers 98064. Coordinated Bridge fixes bring normal timed coverage from 39 to 60, plus 25 new explicit draft-only routes.
- [x] 89 focused Trainer tests and all 50 coordinated isolated browser cases pass; document counts, native/source limitations and private evidence without adding lesson files here.
- [ ] Owner acceptance: hard-refresh Trainer and recheck/send matching originals with actual provider recordings; confirm audible alignment and physical MIDI as usual.

See [shared carry investigation and limits](DEV-NOTES.md#shared-finite-carry-audit-across-saved-lessons--2026-11-16-local-only). This broad saved-input task is at its stopping point; no publication.

## Finite native ties at recording breaks — 2026-11-16 (local only)

- [x] Fix 97483's false hold-boundary rejection using proved finite within-bar native ties; retain exact original notes, tied sustains, bytes and recording plan. Normal timed v4 import now passes.
- [x] 86 focused checks, native classic/core/worker readbacks, supplied/synthetic receiver imports and retained explanation browser checks pass. Record the separate short-target timeout in the broader interval browser; no unrelated harness cleanup or catalog replay.
- [ ] Owner acceptance: hard-refresh local Trainer, use Bridge's Advanced → Check timing again, then Send the original with its video/timing. Confirm audible tied phrase endings. No draft/manual retiming is required for this rejection.

See [diagnosis, proof and limits](DEV-NOTES.md#finite-native-ties-at-recording-breaks--2026-11-16-local-only). No vendor/Bridge runtime/protocol change or publication.

## Visual draft alignment — 2026-11-15 (local only)

- [x] Replace passage forms with one draft timeline, continuous recording transport, native-geometry display-only score tracking, selected occurrence mapping, explicit whole/point editing and original-evidence preservation.
- [x] Keep unknown endpoints unplaced, existing strict validation unchanged, all draft grading paused, and explicit export/reopen/activation.
- [ ] Owner acceptance: actual 97322 video/audible alignment and provider seek/buffering; 97311 still needs complete valid correspondence or a matching score.

# Guitar Trainer Studio: status and to-do

## Explicit Draft timing — 2026-11-15 (local only)

- [x] 82 focused checks pass including the four supplied saved controls; isolated draft, ordinary, explanation and interval browser checks pass. Syntax and whitespace pass. No catalog replay.

- [x] Add separately gated lesson-v5 / draft-recording-timing-v1 / draft-timing-v1 recovery with explicit review, immutable source evidence and editable Media Sync working copy. See [exact contract](DRAFT-TIMING.md).
- [x] Keep all draft recording grading paused until complete strict validation and explicit Use reviewed timing. Preserve verified sections/anchors, list missing endpoints/unmapped visits/range issues, provide bounded passage listening, Undo/Redo/restore and explicit draft export/reopen. No fit/rescale/clamp or auto save.
- [ ] Bridge follow-up constructs and explicitly sends drafts only after the new exact capability. Normal/verified workflows stay unchanged.
- [ ] Owner checks one intentionally incomplete lesson after Bridge integration; 97311 musical correspondence remains unresolved, 97322/97326 need owner-supplied endpoints. 97330 stays verified at its actual duration. No publishing authorized.


## Matched timing intervals — 2026-11-15 (local only)

- [x] Add the strict, independently capability-gated interval format from Bridge's proposal; preserve versions 1–4, original explanation timing, score bytes, exact anchors, recording identity and actual duration checks. See [exact contract](TIMING-MATCH.md).
- [x] Keep source rests distinct from explanations and skip only reviewed, independently verified silent score omissions, including first visits. Require complete native evidence from all tracks/voices; reject sounding omissions and ambiguous holds/ties.
- [x] Preserve grading suspension, neutral listen/skip controls, retained musical targets/loops, complete profile plans, default-on saved automatic import, local-file selection, no autoplay and explicit saving.
- [x] Pass 173 focused Node checks (including complete 87753 control), syntax/whitespace checks, and isolated interval, existing explanation and legacy-import browser regressions. Paused omitted-measure seeks keep provider/cursor together; Reset and delayed native seek callbacks retain the requested recording position. Synthetic playback fixtures only; no catalog replay.
- [ ] Bridge follow-up must query `score-timing-match-v1`, construct the strict runtime plan from reviewed evidence, and keep unsupported cases blocked. No Bridge edits or publishing in this task.
- [ ] After Bridge integration, owner hard-refreshes Trainer and checks one newly supported lesson in the normal browser. Actual audible/provider/Fishman acceptance is not inferred from automated tests.

## Optional automatic lesson import — 2026-11-15 (local only)

- [x] Add **Settings → Lesson imports → Import helper lessons automatically**, on by default with saved On/Off choices retained in localStorage. The Lesson imports section starts collapsed and can be expanded to change the option. Non-local-choice offers bypass review through the existing import pipeline; local recordings still require file selection and Import.
- [x] Follow-up checks: 51 focused dialog/v4 tests and isolated Chrome default-on, compact collapse/expansion and saved On/Off reload checks pass. The earlier default-off decision is superseded.
- [x] Keep schema/hash/capability/native-order/duration checks, original bytes, paused playback and explicit saving. Acknowledge receipt before loading completes; block overlapping imports, show progress, and surface loading failures in the attention dialog. Invalid offers still return rejection to the sender.
- [x] Pass 59 focused receiver/legacy/v4 checks, syntax and whitespace checks, and isolated Chrome opt-in/reload/automatic online/local-file/duration-failure checks. Synthetic fixtures only; no catalog replay or new hardware claim.
- [ ] Owner hard-refreshes and checks the collapsed Settings section and Send in the normal browser; any previously saved Off choice remains off. Bridge needs no automatic-import change; bringing its matched Trainer tab/window forward is a separate Bridge task requested by prompt.
- [ ] Keep the existing publication hold: no commit, push or deployment.

## Compact explanation import review — 2026-11-15

- [x] Owner confirmed lesson 87753 works. Keep its 77 musical visits / 20 explanations and only omissions 50–53 (second pass of measures 46–49), with original GPX unchanged.
- [x] Use one Import/Cancel review for online recordings; Import confirms the displayed recording. Keep local-file selection required. Put technical recording ID and native visit numbers in closed Details; show a plain repeat adjustment in the main review.
- [x] Preserve strict v4/hash/native-order/duration validation, capability protocol, no autoplay and no automatic saving. Changes stay in Trainer; no commit, push or deployment.
- [x] Focused receiver/schema/complete-87753 evidence tests, isolated Chrome one-click URL import/local selection/Cancel/no-autoplay/no-save checks, and desktop/phone visual review pass. Playback/grading code is unchanged.
- [ ] Owner can hard-refresh and check the shorter online review, or choose a local recording and import without a separate checkbox.

## Explanation timing receiver — 2026-11-15 (local, not published)

- [x] Implement strict v4 / explanation-plan-v1 reception, score/recording binding, explicit review and capability negotiation. Keep legacy imports and original score bytes/native traversal intact. See [contract and Bridge handoff](EXPLANATION-TIMING.md).
- [x] Separate explanations from music; support holds, listen/skip, seeking, pause, native loops/count-in, Wait, Realtime and reviewed repeat omissions. Guard ties/sustains crossing changed boundaries. Keep existing input tolerances.
- [x] Save complete plans in profiles/backups. Explanation timing is read-only in ordinary anchor editing; Move one/all/section remain available for legacy profiles.
- [x] Verify the supplied original GPX against external preparation: 81 native visits, 77 retained, 20 breaks, omissions 50–53 only, 106 times and final measure retained. Focused synthetic offline/native-browser checks; no private catalog replay.
- [x] Final checks: 723 Node tests, 14 application-module syntax checks, whitespace review, complete explanation browser runner (including final-measure loops, profile restore and too-short media), and existing sync/practice + lesson-import browser regressions pass.
- [x] Bridge implemented preparation and capability-gated Send separately; owner reported lesson 87753 works. Its newer workflow is described in private `dist/lesson-workflow-20261115/REPORT.md`. Specific Fishman and audible technique acceptance are not inferred from that report.
- [ ] Publication explicitly held for this task: no commit, push, deployment, version change or release.

## Timing fallback and group sync movement — 2026-11-15

- [x] Load valid imported score/recording resources when timing is rejected; show the reason, retain bounded timing evidence in Paste sync points, and leave the editor open for manual alignment. Timing-only rejection preserves current alignment. Resource/security/stale-load errors remain failures; no automatic timing repair, autoplay or save.
- [x] Add Move all / Move selected section for saved-point dragging and nudging. Inclusive section endpoints shift uniformly, outside anchors stay fixed, and groups stop at neighbors/recording edges. One Undo reverses the whole gesture; no locked-target or stretching controls. Guard Undo and source replacement during dragging.
- [x] Pass all 683 Node checks, focused native import and group-movement browser checks, import-timeline and sync/practice regressions, syntax and whitespace checks. Synthetic demo/recording fixtures only; no private lesson collection or Lesson Bridge source changes.
- [ ] Owner hard-refreshes and imports a known timing mismatch: confirm score/video load, clear manual-alignment warning and no autoplay. Try Move all and a middle section, drag against a neighbor, Undo, and preview before saving. Audible/provider/physical-MIDI acceptance remains local.
- Explanation-pause deferral superseded by the supplied 87753 example and receiver work above. Automatic inference without verified source evidence remains unsupported.

## Written bend ranges — 2026-11-15

- [x] Add **Allow written bend ranges**, on by default in Hex/Poly and Realtime/both Wait choices, saved independently. Marked bends, pre-bends, releases and whammy accept the base pitch or written range, including fine bends and played tie chains. Ordinary pitches and other tolerance defaults remain unchanged; saved Off restores original onset matching.
- [x] Keep each chord requirement independent; resolve overlapping ranges without making acceptance depend on strum order. Continuous pitch-wheel movement never supplies a new attack. Vibrato does not widen initial pitch matching. A bounded continuation guard keeps likely converter re-keys attached to their original note; see architecture for the time and channel rules.
- [x] Pass all 671 Node tests and isolated Chrome written-bend checks in all six practice/input combinations, tolerance default/persistence/layout checks, and existing Realtime timing/feedback checks. Syntax and whitespace checks pass. No physical MIDI acceptance claimed.
- [ ] Owner hard-refreshes and compares On/Off with Fishman Hex and Poly: C→D bends/pre-bends, a release, fine bends, wide whammy, vibrato, bent/unbent chords, tied notes and quick deliberate separate attacks in Wait and Realtime. Confirm correct notes register without skipped targets. The continuation guard can confuse unusually quick separate notes; wide whammy ranges intentionally accept broad pitch choices. This mode does not measure endpoint, shape or technique accuracy.

## Pending alphaTab publication — 2026-11-14

- [x] Review and validate the complete pending trainer-side alphaTab checkpoint for the owner-authorized commit/push: 563 Node tests, all 17 manifest hashes, exact classic/core patch replay and offline updater regressions.
- Existing audible lesson/browser/Fishman acceptance items below remain open. This routine checkpoint keeps alphaTab 1.8.4 and app version 1.0.1; no release or private Lesson Bridge changes.

## Recording editor playhead — 2026-11-10

- [x] Reproduce lesson 87750's outro rewind with unchanged anchors; protect editor transitions from native Pause seeks. All 563 Node tests and full-recording, sync-practice and loop/repeat browser checks pass.
- [ ] After refresh/reimport, verify lesson 87750 past 9:42, open/close Edit sync, resume, and seek to bar 51. The exact intermittent Pause-with-frozen-clock state remains unconfirmed; a separate Chrome decoder/read failure was captured. See [investigation](RECORDING-PLAYBACK.md).

## Swung connected-grace targets

- [ ] Open Hands-on Fingerstyle 95717 with explicit GP-native grace and check the two voices around bars 4 and 9.

## Whole note in written 6/8

- [ ] Open Hands-on Fingerstyle 95712 through Send without timing and listen to the whole note in bar 13 and the next bar.

## Captured GP tap practice pitch

- [ ] Open prepared Rock Sauce Lead 248 with explicit native grace and Send without timing. Check the low-E fret-10 tap target in bar 8.

## Captured GP on-beat rock grace

- [ ] Prepare 254 with explicit native grace, send without timing and listen for the grace and slides into bar 21 and the long releases after bars 3 and 21.

## Captured GP fractional rock slides

- [ ] Listen to prepared Rock Sauce Lead 221 score-only through four passes. Check the overlapping approach into bar 4, the bar 8 bend and the silent repeat close.

## Captured GP sampled rock restart

- [ ] Listen to prepared Rock Sauce Lead 239 score-only through three passes. Check the separate legato attacks, the fresh bend sample and the silent bar before each repeat.

## Captured GP compact blues

- [ ] Listen to prepared Freestyle Blues 95570 with retained timing. Check the opening legato, the swung handoff near the end of bar 2 and the short fine bend.

## Captured GP sampled blues

- [ ] Listen to prepared Freestyle Blues 95557 on both passes with retained boundaries. Check the shared MIDI 59 in the legato chord, the shift target and the swung palm-muted releases.

## Captured GP terminal falls

- [ ] Listen to prepared Pedal Steel 46659 with its boundaries retained. Check the triplet attacks and listen for the full fall into the first ending and the silent final bar.

## Captured GP straight paired bends

- [ ] Listen to prepared Pedal Steel 46657 on both passes. Check the pre-bent releases, sampled slides, paired rises and the two vibrato passages.

## Captured GP long vibrato rises

- [ ] Listen to prepared Pedal Steel 46658 on both passes. Check the mixed meter, the quarter-note bends and the independent release through bars 6–7.

## Captured GP swung dyad releases

- [ ] Listen to prepared Pedal Steel 46665 on both passes. Check the release and sampled dyads in bars 2–3 and the falling restart and held bend in bars 4–6.

## Captured GP pre-bent approaches

- [ ] Listen to prepared Pedal Steel 46638 on both passes, checking the release and fresh target across bars 2–3, the sampled slide and falling dyad in bar 4, and the closing dyad.

## Captured GP swung reattacks

- [ ] Listen to prepared Pedal Steel 46647 on both passes: the short chords in bars 2–3 and the separate reattack, hold and hammer across bars 4–5.

## Captured GP hammer attacks and chord releases

- [ ] Listen to prepared Pedal Steel 46651 in bars 4–5 on both passes; check the separate hammer/pull attacks, sustained strings, and the two independent falling pitches.

## Captured GP tapped harmonics

- [ ] Listen to prepared Pedal Steel 46662 after refreshing the local reader. Check the three opening tap pitches, the swung release in bar 3 and the long tie through bars 6–7 on both passes.

## Sustained GP tied bends

- [ ] Listen to prepared Pedal Steel 46654 at bars 3–5 and 7–9 and through the release inside the silent final bar.

- [ ] Listen to prepared Pedal Steel 46663 through both passes and its release inside the silent final bar.

- [ ] Listen to prepared Pedal Steel 46640 and 46644 on both passes; check the fresh attacks, short palm mute, paired exits and mixed swing against the matching recordings.

- [ ] Listen to prepared Pedal Steel 46645 on both passes and check the raised release into bar 4. Check the two 1,920-tick releases in 46652.

- [ ] Check prepared Pedal Steel 46653 on both passes. Listen for the continuous rise and short chord partner across bars 6–8.

- [ ] Check prepared 46656 and 46664 with the matching recordings. Listen for the rising restart into bar 5 and the staggered falls in bars 2 and 3 across both passes.

- [ ] When a complete capture qualifies, check paired falling exits against the matching recording. Verify both 300 ms restarts, optional approach samples and fresh targets.

- [ ] Check prepared Pedal Steel 46661 on both passes with the matching recording. Listen for the bar 4 staccato and descending exit, and the bar 7 tied exit and target attack.

- [ ] Listen to Pedal Steel 46661 on both passes, including the standalone chord rise and the two written tie continuations.

- [ ] Listen to Pedal Steel 46641 on both repeat passes after refreshing the reader. Check the raised attacks and continuous releases, including the held chord partner.

- [ ] Listen to Pedal Steel 46637 and 46642 on both repeat passes after refreshing the local reader. Check the held peak and the steady dyad against their written vibrato signs.

- [ ] Listen to the prepared Pedal Steel 46650 through both falling-bend restarts after refreshing the local trainer.

- [ ] Listen to the prepared Pedal Steel 46646 on both repeat passes after refreshing the local trainer. Check both legato targets, the peak bend and the swung release.

- [ ] After refreshing the local trainer, listen to both passes of Pedal Steel 46636 and check that the bend keeps rising through the tie.

## Explicit GP repeat-ending tie releases

- [x] Verify the first and second release, both bundle paths, worker transport, and reapplication through the patch registry.
- [ ] Listen to the score-only import of either saved ending example after refreshing the local trainer. Let both passes play and check the pull-off into the first and second endings.

## Explicit GP directional slides

- [x] Verify classic/core readback and playback, worker transport, and byte-exact reapplication through the alphaTab updater registry.
- [ ] Refresh the local trainer and listen to a score-only Send of 81437 or 81441. Check bar 10's chord release and the tied bass slide-ins at bars 11 and 15. Those saved recordings have no usable timing map.

## Explicit GP fine bends and internal clocks

- [x] Retain both properties through classic and core GP reader/writer and worker score transport. Verify playback and reject invalid bar lengths.
- [ ] In the normal trainer, listen through a marked fine bend and verify recording alignment separately. Seek and loop through a marked internal bar and its following boundary.

## Explicit GP ghost pull-off release

- [x] Preserve the opt-in release instruction across the pinned GP reader, writer, worker codec and MIDI generation.
- [ ] Refresh the running trainer and review a compatible score in the normal import dialog. Listen through a marked pull-off and verify recording alignment separately where timing is provided.

The owner authorized including all pending Guitar Trainer updates in a routine commit and push to `main` on 2026-11-07. Earlier local-only bullets record the original task scope. The pending owner checks below still apply.

## Per-note Guitar Pro right-hand tapping — 2026-11-07

- [x] Keep individual GPIF `Tapped` flags through native model, clones, serialization, renderer worker, staff/TAB, print and GP re-export. Keep legacy beat-wide and left-hand tapping separate.
- [x] Validate synthetic repeat/connection witnesses and the six saved examples read-only: all 45 source mixed chords match the existing raw evidence, with 56 selected notes marked and 62 untapped partners preserved. Exact native attacks, releases, velocities, pitches and connections remain unchanged.
- [ ] Optional owner check in Live Server: hard-refresh, open one original GPX and compare the selected T marks in staff/TAB/print. Isolated Chrome does not establish physical MIDI or audible playback acceptance.
- [ ] Separately authorize Lesson Bridge's writer to emit the exact source-selected per-note flags, inspect raw GPIF and qualify corrected receiver playback/marks before narrowing the mixed-tap guard. Keep other notation, grace and timing guards in force. No new conversion or sync claim from the receiver work.
- Local only; no Lesson Bridge edits, acquisition, timing work or publication.

## Annotation, section-heading and chord-name spacing — 2026-11-05

- [x] Reuse the private read-only rendering investigation; reproduce label overlaps in the actual trainer with the adapter disabled.
- [x] Add a guarded, display-only host adapter: measured wrapping, 1.35 font-size line spacing, separate effect areas and native minimum label spacing. Keep vendor files, source labels/notes and synchronization unchanged.
- [x] Verify saved GPX, Soundslice-derived GP and an original synthetic two-track fixture in isolated Chrome: 108 screen cases (390/600/1600px, 75/100/150/200%, staff/TAB/both) plus three native print previews, zero detected target-label intersections. Compare exact generated MIDI, playback timelines and source text; validate supplied timing anchors/interpolated mappings and exercise native playback.
- [x] Pass 498 Node tests and existing display, sync/practice, Realtime, full-recording and import-timeline browser runners. Preserve all pre-existing local work.
- [x] Owner confirms the text layout “looks fine now” (2026-11-06). No remaining annotation, section-heading or chord-name overlap reported; exact score/view/zoom coverage was not specified.
- [ ] Owner confirms actual print destination, audible recording sync and physical Fishman feedback. These are separate from visual acceptance. At narrow/high zoom, scroll horizontally inside the score panel.
- Remaining title/credit, tuning-label and footer intersections are outside this focused fix. Composite chord diagrams retain native layout. Rendering uses the main thread; native audio workers remain enabled. Large-score responsiveness and other fonts/browsers still need real-use acceptance.
- Local only under the explicit task instruction: no commit, staging, push, version change or publication.

## Trimmed lesson import lifecycle — 2026-11-02

- [x] Reproduce the supersession failure with an equivalent playback timeline rebuilt during media load, using the private trimmed GP read-only.
- [x] Replace timeline reference comparison with a timing-structure snapshot while preserving score/source cancellation and final point validation.
- [x] Test equivalent rebuild acceptance, changed mapping/tempo/score rejection, exact anchors and no autoplay/save. Pass 496 Node tests and four browser runners, including native nonzero playback with the private trimmed GP and synthetic recording.
- [ ] Owner refreshes the trainer and retries trimmed Acoustic Jimi with the actual provider recording; audible sync remains live acceptance.
- Authorized coordinated fix, local only: no commit, push, version bump, release or deployment.

## Full recording playback and outside-music shading — 2026-11-02

- [x] Continue non-looping Realtime recording playback after score completion; finalize results once without stopping the outro.
- [x] Allow introduction/outro seeking and Pause/Resume without grading those sections or snapping video back to the score.
- [x] Shade before/after-score ranges and show region notices; retain Wait, explicit loops, score bytes and sync points.
- [x] Pass 495 Node tests and isolated installed-Chrome full-recording/sync-practice checks with generated audio and synthetic input; inspect waveform shading screenshots.
- [ ] Owner checks their actual TrueFire GP + synced video: automatic outro continuation, Pause/Resume, seek back to music, audible sync and Fishman feedback. Real video/YouTube/provider/hardware acceptance is separate.
- Local-only update; no commit, push, deployment or publication.


## Realtime recording timeline seeks — 2026-11-02

- [x] Keep playing after a recording timeline seek during active Realtime practice; paused seeks stay paused.
- [x] Preserve Wait silence, sync-preview behavior and existing explicit-seek grading rules.
- [x] Reproduce failure before the fix in installed Chrome; pass forward/backward and paused seek regression afterward, plus sync editing/Wait checks and all 492 Node tests.
- [ ] Owner verifies actual synced video/YouTube and audible playback with the normal Live Server/browser/Fishman workflow.
- Local only; no commit or push.


## Custom visible tracks — 2026-11-02

- [x] Add Custom checklist with at least one track, source-order native aligned layout, friendly provider labels and retained original names/bytes.
- [x] Keep visibility independent of the practice track, audio and partial Wait/results; remember mode/selection by original-file fingerprint.
- [x] Verify 492 Node tests and isolated installed-Chrome checks with synthetic MIDI, completed native two-track measure bounds, keyboard focus, hidden practice track, reload, print regression and phone overflow.
- [x] Read-only installed-Chrome smoke with the supplied Sultans of Swing GP: Lead Guitar + Chords, friendly labels, retained original name, switching to a demo and restoring the song selection. Private file/screenshots are not repository fixtures.
- [ ] Owner acceptance in normal Live Server/browser/Fishman workflow: Wait and Realtime, chord placement, scrolling, audible mute/playback independence, and practice-track changes under Custom.
- Chord-source overlay remains deferred. This update stays local: no commit, push, version or release.


## Choose a local recording during lesson review — 2026-10-30

- [x] Add version-3 local-recording request and trainer review picker, keeping versions 1/2 compatible.
- [x] Reuse local media loader and nonzero timing repair; preserve cancellation/no-autoplay/no-automatic-save.
- [x] Verify 488 Node tests and expanded native receiver browser checks.
- [ ] Owner tests an actual local audio/video file and audible alignment with the updated local trainer.
- Publication/push is not authorized for this coordinated change.


## v1.0.1 backup guidance and tall lists — 2026-10-30

- [x] Add Scores backup reminder and explain automatic browser cleanup in README/Help.
- [x] Let long lists grow on tall screens while retaining short-list minimums and laptop/narrow limits.
- [x] Verify 486 Node tests and isolated Chrome tall/laptop/narrow list and guide checks.
- [x] Publish and verify stable v1.0.1 at d3649be as the latest GitHub release.
- [ ] Owner checks final layout on their actual displays.


## Stable v1.0.0 — 2026-10-29

- [x] Owner authorizes stable v1.0.0; align version metadata and current guidance, preserving historical releases/tags.
- [x] Finish release validation: 486 Node tests and isolated Chrome guide/display/print/library/Realtime checks.
- [x] Publish and verify v1.0.0 as the latest stable GitHub release, tagged at 00d725a; source ZIP/tar links available and historical tags preserved.
- [ ] Physical-device/provider and Mac-launcher combinations remain separate acceptance checks; stable status does not imply exhaustive hardware coverage.


## Score download and folder export — 2026-10-29

- [x] Add original file downloads to individual stored score menus.
- [x] Export user folders in the existing library JSON format with only related saved sync profiles; retain Import Library compatibility.
- [x] Verify 486 Node tests plus actual isolated-browser downloads and folder restore.
- [ ] Owner tries downloads and folder restore with their normal browser/files; recordings and preferences remain excluded.


## Open File button styling — 2026-10-29

- [x] Match Open File border and hover styling to neighboring Scores actions.
- [x] Verify all three themes and native chooser activation in isolated Chrome.
- [ ] Owner confirms the button appearance in their normal browser.


## Profile transfer grouping — 2026-10-29

- [x] Collapse standalone sync-profile transfer controls and explain their overlap with Library Backup.
- [x] Keep app preferences excluded and retain existing profile transfer format.
- [x] Verify collapsed controls and actual profile transfer plus library round-trip in isolated Chrome.
- [ ] Owner reviews the revised Media & Sync section in their normal browser.


## Backup verification and library space — 2026-10-29

- [x] Verify Backup Library / Import Library round-trip and document existing-library conflict behavior.
- [x] Move Current score to the Scores header, remove duplicate tracks summary and expand desktop list space.
- [x] Verify real IndexedDB backup/import controls, reload, duplicates and distinct sync edits in isolated Chrome; desktop/phone checks and 485 Node tests pass.
- [ ] Owner checks the revised header and list space in their normal browser.


## Scores library refinement — 2026-10-29

- [x] Compact library search, fixed Demo Scores view and alphabetical user folders.
- [x] Preserve useful status messages and use filenames for untitled scores.
- [x] Verify 485 Node tests and isolated Chrome demo/search/folder ordering/save/error flows and desktop/phone layout.
- [ ] Owner checks the updated Scores menu with their own library in the normal browser.


## Initial fretboard and running-server themes — 2026-10-29

- [x] Serve theme styles from the existing assets subtree so pre-theme running launchers can load them without restarting.
- [x] Stabilize initial neck proportions and schedule resize repaint after workspace sizing; retain ultrawide cap, centering and saved sizes.
- [x] Add startup-size regression and isolated pre-theme server/load-layout coverage; 484 Node tests pass.
- [ ] Owner reloads the normal browser and checks the actual imported lesson before touching the divider, then switches Light/Soft Light/Dark. Hardware MIDI and actual PDF/printing remain pending.


## Appearance themes — 2026-10-29

- [x] Add saved Light / Soft Light / Dark in Display, Light default; supersedes previous dark-mode deferral.
- [x] Apply native score colors and app surfaces; retain feedback semantics with clearer dark colors; always request black print ink in the standalone white print view.
- [x] Verify 483 Node tests, syntax/whitespace and isolated Chrome appearance/persistence, feedback contrast, native print, menus and phone layout.
- [ ] Owner checks actual LG/laptop viewing comfort, Fishman feedback and browser Save as PDF/physical printing. Automated print checks suppress the OS dialog; they do not verify physical output.


## Fret inlay emphasis — 2026-10-29

- [x] Enlarge and brighten neutral inlays, emphasize octave double dots and bold 12/24 labels.
- [x] Pass 481 regressions, syntax/whitespace checks and isolated Chrome sizing/label checks at laptop and ultrawide sizes; inspect the rendered neck.
- [ ] Owner checks contrast on the physical LG at normal zoom. Hardware MIDI testing was not performed for this visual-only change.
- Dark mode remains deferred by owner decision; no implementation included.


## Ultrawide fretboard proportions — 2026-10-29

- [x] Cap neck width relative to usable panel height and center the SVG; preserve responsive scrolling and saved panel sizing.
- [x] Pass 481 Node tests and isolated Chrome checks at 3820×1550, 1440×900 and 390×844; inspect ultrawide/laptop screenshots and verify taller saved panels expand the cap.
- [ ] Owner confirms appearance on the physical LG 38-inch display at their usual browser zoom. Physical MIDI acceptance remains separate.


## Compact menus — 2026-10-29

- [x] Remove routine helper text in Display, Loop, Tempo and Audio; retain contextual unavailable explanations and input errors.
- [x] Place tempo reset beside BPM arrows and fit five Scores actions in one desktop row, with responsive wrapping.
- [x] Verify 481 Node tests, syntax checks and isolated Chrome layouts at 1440/768/390 pixels; verify tempo/pitch validation and reset.
- [ ] Owner checks menu spacing at their normal browser zoom. Physical Fishman testing was not performed for this presentation-only update.


## Score display and printing — 2026-10-29

- [x] Add saved Score Default / Notation + Tab / Tab Only / Notation Only and independent Automatic / Show / Hide tab rhythm; preserve chord diagram choices and unsupported-track notation fallback.
- [x] Add Scores → Print / Save PDF using native alphaTab printing of full visible tracks without practice overlays; handle popup blocking.
- [x] Document module ownership and player workflow; 481 Node tests and isolated native Chrome display/print checks pass.
- [ ] Owner checks normal Live Server/browser: display preferences, chord diagrams, actual print/Save as PDF output and Fishman feedback after switching layouts. Automated print checks suppress the OS dialog and do not verify a physical printer or saved PDF.

## Realtime written-span forgiveness — 2026-10-29

- [x] Accept correct Realtime attacks/chord tones through the written target span, bounded by the next required attack or earlier written end/rest; retain 120 ms early grace and one-input/one-target ownership.
- [x] Delay misses to the same deadline; preserve Wait, MIDI filters, held-note tolerance and native transport. Project deadlines through recording sync and loop boundaries.
- [x] Add automated timing, repeat/rest/tie, tempo/speed, latency, boundary and recording tests plus isolated native Chrome synthetic Poly/Hex checks; document module ownership and player-facing rules.
- [ ] Owner verifies normal Live Server/browser/Fishman: late single notes, slower strums, omitted notes turning red at the end, early/repeated notes, fast passages, loops and synced recording practice. Wait One at a time/Together remains unchanged. Automated evidence does not establish physical tracking or listening acceptance.

## Fretboard missed-target display — 2026-10-29

- [x] Keep missed fretboard targets blue while preserving score miss history/results, played wrong-note rings, green feedback and Wait progression.
- [x] Add Poly/Hex no-input and partial-chord Realtime regression coverage; update player guidance and module responsibilities.
- [ ] Owner checks in normal Live Server/browser/Fishman workflow: watch Realtime without playing, miss selected notes, play/release wrong notes, and complete Wait chords with One at a time and Together. Automated evidence is recorded in DEV-NOTES; physical acceptance remains separate.

## Private extension separation — 2026-10-29

- [x] Remove distributable extension source, store materials, packaging and extension-only tests; retain the app receiver and timing behavior.
- [x] Remove customer-facing extension instructions; document the retained protocol and private-project boundary. Extension development/store tasks belong to the separate project.
- [x] 469 Node tests, isolated Chrome receiver checks, changed-test syntax and diff whitespace checks pass.
- [ ] Owner loads the extension from its separate project folder and verifies Send to the refreshed hosted/local trainer, including nonzero timing and normal Fishman practice.

## Triangle navigation follows the chosen pass — 2026-10-28

- [x] Triangle clicks seek their selected score beat and repeat pass, moving the sheet cursor/black playhead while preserving red recording seconds; saved drags remain unchanged.
- [x] Keep native repeat selection for sheet clicks, with selector/triangle feedback and explicit pass choice through the timeline.
- [ ] Owner check with original repeated song: choose red time, click first/second-pass triangles, check black/sheet cursor and Add/Update, then save explicitly. Audible playback and physical MIDI acceptance remain separate.

## Reset cursor follow — 2026-10-28

- [x] Reset reveals the stopped cursor with auto-scroll enabled, including asynchronous native position updates; auto-scroll off preserves the viewport.
- [x] Verify host loop-start/worker behavior and real Chrome paused Reset without Play.
- [ ] Owner acceptance with the original long song and recording; physical MIDI remains untested for this update.

## Score selection in the sync editor — 2026-10-28

- [x] Connect native notation/tab single clicks to sync target selection and Add/Update while preserving red recording seconds and native seeking.
- [x] Support repeat occurrences/fractional triangles and cancel stale app cursor reveals when choosing a timeline target.
- [ ] Owner check with original score: choose recording time, click notation/tab, verify target and unchanged red line, then select triangles across rows and repeats. Confirm no unexpected scrolling. The blue/black playback cursors intentionally remain distinct from the score target. Audible playback and physical MIDI acceptance remain separate.

## Media ruler and compact editor — 2026-10-28

- [x] Owner reports recent media sync workflow works better; extreme-zoom timestamp blur and redundant vertical space prompted this follow-up.
- [x] Render a viewport-sized timeline with adaptive, visible-only time labels, retaining seek/drag coordinates and bounded waveform work.
- [x] Move detailed guidance into Load/options; keep meaningful lower status messages; reduce first-use/reset height to 320 px without overwriting saved heights.
- [x] Open Load/options with an empty editor; reopen directly when a recording is already attached.
- [ ] Owner acceptance: zoom/scroll and fine-tune the long YouTube recording on the 16-inch laptop; inspect ruler clarity, compact layout and repeated open/close flow. Physical Fishman and audible playback checks remain separate from automated evidence.

## Launchers prefer localhost — 2026-10-28

- [x] Both ZIP launchers open/copy localhost through their shared server; continue displaying loopback IP and effective port and bind only to 127.0.0.1.
- [x] Update user guide and developer/module documentation, including separate-origin library transfer guidance.
- [ ] Actual Windows double-click/clipboard and Mac Finder/default-browser acceptance remain local; automated verification is recorded in DEV-NOTES.

## All Of Me YouTube origin diagnosis — 2026-10-28

- [x] Identify address-dependent behavior for EmeenSNRGBc: numeric 127.0.0.1 parent returns UNPLAYABLE/150; localhost parent returns OK. Both official embed hosts tested. Watch page reports playableInEmbed:true.
- [x] Verify exact supplied GP/video in actual current app at localhost:8081: recording loads twice, and explicit Preview advances the media clock. No runtime changes.
- [ ] Owner confirms same localhost address resolves playback in normal Chrome; libraries/preferences remain separate from 127.0.0.1. Actual audible sync/Fishman acceptance remains pending. YouTube's internal reason/history for differing treatment remains undisclosed.


## YouTube comparative evidence — 2026-10-28

- [x] Owner confirms rxsEDmdtRrY loads in the current normal browser; owner also reports EmeenSNRGBc worked before the recent updates.
- [x] Compare bd1945a and cf569bf under identical isolated visible-player conditions: rxsEDmdtRrY loads with both, EmeenSNRGBc returns 150 with both. Full-app baseline/current tests also fail for EmeenSNRGBc. See DEV-NOTES for boundaries.
- [ ] Historical difference remains unexplained: no evidence yet reproduces the owner's earlier successful EmeenSNRGBc session. Do not treat provider code alone as a proven cause or introduce speculative playback changes. Physical MIDI/listening acceptance remains separate.


## YouTube metadata readiness — 2026-10-28

- [x] Reproduce All Of Me score/YouTube loading failure on Live Server: iframe ready precedes duration, causing premature disposal.
- [x] Wait for finite positive metadata without autoplay; bound waiting and cancel timers on disposal/errors. Explain YouTube embedding refusal (101/150).
- [x] Actual earlier Autumn Leaves link loads after fix; new All Of Me link returns provider code 150 in isolated Chrome. Score import works.
- [ ] Continue the evidence-led investigation above; code 150 does not establish why a previously working session changed. Listening and Fishman acceptance remain pending.

## Media sync usability — 2026-10-27

- [x] Select successfully loaded recordings automatically without autoplay; retain explicit Synth choice.
- [x] Guard small YouTube duration revisions; preserve strict point/order validation.
- [x] Separate score/time lanes, clarify copy/save actions, use hundredth-second arrow steps with typed milliseconds, keep zoom by timeline, and temporarily reclaim fretboard space while editing.
- [ ] Owner acceptance: supplied Autumn Leaves GP + YouTube video, move Start after playback, audible alignment, local/URL/embedded recordings, laptop layout, profile reopening and Fishman Realtime/Wait. Automated evidence is recorded in DEV-NOTES.

### Deferred MusicXML presentation fidelity — 2026-10-26

- [x] Investigate pinned alphaTab 1.8.4 and current upstream support for chord-frame finger labels, simultaneous above/below words and slash-chord bass. Record private local model/SVG evidence and proposed boundaries in DEV-NOTES.md; no implementation added.
- [ ] Revisit only when explicitly scoped: evaluate a narrow slash-bass adapter and independent source annotation/frame metadata; trial an app-owned presentation layer if faithful numbered diagrams and above/below placement are required. Native model/renderer limitations remain unresolved; a stable upgrade was not available at investigation time.
- [ ] If resumed, add original synthetic regressions and verify actual rendering, source-to-beat mapping, paired imports, resize/zoom/tracks and unchanged playback targets/grading. Use private Soundslice Tool diagnostics locally; never copy lesson material or signed URLs into public fixtures. No current action or owner hardware retest is required for this deferred note.

### Beta v0.0.4 release and Pages guidance — 2026-10-24

- [x] Owner explicitly lifts the documentation/licensing hold and requests Beta v0.0.4; verify the tag is unused, align version.json/current instructions and save release notes.
- [x] Document root LICENSE detection and third-party exceptions, owner-controlled public visibility and main/root Pages setup. Add .nojekyll; preserve Live Server and all runtime behavior. README remains player-facing.
- [x] Complete release checks, push release commit 7deb130 and annotated v0.0.4 tag, and publish Beta v0.0.4 as a nondraft GitHub prerelease. Verify remote tag target, license recognition and tagged notices; details in DEV-NOTES.
- [ ] Owner makes the repository public when ready, verifies source/license/release access while signed out and enables Pages. Verify hosted assets, demos/playback, Help license/source links, library import and actual Fishman Wait/Realtime. Hosted/physical/Mac acceptance is separate from automated checks.

### Licensing before public release — 2026-10-24

- [x] Add AGPL-3.0-or-later terms for original application content, explicit MPL coverage for native-derived alphatab-host adaptations, third-party license inventory/source links and preserved vendor notices; retain CC0 demos.
- [x] Expose License & Source in Help/README and serve license texts through the optional local launcher. Preserve alphaTab/MIDI/Wait/feedback behavior and existing Live Server workflow.
- [x] Require alphaTab package license/font/sound notices on updates, hash them and reject missing notices before replacement; extend isolated updater and HTTP verification. Final evidence in DEV-NOTES.md.
- [ ] Before public hosting, make matching application source accessible and review project artwork/contribution rights and any new bundled content. Sonivox terms/provenance are upstream-declared, not independent sample clearance.
- [ ] Owner reviews Help/guide in the normal browser. Actual hosted source/license access and physical MIDI/browser acceptance remain separate. Keep 0.0.3 and all tags; next beta release/visibility/Pages activation still on hold.

### Owner experience for TriplePlay, MG3 and MiGiC Poly — 2026-10-24

- [x] Replace TriplePlay per-model qualification with successful owner experience and occasional mistakes; describe MG3 usability/extras/raked chords and MiGiC Poly Wait usability with distracting feedback hidden and many extra/wrong attacks. Mark NX/other alternatives untested; add manufacturer demo links.
- [x] Keep the personal-test scope, visual-only hiding and Together-window limitations explicit; no matching, feedback/default or MIDI changes.
- [x] 459 Node regressions, whitespace and isolated desktop/phone appendix checks pass, including updated experience and both demo links; details in DEV-NOTES.md. Owner wording review remains separate.

### MIDI requirement upfront and TriplePlay family name — 2026-10-24

- [x] Use Fishman TriplePlay for the family in player-facing setup/comparison labels; retain specific Connect owner-use evidence in the appendix.
- [x] Put the MIDI requirement at the start of README and Quick Help, reinforce external conversion in first-session/setup guidance and remove ambiguous wording about ordinary audio input. Keep score/playback access without MIDI clear.
- [x] 459 Node regressions and whitespace checks pass; isolated desktop/phone Chrome verifies upfront MIDI requirement, family labels and layout. Details in DEV-NOTES.md; owner wording review remains separate.

### MIDI hardware/software comparison appendix — 2026-10-24

- [x] Compare the two existing owner-used paths with MIDI Bass 3, MiGiC NX/Poly, SubSix, BOSS GK/GM-800, Sonuus G2M V3 and experimental REAPER ReaTune. Link primary sources, omit volatile prices, distinguish audio-only pickup/routing requirements and clearly mark untested setups.
- [x] Keep MiGiC chord tracking as a manufacturer claim, not evidence of parity with MIDI Guitar 3. Bass pointers do not expand the app's validated scope or six-guitar-string Hex mapping.
- [x] 459 Node regressions and whitespace checks pass; isolated desktop/phone Chrome verifies appendix links/anchor, eight sourced rows and readable horizontal table scrolling. Screenshots reviewed; details in DEV-NOTES.md.
- [ ] Owner wording review and alternative-device compatibility remain separate; the comparison does not establish physical acceptance.

### Clarify misleading tracking feedback and optional simpler visuals — 2026-10-24

- [x] Explain in README/Quick Help that correct playing can appear wrong/unrecognized after tracking errors; identify independent tab highlights/fret numbers/Poly estimates controls for less distracting feedback.
- [x] State explicitly that visibility changes do not alter grading, Wait progression or detection; retain setup/tolerance troubleshooting. No runtime/default changes.
- [x] 459 Node regressions and whitespace checks pass; isolated desktop/phone Chrome checks verify guidance rendering and overflow. Details in DEV-NOTES.md; owner wording/appearance review remains separate.

### Standard-guitar MIDI setup and tracking expectations — 2026-10-24

- [x] Add README options for TriplePlay/Connect and MIDI Guitar 3, source-linked pickup sensitivity/interface gain/tracker gate advice, clean input and realistic extra/missing-note expectations without attributing every mistake to conversion.
- [x] Explain slower raking as an experiment, particularly for ordinary polyphonic audio input; retain One at a time collection, Together chord-window and Realtime timing requirements. Add concise Help reminder/link; no runtime or grading changes.
- [x] 459 Node regressions and whitespace checks pass; isolated Chrome verifies desktop/phone Help scrolling/link and guide rendering/anchor navigation. Screenshots reviewed; details in DEV-NOTES.md.
- [ ] Owner reviews the wording in the normal browser and tries setup suggestions with the actual guitar/interface. Real-device effectiveness is not established by documentation/browser checks.

### Fretboard first-use defaults — 2026-10-24

- [x] Default to Beat + Bar with note labels, alternates off, visible fretboard, left-handed off and automatic sizing. Only Beat → Beat + Bar required a runtime change; existing settings and localStorage persistence already match the approved choices.
- [x] Preserve all valid saved views and independent fretboard preferences/sizing across reloads/score loads and hiding/showing. Update player guide and ownership/default documentation; verification in DEV-NOTES.md.
- [ ] Owner hard-refreshes and checks the saved view stays selected; a fresh profile should show Beat + Bar. Normal browser appearance acceptance remains separate from automated checks.

### Current beta acceptance, audio startup and Git workflow — 2026-10-24

- [x] Owner confirms normal real-guitar practice checks completed; broader TriplePlay/MIDI Guitar user coverage can follow through beta testing. This supersedes blanket claims that normal practice has never received physical acceptance, without claiming every historical edge case/platform/provider was tested.
- [x] Close the app-specific Fishman unplug-freeze investigation as a known cross-site Web MIDI limitation based on the owner's report. Retain troubleshooting/history in MIDI-DISCONNECT.md; the symptom is not claimed fixed and its browser/driver cause is not conclusively established.
- [x] Reproduce InvalidStateError with deliberately delayed native AudioWorklet startup; cancel obsolete starts and unstarted sources through a guarded host compatibility fix without vendor, grading or MIDI changes. Add native lifecycle and real-browser regressions; remove the older browser test workaround waiting for the worklet before Pause.
- [x] AGENTS.md authorizes descriptive commits/pushes after verified updates and defines explicit version/release handling. Retain 0.0.3 and all existing tags; owner holds the next version/tag/release for documentation work.
- [x] 459 Node regressions, deterministic delayed-startup Chrome checks, existing sync-practice Chrome checks and changed-module syntax/whitespace checks pass; details in DEV-NOTES.md.
- [ ] Owner can optionally check quick Play/Pause/Reset and subsequent resume in the normal browser; this specific edge case has automated browser evidence, not owner listening acceptance.

### Manual download guidance and menu scope — 2026-10-24

- [x] Owner approved keeping Settings and Practice as-is, deferring LED integration and automatic version checking, and leaving Piano Trainer unchanged.
- [x] Add Downloads & releases to More → Help & Guide; retain the main-branch ZIP fallback in the user-friendly root README and explain manual updates, library backup, retained old copy and consistent browser/address/port.
- [x] Document static link/guide ownership and future single-source version policy; retain Beta 0.0.3. Automated verification is recorded in DEV-NOTES.md.
- [ ] Owner hard-refreshes the normal Live Server browser, reviews Help/guide wording and opens the releases link. A real update, restored library and physical Fishman session remain owner acceptance checks.

### Paused loop scrolling and media repeat/jump verification — 2026-10-24

- [x] Reveal the paused native cursor after enabled loop slider/measure changes, including rapid or unchanged-start range edits; share existing media viewport reveal and preserve Auto-scroll preference, native transport, grading and count-in.
- [x] Verify separate recording-time occurrences through ordinary repeats, alternate endings, D.C. al Coda, D.S. al Coda and D.C. al Fine with synthetic native fixtures; no custom repeat interpreter or matching changes.
- [x] 454 Node regressions pass; final isolated browser and syntax/whitespace evidence in DEV-NOTES.
- [ ] Owner hard-refreshes normal browser and selects distant loop ranges without Play, with Auto-scroll on/off and either source. Listen to a familiar recording with matching repeat/jump form and review alignment at returns/Coda/Fine. Physical Fishman/provider/appearance acceptance remains pending.

### Clarify sync preview and restore practice controls — 2026-10-24

- [x] Add explicit Finish editing / Return to practice action; identify Preview on main transport and explain suspended feedback/targets/loops. Keep source choice separate and preserve alignment, matching and Wait progression.
- [x] Disable Loop inputs/intents during sync editing and source restoration without changing saved choices. Default video placement to Left; retain valid saved preferences/profiles.
- [x] 449 Node regressions pass; isolated Chrome verifies repeated source/editor transitions, cursor/range/shading, staff/tab/fretboard synthetic MIDI grading, silent Recording Wait, saved placement and desktop/phone layout. Syntax/whitespace pass; final details in DEV-NOTES.
- [ ] Owner tests real video/Fishman after source switches; see the acceptance checklist in DEV-NOTES. User confirmed fretboard targets return when closing the editor; no separate Realtime grading failure established.

### Tolerance defaults and setup guidance — 2026-10-24

- [x] First-use Two held notes and Skipped strings only (Hex); preserve saved choices, legacy disabled tolerance and all matching/progression rules. Keep tracking spikes on, range/brief filtering off, brief duration 30 ms and all four feedback switches on.
- [x] Explain tolerance during setup in README, add a brief Help reminder and expanded-section introduction, retain clean disclosure/summary without an importance badge. Clarify Poly estimated positions and optional simpler feedback. Document the owner's full preferred setup as optional, not universal defaults.
- [x] 448 Node regressions pass, including saved-choice/legacy-off preservation. Browser, syntax and final evidence are recorded in DEV-NOTES.
- [ ] Owner hard-refreshes normal browser, checks saved settings remain unchanged and reviews Practice/Help wording. A fresh/private profile should show Two/Skipped; actual Fishman/MIDI Guitar tracking, listening and comfort remain owner acceptance checks. No automatic application of the owner's optional range-on/brief-on/60 ms preferences.

### Alternate-guide contrast — 2026-10-24

- [x] Brighten alternate labels and modestly strengthen dashed borders without enlarging markers or changing behavior. 447 Node regressions and isolated native preview browser checks pass; screenshots inspected.
- [ ] Owner hard-refreshes and reviews Show alternate positions at normal and manually reduced fretboard heights. Appearance acceptance remains pending; this change has no MIDI path.

### Clear replayed collected-tone fretboard rings — 2026-10-24

- [x] Associate existing ignored-collected-tone replays with already credited event/pitch IDs for display. Clear their held rings after advancing in Poly/Hex without extra credit/errors or tab/Wait changes.
- [x] 447 Node regressions pass, including Collect/Together × Poly/Hex replay matrices, strict attribution negatives and the supplied four-tone capture pattern. Synthetic browser MIDI replay/pause/wrong-ring checks pass; see DEV-NOTES.
- [ ] Owner hard-refreshes and repeats partial-chord tones before completion, holds them into the next target and confirms no leftover purple/red rings or changed results. Physical input/appearance acceptance pending. Alternate-guide contrast was assessed but not changed in this fix.

### Measure preview continuity and alternate-position guides — 2026-10-24

- [x] At the last onset in Beat + Bar, preview one next playback onset in gold; restore full new-bar context on entry. Follow repeats and enabled loops, including loop return in Beat + Next Beat; retain rests and song-end behavior.
- [x] Add one saved Show alternate positions checkbox, default off. Draw faint dashed blue exact-pitch guides for current targets only, with written/live feedback priority and no inferred alternate fingers or octave acceptance.
- [x] Update root README player guidance and fretboard/architecture notes. 441 Node tests and isolated native preview/alternate-control, MIDI feedback, desktop/phone layout/media regressions pass; see DEV-NOTES.
- [ ] Owner hard-refreshes and reviews measure transitions, repeated endings/loop edges, rests, alternate guides on/off, labels/capo/orientation and saved preference. Physical Fishman/MIDI Guitar, listening and appearance acceptance remain pending.

### Hide accepted held-note tails on the fretboard — 2026-10-24

- [x] Hide rings from known accepted prior-target attacks in Poly/Hex without changing held MIDI, grading, errors, tab feedback or Wait progression. Retain current accepted feedback and genuine wrong-position rings.
- [x] Preserve fresh/unclassified input, including neutral paused exploration and release/replay of the same pitch; do not borrow earlier hidden status or stale green/red colors. Keep active held credit visible.
- [x] 438 Node regressions pass, plus isolated synthetic-MIDI checks in Wait/Realtime × Poly/Hex and existing desktop/phone fretboard/media regressions. See DEV-NOTES for evidence and limits.
- [ ] Owner hard-refreshes and checks familiar Poly/Hex guitar phrases: ring accepted chords across target changes, sustain genuine wrong notes, pause/explore/release/replay and repeated-chord tolerance. Appearance, real Fishman/MIDI Guitar and listening acceptance remain pending.

### Player guide wording — 2026-10-24

- [x] Keep the root README free of the app version number; clarify Node.js is required for the included launchers, not hosted use or an existing local server. Remove the deferred-feature list while retaining the practical pitch-grading explanation. Documentation only; no runtime changes.

### Beginner guide, optional demo scores and local launchers — 2026-10-24

- [x] Rewrite root README as player guidance for hosted use, ZIP/offline launchers, MIDI setup, scores/library, modes, menu pointers, feedback, music sources and troubleshooting. Preserve useful technical guidance in docs/DEVELOPMENT.md and existing subsystem docs; remove stale/contradictory history from the player guide.
- [x] Add README.html backed by the same Markdown and a local licensed renderer; keep a brief in-app quick start with a full-guide link opening a separate tab.
- [x] Add three original CC0 GP demos with editable sources and optional native loading from Scores. No automatic library seeding/saving/playback; existing Save to Library remains explicit.
- [x] Add one Launchers folder with Windows .bat and Mac .command files plus a dependency-free Node 22+ loopback static server. Retain Live Server, normal browser and native MIDI/practice behavior. Explain offline assets versus internet-dependent media and separate browser origins.
- [x] 429 Node regressions pass, including real HTTP path/method/MIME checks, launcher port failure handling, injected clipboard success/failure and all three native demo import/SVG/practice timelines. Changed JavaScript syntax and whitespace checks pass. Isolated desktop/phone browser demo/guide/offline flows pass; evidence is recorded in DEV-NOTES.
- [x] Launcher displays the local URL and offers C then Enter to copy for a browser of the user's choice; failed automatic copying retains manual-copy instructions. No LAN address is advertised.
- [ ] Owner tests the extracted Windows ZIP launcher, guide/new-tab navigation, all three demos, explicit save/reopen, offline local playback and a familiar Fishman practice session. Test Mac launcher permissions/Terminal/browser on actual macOS. Hardware, listening, platform prompts and owner visual acceptance remain pending. No published URL has been supplied/verified; add it to the guide when available.

### Scale full neck into manually shortened frame — 2026-10-24

- [x] Scale down the full fretboard to fit short frames, keeping all strings visible and circles round instead of vertical scrolling. Preserve horizontal scrolling, saved manual height and natural-size automatic reset.
- [x] 423 Node regressions plus isolated browser saved-height/scale/visible-string/round-marker/automatic-reset checks pass; existing geometry and app/media browser checks also pass. See DEV-NOTES.
- [ ] Owner hard-refreshes, drags shorter/taller, reviews text/all six strings, reloads and double-clicks to restore normal automatic size. Physical guitar and appearance acceptance remain pending.

### Snug automatic frame and saved manual resizing — 2026-10-24

- [x] Trim outer fretboard padding; fit automatically on first use and reserve horizontal-scrollbar space only when needed. Keep marker/text/string sizes unchanged.
- [x] Restore dragging/Up/Down below the neck's content height with saved manual choice and optional vertical scrolling. Double-click/Home/global reset restore saved automatic mode. Preserve legacy numeric sizes as manual choices.
- [x] 422 Node tests and isolated browser drag/keyboard/reload/reset/default-fit checks pass, plus existing desktop/phone app regressions. See DEV-NOTES for evidence.
- [ ] Owner hard-refreshes, reviews padding, drags shorter/taller and reloads; double-clicks divider to restore automatic fit. Appearance and physical MIDI acceptance remain pending.

### Fit the fretboard frame to its neck — 2026-10-23

- [x] Use a dynamic frame minimum based on neck height, frame chrome and horizontal-scrollbar allowance. Retain larger saved sizes and preserve small stored preferences without applying them below the fit minimum. Remove conflicting 32vh cap; retain horizontal scrolling and outer workspace/score sizing.
- [x] Node floor/persistence tests and isolated browser no-vertical-overflow checks across native string-count profiles and responsive widths; see DEV-NOTES for final results.
- [ ] Owner hard-refreshes, toggles fretboard visibility and reviews six-string/extended necks, narrow/short windows and manual resizing. Appearance and physical MIDI acceptance remain pending.

### Remove duplicate Display fretboard controls — 2026-10-23

- [x] Keep Show virtual fretboard in Display; move orientation/help access exclusively to the neck popup. Preserve saved orientation/defaults, hidden-neck retention, full help guidance and live status.
- [x] 420 Node regressions and syntax checks pass; isolated browser checks cover popup orientation persistence/reload, hide/show retention and help/status without the old Display control, plus existing fretboard/app regressions. See development notes for final evidence.
- [ ] Owner hard-refreshes and reviews Display and popup Help/orientation. Appearance and physical guitar acceptance remain pending.

### Fretboard readability and capo cue — 2026-10-23

- [x] Enlarge target/context circles and labels; increase string spacing. Keep vertical size steady during horizontal resizing and scroll below readable fret-cell limits.
- [x] Use 0/landmarks/current-target/final fret labels when compressed; omit 1 unless targeted. Retain all fret labels at comfortable widths. Show explicit nonzero Capo N badge and preserve existing capo arithmetic/inlays.
- [x] Pure resize/label tests plus isolated browser dimensions, capo, controls, mirrored tracks and existing regressions; see DEV-NOTES for final evidence. Keep Help, saved choices and feedback/Wait/MIDI rules unchanged.
- [ ] Owner hard-refreshes usual Live Server browser; review marker/text size, window resizing, right/left-handed scrolling, targeted fret 1, high frets and actual capo files. Physical Fishman/MIDI Guitar, appearance and listening acceptance remain pending.

### Fretboard previews, labels and paused browsing — 2026-10-23

- [x] Add saved Beat (default) / Beat + Next Beat / Beat + Bar views. Blue current, gold future outlines, faint neutral past; current feedback wins over deduplicated context and historical errors do not color context.
- [x] Add saved Note names (default) / Fret numbers / Finger numbers / None. Use explicit native fingering only, blank when absent; preserve pitch-based Poly/Hex grading and independent score feedback.
- [x] Add local arrow/gear controls, synchronized orientation and help. Arrows pause/cancel count-in, clear existing attempt/held state, seek within the enabled loop and remain paused. Disable during sync editing; retain existing pre-Play/startup behavior and compact panel geometry.
- [x] Add automated context, native fingering round-trip, persistence and isolated Live Server controls/navigation checks; see DEV-NOTES for final evidence and limits.
- [ ] Owner hard-refreshes usual Live Server browser: review all views/labels, missing/present fingering, left-handed/hidden persistence, and arrow stepping from playing/paused Realtime/Wait. Compare alternate-position Poly green, partial chords, wrong-note rings/release, repeats/loop edges and synced recording pause/seek. Physical Fishman/MIDI Guitar, listening, representative user files and appearance acceptance remain pending.

### Pre-Play fretboard target preview — 2026-10-23

- [x] Preview the next written attack in blue before Play when no session target exists; follow track/loop selection and retain paused current targets. Do not start grading, transport or create a session target.
- [x] 413 Node tests, syntax and whitespace checks pass. Isolated native-fixture browser checks cover Wait/Realtime load previews, all seven track changes, idle sessions, enabled-loop preview and Wait pause retention.
- [ ] Owner hard-refreshes, loads a usual score and reviews blue targets before Play, track/loop starts, pause/resume and physical MIDI. Hardware/visual acceptance remains pending.

### Startup fretboard — 2026-10-23

- [x] Before loading a score, show a standard six-string EADGBE neck instead of the missing-tuning placeholder. Loaded tracks retain their own tuning/string count; invalid/percussion tracks retain existing unsupported handling. Saved visibility/orientation still win.
- [x] 412 Node tests, changed-module syntax and whitespace checks pass. Isolated Live Server browser verifies startup, native imported 1/4/5/6/7/8/12-string tracks, saved hidden and left-handed choices without page errors.
- [ ] Owner hard-refreshes and reviews startup appearance and transition to a usual score. Physical MIDI/appearance acceptance remains pending.

### Settings text trim — 2026-10-23

- [x] Remove the routine per-device saving line; hide connected listening/receiving/mode confirmations while preserving waiting, None and error statuses. Keep per-device saving guidance in help.
- [x] Shorten Hex mapping to Channels, lowest → highest string and the channel sequence; remove the dropdown-range explanation.
- [x] 411 Node tests, syntax and isolated Settings browser checks pass, including hidden routine text, exact mapping, visible waiting/None states and existing device persistence checks. Owner visual/physical MIDI acceptance remains pending; hard-refresh and review both modes.

### Settings layout and per-device preference audit — 2026-10-23

- [x] Compact Settings into device/status, vertical Poly/Hex mode choices, aligned mode-specific rows, visible Hex mapping, collapsed device help and collapsed diagnostics. Retain connection failures in the visible status line.
- [x] Verify existing per-device mode/channel/base/order/bend/latency storage and preferred-device late arrival; retain the router and None/manual-selection policy. Disable Settings device controls without a selected input and identify the profile being edited.
- [x] 411 Node regressions, bootstrap/browser-runner syntax and whitespace checks pass. New isolated Live Server browser runner uses synthetic devices to exercise actual controls, separate device settings/reload, remembered arrival before any score, manual/None priority, keyboard help and widths 1440/800/620/390 without page errors or horizontal overflow.
- [ ] Owner hard-refreshes usual browser: select/configure Fishman and MIDI Guitar differently, switch back/forth and reload; start with the last device unavailable, connect before loading a score and confirm automatic selection/mapping. Review Settings spacing with a score; actual MIDI, reconnect/driver and listening acceptance remain pending.

### Practice menu tidy-up — 2026-10-23

- [x] Keep vertical practice modes and conditional Wait controls; move all four Score feedback choices ahead of MIDI tuning. Collapse tolerance/timing sections, align dropdowns, shorten visible explanations and retain detailed inline help and warnings.
- [x] Add a display-only held-note/filter summary that excludes unavailable Hex filters. Preserve control IDs, saved choices, defaults and all grading/transport behavior.
- [x] 411 Node tests, changed-module syntax and whitespace checks pass. Isolated Live Server Chrome checks cover keyboard disclosure, summary updates, reload persistence, independent feedback choices, Wait settings, duration controls and widths 1440/800/620/390; no page errors or horizontal menu overflow.
- [ ] Owner hard-refreshes the normal Live Server browser and reviews spacing with a loaded score in Realtime/Wait; check Hex/Poly device availability, saved feedback/tolerance choices and familiar Fishman/MIDI Guitar practice behavior. Physical MIDI and owner visual acceptance remain pending.

### Explicit held-note limits — 2026-10-21

- [x] Replace unlimited Multiple with Two notes / Three notes, retain Off / One note default, enforce caps in every practice/input configuration and migrate saved Multiple to Two.
- [x] Add cap matrix and preference migration coverage. See handoff for final checks.
- [ ] Owner hard-refreshes and compares Two against One/Three on repeated chords with MIDI Guitar; check reload persistence and X transitions. Physical/browser acceptance pending.

### Multiple held-note refresh — 2026-10-21

- [x] Keep separate real-attack evidence for correct prior-chord tails and collected-tone reattacks in Multiple. Allow Wait Collect corrections spanning attempts without requiring all collected tones in the latest gesture. Preserve One/Off, releases, chord identity and X rules.
- [x] 404 tests; isolated supplied E7 replay settles the stalled chord at 19.120 seconds with no credit on the following X target. No whole-performance accuracy claim.
- [ ] Owner hard-refreshes, enables Multiple and replays measure 2 in Poly/Hex. Check lingering correct tones advance the identical E7, released tones still need attacks, and the X beat waits for its own gesture. Capture any remaining mismatch; physical/browser acceptance remains pending.

### Lightweight capture readout before grading acceptance — 2026-10-21

- [x] Keep stopped/limit-reached preview bounded; generate full Copy/Save report only on demand. Add Clear recording; restore preview after manual-copy fallback loses focus.
- [x] Avoid trainer repaint for irrelevant bend/controller traffic while retaining raw capture and grading outcomes.
- [x] 400 Node tests including maximum-size preview/export/clear evidence; isolated Live Server Start/Stop preview smoke check.
- [ ] Owner hard-refreshes and records a longer passage; stop and reopen Settings, Copy/Save, Clear, then repeat to compare responsiveness. Test actual Fishman and MIDI Guitar traffic. Reassess Multiple held-note stalls and apparent X-beat skips using a fresh capture; neither symptom is established as a grading defect yet.

### All-mode MIDI tolerance — 2026-10-21

- [x] Shared Off / One note (default) / Multiple notes for Poly/Hex, Realtime and both Wait chord modes. Require fresh attack evidence, retain held provenance and explain the Multiple trade-off.
- [x] Extend written-range, brief-error and confirmed Hex artifact filtering to Realtime; retain independent saved choices and original-target decisions. Remove Wait-only UI restrictions.
- [x] Automated all-mode/input matrix plus isolated Live Server menu/choice/persistence checks. See development notes for final validation.
- [ ] Owner hard-refreshes usual browser: compare Off/One/Multiple with repeated chords in Poly/Hex, both Wait choices and Realtime. Check releases, deliberate mistakes, singles, X transitions, pause/resume and loops. Compare each filter on/off. Physical MIDI, listening and loaded-score acceptance remain pending.

### Written X and extra chord strings — 2026-10-21

- [x] Always forgive identified written X-string input in mixed Hex targets without crediting pitched slots. All-X beats still require one fresh arbitrary MIDI attack in Poly/Hex, Wait/Realtime, independently of scope.
- [x] Replace broad checkbox with Off / Skipped strings only / All unwritten strings. Require two distinct pitched strings for optional tolerance; preserve legacy saved true as All. Other filters remain independent.
- [x] Automated session, native mixed-X metadata and preference regression coverage; see development notes and handoff for final checks.
- [ ] Owner hard-refreshes normal Live Server: test all-X, mixed pitched/X, single notes, internal rakes and outer-string mistakes across all three scopes, Wait/Realtime, then reload to verify saved selection. Physical Fishman/browser acceptance remains pending.

### Continued TriplePlay USB freeze mitigation — 2026-10-20

- [x] Owner confirms whole Chrome freezes on active TriplePlay removal despite earlier guards. Skip close calls on disconnected inputs, including reinitialization cleanup; invalidate listener epochs before detachment. Connected switches/None still close once without waiting/retry.
- [x] 366 Node tests pass, plus router syntax and whitespace checks. Simulations cover notification storms, reconnect cycles, dead-port close avoidance, callbacks during detach, inactive-device removal and throwing/rejected/unresolved connected closes.
- [ ] Physical Chrome/TriplePlay acceptance remains pending. This is a mitigation, not a confirmed native-hang fix. See MIDI-DISCONNECT.md for acceptance and the None-before-removal comparison.

### Correct paired XML ties/visibility and repeat-open choice — 2026-10-20

- [x] Supersede saved per-file combine choices: ask every qualifying open, including reopening identical files; ignore legacy keys. Clear captured file input so same-file selection fires again.
- [x] Rebuild from original notation rhythm/visibility/ties/symbols with tab fingering and chain-origin fingering for sustained notes. Use native reimport/rendering; fail closed to separate parts when original sources cannot reconcile. No MIDI/session-rule or vendor changes.
- [x] Supersede the earlier 447-attack replay claim: original-source/browser checks establish 447 note entries, 30 tied continuations and 417 fresh slots / 223 targets. Fresh attacks match GPX within triplet rounding; all six practice configurations pass at 100%. Actual app prompts pass Combine/Keep separate/Combine with a legacy choice seeded. 362 Node tests and syntax checks pass.
- [ ] Owner hard-refreshes and reopens XML, confirms each-time choice and visible sustained upper chords/ties in measures 37–45. Play only fresh bass notes while chords sustain; verify physical Fishman Wait progression, Realtime feedback and listening. Hardware/audio acceptance remains pending.

### Black notation for all voices — 2026-10-20

- [x] Owner approved equal black native glyph colors for primary/secondary voices across all scores and visible tracks. Host resource settings preserve musical voices and independent green/red practice overlays; no grading/MIDI/transport changes.
- [x] 362 Node tests, host syntax and whitespace checks pass; bundled native settings parsing confirms both colors resolve to opaque #000000.
- [ ] Owner hard-refreshes Live Server and checks measures 37–44 of Four on six, All tracks display and green/red practice feedback. Browser/Fishman acceptance pending.

### Paired import gray-voice follow-up — 2026-10-20

- [x] Owner reports combine import appears to work. Explain screenshot gray bass as native secondary-voice coloring; retain native colors. Pitched notes in both voices remain targets.
- [x] Exact supplied repaired XML replay: 225 attack groups / 447 note slots, zero percussive groups; 100% with no errors/misses in Poly/Hex Realtime and both Wait chord modes. All 447 Wait feedback source-note marks become correct. Add independent synthetic two-voice regression.
- [ ] Physical Fishman and browser green-feedback alignment on both notation/tab remain owner acceptance, especially measures 37–44; synthetic replay does not establish hardware delivery or visual overlay placement.

### Optional paired MusicXML notation/tab import — 2026-10-20

- [x] Detect explicit two-part groups in uncompressed .xml/.musicxml on opening, including library reopen. Offer Combine parts / Keep separate only for closely matching notation-only/tab-only Guitar parts; no general track merge or multi-track grading.
- [x] Disclose differing measures; retain tab pitches, fingering, durations and ties, enable native notation, transfer chord symbols at original onsets, and remove the redundant notation track only after consent. Original/library bytes remain unchanged. Remember both choices by file SHA-256 and pair in this browser.
- [x] 361 Node tests pass; native SVG/MIDI checks pass. Supplied Four on six XML identifies measures 38/45 and transfers 67 chord symbols. Comparison measured about 1.5 ms after about 53 ms native parsing in one local Node run, not a browser performance guarantee.
- [ ] Owner checks the dialog, both choices, saved reopening, chord symbols (including measure 24), notation/tab, playback and Wait/Realtime with Fishman in the normal Live Server browser. Physical/browser acceptance pending.
- [ ] Compressed .mxl pairing, general manual merging, conversion/export and moving saved decisions with library backups are outside this increment; native .mxl loading remains supported unchanged.

### Optional brief off-target tolerance — 2026-10-20

- [x] Add visible Practice → MIDI input tolerance checkbox, Ignore brief off-target notes, default off. Correct pitches count immediately; wrong MIDI pitches released before the chosen threshold are forgiven. Wait Hex and Poly only; Realtime unchanged.
- [x] Default 30 ms, valid integer 5–100 ms; direct numeric entry and ±5 ms arrow buttons. Show duration when enabled. Save enabled choice and duration per MIDI input; disabling retains duration. Legacy/new device profiles default off/30. Device identity/reconnect behavior is preserved.
- [x] Keep pending errors anchored to their original target; mature held errors through the existing clock or releases. Preserve duration handling across target changes, Together retries, pause/resume, final completion and loop archival. Raw messages and later decisions remain in capture evidence.
- [x] 358 tests, changed-module syntax and whitespace checks pass. MG3 replay at 30 ms keeps all 84 correct attacks and target identities, removes 18 of 32 penalties (72% → 86% for that recorded segment). Synthetic browser check verifies checkbox, numeric entry and arrows; real app menu shows device-selection help when no input is selected.
- [ ] Owner hard-refreshes normal Live Server browser, selects MG3, enables at 30 ms, compares off/on, reloads and switches to TriplePlay to confirm independent saved choices. Check deliberate sustained errors, very short correct notes and loops. Physical acceptance pending.


### Weak precursor retrigger across Wait targets — 2026-10-19

- [x] Audit 48-message Christmas capture: measure-1 low C3 soft velocity-10 onset completes its target; release at 35 ms; same-channel/pitch velocity-119 retrigger at 42 ms is wrongly attributed to measure 2. This precedes every actual measure-2 chord attack; the held-note hypothesis is not the captured cause.
- [x] Under Filter confirmed tracking spikes (Wait Hex), tolerate one stronger immediate retrigger of an accepted soft single across exactly one target boundary: precursor velocity ≤20, matching raw/interpreted pitch and string/channel, captured release ≤70 ms, retrigger ≤60 ms from onset and ≤20 ms from release, ≥2× velocity. Never ignore a pitch required by the current target.
- [x] 342 tests, syntax and whitespace checks pass. Raw-router replay processes all 48 messages/24 selected-channel messages, preserves all 9 correct attacks and target identities, and changes the single disputed penalty from wrong to ignored-previous-onset.
- [ ] Owner hard-refreshes and retries measures 1→2 with confirmed-spike filtering enabled, including deliberate delayed wrong notes and genuine repeated written notes. Physical Fishman acceptance pending.


### Practice filter controls and menu layout — 2026-10-19

- [x] Capture both filter checkbox values before WaitController.stop publishes a synchronous repaint. Previously that repaint restored the old checkbox value before it was saved, preventing both directions of change.
- [x] Group MIDI tolerance options into full-width rows with attached descriptions, mode labels, and expandable technical help instead of alternating labels/help through the setup grid.
- [x] 328 tests pass, including both actual handler bodies under a simulated synchronous stop repaint; bootstrap syntax and whitespace checks pass. Live Server browser check confirms range on/off and visually grouped rows. The separate test browser has no WebMIDI, so live Hex checkbox/device acceptance remains with the owner.


### Captured MIDI artifacts and optional score-range tolerance — 2026-10-19

- [x] Audit the 452-message Christmas Time Is Here capture. All three disputed pitches occur in raw TriplePlay MIDI; string/fret feedback is a projection, not proof of a physical attack. See MIDI-ARTIFACT-AUDIT-2026-10-19.md.
- [x] Extend existing Wait Hex spike tolerance for wrong onsets released within 5 ms and replaced within 20 ms by the unique written same-string tone at equal/greater velocity, same target/retry. Preserve the earlier soft/distant policy and short correct notes.
- [x] Owner approved optional written-range tolerance for Wait Hex and Poly, default off and independently saved. Current fretted shape ±5 frets plus open strings; Hex uses reported string, Poly requires no plausible string. Invalid/missing fingering leaves input unchanged. This is score-based tolerance, not measured hand position or strict position grading.
- [x] Record enabled filters and ignored-range evidence without modifying raw MIDI. 326 tests, changed-module syntax and whitespace checks pass. Supplied-capture replay preserves all target identities and 88 correct notes; with both filters, 7 wrong remain, versus the captured 10.
- [ ] Owner hard-refreshes, keeps confirmed-spike filtering on, enables Practice → Ignore notes outside written fret range (Wait), retries the passage and deliberately tests nearby mistakes. Compare range off; verify saved choice after reload. Hardware/browser acceptance pending.


### Blank systems in imported GPX — 2026-10-19

- [x] Guard native alphaTab tab staff-line gap collection for notes without a valid string. Preserve pitches, score data, repeats, lazy loading and grading.
- [x] 309 Node tests and vendor syntax check pass. Supplied 32-measure GPX renders 11 chunks at 900px and 7 at 1800px in the native SVG renderer.
- [ ] Owner hard-refreshes Live Server, reloads Christmas Time Is Here, and confirms second/later systems, repeats, cursor and Fishman feedback in the usual browser.


### Confirmed Wait Hex tracking-spike tolerance — 2026-10-16

- [x] Implement optional saved Practice filter (default on) requiring a very soft, released, distant wrong pitch and stronger correct next attack on the same configured Hex channel, same target/retry. Bounds: velocity ≤20, duration ≤70 ms, distance ≥9 semitones, follow-up ≤200 ms and ≥2× velocity.
- [x] Preserve short correct notes, high written frets, unconfirmed/adjacent/loud/sustained errors, Poly and Realtime. Keep original raw MIDI and wrong outcome plus explicit reconciliation evidence. Candidates clear on pause/new session and cannot cross targets or retries.
- [x] 308 automated tests, changed-module syntax checks and whitespace checks pass. Capture-derived measure-2/7 patterns covered; measure-6 adjacent errors remain visible.
- [ ] Owner hard-refreshes and repeats the passage in Wait Hex, checks on/off behavior and intentional neighboring-fret errors. Hardware acceptance pending. Older entries saying extreme-spike handling is missing are historical and superseded by this section.


### Saved MIDI device profiles and late connection — 2026-10-16

- [x] Save Poly/Hex, single channel, Hex base/reverse, pitch-bend range and latency per input; restore before attaching its listener. Global Practice/feedback preferences remain independent.
- [x] Remember the last selected input across reloads and wait for late connection without switching to Microsoft loopback. First use and explicit None select no input; None cancels pending reconnection while retaining profiles. Manual selection replaces the remembered input.
- [x] Prefer browser port ID; recover a changed ID only from one matching name/manufacturer, preserving that profile. Ambiguous matches wait for manual choice. Invalid or blocked browser storage is contained.
- [x] 285 Node tests pass, including saved settings, multiple devices, startup/late plug/reload/unplug orders, explicit None, ID fallback and the first message using restored Hex/channel settings. Previous disconnect-storm checks still pass.
- [ ] Owner hard-refreshes, selects/configures TriplePlay once, then tests reload while connected and opening the app before plugging in. Verify both restore settings; test choosing None while waiting, switching to another device and back, and paused unplug/replug. Browser/Fishman acceptance remains pending.

### USB disconnect robustness and MIDI UI workload — 2026-10-16

- [x] Owner reports Chrome hanging, possibly coinciding with unplugging TriplePlay rather than file updates. No full-browser crash reproduced; do not claim a confirmed browser/driver root cause.
- [x] Ignore disconnected ports and output-only/unchanged connection notifications. Detach and close the old selected input once; discard queued stale listener callbacks. Keep the selected input preference during unplugging, reconnect that ID when it returns, and show Select MIDI input if manual choice is needed instead of silently picking another device.
- [x] Prevent late permission requests from overwriting newer access sessions. Emit one completed device transition instead of notifying UI while a listener switch is half-finished.
- [x] Group MIDI device/debug DOM updates by frame, cache dropdown options and eliminate duplicate trainer paints from message-state notifications and completed Wait gates. All raw capture and grading callbacks remain immediate; trainer/capture feedback still publishes synchronously.
- [x] Cache completed report text until evidence changes and serialize without cloning the entire capture first. Public report objects still return independent copies; the final capture-limit row is populated before automatic text generation.
- [x] 279 Node tests and changed-module syntax/whitespace checks pass. New evidence includes 10,000-event disconnect/output/unchanged storms, 100 reconnect cycles, stale callbacks, out-of-order permissions, all 5,000 MIDI messages delivered before UI paint, one publish per solved gate and report-cache invalidation.
- [ ] Owner hard-refreshes, tests one unplug/replug while paused, then during Wait practice if stable, with and without recording. Confirm the tab remains responsive and the same input returns; a changed OS device ID requires selecting it again. Real Chrome/Fishman/native-driver freeze acceptance remains pending. Live Server and the owner's Chrome session were not closed or replaced during this work.
- [ ] Extreme tracking-spike handling remains pending after stability testing; this change intentionally leaves pitch grading rules unchanged.

### Fix stale bend state blocking the first chord — 2026-10-16

- [x] Latest capture confirms a regression: raw G3/E4 were shifted +7/-10 semitones by unrelated channel bend values retained before recording. The first raw strum actually contains all four required Am7 pitches.
- [x] Apply only bend offsets observed within 60 ms of their own active raw onset. Exact repeats of that raw base can retain the observed correction; a different raw base, late/unassociated bend, pause or new session/attempt clears its applicability. Bare cached channel bend values never offset a fresh onset. This is scoped onset recognition, not universal continuous-bend interpretation.
- [x] 273 Node tests pass, retaining prior E7/Bm correction cases and adding stale ± offsets, changed-base isolation, pause/new-attempt/start resets and the captured first Am7 sequence. Actual raw-message replay through the router/controller advances on the first strum's E, 58.1 ms after A; only its separate raw F4 spike remains an error. Syntax and whitespace checks pass.
- [ ] Owner hard-refreshes and retries normal strums with the saved ±12 unchanged. Physical browser/Fishman acceptance remains pending. Extreme tracking spikes remain a separate policy decision.

### Wait Hex pitch-bend interpretation — 2026-10-16

- [x] Owner confirms Fishman range ±12. Wait Hex now interprets per-channel Note-On + bend using that saved matching range, with ±2/±24/Ignore choices in MIDI settings. Normal attacks remain immediate; ordinary short notes are retained.
- [x] A received bend within 60 ms may revise an initially wrong onset on its original occurrence, without adding an attack. Corrected pitches remove their false penalty/history/live marker; still-wrong pitches retain one penalty with updated pitch detail. Raw MIDI remains intact in capture, with separate interpretation/correction evidence. Poly and Realtime are unchanged.
- [x] Raw Note-Off releases the corrected sounding pitch. Pause cancels correction eligibility; channel bend state survives ordinary Pause/Resume and session restarts. MIDI/score reconfiguration clears it. No extreme-fret/velocity/duration filter was added; fret-26 tracking spikes remain a separate decision.
- [x] 269 Node tests, changed-module syntax and whitespace checks pass. Isolated supplied-sequence replays correct measure-2 E7 and measure-2/4 Bm7b5 onset errors; measure-4 E7 with no bend correction still fails as its received pitch requires. No new whole-performance percentage claimed.
- [ ] Owner hard-refreshes Live Server, confirms MIDI → Wait pitch-bend range ±12, then checks the same chords and a deliberate unbent fret-8 mistake with capture on. Physical browser/Fishman acceptance and separate extreme-tracking-artifact policy remain pending.

### MIDI input audit and repeated Hex chord recognition — 2026-10-16

- [x] Replayed all 486 raw messages from the latest capture through the actual router: all 486 preserved byte-for-byte; all 243 selected-channel messages delivered; no held duplicates suppressed. This is reproducible code-path evidence, not proof of live device/browser delivery before the capture boundary.
- [x] Wait One at a time can recognize one still-held matching tone in a repeated identical six-string Hex chord with at least three tones, when all other tones have fresh attacks on distinct channels within a short gesture. It waits min(200 ms, configured window) from gesture start plus at least 60 ms quiet before settlement through the existing controller clock. Fresh full chords remain immediate.
- [x] Release, changed pitch, noncentral pitch bend, wrong notes in the gesture, paused/restarted practice, stale gestures, ambiguous/reused channels, new chords, Poly and Together prevent support. Support cannot chain to another chord without a real reattack of that tone.
- [x] Diagnostics/history/snapshot reports distinguish held-note support from verified attacks; help explains chord recognition versus reattack verification. Capture also records browser dispatch delay and app handler duration without altering routing.
- [x] 255 Node tests pass; raw-router/controller/recording-on-and-off tests cover evidence preservation, delayed settlement and wrong-fret retention. Isolated replay of all three held-E chord pairs now completes each without errors. The final C case remains pending: it was released with no fresh Note-On and cannot safely be inferred. No personal capture/score data added.
- [ ] Owner fresh Live Server/Fishman check: normal repeated Am7 strums in Hex / One at a time, with diagnostics recording on. Observe held-note support count, X transitions and intentional wrong upper notes. If the released-C stall remains, compare the same short passage in the existing Fishman monitor separately; this distinguishes missing-before-capture input from app decisions. Physical/live browser acceptance remains pending.

### Wait X handoff and repeated chord tones — 2026-10-16

- [x] Keep repeated/changing pitch messages inside one X gesture out of the next target. A quiet 60 ms gap or a repeated starting identity after 60 ms starts a new gesture, within the existing maximum 200 ms (or shorter configured window) guard. Pitched-chord handoff and Realtime remain unchanged.
- [x] Replaying collected required tones in Wait adds neither credit nor a wrong-note penalty. Hex unisons still require distinct channels; Together expiry still clears partial hits. Genuine wrong pitches retain their penalties and feedback.
- [x] 243 Node tests, changed application-module syntax and whitespace checks pass. Synthetic cases cover the captured changing-pitch X sequence, consecutive X targets, reversed strums, fast singles, Hex unisons, Together expiry and the measure-4 fret-7/fret-6 correction.
- [ ] Fresh Fishman acceptance in the normal Live Server/browser: enable Allow muted-string noise (Hex), clear results, then check X → chord transitions, repeated/reversed strums and correcting measure 4. Compare Strict separately. Very rapid X/chord gestures remain subject to the bounded heuristic; MIDI alone cannot prove gesture identity. No new overall accuracy claim from replaying the old, differently advanced performance.

### Muted strums, Hex tolerance and handoff — 2026-10-16

- [x] All-X beats accept one fresh attack at any pitch in Wait/Realtime and Hex/Poly. Mixed X notes impose no pitched requirement; native rendering is preserved.
- [x] Saved Practice → Allow muted-string noise (Hex), default off/Strict, ignores omitted-string input only for supported six-string chords. Ignored input neither penalizes nor fills required tones; Poly stays strict.
- [x] Wait protects remaining tones of a completed strum at the next gate. Realtime favors a started chord within its existing tolerance. Fast repeated single notes retain immediate acceptance.
- [x] No blanket <100 ms filter or fret-distance rejection. Feedback describes received-pitch interpretations; X notes no longer prescribe frets.
- [x] 235 Node tests and an isolated actual-GP5 Chrome/simulated-MIDI check pass.
- [ ] Owner enables Hex tolerance in Practice and checks the jazz standard with Fishman: fifth-string rakes, one attack for X chords, transitions at measures 3/4, repeated chords, fast notes, reversed strums and Strict comparison. Muted strums with no MIDI still need a detectable attack. Physical/audio acceptance remains pending.

### Independent measure and recording selections — 2026-10-15

- [x] Measure/beat fields, timeline guides, saved marker clicks and secondary point-list selection change only the score target. Selected recording time, audio position and playing/paused state are preserved. The sheet reveals the measure without seeking its playback cursor.
- [x] Waveform clicks still select/seek recording time while retaining the score target. Add/Update joins the selections; actual dragging and 50 ms adjustments still edit/audition saved points.
- [x] 224 Node tests, 100 desktop / 99 phone app checks and 17 native/storage checks pass. Tests cover paused/playing target changes preserving recording time, native playhead and playback state, plus continued drag/nudge audition.
- [ ] Owner checks sound → measure → Add/Update, as well as measure → sound → Add/Update, with the usual MP3/video sources.

### Alignment indicator colors — 2026-10-15

- [x] Selected recording time uses dotted red and a red pointer, matching the solid red measure target. Moving playhead remains charcoal; saved/estimated points retain blue. Help text updated; no timing/transport changes.
- [ ] Owner checks the paired red indicators in the usual browser after reload.

### Audition adjusted sync point — 2026-10-14

- [x] Each 50 ms adjustment immediately moves the selected saved point, seeks recording/sheet to its new time, and preserves the previous playing/paused state. It no longer merely shifts playback relative to its distant old position.
- [x] 224 Node tests, 98 desktop / 97 phone app checks and 17 native/storage checks pass. Browser regressions seek from 3/5 seconds back to the adjusted 1.700/1.650-second marker and verify continued playback; paused adjustment also verified.
- [ ] Owner checks repeated left/right adjustments while listening well past the selected marker, plus paused adjustments, with the usual recording sources.

### Selected recording time stays fixed — 2026-10-14

- [x] Waveform/marker seeks select a recording time that stays fixed while playback continues. Editable Selected time and a dashed blue indicator show it separately from the moving dark playhead.
- [x] One Add sync point / Update sync point action saves the selected seconds for the chosen measure/beat and pauses. Use playhead time only copies current playback time into the selection, without seeking, saving or pausing. No added buttons or hidden live-capture mode.
- [x] 224 Node tests, 96 desktop / 95 phone app checks and 17 native/storage browser checks pass, including click → listen onward → save original time, non-saving playhead copy, and existing paused/running drag behavior.
- [ ] Owner checks the revised click → listen → Add/Update workflow with a representative MP3/video in the usual Live Server/browser.

### Drag audition and Start label — 2026-10-14

- [x] Dragging a saved anchor pauses during movement, seeks to the placed time on release, and resumes only if playback was running before the drag. Paused drags stay paused; explicit Align still pauses.
- [x] The score's opening anchor says Start, paired with End. Labels depend on score position rather than just being first/last in the saved point list.
- [x] 224 Node tests, 91 desktop / 90 phone app checks and 17 native/storage checks pass. Real-pointer checks verify pausing during a running drag, resuming at its placed time, and retaining pause after a paused drag.
- [ ] Owner checks running/paused drags and Start/End with the usual MP3/video sources in Live Server/browser.

### Ungraded sync editing and 50 ms adjustment — 2026-10-14

- [x] Open sync editor previews the selected source independent of saved Realtime/Wait. Scoring, old feedback overlays, practice loops and count-in are suspended. Closing pauses and restores practice/loop choices with a fresh attempt; preferences are unchanged.
- [x] Playing waveform/guide/saved-point clicks seek and continue; paused seeks stay paused. Capture and actual anchor dragging pause. Provider state reports cannot toggle playback on their own; paused position samples cannot trigger native completion.
- [x] Buttons move selected anchors immediately by 50 ms and keep preview running. Existing keyboard behavior is unchanged. Endpoint labels say End; intermediate anchors identify their beat.
- [x] Preview can seek/play past a moved score endpoint without native completion stopping the audio. Paused endpoints do not finalize grading. Checks: 224 Node tests, 91 desktop / 90 phone app checks, actual opposing pointer drags/playing seeks and 17 native/storage browser checks pass.
- [ ] Owner checks representative MP3/TrueFire/local video/YouTube editing, especially near the last measure, then closes the editor and checks normal Realtime/Wait with Fishman.

### Timeline without a waveform — 2026-10-14

- [x] Missing waveforms show a faint baseline/divider and “Waveform unavailable · Click timeline to seek” inside the existing timeline, with no fabricated waveform or extra panel height. Pending local decoding has a Building waveform hint; real data replaces the hint. No online processing added.
- [x] 221 Node tests, 81 desktop / 80 phone app checks and 17 native/storage browser checks pass, including fallback display and replacement by real peaks.
- [ ] Owner checks the hint with the working TrueFire URL. Owner confirmed the preceding target/playhead workflow works.

### Fixed alignment target and independent playhead — 2026-10-14

- [x] Measure/guide clicks select a target and seek audio plus score; waveform seeks preserve that target. Main Play/Pause does not change target or save sync points. Double-clicking a guide now only selects/seeks.
- [x] Red target indicator ends in the measure strip; dark playhead occupies only the waveform. Visible target/recording summary and **Align selected measure here** clarify capture. Recording seconds follows playback unless explicitly typed; seeking refills it.
- [x] Paused manual media seeks reveal the native sheet cursor once without changing Auto-scroll. Playback following retains the saved preference.
- [x] 221 Node tests, 79 desktop / 78 phone app checks and 17 native/storage browser checks pass. Syntax and whitespace checks pass; physical MIDI/provider acceptance remains local.
- [ ] Owner verifies the select-measure → listen/seek → align flow with a representative MP3/video, saved profiles and normal Live Server/Fishman setup.

### Readable media timeline zoom — 2026-10-14

- [x] Keep measure/time text readable at high zoom and waveform/playhead strokes at constant screen width. Declutter overlapping measure labels without removing guides or changing alignment.
- [x] 221 Node regression tests pass; application/browser harness syntax checks pass.
- [x] Actual app harness passes 69 desktop / 68 phone checks, including 516% zoom geometry and waveform redraw. Desktop zoom screenshot visually inspected.
- [ ] Owner checks the same MP3 at 100% and around 516% in the usual Live Server/browser: readable labels, finer waveform detail, horizontal scrolling and unchanged point dragging/sync.

### Shared media transport, grading and point capture — 2026-10-14

- [x] Media Sync only in More. One main Play/Pause uses Synth audio or Recording; Tempo percentage is shared, and the optional panel is for video. Duplicate media Play/speed controls removed.
- [x] Realtime grades MIDI against recording sync-point timing at the selected percentage; Wait pauses/mutes the source while its target seeks update the media frame. Original pitch rules and score timeline retained. This explicitly supersedes earlier recording-grading deferral.
- [x] Paused waveform seeking positions audio and native cursor together; guide hit areas no longer cover the waveform body.
- [x] Add / update point uses the playhead by default. Adjacent seconds/Use typed time is the single alternative, with no duplicate playhead button or redundant Undo for identical updates.
- [x] 221 Node tests and 65 desktop / 64 phone app checks pass, including recording-clock MIDI acceptance, shared Tempo and silent Wait advancement.
- [ ] Owner checks Fishman Realtime accuracy with representative media, silent Wait video positioning, real YouTube seek/rate/buffering and normal Live Server/browser acceptance. No version or Git publishing change.

### Compact, discoverable sync editing — 2026-10-14

- [x] Visible Add point creates the selected measure/beat at its estimated time for dragging; existing positions select their point without duplication. Use playhead time is the immediate timestamp alternative. One inline Apply time and adjacent nudges replace the hidden two-button fine adjustment.
- [x] MIDI practice/Use recording and Show whole recording replace ambiguous labels. Save stays visible; profile fields, waveform retry and duplicate point list move to Load/options. First-pass and point-list labels are plain language.
- [x] 217 Node tests, 59 desktop / 58 phone browser checks pass; desktop essential editing/save actions verified visible without scrolling. Current contract is in MEDIA-SYNC.
- [ ] Owner verifies the revised Add-and-drag MP3 workflow and physical/browser acceptance. This supersedes the earlier unified editor layout below.

### Unified Media Sync editor — 2026-10-14

- [x] Direct Media Sync toolbar/More action opens the editor. Source loading, Practice/Recording selection and profile picker/name/save live there; layout and profile management remain secondary options. Selecting Recording does not autoplay or overwrite saved visibility. Main transport keeps native media behavior and Practice restoration.
- [x] Estimated repeat-aware measure/beat guides are distinct from anchors. Capture immediately creates/updates the selected score position at recording time and pauses. Fine adjustment, pointer preview/bounds, 10/100 ms nudges, magnifier zoom/Fit, timeline seeking and Undo/Redo retain native point validation.
- [x] Automatic detailed stereo waveform for supported local files; visible-column rendering, resource limits and stale-result protection. Existing profiles/backups remain compatible; save status distinguishes unsaved edits.
- [x] 217 Node tests pass; browser validation and remaining acceptance are recorded in DEV-NOTES and MEDIA-SYNC.
- [ ] Owner checks audible alignment, real MP3/video/YouTube/direct URLs, touch interaction and Fishman Realtime/Wait restoration in the usual Live Server/browser. Graded recording practice, GP export/code generation and other deferred features remain outside scope.

### Workspace panel cleanup and UX review — 2026-10-14

- [x] Listen reveals recording and dismisses the menu; Edit sync opens the editor separately. Direct × controls hide recording/editor/fretboard and synchronize saved visibility without discarding work.
- [x] Editor/fretboard dividers support pointer/keyboard resizing, bounded persistence, viewport fitting and resets. Recording divider keyboard direction follows right/bottom placement correctly.
- [x] Collapsed alignment help, unsupported-score fretboard explanation and desktop fretboard fitting. Phone fretboard retains readable horizontal scrolling.
- [x] Fixed missing host score-loading/error callback registration: changing scores clears old recording/alignment and updates library loading/error state.
- [x] 209 Node tests pass. Expanded browser checks cover close/reopen, resizing, score switching, embedded media, menu width/Escape and reload persistence; see UX review for browser evidence.
- [ ] Owner Chrome/PiP, touch divider and Fishman Realtime/Wait acceptance. TrueFire integration, media pitch shifting and grading changes remain deferred.

### Match Piano Trainer folder deletion — 2026-10-14

- [x] Single and bulk folder Delete now warn that contained saved scores will also be deleted, with their count, focused Cancel and Escape dismissal. Confirmed deletion removes folders and their contents atomically. This supersedes earlier move-to-Unfiled deletion behavior.
- [x] All 207 Node tests and changed-module syntax checks pass; regressions cover selected contents, other folders, Unfiled and invalid/system IDs.
- [ ] Owner checks Cancel/Escape and confirmed deletion with disposable folders/scores in Live Server. Browser dialog acceptance remains pending.

### Bulk library management — 2026-10-14

- [x] Add compact Manage/Done controls to both library panes, checkboxes, selection counts, Select All/Deselect All, bulk score move/delete and folder removal to Unfiled. Keep extra actions hidden during normal browsing and retain per-item menus.
- [x] Scores header groups the folder name and count on the left, with Add File(s) immediately before Manage on the right. Search uses a full row; header groups wrap at narrow widths.
- [x] Atomic database operations preserve unselected records and original score data. Full Node suite: 205 passing; changed-module syntax checks pass.
- [ ] Owner checks Manage at desktop/phone widths in Live Server, search/folder selection clearing, cancel/confirm dialogs, multi-score moves and folder removal. Browser visual acceptance remains pending.

### Chord placement fallback for scores without diagrams — 2026-10-14

- [x] Only scores with zero chord diagram shapes use Score Default temporarily. Display shows Score Default with the selector disabled and a short explanation; any score containing at least one diagram, including mixed name/diagram scores, uses the saved preference.
- [x] The automatic fallback never changes or saves the preferred placement. Saving other Display options retains it; loading a score with diagrams restores it. Native host and storage/UI regressions cover these transitions.
- [ ] Owner checks a name-only score followed by a mixed score in Live Server, including changing zoom and reloading the page. Score Default restores the source stylesheet exactly.

### Persistent chord-diagram placement — 2026-10-13

- [x] Added Display choices in order: Score Default, Above Chord, Top of Score, Off. Score Default restores each loaded score's embedded alphaTab placement; the other choices override alphaTab's native diagram placement/visibility settings.
- [x] Save the selection with Display preferences in localStorage and apply it after each score load. Chord names and score content remain native; no grading, MIDI, transport or deferred feature changes.
- [x] Regression coverage checks preference validation/round-trip and each native stylesheet override plus restoring a score's original settings.
- [ ] Owner visually checks all four choices on Guitar Pro and MusicXML scores in Live Server, confirms chord names remain useful with diagrams Off, reload persistence, and that score layout/playback still behave normally.

### Relink recovered local media to a saved sync profile — 2026-10-13

- [x] Selecting a saved profile, then choosing a renamed/recovered local recording, reuses the saved sync points and updates that profile's source details after validation.
- [x] Reject a selected profile from another score or source type. Validate saved measure/repeat references and recording duration before restoring; show errors without applying invalid alignment.
- [ ] Locally verify selecting an older profile, relinking a renamed/timestamp-changed copy of the same recording, and confirming the profile is automatically recognized on the next load.

### Scores library menu cleanup — 2026-10-13

- [x] Group Open File, Save to Library, Backup Library, and Import Library (Merge) at the top; keep Add File(s) as a multi-file import into the selected folder.
- [x] Replace the folder dropdown/inline Edit controls with folder navigation and per-folder/per-score three-dot action menus. Keep the compact current-score title and collapsed track controls; remove duplicate loaded-file, playback-status, and current-position readouts.
- [ ] Verify folder create/rename/remove, score rename/move/delete, multiple file import, backup merge, and current-score loaded badge in Live Server at desktop and phone widths. Confirm alphaTab still opens scores natively.

### Ignore duplicate held-note attacks — 2026-10-13

- [x] Suppress repeated Note-On messages for the same MIDI channel/pitch while it remains held. The release still reaches feedback; the next Note-On is a fresh attack. The captured E4 case showed a duplicate 27 ms after its first Note-On and no release until about 1.28 seconds later; the owner confirmed the note stayed held. Duplicate events do not leak into the next Wait/Realtime target or count as mistakes.
- [x] Keep the original onset when calculating captured hold duration; mark suppressed duplicates as `ignored-held-duplicate` in the optional MIDI report.
- [ ] Owner verifies held repeated pitches and deliberate retriggers after release with keyboard and Fishman in Poly and Hex, in Wait and Realtime. Normal guitar re-plucks should produce a release before the next Note-On.

### Cleaner tablature practice feedback — 2026-10-13

- [x] Removed blue expected outlines and historical green correct outlines from tablature; retained those states on standard notation. The tab visibility switch controls red error marks and green correct marks only on the active target. Historical correct tab frets stay unmarked. Marks are compact, translucent rounded rectangles without a solid border, preserving fret readability.
- [x] Added a narrower, lighter-blue cursor band with a horizontal fade on both edges, removed the narrow center fill and suppressed thin blue expected-note rings on the staff. The in-app legend describes cursor position separately from green correct and red error feedback. alphaTab cursor positioning, score rendering and grading behavior remain unchanged.
- [x] Automated tests cover active versus historical correct tab feedback, error marks, and unchanged notation feedback. JavaScript syntax checks and `git diff --check` pass.
- [ ] Owner checks clean/error chord feedback, retained mistakes, cursor visibility, zoom and narrow/wide layouts in Live Server/browser with Fishman Realtime and Wait. Then consider Poly inference improvements as a separate change.

### Synth playback pitch offset — 2026-10-13

- [x] Audio exposes a whole-semitone -12 to +12 offset for all alphaTab synthesized score tracks, with a reset-to-written-pitch action. The offset resets when a different score loads.
- [x] Native alphaTab live channel transposition is used. Written notation/tab and MIDI grading targets are unaffected. Automated host check confirms all tracks receive the offset without moving practice position or clearing results. Synth master volume applies to synth/metronome/count-in; separate Synced media volume controls recordings and YouTube.
- [ ] Owner checks synth/media volume and pitch audibly in Live Server/browser, including local media and YouTube, and confirms the Fishman Realtime/Wait workflow still behaves as expected. Score transposition by semitones/key remains deferred until notation, key signatures, guitar tab positions and expected practice pitches can be kept consistent. Media pitch shift is a separate feature; browser extensions may cover provider media that this app cannot process directly.

### Audio menu pitch-control cleanup — 2026-10-13

- [x] Tightened the Synth playback pitch group: semitone input and Reset stay together on one row when space permits, the live status is concise, and one static sentence explains its scope. This removes repeated wording without changing volume or pitch behavior.
- [ ] Owner reviews Audio menu spacing in Live Server on desktop and phone widths.

### Media & Sync listening/alignment — 2026-10-13

- [x] Local audio/video, direct media URLs, explicit YouTube loading and GP embedded audio using native external-media cursor/seek/sync points. Listening is separate from MIDI grading. Return retains original practice timing/position/results and paused Wait attempts; Wait remains silent.
- [x] Saved Above/Below/Left/Right layout, mouse/touch/keyboard divider, panel/editor visibility and local/direct-video PiP. Grouped Recording/Layout menu explains side-by-side and disabled YouTube floating.
- [x] Optional local waveform, zoom, measure/repeat/beat/time editing, marker drag, Undo/Redo, increasing-point validation and endpoint protection. Explicit Save retains edits.
- [x] IndexedDB per-score/per-recording profiles: picker, all-profile search/rename/confirmed-delete/KB size list, JSON export/import, library backup v2 with profiles and v1 score-backup compatibility. No recording bytes/waveform storage.
- [x] Narrow host compatibility fix for 1.8.4's recursive worker getter; immutable vendor files. Native transport/Wait-restoration and actual UI-wiring checks added; see MEDIA-SYNC.md for reproducible fixtures/evidence.
- [x] 200 Node tests, 17 native/storage browser checks and 15 app UI checks pass; generated WAV/video-with-audio and profile restoration checked. Owner screenshots establish YouTube loading/playback, not full alignment/hardware acceptance.
- [ ] Owner audible/Chrome/Fishman acceptance, actual recordings/GP backing tracks, YouTube restrictions and PiP. Graded stretched-media timing, TrueFire automation and desktop-player connections remain outside this increment. No Beta version/Git publishing change.

Supersedes the earlier Media & Sync placeholder/broad deferral below for listening and alignment only.

### Repository alphaTab updater — 2026-10-13

- [x] Optional `tools/alphatab` double-click launcher and PowerShell updater: choose latest stable or an exact version, verify official npm package SHA-512/version/assets, stage before replacement, retain ignored backups, and record asset hashes. No runtime updater/build dependency or Git publishing.
- [x] Real 1.8.4 package download verified in check-only mode using Windows PowerShell 5.1. Isolated fixture covers latest lookup, check-only, install/backup, invalid integrity, missing core module and failed-move rollback. Existing 189 regression tests pass.
- [ ] Owner runs the installer when ready, then accepts rendering/feedback, count-in, loops, tempo/metronome, Pause/Resume and Fishman Realtime/Wait locally before committing/pushing. Installed alphaTab remains 1.8.1; no actual upgrade or Guitar Trainer version bump in this tooling task.

### Fretboard first-use defaults — 2026-10-13

- [x] Show virtual fretboard defaults on; left-handed defaults off. Both retain existing validated localStorage persistence across sessions/score loads. Saved explicit choices override defaults, including fretboard off.
- [x] Defaults, malformed/empty storage and both saved true/false choices checked; 189 regression tests pass. Supersedes earlier default-off fretboard notes.

### Compact fretboard and relocated help — 2026-10-13

- [x] Neck panel contains only the neck and functional fret/string/note labels. Title, legend, explanations, track/capo details and out-of-range pitch messages are in Display → Fretboard help.
- [x] Reduced padding, string spacing and marker size. At 1280 × 720, six-string panel is about 170px and seven-string panel about 190px; neither scrolls vertically. Phone 390 × 844 seven-string panel also fits without vertical/page horizontal overflow.
- [x] Double inlays sit between strings 2–3 and 4–5 on six strings; other counts use symmetric available string gaps. Capo-aware physical frets and left-handed reflection retained.
- [x] 189 regression tests pass; 56 real-DOM scenarios rerun at laptop and phone sizes, including corrected inlays. Native help, Wait targets, panel fit and phone mirroring checked. Owner appearance acceptance pending.


### Score-defined fretboard — 2026-10-13

- [x] Narrowing fret spaces, nut, capo-aware inlays, variable string thickness, target note names, separate held-note rings and complete left-handed mirroring.
- [x] Selected tablature defines string count/tuning. Non-six-string Hex input explicitly uses possible pitch positions; grading/hardware mapping unchanged.
- [x] 188 regression tests pass; native GP import/track switching verified for 1/4/5/6/7/8/12 strings. 56 browser scenarios pass at desktop/phone widths. Reproducible tabs included; see FRETBOARD.md.
- [ ] Owner Fishman, appearance/orientation and real extended-range/bass tab acceptance.
- [ ] Discussed follow-up: note-name/fret-number/off marker labels and optional conservative Poly position inference. No new inference/label controls in this pass.


### Display cleanup and persistence — 2026-10-13

- [x] Shorter auto-scroll label, tighter sections, indented left-handed checkbox disabled while fretboard hidden (choice retained), collapsed Fretboard help.
- [x] Save zoom, auto-scroll, fullscreen-on-Play, visible-track view, fretboard visibility and left-handed orientation across sessions/score loads. First-use defaults unchanged. Native score loading preserves chosen view; fullscreen still requires Play.
- [x] 175 tests pass; Live Server reload/native score reopening, orientation availability, help and laptop/phone layouts verified. Owner fullscreen/orientation acceptance remains local.

- [x] Audio Master volume (%) label stays on one line with a content-sized desktop label column and existing phone stacking; Live Server desktop/phone checked, 2026-10-13.

### Compact Practice menu — 2026-10-13

- [x] Hide Wait chord controls in Realtime, retaining saved choices/window when returning to Wait. Shorter radio descriptions and collapsed Chord timing help replace long permanent explanations.
- [x] Tighter Practice section spacing retains 44px controls. 172 tests pass; Live Server verified mode round trips, window gating, help disclosure and laptop/phone layout. At 1280 × 720, Realtime feedback choices/help are visible without scrolling; the final results action still needs slight scrolling.

### Persistent Practice preferences — 2026-10-13

- [x] All four Score feedback options default checked, with independent saved true/false choices, including Poly estimates. Estimates remain conservative visual guidance.
- [x] Remember Practice mode across sessions/score loads; Realtime on first use. Remember Wait chord choice and window; One at a time/200 ms on first use.
- [x] Validated localStorage preferences restore before UI/native startup. 172 tests pass; Live Server verified defaults, reload, fresh tab and score-load retention. Supersedes earlier default-off Poly/session-only feedback notes.

### Practice menu composition follow-up — 2026-10-13

- [x] Track selector first/full width; mode above Wait chord choices, with window beside chords on wider screens and stacked on phones. Unavailable chord-window label/help dims with its existing disabled input.
- [x] Direct, indented Poly estimate checkbox below Incorrect fret numbers, short dependency help and fuller explanation in the existing feedback disclosure. Feedback stays vertical and independently controlled; estimates default off.
- [x] 169 tests pass; Live Server chord gating and desktop/phone/tablet layout verified. Owner appearance/touch review remains local.

### Practice/Display, Audio and score library — 2026-10-13

- [x] Shorter feedback/track labels; occasional timing/Poly/help controls in disclosures. Independent feedback switches and native Display/fretboard behavior retained. Chord-window edits commit on Enter/blur without repeating unchanged pause/reset intents.
- [x] Saved master volume includes native playback, Wait metronome and count-in. Native track volume/mute follows practice/backing switches and groups shared MIDI channels; track settings reset on score load. Mixer edits leave grading/transport state intact.
- [x] IndexedDB scores/folders: save, bulk import, open/search, rename/move/delete, folder create/rename/remove, JSON backup and validated atomic merge with content deduplication. Removing folders keeps scores. Original bytes pass unchanged to alphaTab.
- [x] 169 regression tests and 12 real-browser IndexedDB checks pass. Live Server checked two-track MusicXML, save/reopen after reload, folder creation, rename/move/search, actual backup download/reimport, audio and native Display controls. See SCORE-LIBRARY.md for workflows/storage boundaries.
- [x] Phone/tablet/desktop layouts checked without horizontal overflow; bulk import and invalid-version backup handling verified. Library removals use explicit in-page confirmations with Cancel focused.
- [ ] Owner listening/Fishman/tablet acceptance, real GP/MXL save/reopen, fullscreen and storage quota behavior. Keep the same browser/address/port and make backups.

Supersedes older audio/library placeholders below. Grading, deferred pitch/media/exercise features, Piano Trainer, version metadata and Git publishing remain outside this update.

### TriplePlay Wait diagnostic recording — 2026-10-12

- [x] Opt-in MIDI/feedback recording in Settings with screenshot markers, selectable text, clipboard fallback and .txt download; no grading or spacing changes. 166 automated tests pass; browser controls checked.
- [x] Owner observed brief ghost notes in Fishman's own app, particularly with thumbnail playing, and reports moving Play Style toward Finger fixed things overall. Retain opt-in diagnostics for future issues; no app-side filtering added. TriplePlay Realtime remains untested.

### Historical fret placement — 2026-10-12

- [x] Small left-only nudge: retained red fret numbers move 2 scaled pixels closer to their tab outlines; live numbers and vertical string alignment stay unchanged. 162 automated tests pass.
- [x] Owner confirmed the spacing is fixed. Additional zoom acceptance remains pending. No layout padding or collision omission added.

Updated 2026-10-11. This is the central status and priority list. Stage files retain implementation details and checks; DEV-NOTES records decisions. Proposed items below are recommendations, not implemented changes. The next implementation stage should be scoped from this ordered list.

## Current workflow and specification — 2026-10-11

### Menu follow-up — implemented 2026-10-11

- [x] Follow-up: desktop toolbar uses 36px buttons even when a secondary touchscreen is present; only a coarse primary pointer selects 44px. Display mode and MIDI input source are visible radio groups with existing readiness/availability behavior.

- [x] Smaller 14px toolbar text, retaining responsive collapse/stack thresholds and 44px coarse-pointer targets. Owner confirmed the preceding collapse behavior.
- [x] Visible Practice mode and **Wait Mode Chords** radio choices, Wait-only chord gating, shorter help and compact spacing. Small screens still scroll.
- [x] Display: native zoom slider/numeric entry/±5 buttons (50–200%), auto-scroll and fullscreen on starting/resuming a ready player's Play gesture. Preferences remain session-only.
- [x] Reverse Hex counts **downward from the selected lowest-string base**, with bases 6–16; forward bases remain 1–11. Invalid bases clamp when switching direction. Channel sequence is explicit, active notes/results clear on input-setting changes, and grading stays pitch-only.
- [x] 162 tests pass, including radio gating, native scale/scroll, zoom editing and reversed Hex routing/releases. Browser preview verifies controls and phone fit. Loaded-score zoom/scroll/fullscreen and physical Fishman direction remain local acceptance.

### Menu organization and Piano toolbar — implemented 2026-10-11

- [x] Compact shared-menu composition replaces oversized headings/cards and stretched file/fretboard controls. Toolbar follows Piano's 1060px Tempo/Loop collapse, 960px score-percentage hiding and 620px stacking; coarse-pointer buttons retain 44px height. Popups follow measured toolbar height.
- [x] Practice contains Realtime/Wait, practice track, existing timing/chord controls, independent Staff/tab highlight/fret-number controls and default-off Poly inference. Small **Clear practice results** retains the existing current-position attempt action; no grading/transport change.
- [x] Live trainer status, expected/detected notes and mistake history moved to collapsed Settings MIDI/practice diagnostics. Display owns practice-only/all-track visibility and the existing six-string/left-handed fretboard. Audio owns existing selected/backing-track playback toggles; Wait accompaniment stays paused.
- [x] Scores keeps working Open File, compact metadata and expandable track list. Library/folder/backup controls, Audio volume/mixer/output, Pitch & Transpose and Media & Sync are explicitly **Not implemented yet**. Help now provides a basic guitar-specific quick start.
- [x] 160 regression tests and toolbar syntax check pass. Browser smoke checks cover menu movement, tablet collapse, phone stacking, diagnostics disclosure and Media shortcut; no horizontal overflow in checked layouts. Physical Fishman/tablet and loaded-score playback acceptance remain local.
- [x] Audio mixer/master volume and IndexedDB score/folder library with JSON backups implemented 2026-10-13. The earlier layout pass itself added no persistence.
- [ ] Later: define playback-only semitone offset versus coordinated practice pitch offset versus full key/semitone score transpose. Do not present audio-only shift as capo/down-tuning grading support.
- [ ] Later: Media & Sync for local audio/video and supported online providers, score/media-specific saved sync profiles, export/import and inclusion in library backups. Media files are separate from settings; backing-media/synth mixing and Wait behavior need focused validation.
- [ ] Later: custom fretboard automatically follows score string count/tuning (bass/7-string); separately scope positional MIDI mapping. Future dots/exercise overlays stay display-only. No Follow or virtual piano addition in the guitar menu plan.

This entry supersedes older menu-placement recommendations; dated descriptions of **New attempt here** refer to the unchanged action now labeled **Clear practice results**.

### Loop menu refinement — implemented 2026-10-11

- [x] Loop stays highlighted while enabled, including its More shortcut and a narrow-screen More marker. Dragging shows a three-second nonblocking notice only when it enables looping; later enabled drags stay silent. Follow-up validation: 160 tests pass; browser verified measures 2–3 activation, silent 3–4 adjustment, notice expiry, tablet More indicator and disable cleanup. Owner normal-browser acceptance remains pending.
- [x] Compact Piano-style Looper uses shared menu CSS, linked measure sliders/number fields, and horizontal arrows stepping by one. Crossing an endpoint moves the other; edits apply immediately and retain the existing pause/reset rule.
- [x] Enable Loop and Loop Count-in default off on page/score load, session-only. Loop Count-in is disabled/grayed when looping is off. Numbers remain playback-order positions, including repeated occurrences; repeated scores show written-measure/occurrence context.
- [x] Play/resume starts with a one-bar native-sound click pre-roll in both modes. Checked Loop Count-in inserts a pre-roll on each pass; unchecked loops repeat directly. Wait score playback remains paused and its independent metronome is suspended only for the pre-roll. Pauses, Reset, range/mode changes and score loading cancel pending pre-roll; note acceptance waits until completion. Resumed Together windows exclude pre-roll time.
- [x] Native alphaTab mouse drag selection expands to whole measures, updates the menu and enables looping. Single clicks retain the enabled loop; out-of-range seeks return to its start. Realtime playback uses native tick ranges/continuous looping, with explicit finish/pre-roll/restart only for repeat count-in.
- [x] Passive gray SVG shading uses native bounds outside selected written measures, redraws after layout changes, and disappears with looping off/full-song selection. A repeated written measure stays unshaded if any selected occurrence uses it. No custom score hit testing, MIDI output or grading-formula changes.
- [x] 159 automated tests and syntax checks; browser checks loaded Four On Six, selected measures 2–3 by native dragging, confined an outside click to 1,200ms, exercised count-in/cancellation, and checked 1280-wide, 768 × 1024 and 390 × 844 layouts without horizontal overflow. Touch arrows are 44 × 44, ranges 44px high.
- [ ] Owner listening/Fishman/tablet acceptance: count-in to first-note timing, repeated short loops with count-in on/off in both modes, Pause/Reset during pre-roll, and shade alignment through zoom/track changes. No version/Git publishing changes.

### Tempo menu refinement — implemented 2026-10-11

- [x] Compact Piano-style Tempo layout: editable BPM, linked speed slider/number box, and reset. Native speed range remains 25–200%; source tempo map is preserved. Realtime BPM shows effective tempo at the current position; missing initial tempo falls back to native 120 BPM.
- [x] Side-by-side five-step buttons for BPM, speed and volume; up from 103 goes to 105 then 110, down to 100 then 95. Direct entries can remain off-grid. Edited numbers commit on change, Enter or blur.
- [x] Piano-style Tempo refinement supersedes the tall stacked-arrow touch layout: horizontal arrows, compact aligned rows, plain number boxes, 24px slider thumbs (28px on touch) and 44px interaction height. Shared menu-controls.css owns menu spacing/control settings for all popup shells and reusable row/number/option classes. Existing menus inherit common spacing; migrate their composition as each is refined. Touch arrows remain 44 × 44. Physical tablet dragging/tapping remains owner acceptance.
- [x] Native Sonivox metronome, linked volume controls, and functional Tempo-button visual pulse. Defaults: metronome off, volume 75% (saved volume overrides default), visual pulse checked. Volume/visual controls gray out with metronome off. Accented downbeat is a disabled, explicitly labeled placeholder. MIDI Out click is omitted.
- [x] Latest owner clarification: Wait metronome is independent of cursor/user pace. It runs at the selected BPM while Wait is active, stops on Pause/Reset/completion, and does not restart for solved notes or loop passes. Entering Wait latches the source tempo at that position; later score tempo changes do not change its rate. BPM/speed edits in Wait adjust the click without pausing/resetting results; Realtime retains its existing pause/reset behavior. Accompaniment remains paused in Wait.
- [x] Metronome volume persists in localStorage; other metronome preferences remain session-only. No output routing, grading changes, or version bump.
- [x] 152 automated tests pass after the timing/restart fix: native Sonivox click rendering, repeated Wait restarts, audio-clock/visual alignment calculations, cancellation and saved volume. Actual GP3 browser smoke checks verified 200 BPM, pulse in both modes, Wait restart and volume retention. Earlier desktop/390px layout checks remain applicable.
- [ ] Separately scope Realtime speaker/input latency calibration: current grading has manual input compensation but does not automatically account for speaker output latency. Grading unchanged in this task.
- [ ] Owner listening/Fishman checks: native click tone/volume and beat alignment; continue solving Wait targets across tempo changes/loops at a steady click; change BPM while retaining errors/partial chords; verify Pause/Resume, Reset, completion, and new-score loading.

The current baseline is **Beta v0.0.3**; `version.json` records `0.0.3`. The owner approved this checkpoint after the Tempo/metronome update and will create the `v0.0.3` tag after committing the metadata/documentation update. Earlier tags, including `v0.0.2`, remain unchanged. This version update changes no runtime behavior and does not establish full browser/Fishman acceptance.

Read root README.md and AGENTS.md when starting a task. Work directly in this folder, preserve VS Code Live Server and the owner's normal browser/Fishman Connect testing, and leave commits/tags/pushes/deployment to the owner unless requested. Documentation carries durable decisions between chats; full chat history is not assumed to be available. Earlier ChatGPT history is in **Guitar Trainer** if accessible.

Current feedback uses one Staff control, independent tab error highlights/fret numbers, and saved conservative Poly inference. Hex numbers require configured channels and valid score interpretation, not a mandatory setup/verification button. Poly numeric inference is implemented for an unambiguous remaining written note; it is not physical string detection or strict-position grading. Both Hex and inferred Poly numbers are plain red numbers with translucent backing, native tab font size, and side placement; no tilde, numeric border, pointer, or custom staff spacing. Accepted tones retain green notation feedback; tab itself shows red error marks only. Genuine wrong-pitch history is retained.

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
6. **Validate reversed Hex mapping; scope exact-string grading separately.** Reverse order now counts downward from the lowest-string base (6–16), following the owner's latest instruction. Forward channel-1 remains default. A string-by-string hardware/display check should confirm direction. Fretboard mirroring is separate. Exact-string grading remains deferred and requires verified mapping.
7. **Evaluate a piano alphaTab prototype before a rewrite or merger.** Keep the current OSMD piano application working. Test a separate small prototype against representative piano MusicXML: two staves, hand selection, dense chords/voices, repeats/endings, ties, pedal behavior, and stable feedback positioning through resize/zoom. Compare actual results with the current piano app. Only then decide whether migration and a shared instrument-selector app are worthwhile; hide hand/LED/MIDI-output controls by instrument where appropriate. MIDI input channels and score staves are separate concepts: two piano staves need not require two keyboard input channels.

Recommended next stage: priorities 1–2, with focused validation from priority 3. Notation-first visual refinement is implemented in STAGE-8-NOTATION.md; validate it before adding Hex tab detail. The later items are ordered follow-ups, not a commitment to implement them all in one stage.

## Latest agreed Wait feedback specification

This specification includes the user's final clarification and overrides earlier tab mockups/inference proposals for the default feedback flow. Stage 8 implements the history/summary and notation feedback increments documented above; notation noteheads/accidentals are implemented; configured-Hex live/retained fret labels are implemented in both modes; physical MIDI and retained-lane layout acceptance remain pending.

| Moment/view | Planned behavior |
| --- | --- |
| Active target | Keep original expected frets readable. Configured Hex wrong pitches held on pending written strings receive a compact red translucent mark at that fret; accepted partial chord tones retain their notation feedback without tab outlines. Release removes the live error mark. No expected fret on the detected string means no invented mark. Poly does not identify physical strings. Optional remaining-note inference can mark a pending expected note/fret red without claiming string detection. |
| Wrong note held, configured Hex | Show one latest active red detected fret per string beside the expected fret, with a translucent background. Use the native tablature font size (14px by default) at normal zoom; keep full digits visible even when crowded; no live pointer; for example, expected B-string fret 1, detected fret 2. Never replace the written 1. Derive fret only when configured channel/string, tuning/capo/transposition, and pitch interpretation are valid. |
| Wrong note released, configured Hex | Remove its temporary wrong-fret marker. Keep the internal error record. Multiple held notes require independent release handling. |
| Wrong note, Poly/unverified mapping | Do not display a guessed fret as confirmed. Poly retains green accepted tones and actual received-pitch notation history. Optional inference marks only the sole remaining written note captured at a wrong attack; ambiguous cases stay unassigned. Unknown Hex string metadata retains its target-level summary. |
| Target completed, tab | Remove temporary wrong-fret markers; show compact red marks only for target notes with wrong-pitch history. Clean tones have no tab outline. Unknown Hex string errors keep the whole-target red summary. Poly accepted tones stay green on notation; when inference is enabled, only uniquely associated wrong-note targets retain red in Wait. Red means completed after errors, not that the target was never solved. Retain only the last wrong fret per detected string beside that string, without pointers. Do not accumulate all attempts. |
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
- [x] Loop refinement is implemented; see the current 2026-10-11 entry above. Hardware/browser acceptance remains pending.
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


## Long-score clipped audio — 2026-11-13

- [x] Reproduce native audio starvation, compare supplied exports against pristine/patched alphaTab, and remove repeated full-score Realtime searches and redundant clock paints.
- [x] Add an isolated original 160-bar audio-delivery regression for initial playback and a late-score seek.
- [ ] Owner hard-refreshes Live Server, opens each Arirang export, listens at the opening and after a later seek, and checks Pause/Resume and normal Fishman feedback. Automated audio delivery does not establish audible/hardware acceptance.
