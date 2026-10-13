# Stage 6: notation feedback and virtual fretboard

Historical notes: the 2026-10-13 [fretboard update](FRETBOARD.md) supersedes this stage's six-string-only virtual neck and original geometry. Session-only preference descriptions are also superseded by current README/TODO.

Builds on Stage 5, including the latest TODO entry for later Tempo/Loop menu refinement. Vendor alphaTab is unchanged; style additions are limited to the new visuals. No push or deployment has been performed. The ZIP excludes `.git`.

## Try locally

Copy files into your existing project and hard-refresh Chrome with Ctrl+Shift+R at `http://localhost:5500/index.html`.

1. Load your usual GP file. In Wait, press Play: the required note(s) should have blue outlines on rendered staff/tab notation. Accept a target: its outlines should become green and the next target blue. For a chord, partial correct notes should turn green independently while remaining notes stay blue.
2. In Realtime, deliberately miss a target: it should get a red dashed outline. Incorrect pitches remain in Practice feedback; they are not drawn as invented score notes.
3. Open Display → Show virtual fretboard. Check the expected T markers at the scored string/fret positions. Play and release MIDI notes: rings should appear and disappear. The latest correctly graded pitch is green; the latest wrong pitch red; other held pitches are purple.
4. Single-channel MIDI shows possible positions for a pitch, including multiple strings. Hex input uses the configured string-channel hint for displayed played positions. Neither display changes correctness rules.
5. Toggle Left-handed orientation: fret positions should mirror, while string 1 remains the high string. Test a score with different tuning/capo if available. Positions are relative to the capo.
6. Toggle Show note feedback on the score off/on. Confirm the native green cursor, clicks, scrolling, and playback still work. Resize the browser, change track/view, and re-open panels: outlines should remain aligned after rendering.
7. Test repeats and section loops in both modes. A returning target should be blue again, and a new loop pass should clear old results. Stop, seek, change mode/track/device, and load a new score: stale results should clear.

## Visual rules and limitations

Notation feedback uses native source-note IDs and scaled note bounds. It outlines noteheads/tab numbers rather than rewriting the renderer. Where a repeated occurrence shares a written note, the current occurrence wins; historical occurrence results are not all shown simultaneously. Hidden tracks and notes without bounds have no outlines. Tied continuations are not newly required attacks and are not given independent grading colors.

The fretboard is an initial six-string display: normally frets 0–24, expanding to scored targets up to 36. Unsupported tunings/tracks or missing tab positions have explanatory text. Played positions use pitch arithmetic; bend, sustain-controller, and harmonic fingering inference are not implemented. Mixed staves with different tunings in one merged target are not fully supported; the target group's selected staff provides tuning.

Display preferences apply for this page session only. Accessibility includes control labels, a color legend, target T/correct check/missed cross symbols on the fretboard, and existing textual Practice feedback. Notation colors do not yet have a full accessible note-by-note results view. Wrong rings describe the latest feedback pitch, not a permanent wrong-note history.

## Verification

```powershell
node --test tests/*.test.js
```

66 tests pass. Stage 6 covers per-note display states, repeat resolution, staff/tab bounds, scaled native alphaTab bounds, real normalization/tuning, capo/hex positions, left-handed geometry, unsupported/out-of-range input, Wait/Realtime resets, and accessible fretboard DOM output. The host test covers enabling note bounds, overlay display/hiding, and post-render redraw. JavaScript syntax, module imports, unique HTML IDs, and unchanged vendor assets are checked.

No browser screenshot or physical MIDI check was performed here. Local checks above are required, especially outline alignment and scrolling/resize behavior.

## Push after validation

```powershell
git add -A
git commit -m "Stage 6: add notation feedback and virtual fretboard"
git push origin main
```

Confirm the working directory is your Guitar Trainer project. This stages all non-ignored changes, including the project notes and TODO.
