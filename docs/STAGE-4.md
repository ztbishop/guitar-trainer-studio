# Stage 4 correction: immediate Wait Mode stepping

This package replaces the initial Stage 4 behavior. The first version accepted an attack, then played the interval to the next target. That introduced duration-dependent delays, ignored input during those intervals, and played backing tracks between targets.

Wait Mode now keeps alphaTab paused throughout practice. A completed target immediately selects and seeks to the next required attack. There is no duration requirement, timed playback interval, or backing-track catch-up. Correct attacks are accepted even while the native cursor is asynchronously repositioning. Leading rests and gaps are skipped silently. Realtime retains normal playback.

## Test locally

1. Copy the package files into your existing project, preserving your local `.git` folder. Open Live Server at `http://localhost:5500/index.html` and hard-refresh Chrome with Ctrl+Shift+R.
2. Load your same GP file and MIDI input. Choose Practice → Wait. Confirm target scope is Selected track if you intend to practice one part.
3. Press Play, then tap a correct single note once. The expected target should immediately change, even for a long written note. No hold or release is needed.
4. Play consecutive required attacks quickly; cursor positioning should not discard them. Repeated written pitches require separate new note-ons.
5. Complete a chord by playing each required pitch. Partial correct hits remain collected; wrong pitches do not advance.
6. Cross a measure boundary. Backing tracks should remain silent throughout Wait practice.
7. Test Pause/resume, Stop, repeats, and switching back to Realtime. Paused attacks should be ignored, partial chords retained on resume, and Stop should reset results. Seeking after positioning restarts at the new target.

Wait has no missed-note penalty. Accuracy is correct / (correct + wrong). Single-channel input merges same-pitch unisons; hex input requires distinct channels for separate same-pitch string attacks. Exact string-position grading remains future work.

Count-in, loop, and prior playback-range settings are captured and restored on Stop or leaving Wait Mode. MIDI latency compensation applies only to Realtime. Wait playback is intentionally silent; accompaniment synchronized to variable learner timing would need a separate transport design.

## Validation

`node --test tests/*.test.js`: 47 tests pass, including immediate advancement across long notes and gaps, attacks before seek acknowledgement, partial chords, pause during seeks, score replacement, repeats/ties, and a bundled alphaTab synthesizer check that steps the cursor through the score without calling Play.

JavaScript syntax checks pass. Chrome worker/audio behavior and the physical guitar still require the local check above. Vendor alphaTab and CSS are unchanged. The package excludes `.git`; nothing has been pushed or deployed.

## Commit after validation

```powershell
git add index.html js/alphatab-host.js js/app-bootstrap.js js/app-state.js js/wait-session.js js/wait-controller.js tests/stage1.test.js tests/stage4.test.js docs/STAGE-4.md
git commit -m "Fix Wait Mode to advance immediately and keep accompaniment paused"
git push origin main
```

Use your branch name if it is not `main`.
