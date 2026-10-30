# Guitar Trainer Studio: instructions for coding agents

## Start each task

- Read `README.md`, `docs/TODO.md`, `docs/DEV-NOTES.md`, and `docs/ARCHITECTURE.md`, then relevant stage notes and source files.
- Check Git status before editing. Preserve existing user changes.
- The user's latest instructions and agreed feedback specification take precedence over older suggestions. Dated implementation entries and stage notes record history; do not reintroduce superseded behavior.
- The owner describes intended behavior and is not a developer. Explain changes, results, and local checks in plain language.

## Working environment

- Edit this project folder directly. ZIP upload/download exchanges are no longer the normal workflow.
- Preserve VS Code Live Server and the owner's normal browser for WebMIDI testing with a Fishman Connect. Keep the app usable from localhost/127.0.0.1 without a build step.
- Preserve the existing UI, native alphaTab rendering/transport behavior, bundled assets, and modular file structure unless the task explicitly changes them.
- Keep one coding chat actively editing this shared folder at a time. Record durable decisions in project files; do not assume another chat's full transcript is available.
- Earlier ChatGPT discussions are in the project named **Guitar Trainer**. Treat them as optional historical context if accessible, not automatically loaded or authoritative over current decisions.

## Private extension boundary

- The owner maintains the Chrome extension separately in the private Music File Chrome Extension project. Do not restore extension source, ZIP packaging, store assets or installation/promotion instructions to this distribution or customer-facing README/Help.
- Preserve the trainer-side lesson receiver, review dialog, message compatibility and timing handling. Developer documentation and receiver tests remain here; see docs/LESSON-BRIDGE.md. This separation does not authorize changes or pushes in the private project.

## Implementation boundaries

- Runtime alphaTab integration belongs in `js/alphatab-host.js`. Existing tests may inspect the bundled native API directly.
- Keep MIDI normalization, grading/session logic, UI wiring, and visual projections separate. Visual feedback and Poly inference must not silently change grading.
- Both Poly and Hex currently grade pitch. Exact-string/position grading is deferred and must be explicitly scoped.
- Preserve independent Staff, tab highlight, and tab fret-number controls. All four Score feedback choices, including Poly inference, default on and persist independently (owner decision 2026-10-13). Poly inference remains a conservative display estimate, never a detected physical position. Restore the saved Practice mode (Realtime on first use) and Wait chord settings (One at a time/200 ms on first use) across score loads and sessions.
- Do not add deferred features or edit Piano Trainer as part of an unrelated stage.
- Display preferences persist across sessions/score loads: zoom, auto-scroll, fullscreen-on-Play, visible tracks, fretboard visibility and orientation. First-use defaults are 100%, auto-scroll on, practice-only, fretboard on, left-handed off and fullscreen-on-Play off. Saved choices, including fretboard off, override defaults. Disabling orientation while fretboard is hidden must retain its choice; restoring fullscreen preference must not request fullscreen outside the existing Play gesture.
- Virtual fretboard first-use defaults (owner decision 2026-10-24): Beat + Bar, note-name labels, alternate positions off and automatic panel sizing. Persist all fretboard display choices and manual sizing across score loads/sessions; retain hidden-panel choices and valid previously saved Beat/Next/Bar modes. Temporary targets, played markers and browsing/session state are not display preferences.

## Verification and handoff

- Update relevant TODO, development notes, and architecture documentation as changes are made. Distinguish implemented behavior, automated evidence, user-confirmed behavior, and pending hardware/browser acceptance.
- Run checks appropriate to the change. The regression suite is `node --test tests/*.test.js` with Node 22 or newer; use `node --check` for changed application modules where relevant.
- Automated tests do not substitute for physical MIDI/browser checks. Briefly describe what the owner should test locally.
- After completing and verifying an authorized update, review the diff, stage only files belonging to that update, create a descriptive commit explaining the change and relevant validation, and push the current working branch to its configured remote. This is the owner's standing authorization (2026-10-24); no separate confirmation is needed for routine commits/pushes. Preserve unrelated user changes. If checks fail or publishing is blocked, explain what remains rather than claiming success. Report the commit ID and push result in the handoff. Repository: https://github.com/ztbishop/guitar-trainer-studio.
- Routine commits/pushes do not bump the version, create tags, publish releases or deploy separately. Do not force-push, rewrite history, replace existing tags or publish to a different branch/remote without explicit authorization.
- Treat an explicit request to publish/create a new version or release as authorization to prepare consistent version metadata/documentation, run checks, commit/push, create and push a new annotated version tag, and publish a GitHub Release with descriptive changes, validation and known limitations. Use prerelease status for a beta. If the version number or beta/stable intent is unclear, propose the next unused version and clarify before publishing. A question about versions is not a release request; an explicit hold overrides this workflow.
- Current baseline is **v1.0.1 (stable)**; `version.json` records `1.0.1`. The owner explicitly authorized this patch release on 2026-10-30; v1.0.0 remains the first stable release. Preserve all existing tags, including the historical local `v0.0.3` and remote `v0.0.2`; never replace them. Routine later updates still do not bump versions or create releases. Repository visibility and Pages activation are separate from release publication; see docs/PUBLISHING.md.
