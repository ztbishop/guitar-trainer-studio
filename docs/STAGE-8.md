# Stage 8: retained grading and Wait mistake history

Updated 2026-10-10. This stage implements the first manageable feedback increments from the latest TODO specification. Existing menus, native alphaTab rendering/transport, and module boundaries remain in place. Vendor files are unchanged. No push or deployment was performed; the deliverable excludes `.git`.

## Implemented

- Realtime retains results, percentage and note states through Pause/ordinary Resume, including native same-position seek acknowledgements (two-tick rounding allowance). Actual position-changing seeks, backward loop passes, settings resets and explicit Stop still start fresh grading.
- The bundled synthesizer emits Finished then an automatic rewind then Paused at non-loop completion. The engine now preserves the finished summary through this rewind. Play after completion starts fresh. Loop passes retain the existing fresh-score policy.
- Wait stores every received wrong-pitch attack against its playback event occurrence. Completion after any wrong pitch turns all original target outlines solid red; clean completion remains green. Chords use one target-level error outcome. Original noteheads and fret numbers are never replaced or recolored in the native renderer. Partial accepted chord notes retain provisional green until completion/expiry.
- Separate channel/pitch live wrong records disappear independently on release, including releases while paused. Completion clears live wrong records. Pause preserves completed and partial grades, retained history and Together active time; attacks while paused do not grade.
- Standard notation now shows red **actual pitch labels** beside the target (e.g. `Heard: C#4 (61)`), disappearing on release. After completion it shows `Errors: …` from retained history. These are target-anchored text annotations, not staff-positioned notehead glyphs. Repeated occurrences sharing written notes show the current/latest occurrence's detail.
- Tab remains the compact original-target red/green summary, without retained wrong frets or guessed Poly positions. Tab-only practice does not need visible notation to grade.
- Practice feedback lists completed mistake targets with pass, measure, repeat occurrence, target index and all received wrong-pitch attacks. Previous Wait loop-pass history remains in this review list while the new pass score/overlays reset. History is in-memory for this attempt, not saved across reloads.
- Display adds independent live Wait pitch-label and Wait-history visibility controls. The existing score-feedback control hides all score overlays; history can still be reviewed in Practice. Hiding feedback never changes grading/history.

## Scoring and outcome distinctions

The percentage formula is unchanged: Wait uses `correct / (correct + wrong attacks)`; Realtime uses `correct / (correct + missed + wrong attacks)`. Together retries remain separate, with no wrong/missed penalty for expiry. A received wrong pitch means a MIDI pitch absent from the active target's required pitches. The previous engine also penalizes duplicate attacks of an already-collected required pitch/channel; that scoring behavior remains, but such an attack does not falsely become wrong-pitch history or turn a completed tab target red. Consequently a target may complete green with a lower percentage after duplicate-required attacks. This distinction is deliberate; changing the formula is a separate decision.

History reports pending, completed-clean and completed-with-errors outcomes. Expected notes not received remain pending in Wait; the engine does not infer a playing mistake versus tracking omission. Retries do not erase earlier wrong pitches.

Stop/reset, changing score/track/device/input settings, changing chord settings, a deliberate seek or a new completed replay clear the attempt history. A new loop pass resets current grades but archives the previous pass's review history. A same-position native seek notification alone is not a new attempt.

## Deliberate next increments

- **Precise wrong-note notation glyphs remain pending.** This ZIP uses accurate pitch-name/MIDI annotations at native target bounds. Native note bounds lack a general written-pitch-to-y API, and the bundled accidental helper returns a fallback for pitches not already laid out. Do not place fabricated noteheads with that fallback. A later glyph adapter must handle clef, octave/transposition, accidentals, ledger lines and multiple voices without mutating the score.
- **Temporary verified-Hex wrong-fret markers remain pending.** Existing Hex channel selection is not an explicit verification of physical mapping. Do not silently treat it, or an MPE stream, as verified. Add explicit mapping verification and validate tuning/capo/transposition/pitch interpretation before drawing temporary detected-string fret labels. The current tab summary works for both input modes without claiming position.
- Long pitch labels can crowd dense notation. Check real pieces and zoom before refining the layout. Default, ScoreTab and Score profiles are supported for these labels. Tab/TabMixed profiles omit them; unsupported extra slash/numbered/default layouts fail closed, retaining the Practice history list instead. Visibility preferences remain page-session only.
- No Follow, strict-string grading, tracking filters, harmony/exercise/media work, menu redesign or Piano Trainer changes are included.

## Local acceptance checks

Use your existing local server/VS Code Live Server. Copy the ZIP's project files into your existing Guitar Trainer folder, keeping your `.git`, and hard-refresh Chrome with Ctrl+Shift+R. The ZIP does not update version tags or push to GitHub.

