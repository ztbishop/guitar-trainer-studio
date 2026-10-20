# Christmas Time Is Here: MIDI artifact audit — 2026-10-19

The three disputed marks all correspond to raw MIDI Note-On messages from TriplePlay Connect. They are not proof that the owner physically played those frets. The displayed fret is computed from reported pitch, configured string channel and score tuning.

| Location | Raw evidence | Why the previous filter retained it | Updated behavior |
| --- | --- | --- | --- |
| Measure 5, first pass, A-string fret 12 | Row #119: channel 5, MIDI 57, velocity 10, duration 1125.1 ms. Current target is MIDI 69, first-string fret 5. | Not a brief spike; no written A-string tone at that target, no confirming same-string attack. | Optional score-range safeguard ignores it: fret 12 exceeds the current allowed 0–10 range. Range off retains it. |
| Measure 10, B-string fret 3 | Row #313: channel 2, MIDI 62, velocity 114, duration 2 ms. Required MIDI 63 arrives 6 ms later at velocity 116. | Too loud and only one semitone away for the earlier soft/distant rule. | Confirmed-artifact filter reconciles the released-onset transient after the correct same-string attack. |
| Measure 5, first repeat, G-string fret 23 | Row #433: channel 3, MIDI 78, velocity 40, duration 4 ms. Required MIDI 65 arrives 13 ms later at velocity 83. | Velocity exceeds the old maximum 20. | Confirmed-artifact filter reconciles it; optional Hex range safeguard also rejects fret 23 outside allowed 5–17. Poly range alone conservatively retains it because first-string fret 14 could fit. |

## What was implemented before this audit

A narrow, independently saved Wait Hex filter: wrong velocity ≤20, captured release within 70 ms, at least nine semitones from the unique written pitch on that string, stronger correct same-channel follow-up within 200 ms at ≥2× velocity, same target/retry. It was not a general hand-range filter. The original capture shows it correcting the first-note F2 artifact. Claims that every distant fret was already protected were inaccurate.

## New controls and limits

Keep **Filter confirmed tracking spikes (Wait Hex)** on for both the original rule and the new ≤5 ms released-onset/≤20 ms replacement rule. A correct note of any duration remains eligible immediately. A brief provisional red mark is possible before reconciliation.

**Ignore notes outside written fret range (Wait)** is independently saved, default off, and available in Hex and Poly. It uses the current fretted written shape ±5 frets and permits open strings. Hex uses configured string mapping; Poly checks every possible string. It does not read a physical hand location or TriplePlay's own hand-position setting. It can suppress real distant errors; unusable score fingering leaves grading unchanged.

The captured sustained A-string event cannot be established as a tracking artifact from duration alone. Range tolerance handles it because the owner explicitly chose that policy, not because software can prove what the hand did.

## Verification and owner check

326 automated tests pass, including exact captured transient patterns, negative bounds, target/retry isolation, short correct notes, range boundaries, Poly ambiguity, unavailable fingering, controller lifecycle, saved preferences and raw evidence.

Supplied-score/native-timeline/router replay: all 452 source messages processed, all 226 selected-channel messages delivered, same final practice target and 88 correct notes. With the updated artifact filter, 8 wrong remain. With range filtering enabled too, 7 remain; the captured report had 10. Range replay matched every recorded target identity. Other nearby and longer wrong events remain counted. This is code-path evidence, not physical hardware acceptance.

Hard-refresh the normal Live Server browser. In Wait mode, leave confirmed-spike filtering on and optionally enable written-range filtering. Retry measures 5/10 and the repeat; deliberately play a nearby wrong fret and compare range off/on. Confirm preference restoration after reload. Preserve original raw diagnostic messages if another discrepancy occurs.
