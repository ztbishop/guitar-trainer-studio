# Stage 7: Wait chord matching options

Builds on Stage 6 and retains its notation/fretboard feedback. Adds Together / Collect notes under Practice. Includes updated architecture, dev notes, and TODO. Vendor libraries and CSS are unchanged; the ZIP excludes `.git`. Nothing has been pushed or deployed.

## Test locally

Copy files into your project and hard-refresh localhost in Chrome with Ctrl+Shift+R. Your MIDI piano is sufficient for the first checks; guitar strum and channel latency tuning need a later guitar check.

1. Load a score containing a chord. Select Wait mode. Collect notes remains the default: play one pitch, wait, then the other. It should advance as before.
2. Set Wait chord matching to Together. Keep Chord window at 200 ms and press Play. Play only one required pitch, then wait: its provisional green feedback should return to blue, the target should stay put, and feedback should say the chord window expired.
3. Play all required pitches within the window: the target should immediately advance. You may release an earlier note; attacks must fit the window, but there is no requirement to hold them or match the written duration.
4. Play pitches more than 200 ms apart: they must not complete one chord. The late correct pitch starts a new attempt; play the other required pitches freshly within its new window.
5. Try 350 ms for a rolled strum. The valid window range is 50–1000 ms. Changing either setting pauses practice and resets Wait results; press Play to restart.
6. Pause shortly after the first chord attack, wait, then resume and complete it within the remaining active time. Paused notes should not count. Pausing after an already-expired deadline does not restore the old attempt.
7. Test wrong pitches, single notes, repeats, section loop wraparound, Stop, seeking, and switching back to Realtime. Single notes should still advance immediately; loops reset provisional hits and retries for each pass.

## Rules

- Together uses MIDI event timestamps and active elapsed time; playback speed and written duration do not affect the window. The first correct required attack starts it. All required fresh attacks must fit, including the exact end boundary.
- Expiry clears provisional hits and channel assignments for that incomplete chord. Retry feedback is checked every 50 ms while active; a late note-on also checks expiry immediately.
- Each expired partial attempt increments a separate chord retry counter once. Idle time alone adds no further retries, wrong notes, or misses. Partial hit counts and green outlines are provisional and can decrease/reset on expiry.
- Wrong pitches count normally, but do not start, extend, or erase a still-valid partial attempt. Single-channel same-pitch unisons remain one pitch requirement; hex unisons require distinct channel attacks within the window.
- Pause freezes remaining time, preserving an unexpired partial chord. Stop, settings changes, seeks, score/device/filter changes, and new loop passes reset attempt state.
- These controls apply only to Wait. Realtime keeps its existing early/late and 60 ms chord grouping rules. No preference persistence or exact-string correctness is added.
- Collect remains the default until the stricter mode is validated on the user's setup. The 200 ms default is a starting point, not a claim about optimal guitar detection.

## Validation

```powershell
node --test tests/*.test.js
```

79 tests pass. Stage 7 adds 13 tests for timing boundaries, late attack retries, idle expiry, wrong-pitch handling, unchanged collection, single targets, hex unisons, visual resets, paused timing, loops/seeks/settings reset, and UI validation. Prior transport and notation tests remain green. JavaScript syntax, bootstrap imports, HTML IDs, and unchanged vendor/CSS checks pass.

Actual Chrome/MIDI timing still requires the checks above, especially rolled guitar strums and window expiry feedback.

## Push after validation

```powershell
git add -A
git commit -m "Stage 7: add configurable Wait chord matching and update project notes"
git push origin main
```

Run from the Guitar Trainer project folder. All non-ignored updates, including TODO, are staged.
