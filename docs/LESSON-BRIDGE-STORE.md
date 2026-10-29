# Lesson Bridge: unlisted Chrome Web Store preparation

Prepared October 28, 2026. This is a submission kit, not a published listing or a guarantee of Google approval. Extension version 0.2.0 is independent of app Beta v0.0.4. Do not create an app release/tag for this preparation.

Existing dashboard item: `hflflkmlpeipbjefllldmapaehainknb`, Draft 0.2.0, last updated October 25 on inspection. It predates this preparation and must be replaced with the newly generated ZIP before submission. Version text alone cannot distinguish these unsubmitted builds. If the dashboard requires a higher extension version for a replacement, update the independent extension version and regenerate the archive; that is not an app release. The timing repair is in the trainer app, so refresh/update that separately from the extension.

## Listing copy

Name: **Guitar Trainer Lesson Bridge**

Short description: Find lesson scores, recordings and timing, then send a selected lesson to Guitar Trainer Studio.

Detailed description:

Use lessons you are permitted to access with Guitar Trainer Studio for personal guitar practice. Click Scan this page to find available Guitar Pro/MusicXML score links, recording links and compatible timing data. Review your choices, then send them to an already open Guitar Trainer tab. The trainer asks you to review the import before applying it. Saving to its library is optional; import does not start playback automatically.

The extension supports selected lesson resources exposed by the page, including supported TrueFire lesson pages. It cannot guarantee support for every provider or lesson. It does not bypass sign-in, paywalls or access controls, convert PDFs or reconstruct unavailable scores. Some embedded frames cannot be inspected, links can expire, and recordings may not permit external playback. Timing must match the score's complete performance; check alignment by listening.

You can use the hosted Guitar Trainer Studio or your own HTTPS/localhost copy. No background browsing monitor, advertising or developer analytics is included. Site access is requested for the resources and app destination you choose. Use only content you are permitted to copy/use, and respect provider restrictions. Finding an accessible link does not grant redistribution rights. This project is not affiliated with TrueFire, Soundslice, YouTube or Google.

## Privacy practices fields

Single purpose: Help users discover, inspect and transfer permitted lesson score/recording/timing resources from their chosen page to Guitar Trainer Studio for personal practice.

| Permission | Justification |
| --- | --- |
| activeTab | Read the current lesson only when the user opens the extension and explicitly scans it. |
| scripting | Run the bundled scanner in that tab and the bundled one-shot delivery function in the chosen Guitar Trainer tab. No remotely hosted code is executed. |
| storage | Remember only the user's destination app address in chrome.storage.local. |
| Optional HTTPS hosts | Read user-selected score/timing resources on provider/CDN hosts and deliver to the user's HTTPS trainer. The manifest allows arbitrary HTTPS destinations because lesson providers/CDNs and self-hosted trainers vary; actual grants request individual origins from explicit actions. |
| Optional localhost/127.0.0.1 HTTP hosts | Deliver to an already open local trainer on its actual port. Other HTTP hosts are not requested as supported remote fetch destinations. |

Remote code answer: No. All extension JavaScript is packaged. Remote JSON is parsed as data, never evaluated; preview media/YouTube embeds are content, not extension logic.

Privacy policy URL after hosting is verified:
https://ztbishop.github.io/guitar-trainer-studio/extensions/lesson-bridge/privacy.html

The same policy is packaged as privacy.html and linked from the popup. Verify that the public policy and source/support URLs work while signed out before submission.

Data disclosures must reflect page titles/addresses, resource URLs (which may contain signed parameters), score bytes and timing processed during explicit actions. Relevant dashboard categories include **Website content** and **Web history** (current selected page, not background history monitoring). There is no developer collection server, sale, advertising or analytics. Do not declare that the extension never accesses or transfers data simply because processing is local. Match the live dashboard wording to the packaged policy; disclose that selected data is transferred to the user-chosen trainer and providers receive ordinary resource requests. No passwords/cookies API, financial/health data or personal communication collection is implemented.

## Package and images

Run `powershell -ExecutionPolicy Bypass -File tools/package-lesson-bridge.ps1` from the repository root. The script creates `dist/lesson-bridge/guitar-trainer-lesson-bridge-0.2.0.zip`, prints its hash and verifies the root manifest/file count. Its explicit allowlist includes only extension source, icons, privacy policy, NOTICE and the root LICENSE. It excludes trainer assets, lessons, tests, screenshots and private captures. Inspect ZIP contents before uploading. dist is ignored by Git.

The 128-pixel icon is in the manifest. `docs/lesson-bridge-store/startup.jpg` is a 640×400 JPEG of the actual popup startup UI, rendered with synthetic Chrome APIs but without fabricated results or third-party content. It is a listing asset, not evidence of installed-extension acceptance. Regenerate using `GTS_STORE_SCREENSHOT` with tests/run-lesson-bridge-browser.cjs. Additional screenshots are optional; never publish private/signed links or third-party lesson imagery without permission.

## Reviewer walkthrough

1. Open the hosted trainer at `/index.html` and the original demo lesson at `docs/lesson-bridge-store/demo.html` under the same hosted site. No provider account is required for this example.
2. Open Lesson Bridge on the demo tab. Scan; select First notes as the score and leave recording/timing empty. Send, grant the requested host if desired, and approve the trainer's review. The original CC0 score should open without playback or automatic saving.
3. Declining site permission must show an explanatory status and send nothing. Keep only one matching trainer tab open; no matching tab and duplicate matching tabs must produce recovery messages.
4. Inspect the extension's Privacy link and destination-address persistence. No browsing monitor/background process should exist.
5. For a provider lesson, the reviewer must have their own authorized access. TrueFire is not required for the account-free score-transfer example. Do not provide the owner's account credentials or signed lesson URLs.

## Installed-browser acceptance before submission

- [ ] Reload this unpacked extension; hard-refresh the trainer. Keep the normal Live Server/browser/Fishman workflow.
- [ ] Test real permission grant and decline, hosted destination and localhost/127.0.0.1 destination, exact address persistence, duplicate/missing app tabs and expired links.
- [ ] Blue Nova v32690: select its matching score, recording and timing. The three anchors should be about 7.932401, 133.861 and 135.977883 seconds. At the score start, Play should use the imported recording offset. Inspect alignment through the ending; Save profile/reopen should retain it.
- [ ] Verify standard and Methods lesson selection, clipboard operations, and score-only/manual timing fallback. PDF-only lessons still need a supported matching score.
- [ ] Briefly verify Fishman Wait remains silent and advances normally; Realtime feedback remains as expected. Automated synthetic MIDI evidence is separate.

## Submission and visibility

Create/select a Chrome Web Store developer account, upload the ZIP, fill listing/privacy/support fields and upload the screenshot/icon. Select **Unlisted**, not Public. Anyone with the URL can install and share it; this is not restricted-user access. All visibility modes undergo policy review. Complete review before adding the real installation URL to README; never invent a store ID. Account setup, any fee/terms acceptance and final submission remain owner actions unless separately authorized. Do not change repository visibility.

Official guidance: [distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution), [privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy), [local data disclosures](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), [images](https://developer.chrome.com/docs/webstore/images).