1. **Realtime retention:** play several targets including a wrong/missed attack; record the percentage. Pause, wait, play MIDI while paused, then resume. Percentage and old outlines must remain; paused attacks must not count. Finish the score: the final percentage must survive the native cursor rewind. Press Play again: a new attempt must clear it.
2. **Wait single target:** play a wrong pitch, release it, then play the right pitch. While held, notation shows its red actual pitch label; release removes it. Completing restores that pitch in retained `Errors` detail and leaves the original tab target red. A later clean target stays green. Expected tab frets must stay readable.
3. **Chord:** play an unrelated wrong pitch, then solve the chord. All original chord targets become red together, with no inferred assignment of the mistake to one tone. Test two wrong pitches and the same wrong pitch on different Hex channels: releasing one must not hide the others. Pause with a wrong pitch held, release while paused and resume: no stale live label.
4. **Together:** expire a partial chord. A retry alone must not add wrong/missed penalties or make the solved target red. Repeat after a wrong pitch: solving on a later retry must keep the red outcome. Pause an unexpired partial chord for several seconds, resume and finish within its remaining active-time window.
5. **Display:** toggle live errors, history and score feedback independently. Restore them: grades/history must still exist. Test notation-only, tab-only and combined source scores; hiding notation must not disable grading. Tab shows compact red/green outlines, without a historical wrong-fret list.
6. **Repeats/loops:** the returning occurrence starts blue without the earlier occurrence's label. Its outcome is independent. New loop passes start fresh percentage/score overlays; completed previous-pass mistakes remain in the Practice review list with separate pass numbers.
7. **Reset/regressions:** Stop, actual seek, track/mode/device/settings changes and a new file must clear stale attempt data. Resize, zoom and scroll; labels/outlines should follow native rerendered bounds. Check the TrueFire lick, jazz voicing and classical/fingerstyle passages already specified in TODO, with both Poly and Fishman Hex input where available.

## Verification

Run from the project folder:

```powershell
node --test tests/*.test.js
```

93 tests pass (79 prior + 14 Stage 8). Coverage includes full-target error color, independent note releases while paused, partial chords, Together retry separation, unchanged percentage formulas, history visibility, repeated occurrences, per-pass review isolation, resets, same-position seek retention, completed replay and native synth completion rewind. Native SVG renderer tests cover score/tab profiles and scales 0.75/1/1.5; host overlay tests cover pitch-label construction, hiding and post-render redraw.

Syntax/module imports, unique HTML IDs, patch ZIP reconstruction and source byte comparisons are checked during packaging. Browser screenshot alignment and physical MIDI were not performed here. Passing automated tests is not a claim that every hardware/browser/layout case has been validated.

## Realtime Pause follow-up (2026-10-10)

The initial synth-only Pause test missed the full API's native seek back to the current beat start. That backward seek cleared Realtime grading when pausing mid-beat. The host now marks this expected one-shot seek; the engine retains the percentage and note outcomes while following native cursor positioning. Both event delivery orders are covered by the host test invoking the actual bundled API Pause handler plus a worker-style acknowledgement test. A separate engine regression covers mixed correct/wrong results, paused input, Resume and explicit seek reset. All 94 tests pass.

Local check: in Realtime, produce a visible percentage with correct and wrong/missed notes, pause halfway through a beat, and verify the exact percentage and past colored outlines remain. Wait several seconds and play notes while paused; neither should change grading. Resume and repeat twice. Test a section loop too: ordinary Pause retains the current pass, while an actual loop wrap still starts fresh. Reset must clear the score, and deliberate score clicks/seeks must still start fresh grading. Wait should behave as previously confirmed. Hard-refresh after copying this update.

## New attempt here follow-up (2026-10-10)

Practice now includes **New attempt here** in both modes. It clears the percentage and previous grading/feedback without moving the cursor. Running practice continues; paused practice stays paused and Play resumes it. Wait also clears partial chord collection, retries, live/retained mistakes and previous loop-pass review, keeping the current gate and selected settings. The new attempt skips earlier targets. Reset still returns to the score/selected section start, and deliberate seeks and actual loop wraps keep their existing reset behavior. At the completed/end position the action clears the summary in place; pressing Play uses the existing replay behavior.

All 98 tests pass. New tests cover a paused partial Together chord with errors/retry, resume with a fresh chord window, a new attempt during an in-flight loop gate seek, cleared previous-pass history, Realtime resets while running/paused and fresh timestamp anchoring, and disabled/enabled action readiness.

Local checks after extracting and hard-refreshing:
1. In either mode, practice into the middle of a piece and pause. Open Practice and click New attempt here: the cursor stays put, the percentage becomes a dash until a new result is graded, and old feedback disappears. Press Play and grade new notes there.
2. Repeat while practice is running: it stays running and starts fresh grading immediately at the same position.
3. In Wait, leave a chord partly collected after a wrong note. Pause and start a new attempt here. The same chord must require all fresh attacks; old error labels/history/retries must be gone. Repeat with Together and after a previous loop pass.
4. Check that ordinary Pause/Resume still keeps results, Reset returns to the start, and actual loop wraps/seeks still start fresh grading. Tempo, loop selection, input settings and display options should remain selected.

## Realtime Pause action protection correction (2026-10-10)

The first Pause correction depended on a predicted current beat, which does not reliably match alphaTab's asynchronously rendered cursor. Pause now freezes app-side grading immediately and protects its one native seek acknowledgement regardless of destination. Queued non-seek position rollbacks while paused also preserve results. Intentional score clicks cancel unused Pause protection before seeking; Play and Reset clear it too.

All 99 tests pass. The new cursor/position mismatch and paused rollback regressions were run against the previous implementation and failed there before passing with this correction. Native cursor behavior and the existing Wait/New attempt here behavior are retained. Browser/MIDI validation remains pending.

Local acceptance: apply this ZIP after the New attempt here update and hard-refresh Chrome. In Realtime, build a percentage with some correct and wrong/missed attacks. Pause mid-beat and verify it stays unchanged immediately and after several seconds. Play MIDI while paused, resume, and repeat near beat/measure/repeat boundaries and inside a loop. Existing results must remain on Pause/Resume. Then deliberately click another score position, use New attempt here, and use Reset separately: each must clear results according to its existing behavior. A real loop wrap still starts a fresh pass. If a Pause still clears results, record the score file, track/view, approximate measure and whether a section loop was enabled so the exact remaining sequence can be reproduced.
