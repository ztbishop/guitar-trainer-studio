# Lesson Bridge: local Chrome lesson import

Lesson Bridge for Guitar Trainer Studio is an optional, locally installed desktop Chrome extension. It scans the page you choose for score, recording and timing candidates, then can send your selection into an already open Guitar Trainer tab. The app asks you to review before replacing its score. Nothing saves or starts playing automatically. Guitar Trainer still works without the extension.

## Install for testing

1. Use your normal desktop Chrome profile, where you sign into TrueFire.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the `extensions/lesson-bridge` folder inside this repository. Select that folder, not the repository root.
4. Pin **Lesson Bridge for Guitar Trainer Studio** from Chrome's extensions menu.
5. Open a lesson you can access. Let its player load and reveal its download links. Click the extension, then **Scan this page**.
6. Review candidates. For a timing JSON candidate, **Inspect timing** asks for access to that HTTPS host and tries to display a validated Soundslice timing preview.
7. Keep Guitar Trainer open in the same Chrome profile. In the extension, select the score and optional recording/timing, then enter the app's **exact address** from its address bar (including the actual Live Server/launcher port and any project subfolder). Use HTTPS for hosted copies or HTTP localhost/127.0.0.1 locally. The address is remembered; lesson resources are not.
8. Click **Send selected lesson**, grant the requested site access if wanted, and keep the popup open until sent. One matching app tab must already be open; duplicate matching tabs produce a recovery message. No download file is left in Downloads.
9. Guitar Trainer opens a review. Choose **Import lesson** to replace the current score/unsaved sync work, or **Cancel** to leave it alone. A selected recording opens Media Sync for review without playing. Choose **Finish editing / Return to practice**, then Play when ready. Save to Library and Save profile remain separate optional actions.

After code updates, click the extension's reload button at `chrome://extensions`, hard-refresh Guitar Trainer, refresh the lesson and scan again. The extension must be reloaded for new permissions/modules to take effect. Uninstall it there when no longer wanted. No store account, Node helper or server is required for the extension; your app still uses Live Server or its normal launcher. A future store listing can be private for testers, then unlisted/public when wanted. Nothing has been submitted to Google.

Scan results disappear when the popup closes. Query parameters and encoded redirect destinations are hidden in the review. The extension stores only the app address in `chrome.storage.local`, not lesson URLs, credentials, score bytes or timing. No telemetry, cookies API or background listener is used. Explicit download requests use the browser's available session; signed links, cookie policies and publisher access still apply. Optional host grants remain in Chrome until revoked through extension/site access settings or uninstalling. Score downloads are bounded to 12 MB; timing JSON to 1 MB. Remote HTTPS retrieval is supported; generic HTTP sites other than loopback are not granted fetch access. After review, the app holds the imported score/recording/alignment like an ordinary loaded session; only explicit library/profile saving persists them, and saved online profiles can contain expiring media URLs.

## What the scan can find

- Guitar Pro (`gp`, `gp3`, `gp4`, `gp5`, `gpx`) and MusicXML (`xml`, `musicxml`, `mxl`) links. File extensions/labels identify candidates, not validated file bytes. A label-only candidate may still be an ordinary web page.
- Media links and HTML player sources, including streaming playlist names and encoded TrueFire MP4 routes. MP4 is preferred when available. Soundslice soundfont/metronome assets and malformed empty-ID timing links are filtered. Download-MP3 jamtrack links are excluded from the recording picker for this lesson-video workflow; review remaining candidates rather than assuming automatic pairing.
- Timing JSON links and TrueFire's player manifest when exposed in the inspected page/frame resource names or player URL IDs.
- Same-origin frame contents, quoted URL declarations in bounded inline scripts and already loaded resource names. This is a snapshot, not interception of every network request. Cross-origin frames, JavaScript-only player state, `blob:` media and undisclosed links can be missed. Start the player and rescan when needed.

On TrueFire only, an observed same-origin `soundslice_manifest` endpoint is read using the page's existing session. When the page identifies a lesson with `/vNNN`, observed manifest parameters must match that lesson and contain a numeric course ID; timing resource names for other lesson IDs are omitted. If absent, the adapter can construct the endpoint from numeric course/lesson IDs exposed by a same-origin Soundslice player iframe. It does not guess course IDs or query other lessons. Manifest field strings become candidates, not executable scripts. Sign-in errors/non-JSON replies produce a recovery hint.

