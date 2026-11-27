# Guitar Trainer Studio status and to-do

Guitar grading, PDF companions, MIDI import, Auto-sync and library recovery are implemented. The current milestone is normal practice with the released features. Physical Fishman response and personal take preferences are optional owner checks. Recording comparisons, browser recovery and fixture coverage can be tested by the project maintainer. The remaining timing ideas below are accuracy research.

- [x] Find a first-note PDF guide anchor on image-only system openings with recognizable noteheads.
- [x] Keep Media Sync open when Auto-sync completes.
- [x] Save recording references for standalone PDF entries and remove their legacy media copies.
- [x] Shift a range of standalone PDF taps or clear all taps for the current recording.
- [x] Mark recorded repeats and save standalone PDF/recording pairs to the library.
- [x] Use one shortest-duration strip per companion PDF chord, with one retained chord result.
- [x] Add a timed beat guide to companion PDFs, with live and retained colors controlled by Staff feedback.
- [x] Choose a bundled synth sound for a melodic track in Audio and restore the score's original instrument changes.
- [x] Allow Fill gaps on a continuous performance with unmatched opening or closing measures, and identify the estimated ends in the editor.
- [x] Offer a remembered Fretboard or Keyboard view and verify pitch feedback on the Arirang MIDI with both companion PDF editions.
- [x] Fit the full practice keyboard across desktop and phone panels.
- [x] Review a full PDF scan across page boundaries and accept all pages together.
- [x] Map a range of playback visits to existing printed boxes for repeats, alternate endings and coda jumps. Remember custom repeat mappings with the PDF and its score.
- [x] Save a library score’s loaded recording and sync profiles together and reconnect a moved recording.
- [x] Test a continuous recording’s closing run against a MIDI export with trailing empty measures and compare its selected timings with the Arirang GPX.
- [x] Restore companion PDFs, edited measure boxes and recording references from saved scores. Include PDFs and timing in portable library backups and support reconnecting a missing recording.

- [x] Scroll continuously through PDF pages, follow the saved Auto-scroll setting in both PDF workflows, and return from notation with Show PDF.
- [x] Give companion PDFs the full reading area and reopen the marking toolbar from Scores → PDF.
- [x] Clear all printed boxes for one companion score/PDF pair from the PDF menu.
- [x] Verify that Reset reveals the companion PDF box at the score or loop start after browsing away, and identify unlinked printed measures when clicked.
- [x] Compare PDF-only timing with verified TrueFire timing on a syncopated lesson. Offer per-passage audition, explicit application and restoration. Even spacing remains the default. See DEV-NOTES for the single-note and chord results.

- [ ] Listen to optional per-point comparisons on additional performances. Current timing is the initial choice for each point.

