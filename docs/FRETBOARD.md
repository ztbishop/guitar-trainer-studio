# Practice fretboard

Updated 2026-10-13. Supersedes Stage 6's original six-string-only display.

More → Display → Show virtual fretboard uses the existing saved visibility/orientation preferences. The selected staff supplies string count, tuning, capo and sounding transposition, without an instrument-name gate. Missing/invalid tuning and percussion show an explanation instead of a default guitar neck.

First use defaults to Show virtual fretboard on and Left-handed off. Both choices persist in localStorage across sessions/score loads; saved preferences override defaults, including turning the fretboard off.

Narrowing fret spacing, nut, single/double inlays and pitch-based string thickness provide location cues. Thickness is illustrative, not measured gauge. Notes sit within fret spaces; open notes sit outside the nut. Fret numbers are relative to capo; inlays reflect physical frets. Left-handed mode mirrors the neck and positions. Horizontal scroll retains readable high frets and survives feedback updates. The height-limited panel protects score space; larger string counts can need vertical scrolling.

The compact panel shows only the neck and its functional labels. Its title, legend, explanations and current track/range status are in Display → Fretboard help. Reduced padding and string spacing let six/seven-string necks fit without vertical scrolling at 1280 × 720 (about 170/190px tall). Double inlays on six strings sit between strings 2–3 and 4–5; other counts use symmetric available gaps. One/two-string necks use a single center.

Targets are blue, accepted targets green ✓, and missed/error targets red × / !. Separate held-note rings are green for accepted pitches, red for wrong attacks, purple without current correctness attribution. Targets and rings can coexist. Release removes rings. This consumes existing session results/live wrong notes without changing grading or transport.

Poly/pitch-only input shows every possible position within the displayed range, not detected strings. Configured six-channel hints restrict positions only on six-string tablature. Other string counts explicitly explain the mismatch and fall back to possible pitch positions. This does not expand Fishman hardware mapping or enable exact-position grading. The neck shows frets 0–24 and extends through 36 for current targets. Unsupported target positions are explained; other score feedback remains available.

Expected markers currently show pitch-class names; fret numbers and open-string pitches stay labeled. Note-name/fret-number/off selectors and optional conservative Poly position inference are discussed follow-ups, not implemented controls. A future estimate should reuse the unambiguous-remaining-target rule where applicable and never silently pick among equally possible strings. The existing tablature estimate checkbox still governs score overlays independently; custom incorrect fret-number overlays retain their six-string limits. This pass generalizes the virtual neck.

## Verification

- 189 regression tests pass: native GP export/import and MIDI normalization for 1/4/5/6/7/8/12 strings, first/last strings, drop D/capo, selected staff/transposition, deduplication/release, simultaneous green and multiple red pitches, invalid tuning/positions, mirrored rendering, corrected inlay gaps, relocated help and geometry through fret 36. Native fixture sessions verify existing Wait/Realtime pitch acceptance.
- Synthetic `tests/fixtures/fretboard-multistring.gp` and normalized JSON regenerate with `node tests/generate-fretboard-fixtures.js` using bundled alphaTab.
- Live Server `tests/fretboard-browser.html` runs 56 real-DOM combinations (seven profiles × two orientations × four feedback states) without touching preferences/library/MIDI. Desktop and 390px phone checks pass without document horizontal overflow.
- Native app imported the generated GP file; all seven selected tracks produced matching drawn string counts. Physical Fishman, owner appearance/orientation acceptance and representative real bass/extended-range files remain local checks. Synthetic fixtures cannot establish every external file's tuning conventions.

No build, runtime dependency, vendor, grading, Piano Trainer, version or publishing changes.
