# Stage 5: playback speed and section looping

Builds on corrected Stage 4 and includes the updated project notes. The existing Tempo and Loop popups now have working controls. UI structure, bundled alphaTab, and CSS are otherwise preserved. No git push or deployment has been performed; the ZIP excludes `.git`.

## Local check

Copy the package into your project, preserving your local `.git` folder. Open `http://localhost:5500/index.html` and hard-refresh Chrome with Ctrl+Shift+R.

1. Load a known GP file and select your practice track. In Realtime, open Tempo and enter 50. Press Play: score playback should run at half speed. Reset to 100% returns to the score's original tempo map. Changing speed pauses practice and resets results.
2. Open Loop. Enable Repeat selected section, choose Start and End, and press Apply loop settings. End is included. Press Play: the selected section should repeat, and grading should reset each pass.
3. The list shows measure numbers, repeat occurrences, and playback steps. Choose the second occurrence of a repeated measure and confirm that specific passage is selected. Backwards ranges are rejected without changing the active loop.
4. Pause/resume within the loop. Stop should return native playback to the section start. Resume with Play. Only selected-range attacks should appear in practice results.
5. Switch to Wait. Solve the section's targets: after the last target, it should return immediately to the first target with fresh results and a new pass number. Backing tracks must stay silent; each pass requires fresh attacks.
6. In Wait, speed is disabled because targets advance on correct attacks. Loop controls remain usable. Pause/resume should preserve partial chords; Stop resets the pass counter.
7. Switch back to Realtime and confirm normal section playback resumes. To remove the loop, uncheck Repeat selected section and press Apply loop settings; press Play to resume full-score practice.
8. Load another score. The old loop must be cleared and selectors rebuilt for the new score. Playback speed is retained for the session; Reset to 100% is available. No preferences are persisted across a page refresh yet.

If the chosen practice track has no attacks in a section, Wait has nothing to advance. Choose a section containing notes. Native alphaTab playback can still loop backing tracks in that section.

## Rules and limitations

- Ranges use half-open ticks: start included, end excluded. Whole measure occurrence selection exposes repeats and endings explicitly rather than guessing which written measure the user intended.
- Attacks before the start, including sustains/ties entering the section, are not new required attacks. Native alphaTab owns accompaniment and seek reconstruction at the boundary.
- Realtime timing tolerances remain real milliseconds at all speeds. The underlying score tempo changes are scaled proportionally.
- Applying speed/loop changes pauses practice and resets results; it does not resume automatically. Editing dropdowns alone does not apply the loop.
- Results are per pass, not cumulative across loops. Wait displays the current pass number. The preceding Wait pass results are retained in state, but a historical results view is not yet implemented.
- Wait keeps the corrected immediate, silent behavior and unlimited chord collection. The Together / Collect notes option remains in TODO.md.
- Section selection is reset on score loading. Tempo and looping browser/physical MIDI checks above remain required; no live hardware test has been performed here.

## Verification

```powershell
node --test tests/*.test.js
```

56 tests pass. Stage 5 adds occurrence-range validation, onset filtering, speed input limits, silent Wait looping, pause/reset at loop boundaries, Realtime range grading/reset, and UI form checks. Tests use the bundled synthesizer and soundfont to confirm native half-speed section looping without dispatching the excluded future attack. Existing stage tests remain green. Application JavaScript syntax and module imports are checked.

## Git commands after validation

```powershell
git add index.html js/alphatab-host.js js/app-bootstrap.js js/app-state.js js/practice-engine.js js/practice-range.js js/transport-controls.js js/wait-controller.js tests/stage1.test.js tests/stage5.test.js docs/
git commit -m "Stage 5: add playback speed and section looping"
git push origin main
```

Use your actual branch name if it is not `main`. Proposed next work is notation/fretboard feedback after local Stage 5 checks.
