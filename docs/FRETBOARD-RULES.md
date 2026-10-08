# Fretboard Rules

- The fretboard is the primary training surface for guitar.
- The fretboard UI renders state but does not decide correctness.
- Left-handed mode should reverse the visual orientation without rewriting trainer logic.
- V1 should focus on 6-string guitar first.

## Stage 6 implementation

- Six-string tuning is read high-to-low from the selected score staff, adjusted for capo and sounding transposition.
- Guitar string labels remain 1 = high string through 6 = low string. Left-handed mode mirrors fret positions without changing these labels or MIDI mapping.
- Scored targets use known string/fret metadata, not an inferred fingering. Current correct/missed states come from the trainer.
- Single-channel live pitches show all possible positions in the displayed fret range. Hex input limits markers to the configured MIDI string hint. These markers are display information, not exact-position grading.
- The normal display covers frets 0–24 and expands to scored targets through fret 36. Other positions and unsupported tracks are reported without inventing targets.
- Played markers disappear on note-off; accepted chord/notation results are retained until session reset. No sustain-controller or harmonic-fingering inference is added.
