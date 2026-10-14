# Workspace UX review — 2026-10-14

Current owner-directed follow-up: Media Sync is More-only; one main transport and Tempo percentage operate the selected Synth audio/Recording source. Realtime grades recordings and Wait advances media silently. Audio-only sources use the editor; the optional panel is video-only. Add / update point captures the playhead, with grouped Use typed time as the alternative. Guide hit areas no longer block waveform seeking. See MEDIA-SYNC and the latest DEV-NOTES entry for the implemented contract and 65 desktop / 64 phone checks; earlier UI decisions below are superseded where they conflict.

## Decisions and implemented cleanup

Superseded media flow (2026-10-14): the unified editor now opens through Media Sync, owns loading/mode/profile controls, and preserves visibility on playback selection. Magnifier zoom, estimated guides, capture/upsert, waveform and direct saving replace the earlier separate Listen/Edit setup. See MEDIA-SYNC and DEV-NOTES for the current contract and 56-check desktop/phone evidence. The earlier decisions below remain the history of the panel-sizing pass.

- Listen & sync exposes the recording, dismisses its setup menu and focuses the recording transport. Editing remains an explicit action so ordinary listening does not consume score space.
- All three optional panels have direct hide controls synchronized with their existing visibility preferences. Hiding is distinct from unloading or returning to practice.
- Recording placement keeps its existing divider. Sync editor and fretboard gain bounded saved heights, pointer/keyboard resizing and reset controls. Viewport fitting does not overwrite preferred sizes.
- Desktop fretboards fit without needless horizontal scroll; narrow screens keep a readable neck with horizontal scrolling. All panels together may need vertical scrolling. Native score scrolling remains necessary for longer music.
- Sync instructions collapse into Alignment help; a score without tablature explains the empty fretboard. Panel controls survive fretboard re-renders.
- Corrected keyboard divider direction for right/bottom placement and fixed stale recordings/markers on score changes by forwarding native host lifecycle callbacks.

## Evidence

209 Node tests pass, including size validation/fitting and existing media, MIDI, grading, library and rendering regressions. The expanded real-browser harness passes 45 checks at desktop 1280 × 720: audio loading, alignment edit/undo/redo, endpoint validation, four placements, Listen/Return, close/reopen/checkbox synchronization, keyboard resizing, all nine menu bounds/Escape, native GP/embedded audio, score-change cleanup and saved visibility/height after reload. Phone 390 × 844 also passed the initial 39 checks; expanded phone results are recorded in the handoff. Syntax and diff whitespace checks pass.

Generated local WebM video (with audio) loaded through the normal picker; Listen revealed the video and dismissed the menu; Return and the real GP fretboard were visually inspected. This is not a certification of every media codec/provider or physical MIDI behavior.

## Follow-up opportunities and acceptance

- Check normal Chrome PiP, touch resizing and Fishman Realtime/Wait after Return locally. Browser automated evidence cannot replace those checks.
- A future unsaved-alignment indicator/leave confirmation would help when switching recordings or scores after editing. Explicit Save profile remains the current contract.
- Consider a direct Save profile shortcut in the editor if repeated menu trips are inconvenient; naming/new-vs-update behavior should remain clear.
- Test long score/recording names and large profile collections during normal use. Existing search and profile management remain available.
- TrueFire score/video/timing import and independent recording pitch shift remain separate projects. This pass does not add either or change grading.
