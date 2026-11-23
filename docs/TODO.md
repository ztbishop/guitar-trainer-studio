# Guitar Trainer Studio status and to-do

- [x] Recover short runs between synced visits in Auto-sync. Checked five saved lesson pairs, Jazz Discovery measures 15–17, recorded explanations and withheld second passes. [Results and limits](DEV-NOTES.md#auto-sync-across-several-missing-measures-november-22-2026)
- [x] Compare neighboring measures to distinguish competing takes. Tested Quartal Harmony, Connecting Intervals and three saved controls. [Results and limits](DEV-NOTES.md#choosing-a-repeated-take-from-its-neighboring-measures)
- [x] Verify chord attacks at the boundaries of a newly selected take. Quartal Harmony measures 8–9 now land within 0.15 seconds of the published boundaries. [Results](DEV-NOTES.md#verifying-bar-lines-after-a-repeated-take-moves)
- [x] Verify a delayed chord attack after a nearly shared bar line. Quartal Harmony’s measure 10 ends within 47 ms of the published time. [Results](DEV-NOTES.md#checking-a-delayed-downbeat-after-a-nearly-shared-bar-line)
- [ ] Build a blind Auto-sync sample from accepted Lesson Bridge references across courses. Pair each score and reference with the exact playable recording. Check coverage, take assignment, boundary error and explanation overlap before extending rules to other passages. Keep Quartal Harmony and Connecting Intervals as regression cases.

- [ ] With a Fishman in Realtime, play the first attack of the ties in Jazz Discovery 98027 measures 8 and 14. Check that the following gap adds zero misses and the next synced attack earns credit.
- [ ] Check measure 2 of Quartal Harmony in Lydian Mode (98109) with a physical MIDI guitar. Let its four notes ring through the break and check the next chord in measure 3.
- [ ] Evaluate per-passage recovery for conflicting time anchors. The reviewer shows the blocking check beside **Use reviewed timing**.

Check Auto-sync on a familiar lesson, then reopen Edit sync and time a missing measure.

Local listening check: audition the backward suggestion for Jazz Discovery measure 2 and check a score click on a familiar repeated pass.

Local acceptance for audio timing: click a missed measure on the score, set its first beat from the video, then check the colors and the following measure in playback.

**Stable baseline: v1.0.2, published November 20, 2026.** The core practice and usability work is complete. The next milestone is a few normal practice sessions with the released build. Use this page for current priorities and the dated archive for earlier decisions. [Release notes](releases/v1.0.2.md) · [GitHub release](https://github.com/ztbishop/guitar-trainer-studio/releases/tag/v1.0.2) · [Historical to-do entries](TODO-HISTORY.md)

## Changes since v1.0.2

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

- [ ] Check coverage of the 4:34 verse section in *Devil Inside*. Measure-label checks and eight matched timestamps do not establish coverage across the lesson.

- [ ] Try the longer riff search on another previously unmatched lesson. For *Devil Inside*, listen to the slower take around 3:20 and confirm which written pass you want to follow.

- [ ] Try **Suggest sync points from audio** on a familiar guitar lesson with spoken breaks and a repeated demonstration. Compare the preferred take and its measure boundaries with independently supplied Soundslice timing. Listen through one break and confirm practice resumes at the chosen pass.

Use v1.0.2 in your usual browser with your usual guitar. A few representative passages are enough to make this useful.

- [ ] **Fishman in Wait and Realtime.** Try a short passage with a repeated note, a chord, and a written bend or pre-bend. Check releases, Pause/Resume and a short loop. Compare Hex and Poly if you use both. For a reproducible mismatch, record the measure, input mode, and expected and actual feedback. [MIDI and practice guide](../README.md#getting-clean-midi-from-a-standard-guitar)
- [ ] **A real synced recording.** Listen through a musical passage and a spoken break, seek back to the music, and check that the TAB follows what you hear. If a read error occurs, check **Reload recording** with that source. If you encounter incomplete timing, review one draft and verify or place its missing endpoints by ear. An arrangement that differs from the recording may need a matching score or separate reference video. [Media Sync guide](MEDIA-SYNC.md)
- [ ] **Restore a backup when convenient.** Check one library backup in a separate browser profile and reopen a score with a saved sync profile. Relink a local recording from its original file. [Library guide](SCORE-LIBRARY.md)

Mac Finder launch, physical printing, touch layout, and other devices or recording providers can be checked when you use them. Detailed lesson-specific listening notes remain in the [historical checklist](TODO-HISTORY.md).

## Planned Media Sync and PDF work

- [x] **Guitar Trainer automatic timing drafts.** The browser searches three-measure passages, suggests takes in playback order and refines a continuous passage between two user pins. The player can audition alternate takes and leave explanation gaps. [Using timing suggestions](MEDIA-SYNC.md#suggest-sync-points-from-audio)
- [x] Compare pinned passage refinement on three lessons. Trackswitch improved quarter-second accuracy on interrupted lessons. Both matchers found all eight second passes of the continuous exercise. The trainer now offers a local alternate start for audition when its two estimates differ by more than ¼ second. [Passage comparison](DEV-NOTES.md#pinned-passage-comparison-across-three-lessons)
- [ ] Check additional independently timed lessons before adding a trackswitch runtime or changing the automatic selection. Include inaccurate passage pins, speech over guitar, written repeats, and sections where the current timing already sounds right.
- [ ] **Check accuracy on lesson recordings.** Keep reference sync points hidden during prediction. Report whole-lesson results separately from results given approximate passage bounds. On one spoken lesson the tested blind methods missed all 8 stops and 9 restarts at a quarter-second tolerance. With approximate bounds, trackswitch placed 21 of 31 interior starts within that tolerance. String Space placed all 18 starts within it on a separate continuous exercise. Recheck any browser implementation. Consider a local speech detector as a source of gap suggestions and test speech over playing before relying on it. Explicit licensing for String Space's own implementation is pending. [AudioLabs passage matching](https://www.audiolabs-erlangen.de/resources/MIR/FMP/C7/C7S2_SubsequenceDTW.html) · [Sync Toolbox](https://github.com/groupmm/synctoolbox) · [String Space](https://github.com/clark970417-eng/string-space)
- [ ] **Add offline PDF practice with a companion score.** Start with a local PDF and matching Guitar Pro or MusicXML. Let the player mark a printed measure once, store its box relative to its page, and use it on every mapped playback pass. Verify highlights after zoom, resize, page changes and written repeats. Use the companion for sound and grading. Show feedback beside the highlighted measure or on the fretboard. Exact printed-note feedback would require note positions on the PDF.
- [ ] **Suggest measure boxes on PDF pages.** After manual boxes work, try detecting rows and barlines on clean printed pages. Group notation and TAB, or both piano staves, into one box per written measure. Let the player accept a page, drag a boundary, split or merge boxes. Measure corrections per page on real PDFs. The AudioLabs project provides annotated scans and score-following examples. [AudioLabs semi-automatic measure boxes](https://www.audiolabs-erlangen.de/resources/MIR/2019-ISMIR-LBD-Measures)
- [ ] **Support a Standard MIDI File as a PDF companion.** Use its pitches and timing for playback and practice while the PDF supplies the notation and spelling. Provide track selection and a way to correct bar assignments when there is a pickup, missing meter information, or a repeat written out in the MIDI.
- [ ] **Evaluate Piano Trainer after the guitar workflow works on real lessons.** Keep audio analysis, timing by playback pass, and PDF page coordinates independent of the renderer. Assess a Piano Trainer adapter for its OSMD score, transport, MIDI import and feedback before planning Media Sync there.

## Optional for later

- **Exact-string or fret grading.** Scope an opt-in mode for a verified six-channel setup if fingering accuracy becomes a practice goal.
- **Follow mode.** Decide whether the score cursor or the accompaniment should follow the player's timing before designing the feature.
- **Other instrument setups and practice tools.** Consider deeper bass and extended-range fretboard support, coordinated score transposition, automatic latency calibration, or scale/chord-tone overlays when a specific workflow calls for them.

For an unusual score or recording, investigate the specific example when it affects practice. Keep the source score and timing evidence so the problem can be reproduced. [Development setup](DEVELOPMENT.md)
