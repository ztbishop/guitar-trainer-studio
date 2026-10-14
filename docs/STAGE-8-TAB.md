# Stage 8: live and retained Hex fret feedback

Updated 2026-10-10. This supersedes the initial 9px, Wait-only, live-only markers and manual checkbox. The later mandatory guided setup is also removed at the user’s explicit request. The latest user decision places both live and retained details beside their strings, without pointers.

## Current behavior

- Wait and Realtime, configured six-string Hex input. Poly receives no guessed string/fret. Pitch grading stays the default: an identical MIDI pitch on a different string counts correct; a different octave does not.
- Display has three independent default-on switches: **Show notation feedback**, **Tab feedback highlights** and **Show tab feedback (frets)**. Notation controls correct/error and wrong-pitch feedback; tab feedback highlights control compact red error marks and green correct marks on the active target only; frets control live and retained tab numbers. Expected-note outlines and historical green tab marks are omitted. A narrower, faded light-blue alphaTab beat cursor marks current position; feedback marks render above it. The notation live/history controls continue to govern wrong-note heads and the Practice pitch history independently.
- Live: the latest currently held wrong fret per detected string, 12px at normal score scale, directly beside the written fret/cursor on the detected string. No pointer. Full two-digit numbers remain visible, even near a bar edge or another fret. The white background is translucent; temporary overlap is intentional. Release removes the live marker; an older still-held error may reappear.
- Retained: after Wait completion or Realtime timing-window finalization, show only the last wrong fret per detected string for each target occurrence. Place it beside the written fret on the detected string, exactly as for live feedback, with no pointer. Live feedback wins for that target/string while held; release restores retained feedback. Original black frets remain intact. Red errors remain compact translucent rounded marks; a currently correct tab fret gets a matching green mark while its target is active, then clears when the cursor advances. Historical correct tab frets remain plain. Staff correct/missed colors and written-score feedback remain unchanged.
- No custom staff padding, collision routing or reserved feedback lane. Full numbers remain visible; dense neighboring targets can overlap. The fret switch can hide detail while leaving compact tab error highlights visible. The supplied Four On Six GP3 retains native spacing.
- Realtime received-wrong pitches carry channel/string metadata and target IDs assigned by the existing grading timing window. Out-of-window attacks still affect the existing score, but do not get invented target/string positions. Duplicate required-pitch attacks are not actual wrong-pitch feedback. History finalizes when the target's hit window closes, which can be slightly after cursor movement.
- Retained fret details stay directly on the score, not in a new settings-menu list. Full wrong-pitch attack history remains in the existing optional Practice review and wrong-note notation. Repeated written positions show the latest/current occurrence's tab detail; previous Wait passes remain in the review list. Reset, new attempts and the existing seek/loop policies clear current feedback along with grading. Pause preserves records; releases while paused still remove live markers.

## Input configuration

Select a MIDI device, Hex input and the base string channel. Fret feedback uses the existing consecutive low-to-high channel layout immediately. There is no check-string button, verification checkbox, saved setup prerequisite or intercepted calibration MIDI. Score tuning/capo/transposition must still agree with the written notes before deriving frets. Display → **Show tab feedback (frets)** controls visibility independently of pitch grading. Poly input has no inferred string/fret.

## Local acceptance

1. Apply the changed-files ZIP over the previous project and hard-refresh Chrome.
2. Select Hex and your existing base channel. Without any setup/check step, wrong notes must produce live fret numbers; no check-string button should exist in MIDI settings. Toggle Show tab feedback (frets) to hide/show the detail.
3. Wait: at expected B-string fret 1, hold fret 12. The full red 12 should appear at 12px beside the target without a pointer, even if close to the next black fret. Release removes it. Complete the target: the last mistake reappears beside its string without a pointer and the existing red outline remains.
4. Chords: two wrong strings release independently. Several wrong attempts on one string leave only the latest retained fret. Errors on a string absent from the expected chord point to the detected string at the correct target column.
5. Realtime: play wrong then correct pitches within a target's timing window. Held errors remain live until release; after the window closes, last mistakes remain beside their strings at that target. Check late/early attacks near adjacent targets. Attacks outside all windows should not receive guessed fret positions.
6. Pause with a wrong note held, release while paused and resume. Scores/history persist and no stale live marker remains. Check New attempt here, Reset, seeks and loops.
7. Test notation-plus-tab, tab-only, zoom, resize, repeated occurrences, dense/classical chords and score effects. Confirm active correct green marks remain legible over the blue cursor, clear after cursor advance, historical correct frets stay plain, and red error marks stay compact. Toggle **Tab feedback highlights** and **Show tab feedback (frets)** separately; notation/history/grading should be unaffected.
8. Same pitch and octave on an alternative string/fret must count correct in both modes. Poly shows no fret numbers. Test alternate tuning/capo if used; incompatible pitch interpretation must omit positional feedback.

## Validation

124 tests pass. Added normalized Hex MIDI → Wait live/retained fret geometry and Realtime feedback tests with no verification prerequisite. Imported the user's Four On Six GP3 and exercised its first target: live and retained fret 12 both produce visible geometry without setup. Existing tests cover two digits, native spacing/profiles/zoom, independent releases, retained history, correct pitches on different strings and paused scoring retention. Physical MIDI acceptance remains local.

Commit description: `Place retained fret feedback beside strings and add independent display toggles`
