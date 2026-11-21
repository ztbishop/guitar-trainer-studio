# Guitar Trainer Studio status and to-do

**Stable baseline: v1.0.2, published November 20, 2026.** The core practice and usability work is complete. The next milestone is a few normal practice sessions with the released build. Use this page for current priorities and the dated archive for earlier decisions. [Release notes](releases/v1.0.2.md) · [GitHub release](https://github.com/ztbishop/guitar-trainer-studio/releases/tag/v1.0.2) · [Historical to-do entries](TODO-HISTORY.md)

## Changes since v1.0.2

- **Loop → Speed Trainer** increases Realtime synth speed after a chosen number of completed loops. Try a short loop with Loop Count-in and listen for the next pass’s tempo as it increases. [Tempo and Loop](../README.md#tempo-and-loop)
- **Media Sync → Drag / nudge → Stretch selected section** adjusts a passage against a pinned final marker. On a real recording, listen at the first and last points, then try Undo before saving. [Alignment controls](MEDIA-SYNC.md#alignment)
- **Show timeline below toolbar** gives a left-side video a full-width seek bar. Try seeking across a spoken break in a familiar lesson. The title and Float video are under **ⓘ Recording info**. [Video layout](MEDIA-SYNC.md#video-position)

## Complete and shipped

- **Practice.** Wait and Realtime, count-in, tempo, loops and repeat-aware navigation, retained feedback, and adjustable chord and input tolerances. Written bend ranges default on for Hex and Poly, including affected notes in chords. Both modes grade pitch. [Player guide](../README.md#practice-modes-and-feedback)
- **Score display.** Native notation and TAB, independent feedback and track visibility, fretboard options, appearance, fullscreen, and print. The bundled alphaTab 1.9.0 upgrade is installed and qualified. It includes native layout improvements and preserves the supported repeat-bar, tie, and guitar-technique handling. [Upgrade record](DEV-NOTES.md#installed-alphatab-190--2026-11-20)
- **Library.** Score folders, search and management, original-file downloads, folder export, and browser library backup/merge with saved sync profiles. Keep separate copies of recordings and browser preferences as needed. [Library guide](SCORE-LIBRARY.md)
- **Recording alignment.** Media Sync supports individual and grouped point edits, Undo/Redo, and saved profiles. Verified lesson timing can represent explanations and unscored breaks. Optional Draft timing provides visual preview and editing while review is pending. HTML recording reload retains the score, timing, and paused position. [Media Sync guide](MEDIA-SYNC.md) · [Draft timing](DRAFT-TIMING.md)

The owner previously confirmed basic Hex and Poly input, Wait progression, Realtime feedback, repeat playback, and tempo/loop controls on their setup. The v1.0.2 release checks passed 895 automated tests with eight optional fixture skips, verified the installed vendor files, and covered playback and recovery with synthetic video in Chrome. [Development notes](DEV-NOTES.md#v102-release--2026-11-20) · [Earlier owner confirmations](TODO-HISTORY.md#current-status)

## Still to check in normal use

Use v1.0.2 in your usual browser with your usual guitar. A few representative passages are enough to make this useful.

- [ ] **Fishman in Wait and Realtime.** Try a short passage with a repeated note, a chord, and a written bend or pre-bend. Check releases, Pause/Resume and a short loop. Compare Hex and Poly if you use both. For a reproducible mismatch, record the measure, input mode, and expected and actual feedback. [MIDI and practice guide](../README.md#getting-clean-midi-from-a-standard-guitar)
- [ ] **A real synced recording.** Listen through a musical passage and a spoken break, seek back to the music, and check that the TAB follows what you hear. If a read error occurs, check **Reload recording** with that source. If you encounter incomplete timing, review one draft and verify or place its missing endpoints by ear. An arrangement that differs from the recording may need a matching score or separate reference video. [Media Sync guide](MEDIA-SYNC.md)
- [ ] **Restore a backup when convenient.** Check one library backup in a separate browser profile and reopen a score with a saved sync profile. Relink a local recording from its original file. [Library guide](SCORE-LIBRARY.md)

Mac Finder launch, physical printing, touch layout, and other devices or recording providers can be checked when you use them. Detailed lesson-specific listening notes remain in the [historical checklist](TODO-HISTORY.md).

## Optional for later

- **Exact-string or fret grading.** Scope an opt-in mode for a verified six-channel setup if fingering accuracy becomes a practice goal.
- **Follow mode.** Decide whether the score cursor or the accompaniment should follow the player's timing before designing the feature.
- **Other instrument setups and practice tools.** Consider deeper bass and extended-range fretboard support, coordinated score transposition, automatic latency calibration, or scale/chord-tone overlays when a specific workflow calls for them.

For an unusual score or recording, investigate the specific example when it affects practice. Keep the source score and timing evidence so the problem can be reproduced. [Development setup](DEVELOPMENT.md)