**Inspect timing** supports Soundslice arrays containing playback bar number, recording seconds, optional within-bar position (0–480), and optional hide-playhead flag. It checks basic order/ranges and shows up to 12 points. Standalone preview does not confirm score compatibility. Preview timing requests reject redirects; selected Send downloads use the extension's granted host access and normal redirects. There is no separate streaming player/HLS adapter; use MP4 when offered. If a recording fails, the opened score remains usable; retry another recording choice or use manual Media Sync.

**Imported timing** is independently revalidated in the app. Playback bar numbers map into alphaTab's expanded measure occurrence list, positions divide by 480 and seconds multiply by 1000. A final bar equal to the performance measure count maps to the last measure's end. A complete terminal anchor matching the score's performance length is required; partial/mismatched data, non-increasing positions/times, out-of-duration points or hide-playhead flags are rejected rather than silently approximated. Matching length is necessary but does not prove matching musical content; review audible alignment across the lesson. Score-only imports and recording-without-timing imports are supported. There is no conversion from internal Soundslice notation.

## Earlier investigation and evidence

The October 13, 2026 conversation **Explore alphaTab media sync** (`01a136f9-0189-7933-a10a-6ce06fe3a786`) inspected TrueFire's **The Life of a Fool — Playalong**, lesson 32682/course 961. It found a GP5 download despite the GPX label, HLS/MP4 video sources and a Soundslice sync JSON link. The owner supplied:

```json
[[0,10.410579],[63,147.833399],[64,149.9865480000009]]
```

The owner confirmed the video URL played in Guitar Trainer and the first anchor at roughly 10.41 seconds aligned. Matching the downloaded score through the ending, automatic transfer, current endpoint behavior and general compatibility were not established. Do not commit signed download URLs or authentication values. That chat remains discovery history, not a stable provider API contract.

October 24 acceptance of discovery: the owner installed the extension and confirmed the selected GP5/video/timing resources for **All About Me — Playalong**, lesson 32684/course 961. Read-only requests verified its timing `[[0,9.905581],[95,199.885199],[96,201.86074400000066]]` and a complete 205.806-second HLS playlist. The manifest also exposes MP4 `sd`/`mediaurl` routes, previously missed by candidate classification. A prior scan from a non-Soundslice overview was explicitly discarded by the owner; its timing is not evidence for the playalong. This confirms discovery/resource selection, not automated transfer or full alignment through practice.

## When there is no Guitar Pro download

MusicXML is also usable directly in Guitar Trainer. A Soundslice player alone does not establish that a downloadable original score exists. Soundslice exports GPX/MusicXML for self-created slices on a paid account; paying for Soundslice does not automatically confer edit/export access to a publisher's embedded slice. Its authenticated Data API has separate permissions. An agent moving a lesson into a personal Soundslice account might simply download a provided score and upload it; the reported forum workflow has not been inspected.

Conversion from internal Soundslice notation would be a separate feasibility/fidelity project. This extension does not reconstruct notation, perform PDF recognition, copy lessons into Soundslice or claim support for unavailable downloads. Missing timing can use the existing manual alignment editor; a missing supported score cannot become a practice score merely from video/timing data.

## Developer continuation

The extension is optional and uses its own prototype version 0.2.0; the app remains Beta v0.0.4. App runtime imports no files from the extension folder, so the existing local launcher allowlist only adds the app's new review stylesheet.