- [x] Refine existing points between two fixed blue timeline markers after Fill gaps, with cached audio and one-step Undo.
- [x] [Compare standard point refinement against saved timing on Connecting Intervals and Low Bass Note](AUTO-SYNC-BASELINE.md#refinement-after-fill-gaps-on-two-saved-lessons). A poor outer pin moved an accurate measure into a break. Test audition or protection for large shifts before broader automatic use.

- [x] Use the strict seven-measure take comparison in lesson Auto-sync and show verified fill groups for listening when the ordinary search has no matches. [Results and player checks](AUTO-SYNC-BASELINE.md#whole-phrase-take-selection-and-searches-with-no-initial-match)

- [x] Use the selected online recording for timing-blind analysis with a compatible lesson sender when the direct read fails.

- [x] Benchmark lesson Auto-sync across 200 archived lesson pages. [Coverage and per-lesson results](AUTO-SYNC-BASELINE.md)
- [x] Test one-sided recovery across the remaining 44 gaps, including projected attacks in marked breaks. [Results and wrong-performance case](AUTO-SYNC-BASELINE.md#partial-recovery-beside-a-recording-break)
- [x] Offer missing-measure takes in audio draft review with a two-second lead-in, explicit selection and undo. Country Shuffle Electric Guitar Rhythm and The Phrygian Mode are the paired controls. Owner listening feedback is pending.
- [x] Test all 65 missing runs and apply the phrase check supported by synced measures on both sides. [Comparison and remaining gaps](AUTO-SYNC-BASELINE.md#recovery-between-two-synced-measures)

- [x] Recover short runs between synced visits in Auto-sync. Checked five saved lesson pairs, Jazz Discovery measures 15–17, recorded explanations and withheld second passes. [Results and limits](DEV-NOTES.md#auto-sync-across-several-missing-measures-november-22-2026)
- [x] Compare neighboring measures to distinguish competing takes. Tested Quartal Harmony, Connecting Intervals and three saved controls. [Results and limits](DEV-NOTES.md#choosing-a-repeated-take-from-its-neighboring-measures)
- [x] Verify chord attacks at the boundaries of a newly selected take. Quartal Harmony measures 8–9 now land within 0.15 seconds of the published boundaries. [Results](DEV-NOTES.md#verifying-bar-lines-after-a-repeated-take-moves)
- [x] Verify a delayed chord attack after a nearly shared bar line. Quartal Harmony’s measure 10 ends within 47 ms of the published time. [Results](DEV-NOTES.md#checking-a-delayed-downbeat-after-a-nearly-shared-bar-line)
- [x] Run a blind comparison on 12 accepted Lesson Bridge pairs from five courses. [Coverage, accuracy and gap overlap](DEV-NOTES.md#blind-auto-sync-comparison-across-five-truefire-courses)
- [x] Recover missed lead phrases and choose chord demonstrations from neighboring measures. Compared 17 saved lessons and three additional held-out recordings. [Results and remaining errors](DEV-NOTES.md#recovering-melodies-and-chord-changes-from-neighboring-measures)
- [x] Tighten late opening chords and extrapolated final chord releases. Compared all selected boundaries on 24 saved lessons. [Results and remaining take errors](DEV-NOTES.md#ringing-chords-at-the-start-and-end-of-a-lesson)
- [x] Check final takes against the preceding chord progression in Chord Scales 1, 5 and 8. Compared 24 saved lessons and timed old and new Auto-sync builds. [Results and limits](DEV-NOTES.md#choosing-the-final-take-from-the-preceding-chord-progression)
- [x] Screen final single-note measures separately against saved reference boundaries. Of 34 eligible archived examples, 16 ended within 250 ms, 12 earlier and 6 later. Investigate audible release evidence before changing the estimator. [Selection and limits](AUTO-SYNC-BASELINE.md#final-single-note-measures)
- [ ] When a lesson draft has missing musical measures between known spoken breaks, test a passage-level fill in the draft reviewer. Use mapped measures on both sides within the same musical passage as pins. Preserve explicit break times and repeat passes, leave ambiguous gaps for review, and compare against reference timing before extending grading.
- [x] Allow a continuous recording's applied audio timing to become a separate set of standard sync points. [Arirang conversion and grading coverage](DEV-NOTES.md#filling-the-gaps-of-a-continuous-performance)
- [x] Reopen the original Arirang score and video and verify that Fill gaps covers measures 69–72 on pass two starting at 2:55.31. The two bounding downbeats agreed with three saved audio alignment estimates within 53 ms. Interior downbeats still vary with the rubato. Listening feel and physical input are separate checks.
- [x] Add Continuous music to Auto-sync for uninterrupted performances. [Arirang and saved lesson comparisons](DEV-NOTES.md#continuous-music-in-media-sync)
- [ ] Listen to the recovered Arirang opening, repeated figures, holds and final chord, and check their grading with a physical MIDI guitar.

- [ ] With a Fishman in Realtime, play the first attack of the ties in Jazz Discovery 98027 measures 8 and 14. Check that the following gap adds zero misses and the next synced attack earns credit.
- [ ] Check measure 2 of Quartal Harmony in Lydian Mode (98109) with a physical MIDI guitar. Let its four notes ring through the break and check the next chord in measure 3.
- [ ] Evaluate per-passage recovery for conflicting time anchors. The reviewer shows the blocking check beside **Use reviewed timing**.

Check Auto-sync on a familiar lesson, then reopen Edit sync and time a missing measure.

Local listening check: audition the backward suggestion for Jazz Discovery measure 2 and check a score click on a familiar repeated pass.

Local acceptance for audio timing: click a missed measure on the score, set its first beat from the video, then check the colors and the following measure in playback.

For a loaded recording, **Use reviewed timing** also offers playback when grading checks fail. The text beside the button describes exactly which behavior is available. Empty mappings can be filled in the draft editor.

The local draft editor can now activate confirmed passages through **Use reviewed timing**. For a draft without a usable passage, check the reason beside the review controls. Zero-length opening rests and reviewed gaps have targeted regression coverage.

**Stable release v1.1.0 · November 25, 2026.** The core practice and usability work is complete. The next milestone is a few normal practice sessions with the released build. Use this page for current priorities and the dated archive for earlier decisions. [Release notes](releases/v1.1.0.md) · [GitHub release](https://github.com/ztbishop/guitar-trainer-studio/releases/tag/v1.1.0) · [Historical to-do entries](TODO-HISTORY.md)

## Practice and recording changes in v1.1.0

- Reviewed recording timing can activate when the generated guitar playback proves that a ringing note ends before a spoken passage or exactly at its start.

- Media Sync groups **Time to apply (s)**, **Playhead (s)** and **Use playhead time** together. Zoom in for more beat labels. Save profile keeps edits across sessions.

- Online draft timing opens directly in Media Sync when **Import helper lessons automatically** is enabled. Local recordings still need a file selection.

- **Loop → Speed Trainer** increases Realtime synth speed after a chosen number of completed loops. Try a short loop with Loop Count-in and listen for the next pass’s tempo as it increases. [Tempo and Loop](../README.md#tempo-and-loop)
- **Media Sync → Drag / nudge → Stretch selected section** adjusts a passage against a pinned final marker. On a real recording, listen at the first and last points, then try Undo before saving. [Alignment controls](MEDIA-SYNC.md#alignment)
- **Show timeline below toolbar** gives a left-side video a full-width seek bar. Try seeking into a spoken break and clicking **Skip to music** beside **Edit sync** under the video. The title and Float video are under **ⓘ Recording info**. [Video layout](MEDIA-SYNC.md#video-position)

## Complete and shipped

- **Practice.** Wait and Realtime, count-in, tempo, loops and repeat-aware navigation, retained feedback, and adjustable chord and input tolerances. Written bend ranges default on for Hex and Poly, including affected notes in chords. Both modes grade pitch. [Player guide](../README.md#practice-modes-and-feedback)
- **Score display.** Native notation and TAB, independent feedback and track visibility, fretboard options, appearance, fullscreen, and print. The bundled alphaTab 1.9.0 upgrade is installed and qualified. It includes native layout improvements and preserves the supported repeat-bar, tie, and guitar-technique handling. [Upgrade record](DEV-NOTES.md#installed-alphatab-190--2026-11-20)
- **Library.** Score folders, search and management, original-file downloads, folder export, and browser library backup/merge with saved sync profiles. Keep separate copies of recordings and browser preferences as needed. [Library guide](SCORE-LIBRARY.md)
- **Recording alignment.** Media Sync supports individual and grouped point edits, Undo/Redo, and saved profiles. Verified lesson timing can represent explanations and unscored breaks. Optional Draft timing provides visual preview and editing while review is pending. HTML recording reload retains the score, timing, and paused position. [Media Sync guide](MEDIA-SYNC.md) · [Draft timing](DRAFT-TIMING.md)

The owner previously confirmed basic Hex and Poly input, Wait progression, Realtime feedback, repeat playback, and tempo/loop controls on their setup. The v1.0.2 release checks passed 895 automated tests with eight optional fixture skips, verified the installed vendor files, and covered playback and recovery with synthetic video in Chrome. [Development notes](DEV-NOTES.md#v102-release--2026-11-20) · [Earlier owner confirmations](TODO-HISTORY.md#current-status)

## Still to check in normal use

- [ ] Confirm that scrubbing the owner’s streamed lesson in Realtime, skipping its intro and resuming the later take all work in the normal browser session.

- [ ] In a lesson with repeated pickups, audition two takes and compare the highlighted bar with draft review.

- [x] Rerun blind Auto-sync on the saved *Devil Inside* GPX and recording. It selected 12 visits, including the slower take at 3:20.28. The verse at 4:34 remains unmapped. [TrueFire course, lesson 6, Main Riff Guitar](https://truefire.com/guitar-song-lessons/song-devil-inside/c2690)

- [ ] Try the longer riff search on another previously unmatched lesson. The *Devil Inside* score itself labels 1:11 and 3:20 as demonstrations of the same intro. A time-constrained search located both, and found a weaker candidate for the separately labeled verse at 4:34.56.

- [ ] Try **Suggest sync points from audio** on a familiar guitar lesson with spoken breaks and a repeated demonstration. Compare the preferred take and its measure boundaries with independently supplied Soundslice timing. Listen through one break and confirm practice resumes at the chosen pass.

Use v1.1.0 in your usual browser with your usual guitar. A few representative passages are enough to make this useful.

- [ ] **Fishman in Wait and Realtime.** Try a short passage with a repeated note, a chord, and a written bend or pre-bend. Check releases, Pause/Resume and a short loop. Compare Hex and Poly if you use both. For a reproducible mismatch, record the measure, input mode, and expected and actual feedback. [MIDI and practice guide](../README.md#getting-clean-midi-from-a-standard-guitar)
- [ ] **A real synced recording.** Listen through a musical passage and a spoken break, seek back to the music, and check that the TAB follows what you hear. If a read error occurs, check **Reload recording** with that source. If you encounter incomplete timing, review one draft and verify or place its missing endpoints by ear. An arrangement that differs from the recording may need a matching score or separate reference video. [Media Sync guide](MEDIA-SYNC.md)
- [x] **Restore a backup in a fresh browser profile.** Chrome restored scores, folders, six sync profiles and a companion PDF with edited boxes. The separate missing-recording check reconnected the file and recovered its original sync points. [Library guide](SCORE-LIBRARY.md)

Mac Finder launch, physical printing, touch layout, and other devices or recording providers can be checked when you use them. Detailed lesson-specific listening notes remain in the [historical checklist](TODO-HISTORY.md).

## Planned Media Sync and PDF work

- [x] **Guitar Trainer automatic timing drafts.** The browser searches three-measure passages, suggests takes in playback order and refines a continuous passage between two user pins. The player can audition alternate takes and leave explanation gaps. [Using timing suggestions](MEDIA-SYNC.md#suggest-sync-points-from-audio)
- [x] Compare pinned passage refinement on three lessons. Trackswitch improved quarter-second accuracy on interrupted lessons. Both matchers found all eight second passes of the continuous exercise. The trainer now offers a local alternate start for audition when its two estimates differ by more than ¼ second. [Passage comparison](DEV-NOTES.md#pinned-passage-comparison-across-three-lessons)
- [ ] Check additional independently timed lessons before adding a trackswitch runtime or changing the automatic selection. Include inaccurate passage pins, speech over guitar, written repeats, and sections where the current timing already sounds right.
- [ ] **Check accuracy on lesson recordings.** Keep reference sync points hidden during prediction. Report whole-lesson results separately from results given approximate passage bounds. On one spoken lesson the tested blind methods missed all 8 stops and 9 restarts at a quarter-second tolerance. With approximate bounds, trackswitch placed 21 of 31 interior starts within that tolerance. String Space placed all 18 starts within it on a separate continuous exercise. Recheck any browser implementation. Consider a local speech detector as a source of gap suggestions and test speech over playing before relying on it. Explicit licensing for String Space's own implementation is pending. [AudioLabs passage matching](https://www.audiolabs-erlangen.de/resources/MIR/FMP/C7/C7S2_SubsequenceDTW.html) · [Sync Toolbox](https://github.com/groupmm/synctoolbox) · [String Space](https://github.com/clark970417-eng/string-space)
- [x] **Offline PDF practice with a companion score.** Attach a local PDF, mark page-relative boxes and follow the current written measure through playback and loops. Both Arirang layouts passed browser checks. Owner acceptance with a physical MIDI instrument remains open.
- [x] Suggest editable PDF boxes per page, group notation with TAB, and use accepted measures for seeking and loop shading. Tested both Arirang layouts and the TrueFire Bernie Song PDF.
- [x] Scan the entire PDF from either marking editor, carry numbering across reviewed pages, and group PDF and library tools in the Scores menu.
- [x] Verify the PDF and Library tools dropdowns open beside their own Scores buttons at desktop and phone widths.
- [x] Correct the four known Arirang divisions, verify both control PDFs against their previous coordinates and allow bounded shared-barline corrections on saved and proposed boxes.
- [ ] Broaden detection checks to skewed scans, piano grand staves and multi-column layouts. [AudioLabs measure-box reference](https://www.audiolabs-erlangen.de/resources/MIR/2019-ISMIR-LBD-Measures)
- [x] **PDF with a local audio or video recording.** Find printed boxes before timing, tap starts and passage ends, correct drift, seek, change tempo and loop a timed passage in ungraded realtime practice.
- [x] Compare PDF audio estimates with even spacing on 18 archived recordings, including marked breaks. Show conservative per-measure suggestions and allow listening before applying.
- [x] Use the pulse near a tap to flag the misleading M10/M11 accents in Chord Scale 7. The reviewer suggests keeping even spacing and adding a closer tap.
- [x] Protect already-close Easy Guitar FYLT M95/M96 and Acoustic Guitar FWYS M10–M12 starts when a steady bass pattern emphasizes an offbeat. Keep Single-Note M26/M27 as controls.
- [ ] Owner listening checks on rubato and repeated takes remain open.
- [x] **Standard MIDI File as a companion.** Local conversion supplies selectable parts, pitches and a measure timeline. Assign any converted measure to a printed rectangle, including multiple measures at the same printed location for expanded repeats.
- [ ] Check real MIDI exports with pickups or missing meter. A box can correct the visual assignment. Correcting a beat or bar boundary inside the converted score would require a change to the score itself.
- [ ] **Evaluate Piano Trainer after the guitar workflow works on real lessons.** Keep audio analysis, timing by playback pass, and PDF page coordinates independent of the renderer. Assess a Piano Trainer adapter for its OSMD score, transport, MIDI import and feedback before planning Media Sync there.

## Optional for later

- **Follow mode.** Decide whether the score cursor or the accompaniment should follow the player's timing before designing the feature.
- **Other instrument setups and practice tools.** Consider deeper bass and extended-range fretboard support, coordinated score transposition, automatic latency calibration, or scale/chord-tone overlays when a specific workflow calls for them.

For an unusual score or recording, investigate the specific example when it affects practice. Keep the source score and timing evidence so the problem can be reproduced. [Development setup](DEVELOPMENT.md)
