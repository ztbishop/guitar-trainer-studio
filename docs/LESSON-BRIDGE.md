# Lesson Bridge: local Chrome discovery preview

Lesson Bridge for Guitar Trainer Studio is an optional, locally installed desktop Chrome extension. It scans the page you choose for score, recording and timing candidates. It does not yet open them in Guitar Trainer, download scores, save a library item, or change practice. Guitar Trainer works without it.

## Install for testing

1. Use your normal desktop Chrome profile, where you sign into TrueFire.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the `extensions/lesson-bridge` folder inside this repository. Select that folder, not the repository root.
4. Pin **Lesson Bridge for Guitar Trainer Studio** from Chrome's extensions menu.
5. Open a lesson you can access. Let its player load and reveal its download links. Click the extension, then **Scan this page**.
6. Review candidates. For a timing JSON candidate, **Inspect timing** asks for access to that HTTPS host and tries to display a validated Soundslice timing preview.

After code updates, click the extension's reload button at `chrome://extensions`, refresh the lesson and scan again. Uninstall it there when no longer wanted. No store account, Node helper or server is required for the extension; your app still uses Live Server or its normal launcher. A future store listing can be private for testers, then unlisted/public when wanted. Nothing has been submitted to Google.

The results disappear when the popup closes. Query parameters and encoded redirect destinations are hidden in the review; actual candidate URLs are held only in popup memory. No telemetry, cookies API, background listener, storage or app messaging is used. Optional timing-host access remains granted in Chrome until revoked through extension/site access settings or uninstalling. Inspecting timing makes an explicit request to that server; signing into TrueFire does not guarantee that cross-origin request will succeed.

## What the scan can find

- Guitar Pro (`gp`, `gp3`, `gp4`, `gp5`, `gpx`) and MusicXML (`xml`, `musicxml`, `mxl`) links. File extensions/labels identify candidates, not validated file bytes. A label-only candidate may still be an ordinary web page.
- Media links and HTML player sources, including streaming playlist names. An MP3 may be a jamtrack rather than the lesson recording; no automatic pairing is asserted.
- Timing JSON links and TrueFire's player manifest when exposed in the inspected page/frame resource names or player URL IDs.
- Same-origin frame contents, quoted URL declarations in bounded inline scripts and already loaded resource names. This is a snapshot, not interception of every network request. Cross-origin frames, JavaScript-only player state, `blob:` media and undisclosed links can be missed. Start the player and rescan when needed.

On TrueFire only, an observed same-origin `soundslice_manifest` endpoint is read using the page's existing session. If absent, the adapter can construct that endpoint from numeric course/lesson IDs exposed by a same-origin Soundslice player iframe. It does not guess course IDs or query other lessons. Manifest field strings become candidates, not executable scripts. Sign-in errors/non-JSON replies produce a recovery hint.

**Inspect timing** supports Soundslice arrays containing playback bar number, recording seconds, optional within-bar position (0–480), and optional hide-playhead flag. It checks basic order/ranges and shows up to 12 points; it does not confirm score compatibility, convert to alphaTab points or discard hidden-playhead semantics during import. Redirected timing requests are deliberately reported as unavailable in this prototype, rather than following an unreviewed host. There is no separate streaming player/HLS adapter in this update.

## Earlier investigation and evidence

The October 13, 2026 conversation **Explore alphaTab media sync** (`01a136f9-0189-7933-a10a-6ce06fe3a786`) inspected TrueFire's **The Life of a Fool — Playalong**, lesson 32682/course 961. It found a GP5 download despite the GPX label, HLS/MP4 video sources and a Soundslice sync JSON link. The owner supplied:

```json
[[0,10.410579],[63,147.833399],[64,149.9865480000009]]
```

The owner confirmed the video URL played in Guitar Trainer and the first anchor at roughly 10.41 seconds aligned. Matching the downloaded score through the ending, automatic transfer, current endpoint behavior and general compatibility were not established. Do not commit signed download URLs or authentication values. That chat remains discovery history, not a stable provider API contract.

## When there is no Guitar Pro download

MusicXML is also usable directly in Guitar Trainer. A Soundslice player alone does not establish that a downloadable original score exists. Soundslice exports GPX/MusicXML for self-created slices on a paid account; paying for Soundslice does not automatically confer edit/export access to a publisher's embedded slice. Its authenticated Data API has separate permissions. An agent moving a lesson into a personal Soundslice account might simply download a provided score and upload it; the reported forum workflow has not been inspected.

Conversion from internal Soundslice notation would be a separate feasibility/fidelity project. This extension does not reconstruct notation, perform PDF recognition, copy lessons into Soundslice or claim support for unavailable downloads. Missing timing can eventually fall back to the existing manual alignment editor; a missing supported score cannot become a practice score merely from video/timing data.

## Developer continuation

The extension is independent of app runtime and uses its own prototype version 0.1.0; the app remains Beta v0.0.4.

| File | Responsibility |
| --- | --- |
| `manifest.json` | Manifest V3 popup, temporary active-tab/scripting access and optional HTTPS host grants for explicit timing inspection. No background process or automatic injections. |
| `scanner.js` | Self-contained serialized `scanPage` function: read bounded top-page/same-origin frame observations, optionally read the TrueFire same-origin manifest, return candidate observations and notices. No alphaTab/MIDI/app calls. |
| `discovery.js` | Pure URL validation, redirect destination classification, deduplication/caps, redacted review URLs and Soundslice timing array validation. |
| `popup.js` | User-triggered scan, safe text-only results, explicit per-host timing permission/request/preview and recoverable errors. Results exist in memory only. |
| `popup.html` / `popup.css` | Local popup content and presentation. No remote scripts or dependencies. |

Future work, after actual Chrome/TrueFire acceptance: define a versioned import payload and origin-checked receiver, retrieve real score bytes, open through the existing score-loader/host boundary, load recording through media-controls, and convert timing only against the generated playback timeline. Preserve terminal anchors, repeats/jumps, within-bar positions and unsupported semantics. Score hash/profile identity, stale imports and unsaved edits need explicit handling. Keep provider extraction outside the app; alphaTab integration stays exclusively in `js/alphatab-host.js`. Existing MIDI matching, Wait progression and feedback rules must remain unchanged. Do not add a general URL receiver or bypass browser restrictions as a shortcut.

## Checks and local acceptance

Run `node --test tests/*.test.js`, syntax-check the extension JavaScript and run `node tests/run-lesson-bridge-browser.cjs` with the same Playwright setup as other browser runners. The browser runner uses synthetic lessons and mocked Chrome APIs in an isolated profile; it is not proof of a locally installed extension's permission flow or authenticated TrueFire retrieval. Actual results belong in DEV-NOTES.md.

Owner acceptance: load the unpacked extension in Chrome; scan the known TrueFire lesson; check GP5/video/timing candidates; inspect timing if found; rescan after player load; try a lesson without Soundslice and a generic page with no supported links. Check decline/grant of timing access and confirm that Guitar Trainer's current score/practice remains untouched. Physical Fishman practice is unchanged and not established by synthetic checks.

References: [Chrome local installation](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked), [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), [extension fetching](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests), [Soundslice timing format](https://www.soundslice.com/help/data-api/#syncpoint-data-format), [Soundslice export availability](https://www.soundslice.com/help/en/creating/slice-manager/161/exporting/).
