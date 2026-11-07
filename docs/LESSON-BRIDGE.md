# Private lesson sender: trainer receiver contract

## Ownership and distribution

Owner decision, 2026-10-29: the Chrome extension is private and maintained in the separate **Lesson Bridge** project. This repository ships no extension source, ZIP builder, store listing assets or extension installation guide. Historical commits/releases are unchanged. Do not restore those files or promote the extension in README/Help. Developer references and trainer-side compatibility are intentionally retained. Do not publish or push the separate copied project to this repository.

## Modules retained here

- `js/lesson-import.js` creates the review dialog, listens for same-window/same-origin messages, validates each offer and orchestrates injected score/media loaders after explicit acceptance. It waits for matching score bytes/timeline/player readiness and invalidates pending work on unrelated score loads.
- `js/lesson-import-data.js` independently validates versions, URLs, filenames, base64 and a maximum 12 MiB score. It validates Soundslice timing and converts expanded playback occurrences into native flat sync points. It has no native/player calls.
- `lesson-import.css` styles the review and temporary completion notice. `js/app-bootstrap.js` initializes the receiver and forwards score-loading invalidation.
- `js/media-controls.js` owns importLesson, recording retention, shared timeline-ready initialization, stale-source guards and unsaved alignment. It calls the existing host to apply validated imported points before completing a recording replacement. Merely updating editor points leaves native playback on provisional timing: preserve this nonzero-start regression fix. Timing-only updates and manual paste use the existing edit/Undo path.
- `js/alphatab-host.js` remains the only runtime alphaTab integration owner. Receiver changes must not alter native transport, MIDI matching, Wait progression or feedback rules.

An optional GPIF note property carries an explicit ghost pull-off release inside the score bytes. The bundled reader and MIDI generator support it. The sender can verify read/write and playback support before posting the ordinary offer. No receiver payload field, permission, timing validation or review behavior changes. Refresh an already-open trainer tab after updating the bundles.

## Message contract

The sender targets the already open trainer window and posts to its exact origin:

`{type:'gts-lesson-offer', id, payload}`

The id is a string of at most 100 characters. The receiver requires event.source === window and event.origin === location.origin. Its reply is:

`{type:'gts-lesson-reply', id, ok, message}`

An ok reply acknowledges that review was queued, **not** that the user accepted or import completed. A pending/open review or busy import rejects another offer. This protocol is not cryptographic extension authentication; no loading or remote recording request occurs before the user accepts the review. Cancel leaves the loaded session intact.

Payload:

`{format:'gts-lesson', version:2, title, lessonUrl, score:{fileName,base64}|null, recording:{url,label}|null, syncPoints:SoundsliceArray|null, keepRecording:boolean}`

Version 1 remains accepted and requires a score; its timing requires a recording. Version 2 supports score, recording or timing updates and rejects empty updates. Recording/timing-only imports need a ready score. Timing-only keeps the current recording. keepRecording explicitly retains a recording across a score replacement; embedded backing audio cannot be carried to another score. File extensions are Guitar Pro or MusicXML; validation does not replace native score parsing. The app accepts the URL policy in media-sync.mediaUrl, never executable URL schemes or embedded credentials.

Soundslice points are [playbackBar, recordingSeconds, withinBarPosition=0, hidePlayhead=0]. Positions range 0–480 and map against the native expanded playback measure list, including repeats. The first point starts at bar 0/position 0 but may have nonzero recording time. Positions/times must increase; a complete terminal anchor must match the score’s expanded length. A final bar equal to measure count maps to the last measure end. Hidden-playhead semantics and out-of-duration/mismatched timing are rejected. Matching length alone does not prove matching music.

## Import lifecycle

After acceptance, scores go through the existing loadScoreFile(File) path. A subsequent score load invalidates pending work. Replacing a recording clears incompatible alignment; imported points clear the matched profile ID and remain unsaved. Successful timed and score-only imports close review/editor and return to practice without autoplay. Missing timing leaves Media Sync open for manual alignment. Failures report partial state: a successfully opened score may remain, and there is no promise of atomic rollback. Library/profile saving remains explicit.

## Verification and owner workflow

Run `node --test tests/*.test.js` and `node tests/run-lesson-import-browser.cjs` with the existing Playwright setup (GTS_PLAYWRIGHT_MODULE when needed). The receiver browser test uses an independent test-only postMessage peer, real trainer/native demo score and synthetic seekable WAV. It covers review/origin/schema gates, nonzero playback timing, partial imports, no autoplay/save, manual paste and stale-load cancellation. It does not test the private extension’s permissions or authenticated providers.

The owner must load the unpacked extension from the separate project folder if Chrome previously pointed into this repository; deleting the old source does not redirect Chrome automatically. Keep the existing hosted/local trainer address, normal browser and Live Server/Fishman workflow. Check one Send/review, timing near beginning/middle/end, optional saving and normal Wait/Realtime. Actual permission prompts, provider access, audible alignment and physical MIDI remain separate acceptance work.

## Version 3: choose recording in this trainer

A version-3 offer may use recording:{kind:'local-choice'} instead of a recording URL. No additional recording fields, file paths, base64 or keepRecording:true are accepted with this choice. A score may be supplied; otherwise a ready score is required. Optional timing retains the existing Soundslice validation.

The review displays Choose recording… and disables Import until the user selects a nonempty audio/video file. File validation checks MIME/extension for an audio/video candidate; actual codec/duration validation remains with the existing player. No media file content passes through the sender. The selected File remains in review memory until explicit approval. Cancel leaves the current session unchanged. After approval, the same local loader used by Media Sync attaches the file and applies timing. Profile identity uses the original filename, size and lastModified; profile saving does not store the recording itself.

Ordinary version-1/2 requests remain unchanged. Unsupported older trainers reject version 3 without importing; the private sender must explain that a receiver with version-3 support is needed. Failed imports after approval may leave a successfully loaded score/recording; errors do not promise rollback.


## Equivalent timeline rebuilds during import (2026-11-02)

The receiver snapshots alignment semantics with lessonTimelineKey before awaiting recording load. It compares played measure order/occurrences/indices/tick bounds, tick resolution, total ticks and tempo map instead of native timeline object identity. Equal rebuilds retain imported timing; changed semantics reject. Score-file identity, recording-load generation and player availability remain independent cancellation checks. Points are revalidated against the current timeline and recording duration before native application, with another lifecycle/snapshot check after selection. The receiver still requires review, avoids autoplay and automatic saving, accepts protocol versions 1/2/3, and preserves the original score bytes.
