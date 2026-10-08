# Development notes

Use TODO.md for current status and priorities, ARCHITECTURE.md for module boundaries, and STAGE-1 through STAGE-4 for implementation and validation details. Update these files in future packages so project decisions survive a new chat.

## 2026-10-08 — Wait Mode correction validated

The initial Stage 4 transport played each interval between solved targets. The user observed repeated-note attempts and backing-track catch-up. The correction removes timed playback between targets, keeps accompaniment paused, and accepts attacks before the native cursor seek acknowledgement.

User feedback: corrected Wait Mode works. Correct chord pitches can be collected with a break between them. This is the implemented behavior, not a duration requirement.

47 automated tests passed in the corrected package, including native synthesizer cursor stepping without Play, chord collection, long notes/gaps, seek acknowledgement, and pause/reset. User confirmation is a local functional check, not complete coverage of every score, hardware mode, or browser condition.

## 2026-10-08 — Chord timing recommendation, deferred

Recommendation: retain the stable Collect notes behavior for now; add a Together / Collect notes practice setting later. Together should use a forgiving attack window suitable for guitar strums, initially proposed at about 200 ms and adjustable after testing. Exact simultaneity is not the desired rule.

The supplied PianoApp ZIP uses per-note `hit` flags and advances when all expected notes are hit. Note-off does not clear those flags. The current GitHub code could not be retrieved, so this comparison applies only to that supplied ZIP.

This note records a recommendation for later development. No chord timing option has been implemented. See TODO.md for proposed behavior and unresolved scoring choices.
