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

## Implementation boundaries

- Runtime alphaTab integration belongs in `js/alphatab-host.js`. Existing tests may inspect the bundled native API directly.
- Keep MIDI normalization, grading/session logic, UI wiring, and visual projections separate. Visual feedback and Poly inference must not silently change grading.
- Both Poly and Hex currently grade pitch. Exact-string/position grading is deferred and must be explicitly scoped.
- Preserve independent Staff, tab highlight, and tab fret-number controls. Poly inference defaults off and is a conservative display estimate, never a detected physical position.
- Do not add deferred features or edit Piano Trainer as part of an unrelated stage.

## Verification and handoff

- Update relevant TODO, development notes, and architecture documentation as changes are made. Distinguish implemented behavior, automated evidence, user-confirmed behavior, and pending hardware/browser acceptance.
- Run checks appropriate to the change. The regression suite is `node --test tests/*.test.js` with Node 22 or newer; use `node --check` for changed application modules where relevant.
- Automated tests do not substitute for physical MIDI/browser checks. Briefly describe what the owner should test locally.
- Provide a concise change summary and a suggested Git commit description with each update.
- Leave commits, tags, pushes, history rewriting, and deployment to the owner unless explicitly requested. Repository: https://github.com/ztbishop/guitar-trainer-studio.
- Current baseline is **Beta v0.0.3**; `version.json` records `0.0.3`. The owner will create the `v0.0.3` tag after committing the version update. Preserve earlier tags, including `v0.0.2`. Do not bump versions or rename existing tags merely for routine edits.