| File | Responsibility |
| --- | --- |
| `manifest.json` | Manifest V3 popup, temporary active-tab/scripting access, storage for app address only and optional HTTPS/HTTP-loopback grants. No background process or automatic injections. |
| `scanner.js` | Self-contained serialized `scanPage` function: read bounded top-page/same-origin frame observations, optionally read the TrueFire same-origin manifest, return candidate observations and notices. No alphaTab/MIDI/app calls. |
| `discovery.js` | Pure URL validation, redirect destination classification, deduplication/caps, redacted review URLs and Soundslice timing array validation. |
| `popup.js` | Scan/review, resource selectors, app address preference, gesture-triggered permission requests, bounded download orchestration and exact target-tab matching/focus. |
| `transfer.js` | App-address validation, bounded session-aware score/timing fetch, base64 serialization and isolated-world one-shot delivery/acknowledgement to a selected app tab. |
| `popup.html` / `popup.css` | Local popup content and presentation. No remote scripts or dependencies. |
| `js/lesson-import-data.js` | Independent app-side versioned payload/byte validation and Soundslice-to-native-flat-point conversion against the existing normalized timeline. No alphaTab/player calls. |
| `js/lesson-import.js` / `lesson-import.css` | Same-window/same-origin offer listener, text-only replacement review, explicit acceptance, injected score/media orchestration, readiness/cancellation/status. No URL-driven score fetch, grading or direct native API calls. |
| `js/media-controls.js` | New `importLesson` entry point uses the existing recording loader/editor/selection, marks imported alignment unsaved and rejects obsolete score/source work. `timelineReady` now shares its pending hash/profile initialization promise with import callers. |
| `js/app-bootstrap.js` | Initializes the receiver and forwards score-loading invalidation. Existing host remains the only native runtime owner. |

Transfer schema: `{format:'gts-lesson',version:1,title,lessonUrl,score:{fileName,base64},recording:{url,label}|null,syncPoints:SoundsliceArray|null}`. Chrome executeScript arguments use JSON-safe base64; no file download is required. `deliverLesson` posts `gts-lesson-offer` with a random request ID into the exact app tab; the receiver replies `gts-lesson-reply` with that ID and review-queued status. It accepts only same-window/same-origin events and rejects schema/size errors and concurrent reviews. This is a local page bridge, not cryptographic extension authentication; same-origin scripts could offer data too, so no payload can replace a score or contact recording hosts before the visible app review is accepted. Receiving does not bypass any publisher authentication or DRM.

After acceptance, loading uses `loadScoreFile(new File(...))`; the receiver waits for the matching native score bytes/timeline/player. A subsequent score load invalidates pending work. Media controls check score and generation before/after asynchronous operations; loading/import failure reports partial state rather than claiming rollback or success. Imported points clear any matched profile ID and stay unsaved; ordinary Save profile/library identity rules remain. Closing the sync editor uses the existing native practice restoration. No changes to MIDI matching, Wait progression, feedback rules, or practice timeline generation; alphaTab integration remains exclusively in `js/alphatab-host.js`.

Future work remains authenticated end-to-end acceptance, wider provider/arrangement coverage, expiring-link refresh and any separately scoped store publication or notation conversion. Do not treat generic discovery as universal import or introduce score-by-query-string execution.

## Checks and local acceptance

Run `node --test tests/*.test.js`, syntax-check changed modules and run `node tests/run-lesson-bridge-browser.cjs`, `node tests/run-lesson-import-browser.cjs` and `node tests/run-sync-practice-browser.cjs` with the same Playwright setup as other browser runners. The first uses synthetic lessons and mocked Chrome APIs. The import runner uses the real app/native demo score/audio player with synthetic WAV and the actual one-shot delivery function, covering review/origin/schema gates, no automatic persistence/autoplay, timing mismatch, score-only import and superseding score loads. The existing sync/practice runner checks native restoration, Wait and synthetic MIDI feedback. These do not prove real extension permission flows, logged-in download retrieval or audible/hardware alignment. Actual results belong in DEV-NOTES.md.

Owner acceptance: reload the extension and updated app; scan lesson 32684; choose GP5, MP4 video and its matching timing; enter the real app address, grant/decline access and send. Check review/Cancel, then accepted score/video/three anchors and alignment near the beginning/middle/ending. Test score-only, missing timing, expired links and reopen saved score/profile. Finish editing and check normal Fishman Realtime/Wait. Discovery/resource selection is owner-confirmed; full automatic transfer, provider/video access and physical MIDI remain pending.

References: [Chrome local installation](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked), [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), [extension fetching](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests), [Soundslice timing format](https://www.soundslice.com/help/data-api/#syncpoint-data-format), [Soundslice export availability](https://www.soundslice.com/help/en/creating/slice-manager/161/exporting/).
