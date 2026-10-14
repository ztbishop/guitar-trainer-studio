# Media & Sync

Implemented 2026-10-13 with bundled alphaTab 1.8.4. Open **More → Media & Sync** after loading a score.

## Sources and playback

- **Local audio / video:** choose a browser-playable recording. Video displays picture and sound; audio uses a compact panel. Files stay on disk and are not uploaded or copied into the repository/library.
- **Audio / video URL:** use a direct playable media URL. A lesson webpage/share link usually is not a media file. Access, codecs, seeking and expiring links depend on the host/browser.
- **YouTube:** paste a video link or ID and click Load link. The online iframe API loads only on this action. Embedding/sign-in and available speeds depend on the video; unsupported speeds report an error.
- **Score's embedded backing audio:** loads the recording and existing sync points from a compatible GP file. Original score bytes remain unchanged.

**Listen & sync** replaces synthesized audio with the recording and uses alphaTab's native cursor/sync points. This first increment is listening/alignment, not scored recording practice. MIDI input remains available for diagnostics but does not grade during listening. There is no synthesized-track/media mix or metronome/count-in during listening. **Return to practice** pauses the recording and restores practice position, speed, source sync data and synthesizer. Realtime results and paused Wait attempts are retained; Wait resumes silently. Original grading formulas and the score tempo map are unchanged. Grading against stretched media timing requires a separately scoped design.

Main Play/Pause controls listening while selected. Reset pauses and seeks to the score/loop start without clearing practice results. Score clicks seek via native alphaTab. Practice/Tempo/Loop settings are unavailable during listening; return to edit them. Source/unload/score changes pause and dispose old media, invalidating stale asynchronous work. A new score clears the current recording/editor session; saved profiles remain.

## Video position

In **Video & editor layout**, choose Above, Below, Left or Right of score. Left/Right place the recording beside the native score. Drag the divider, or focus it and use arrow keys, to resize. Narrow screens stack automatically while retaining the wider-screen choice. Placement, divider proportion and player/editor visibility persist in localStorage.

**Float video** uses browser picture-in-picture for local video or direct video URLs where supported. It is disabled for audio and YouTube's iframe, with contextual help. YouTube may offer floating playback through the browser's own controls. Our app does not control floating videos from unrelated TrueFire/other-site tabs.

## Alignment

Enable **Show sync editor**. Initial alignment spans the recording and follows source tempo changes. It is an estimate; intros, teacher explanations, repeats or different arrangements need adjustment.

1. Select a marker from the point list or timeline. Choose written measure/repeat pass, beat position and recording seconds. Beat 1 is bar start; numerator + 1 is bar end (beat 5 in 4/4).
2. **Use current time** captures the recording timestamp; Add point or Update selected applies it. Drag an existing timeline marker to edit time visually; precise fields provide an accessible alternative.
3. Points must increase in both playback order and recording time. Repeated written bars have separate passes. At least two points are required; invalid/crossing points are rejected.
4. Use zoom and Undo/Redo to refine alignment. Editing pauses listening. Save explicitly before switching recordings/profiles to keep edits.

**Build waveform** optionally decodes a local recording when its audio format is supported. YouTube/URL waveforms are absent in this increment. Waveforms are not saved. Files over 80 MB or 15 minutes use timestamp editing to avoid large decoded audio allocations. Some video containers play successfully but cannot be decoded into a waveform; synchronization works without it.

## Saved profiles

Expand **Saved sync profiles** for the current score's picker, name, Save/Delete and Export/Import. **Manage all profiles** lists every profile with score/recording names, search, rename, confirmed deletion and approximate JSON settings size in KB. Deleting keeps the score, recording and working alignment. Save updates a selected matching profile; a different recording creates a new one.

Profiles use IndexedDB beside the score library. They contain original score SHA-256 identity, recording metadata, duration, points, name and placement, not recording bytes, waveforms, grades or MIDI settings. Local profiles match automatically by filename, size and modification time; choose the file again after reload. If those details changed, select the saved profile first, then choose the recovered local file to relink it without rebuilding sync points. The relink is saved after the points validate against the current score measures and recording duration. A profile from another score or a different source type is not applied. Different original score bytes get a different identity. Restored online profiles require explicit Load link; reload does not automatically contact or play third-party media.

Export downloads all profiles in a standalone version-1 media-sync JSON. Import validates before an additive write and skips identical settings. Library backup version 2 includes profiles; version-1 score backups still import. Browser origin/profile/storage-clearing boundaries are the same as the score library. Keep external backups and recordings.

## Verification and limits

Evidence: 200 Node tests, 17 native/storage checks, 15 app UI checks and the existing 12 library browser checks pass. Generated local WAV/WebM-with-audio, waveform creation, profile save/restoration and native cursor movement were checked. Laptop 1280 × 720 and phone 390 × 844 frames verify side placement/stacking without horizontal overflow. Owner screenshots demonstrate YouTube loading/playback; full YouTube/audio/Fishman acceptance is still pending.

Run `node --test tests/*.test.js` and `node tests/generate-media-fixtures.js`. Generated public score, WAV and embedded-GP fixtures are ignored by Git.

- `tests/media-browser.html`: isolated migration/profile/backup/deletion and real native mapping/speed/restoration/Wait checks. Its database is separate and disposable. Generate video fixture downloads a six-second WebM with generated sound for video/PiP checks.
- `tests/media-layout.html`: actual app frames at laptop/phone sizes and Run app UI checks for loading, add/update/remove, undo/redo, endpoint rejection, layouts, listening and Return. The UI test restores media layout preferences and does not save scores/profiles.

alphaTab 1.8.4's worker has a recursive loadedMidiInfo getter. alphatab-host.js guards that exact defect and returns the cached field at runtime. The guard is idempotent and leaves correct getters alone; vendor files/manifest hashes remain intact.

Owner acceptance remains: audible alignment, actual MP4/WebM/codecs and GP backing tracks, Chrome PiP, YouTube buffering/seeking/rates, profile backup/reopening, and Fishman Realtime/Wait retention after Return. TrueFire automation, VLC/Transcribe! control, provider-specific streams, GP export/code generation and graded stretched-media playback are not implemented. Beta version/Git publishing are unchanged.

References: [Native audio/video sync](https://alphatab.net/docs/guides/audio-video-sync/), [Playground editor](https://alphatab.net/docs/guides/media-sync-editor/).
