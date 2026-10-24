# Guitar Trainer Studio: status and to-do

### Standard-guitar MIDI setup and tracking expectations — 2026-10-24

- [x] Add README options for TriplePlay/Connect and MIDI Guitar 3, source-linked pickup sensitivity/interface gain/tracker gate advice, clean input and realistic extra/missing-note expectations without attributing every mistake to conversion.
- [x] Explain slower raking as an experiment, particularly for ordinary polyphonic audio input; retain One at a time collection, Together chord-window and Realtime timing requirements. Add concise Help reminder/link; no runtime or grading changes.
- [x] 459 Node regressions and whitespace checks pass; isolated Chrome verifies desktop/phone Help scrolling/link and guide rendering/anchor navigation. Screenshots reviewed; details in DEV-NOTES.md.
- [ ] Owner reviews the wording in the normal browser and tries setup suggestions with the actual guitar/interface. Real-device effectiveness is not established by documentation/browser checks.

### Fretboard first-use defaults — 2026-10-24

- [x] Default to Beat + Bar with note labels, alternates off, visible fretboard, left-handed off and automatic sizing. Only Beat → Beat + Bar required a runtime change; existing settings and localStorage persistence already match the approved choices.
- [x] Preserve all valid saved views and independent fretboard preferences/sizing across reloads/score loads and hiding/showing. Update player guide and ownership/default documentation; verification in DEV-NOTES.md.
- [ ] Owner hard-refreshes and checks the saved view stays selected; a fresh profile should show Beat + Bar. Normal browser appearance acceptance remains separate from automated checks.

### Current beta acceptance, audio startup and Git workflow — 2026-10-24

- [x] Owner confirms normal real-guitar practice checks completed; broader TriplePlay/MIDI Guitar user coverage can follow through beta testing. This supersedes blanket claims that normal practice has never received physical acceptance, without claiming every historical edge case/platform/provider was tested.
- [x] Close the app-specific Fishman unplug-freeze investigation as a known cross-site Web MIDI limitation based on the owner's report. Retain troubleshooting/history in MIDI-DISCONNECT.md; the symptom is not claimed fixed and its browser/driver cause is not conclusively established.
- [x] Reproduce InvalidStateError with deliberately delayed native AudioWorklet startup; cancel obsolete starts and unstarted sources through a guarded host compatibility fix without vendor, grading or MIDI changes. Add native lifecycle and real-browser regressions; remove the older browser test workaround waiting for the worklet before Pause.
- [x] AGENTS.md authorizes descriptive commits/pushes after verified updates and defines explicit version/release handling. Retain 0.0.3 and all existing tags; owner holds the next version/tag/release for documentation work.
- [x] 459 Node regressions, deterministic delayed-startup Chrome checks, existing sync-practice Chrome checks and changed-module syntax/whitespace checks pass; details in DEV-NOTES.md.
- [ ] Owner can optionally check quick Play/Pause/Reset and subsequent resume in the normal browser; this specific edge case has automated browser evidence, not owner listening acceptance.

### Manual download guidance and menu scope — 2026-10-24

- [x] Owner approved keeping Settings and Practice as-is, deferring LED integration and automatic version checking, and leaving Piano Trainer unchanged.
- [x] Add Downloads & releases to More → Help & Guide; retain the main-branch ZIP fallback in the user-friendly root README and explain manual updates, library backup, retained old copy and consistent browser/address/port.
- [x] Document static link/guide ownership and future single-source version policy; retain Beta 0.0.3. Automated verification is recorded in DEV-NOTES.md.
- [ ] Owner hard-refreshes the normal Live Server browser, reviews Help/guide wording and opens the releases link. A real update, restored library and physical Fishman session remain owner acceptance checks.

### Paused loop scrolling and media repeat/jump verification — 2026-10-24

- [x] Reveal the paused native cursor after enabled loop slider/measure changes, including rapid or unchanged-start range edits; share existing media viewport reveal and preserve Auto-scroll preference, native transport, grading and count-in.
- [x] Verify separate recording-time occurrences through ordinary repeats, alternate endings, D.C. al Coda, D.S. al Coda and D.C. al Fine with synthetic native fixtures; no custom repeat interpreter or matching changes.
- [x] 454 Node regressions pass; final isolated browser and syntax/whitespace evidence in DEV-NOTES.
- [ ] Owner hard-refreshes normal browser and selects distant loop ranges without Play, with Auto-scroll on/off and either source. Listen to a familiar recording with matching repeat/jump form and review alignment at returns/Coda/Fine. Physical Fishman/provider/appearance acceptance remains pending.

### Clarify sync preview and restore practice controls — 2026-10-24

- [x] Add explicit Finish editing / Return to practice action; identify Preview on main transport and explain suspended feedback/targets/loops. Keep source choice separate and preserve alignment, matching and Wait progression.
- [x] Disable Loop inputs/intents during sync editing and source restoration without changing saved choices. Default video placement to Left; retain valid saved preferences/profiles.
- [x] 449 Node regressions pass; isolated Chrome verifies repeated source/editor transitions, cursor/range/shading, staff/tab/fretboard synthetic MIDI grading, silent Recording Wait, saved placement and desktop/phone layout. Syntax/whitespace pass; final details in DEV-NOTES.
- [ ] Owner tests real video/Fishman after source switches; see the acceptance checklist in DEV-NOTES. User confirmed fretboard targets return when closing the editor; no separate Realtime grading failure established.

### Tolerance defaults and setup guidance — 2026-10-24

- [x] First-use Two held notes and Skipped strings only (Hex); preserve saved choices, legacy disabled tolerance and all matching/progression rules. Keep tracking spikes on, range/brief filtering off, brief duration 30 ms and all four feedback switches on.
- [x] Explain tolerance during setup in README, add a brief Help reminder and expanded-section introduction, retain clean disclosure/summary without an importance badge. Clarify Poly estimated positions and optional simpler feedback. Document the owner's full preferred setup as optional, not universal defaults.
- [x] 448 Node regressions pass, including saved-choice/legacy-off preservation. Browser, syntax and final evidence are recorded in DEV-NOTES.
- [ ] Owner hard-refreshes normal browser, checks saved settings remain unchanged and reviews Practice/Help wording. A fresh/private profile should show Two/Skipped; actual Fishman/MIDI Guitar tracking, listening and comfort remain owner acceptance checks. No automatic application of the owner's optional range-on/brief-on/60 ms preferences.

### Alternate-guide contrast — 2026-10-24

- [x] Brighten alternate labels and modestly strengthen dashed borders without enlarging markers or changing behavior. 447 Node regressions and isolated native preview browser checks pass; screenshots inspected.
- [ ] Owner hard-refreshes and reviews Show alternate positions at normal and manually reduced fretboard heights. Appearance acceptance remains pending; this change has no MIDI path.

### Clear replayed collected-tone fretboard rings — 2026-10-24

- [x] Associate existing ignored-collected-tone replays with already credited event/pitch IDs for display. Clear their held rings after advancing in Poly/Hex without extra credit/errors or tab/Wait changes.
- [x] 447 Node regressions pass, including Collect/Together × Poly/Hex replay matrices, strict attribution negatives and the supplied four-tone capture pattern. Synthetic browser MIDI replay/pause/wrong-ring checks pass; see DEV-NOTES.
- [ ] Owner hard-refreshes and repeats partial-chord tones before completion, holds them into the next target and confirms no leftover purple/red rings or changed results. Physical input/appearance acceptance pending. Alternate-guide contrast was assessed but not changed in this fix.

### Measure preview continuity and alternate-position guides — 2026-10-24

- [x] At the last onset in Beat + Bar, preview one next playback onset in gold; restore full new-bar context on entry. Follow repeats and enabled loops, including loop return in Beat + Next Beat; retain rests and song-end behavior.
- [x] Add one saved Show alternate positions checkbox, default off. Draw faint dashed blue exact-pitch guides for current targets only, with written/live feedback priority and no inferred alternate fingers or octave acceptance.
- [x] Update root README player guidance and fretboard/architecture notes. 441 Node tests and isolated native preview/alternate-control, MIDI feedback, desktop/phone layout/media regressions pass; see DEV-NOTES.
- [ ] Owner hard-refreshes and reviews measure transitions, repeated endings/loop edges, rests, alternate guides on/off, labels/capo/orientation and saved preference. Physical Fishman/MIDI Guitar, listening and appearance acceptance remain pending.

### Hide accepted held-note tails on the fretboard — 2026-10-24

- [x] Hide rings from known accepted prior-target attacks in Poly/Hex without changing held MIDI, grading, errors, tab feedback or Wait progression. Retain current accepted feedback and genuine wrong-position rings.
- [x] Preserve fresh/unclassified input, including neutral paused exploration and release/replay of the same pitch; do not borrow earlier hidden status or stale green/red colors. Keep active held credit visible.
- [x] 438 Node regressions pass, plus isolated synthetic-MIDI checks in Wait/Realtime × Poly/Hex and existing desktop/phone fretboard/media regressions. See DEV-NOTES for evidence and limits.
- [ ] Owner hard-refreshes and checks familiar Poly/Hex guitar phrases: ring accepted chords across target changes, sustain genuine wrong notes, pause/explore/release/replay and repeated-chord tolerance. Appearance, real Fishman/MIDI Guitar and listening acceptance remain pending.

### Player guide wording — 2026-10-24

- [x] Keep the root README free of the app version number; clarify Node.js is required for the included launchers, not hosted use or an existing local server. Remove the deferred-feature list while retaining the practical pitch-grading explanation. Documentation only; no runtime changes.

### Beginner guide, optional demo scores and local launchers — 2026-10-24

- [x] Rewrite root README as player guidance for hosted use, ZIP/offline launchers, MIDI setup, scores/library, modes, menu pointers, feedback, music sources and troubleshooting. Preserve useful technical guidance in docs/DEVELOPMENT.md and existing subsystem docs; remove stale/contradictory history from the player guide.
- [x] Add README.html backed by the same Markdown and a local licensed renderer; keep a brief in-app quick start with a full-guide link opening a separate tab.
- [x] Add three original CC0 GP demos with editable sources and optional native loading from Scores. No automatic library seeding/saving/playback; existing Save to Library remains explicit.
- [x] Add one Launchers folder with Windows .bat and Mac .command files plus a dependency-free Node 22+ loopback static server. Retain Live Server, normal browser and native MIDI/practice behavior. Explain offline assets versus internet-dependent media and separate browser origins.
- [x] 429 Node regressions pass, including real HTTP path/method/MIME checks, launcher port failure handling, injected clipboard success/failure and all three native demo import/SVG/practice timelines. Changed JavaScript syntax and whitespace checks pass. Isolated desktop/phone browser demo/guide/offline flows pass; evidence is recorded in DEV-NOTES.
- [x] Launcher displays the local URL and offers C then Enter to copy for a browser of the user's choice; failed automatic copying retains manual-copy instructions. No LAN address is advertised.
- [ ] Owner tests the extracted Windows ZIP launcher, guide/new-tab navigation, all three demos, explicit save/reopen, offline local playback and a familiar Fishman practice session. Test Mac launcher permissions/Terminal/browser on actual macOS. Hardware, listening, platform prompts and owner visual acceptance remain pending. No published URL has been supplied/verified; add it to the guide when available.

### Scale full neck into manually shortened frame — 2026-10-24

- [x] Scale down the full fretboard to fit short frames, keeping all strings visible and circles round instead of vertical scrolling. Preserve horizontal scrolling, saved manual height and natural-size automatic reset.
- [x] 423 Node regressions plus isolated browser saved-height/scale/visible-string/round-marker/automatic-reset checks pass; existing geometry and app/media browser checks also pass. See DEV-NOTES.
- [ ] Owner hard-refreshes, drags shorter/taller, reviews text/all six strings, reloads and double-clicks to restore normal automatic size. Physical guitar and appearance acceptance remain pending.

### Snug automatic frame and saved manual resizing — 2026-10-24

- [x] Trim outer fretboard padding; fit automatically on first use and reserve horizontal-scrollbar space only when needed. Keep marker/text/string sizes unchanged.
- [x] Restore dragging/Up/Down below the neck's content height with saved manual choice and optional vertical scrolling. Double-click/Home/global reset restore saved automatic mode. Preserve legacy numeric sizes as manual choices.
- [x] 422 Node tests and isolated browser drag/keyboard/reload/reset/default-fit checks pass, plus existing desktop/phone app regressions. See DEV-NOTES for evidence.
- [ ] Owner hard-refreshes, reviews padding, drags shorter/taller and reloads; double-clicks divider to restore automatic fit. Appearance and physical MIDI acceptance remain pending.

### Fit the fretboard frame to its neck — 2026-10-23

- [x] Use a dynamic frame minimum based on neck height, frame chrome and horizontal-scrollbar allowance. Retain larger saved sizes and preserve small stored preferences without applying them below the fit minimum. Remove conflicting 32vh cap; retain horizontal scrolling and outer workspace/score sizing.
- [x] Node floor/persistence tests and isolated browser no-vertical-overflow checks across native string-count profiles and responsive widths; see DEV-NOTES for final results.
- [ ] Owner hard-refreshes, toggles fretboard visibility and reviews six-string/extended necks, narrow/short windows and manual resizing. Appearance and physical MIDI acceptance remain pending.

### Remove duplicate Display fretboard controls — 2026-10-23

- [x] Keep Show virtual fretboard in Display; move orientation/help access exclusively to the neck popup. Preserve saved orientation/defaults, hidden-neck retention, full help guidance and live status.
- [x] 420 Node regressions and syntax checks pass; isolated browser checks cover popup orientation persistence/reload, hide/show retention and help/status without the old Display control, plus existing fretboard/app regressions. See development notes for final evidence.
- [ ] Owner hard-refreshes and reviews Display and popup Help/orientation. Appearance and physical guitar acceptance remain pending.

### Fretboard readability and capo cue — 2026-10-23

- [x] Enlarge target/context circles and labels; increase string spacing. Keep vertical size steady during horizontal resizing and scroll below readable fret-cell limits.
- [x] Use 0/landmarks/current-target/final fret labels when compressed; omit 1 unless targeted. Retain all fret labels at comfortable widths. Show explicit nonzero Capo N badge and preserve existing capo arithmetic/inlays.
- [x] Pure resize/label tests plus isolated browser dimensions, capo, controls, mirrored tracks and existing regressions; see DEV-NOTES for final evidence. Keep Help, saved choices and feedback/Wait/MIDI rules unchanged.
- [ ] Owner hard-refreshes usual Live Server browser; review marker/text size, window resizing, right/left-handed scrolling, targeted fret 1, high frets and actual capo files. Physical Fishman/MIDI Guitar, appearance and listening acceptance remain pending.

### Fretboard previews, labels and paused browsing — 2026-10-23

- [x] Add saved Beat (default) / Beat + Next Beat / Beat + Bar views. Blue current, gold future outlines, faint neutral past; current feedback wins over deduplicated context and historical errors do not color context.
- [x] Add saved Note names (default) / Fret numbers / Finger numbers / None. Use explicit native fingering only, blank when absent; preserve pitch-based Poly/Hex grading and independent score feedback.
- [x] Add local arrow/gear controls, synchronized orientation and help. Arrows pause/cancel count-in, clear existing attempt/held state, seek within the enabled loop and remain paused. Disable during sync editing; retain existing pre-Play/startup behavior and compact panel geometry.
- [x] Add automated context, native fingering round-trip, persistence and isolated Live Server controls/navigation checks; see DEV-NOTES for final evidence and limits.
- [ ] Owner hard-refreshes usual Live Server browser: review all views/labels, missing/present fingering, left-handed/hidden persistence, and arrow stepping from playing/paused Realtime/Wait. Compare alternate-position Poly green, partial chords, wrong-note rings/release, repeats/loop edges and synced recording pause/seek. Physical Fishman/MIDI Guitar, listening, representative user files and appearance acceptance remain pending.

### Pre-Play fretboard target preview — 2026-10-23

- [x] Preview the next written attack in blue before Play when no session target exists; follow track/loop selection and retain paused current targets. Do not start grading, transport or create a session target.
- [x] 413 Node tests, syntax and whitespace checks pass. Isolated native-fixture browser checks cover Wait/Realtime load previews, all seven track changes, idle sessions, enabled-loop preview and Wait pause retention.
- [ ] Owner hard-refreshes, loads a usual score and reviews blue targets before Play, track/loop starts, pause/resume and physical MIDI. Hardware/visual acceptance remains pending.

### Startup fretboard — 2026-10-23

- [x] Before loading a score, show a standard six-string EADGBE neck instead of the missing-tuning placeholder. Loaded tracks retain their own tuning/string count; invalid/percussion tracks retain existing unsupported handling. Saved visibility/orientation still win.
- [x] 412 Node tests, changed-module syntax and whitespace checks pass. Isolated Live Server browser verifies startup, native imported 1/4/5/6/7/8/12-string tracks, saved hidden and left-handed choices without page errors.
- [ ] Owner hard-refreshes and reviews startup appearance and transition to a usual score. Physical MIDI/appearance acceptance remains pending.

### Settings text trim — 2026-10-23

- [x] Remove the routine per-device saving line; hide connected listening/receiving/mode confirmations while preserving waiting, None and error statuses. Keep per-device saving guidance in help.
- [x] Shorten Hex mapping to Channels, lowest → highest string and the channel sequence; remove the dropdown-range explanation.
- [x] 411 Node tests, syntax and isolated Settings browser checks pass, including hidden routine text, exact mapping, visible waiting/None states and existing device persistence checks. Owner visual/physical MIDI acceptance remains pending; hard-refresh and review both modes.

### Settings layout and per-device preference audit — 2026-10-23

- [x] Compact Settings into device/status, vertical Poly/Hex mode choices, aligned mode-specific rows, visible Hex mapping, collapsed device help and collapsed diagnostics. Retain connection failures in the visible status line.
- [x] Verify existing per-device mode/channel/base/order/bend/latency storage and preferred-device late arrival; retain the router and None/manual-selection policy. Disable Settings device controls without a selected input and identify the profile being edited.
- [x] 411 Node regressions, bootstrap/browser-runner syntax and whitespace checks pass. New isolated Live Server browser runner uses synthetic devices to exercise actual controls, separate device settings/reload, remembered arrival before any score, manual/None priority, keyboard help and widths 1440/800/620/390 without page errors or horizontal overflow.
- [ ] Owner hard-refreshes usual browser: select/configure Fishman and MIDI Guitar differently, switch back/forth and reload; start with the last device unavailable, connect before loading a score and confirm automatic selection/mapping. Review Settings spacing with a score; actual MIDI, reconnect/driver and listening acceptance remain pending.

### Practice menu tidy-up — 2026-10-23

- [x] Keep vertical practice modes and conditional Wait controls; move all four Score feedback choices ahead of MIDI tuning. Collapse tolerance/timing sections, align dropdowns, shorten visible explanations and retain detailed inline help and warnings.
- [x] Add a display-only held-note/filter summary that excludes unavailable Hex filters. Preserve control IDs, saved choices, defaults and all grading/transport behavior.
- [x] 411 Node tests, changed-module syntax and whitespace checks pass. Isolated Live Server Chrome checks cover keyboard disclosure, summary updates, reload persistence, independent feedback choices, Wait settings, duration controls and widths 1440/800/620/390; no page errors or horizontal menu overflow.
- [ ] Owner hard-refreshes the normal Live Server browser and reviews spacing with a loaded score in Realtime/Wait; check Hex/Poly device availability, saved feedback/tolerance choices and familiar Fishman/MIDI Guitar practice behavior. Physical MIDI and owner visual acceptance remain pending.

### Explicit held-note limits — 2026-10-21

- [x] Replace unlimited Multiple with Two notes / Three notes, retain Off / One note default, enforce caps in every practice/input configuration and migrate saved Multiple to Two.
- [x] Add cap matrix and preference migration coverage. See handoff for final checks.
- [ ] Owner hard-refreshes and compares Two against One/Three on repeated chords with MIDI Guitar; check reload persistence and X transitions. Physical/browser acceptance pending.

### Multiple held-note refresh — 2026-10-21

- [x] Keep separate real-attack evidence for correct prior-chord tails and collected-tone reattacks in Multiple. Allow Wait Collect corrections spanning attempts without requiring all collected tones in the latest gesture. Preserve One/Off, releases, chord identity and X rules.
- [x] 404 tests; isolated supplied E7 replay settles the stalled chord at 19.120 seconds with no credit on the following X target. No whole-performance accuracy claim.
- [ ] Owner hard-refreshes, enables Multiple and replays measure 2 in Poly/Hex. Check lingering correct tones advance the identical E7, released tones still need attacks, and the X beat waits for its own gesture. Capture any remaining mismatch; physical/browser acceptance remains pending.

### Lightweight capture readout before grading acceptance — 2026-10-21

- [x] Keep stopped/limit-reached preview bounded; generate full Copy/Save report only on demand. Add Clear recording; restore preview after manual-copy fallback loses focus.
- [x] Avoid trainer repaint for irrelevant bend/controller traffic while retaining raw capture and grading outcomes.
- [x] 400 Node tests including maximum-size preview/export/clear evidence; isolated Live Server Start/Stop preview smoke check.
- [ ] Owner hard-refreshes and records a longer passage; stop and reopen Settings, Copy/Save, Clear, then repeat to compare responsiveness. Test actual Fishman and MIDI Guitar traffic. Reassess Multiple held-note stalls and apparent X-beat skips using a fresh capture; neither symptom is established as a grading defect yet.

### All-mode MIDI tolerance — 2026-10-21

- [x] Shared Off / One note (default) / Multiple notes for Poly/Hex, Realtime and both Wait chord modes. Require fresh attack evidence, retain held provenance and explain the Multiple trade-off.
- [x] Extend written-range, brief-error and confirmed Hex artifact filtering to Realtime; retain independent saved choices and original-target decisions. Remove Wait-only UI restrictions.
- [x] Automated all-mode/input matrix plus isolated Live Server menu/choice/persistence checks. See development notes for final validation.
- [ ] Owner hard-refreshes usual browser: compare Off/One/Multiple with repeated chords in Poly/Hex, both Wait choices and Realtime. Check releases, deliberate mistakes, singles, X transitions, pause/resume and loops. Compare each filter on/off. Physical MIDI, listening and loaded-score acceptance remain pending.

### Written X and extra chord strings — 2026-10-21

- [x] Always forgive identified written X-string input in mixed Hex targets without crediting pitched slots. All-X beats still require one fresh arbitrary MIDI attack in Poly/Hex, Wait/Realtime, independently of scope.
- [x] Replace broad checkbox with Off / Skipped strings only / All unwritten strings. Require two distinct pitched strings for optional tolerance; preserve legacy saved true as All. Other filters remain independent.
- [x] Automated session, native mixed-X metadata and preference regression coverage; see development notes and handoff for final checks.
- [ ] Owner hard-refreshes normal Live Server: test all-X, mixed pitched/X, single notes, internal rakes and outer-string mistakes across all three scopes, Wait/Realtime, then reload to verify saved selection. Physical Fishman/browser acceptance remains pending.

### Continued TriplePlay USB freeze mitigation — 2026-10-20

- [x] Owner confirms whole Chrome freezes on active TriplePlay removal despite earlier guards. Skip close calls on disconnected inputs, including reinitialization cleanup; invalidate listener epochs before detachment. Connected switches/None still close once without waiting/retry.
- [x] 366 Node tests pass, plus router syntax and whitespace checks. Simulations cover notification storms, reconnect cycles, dead-port close avoidance, callbacks during detach, inactive-device removal and throwing/rejected/unresolved connected closes.
- [ ] Physical Chrome/TriplePlay acceptance remains pending. This is a mitigation, not a confirmed native-hang fix. See MIDI-DISCONNECT.md for acceptance and the None-before-removal comparison.

### Correct paired XML ties/visibility and repeat-open choice — 2026-10-20

- [x] Supersede saved per-file combine choices: ask every qualifying open, including reopening identical files; ignore legacy keys. Clear captured file input so same-file selection fires again.
- [x] Rebuild from original notation rhythm/visibility/ties/symbols with tab fingering and chain-origin fingering for sustained notes. Use native reimport/rendering; fail closed to separate parts when original sources cannot reconcile. No MIDI/session-rule or vendor changes.
- [x] Supersede the earlier 447-attack replay claim: original-source/browser checks establish 447 note entries, 30 tied continuations and 417 fresh slots / 223 targets. Fresh attacks match GPX within triplet rounding; all six practice configurations pass at 100%. Actual app prompts pass Combine/Keep separate/Combine with a legacy choice seeded. 362 Node tests and syntax checks pass.
- [ ] Owner hard-refreshes and reopens XML, confirms each-time choice and visible sustained upper chords/ties in measures 37–45. Play only fresh bass notes while chords sustain; verify physical Fishman Wait progression, Realtime feedback and listening. Hardware/audio acceptance remains pending.

### Black notation for all voices — 2026-10-20

- [x] Owner approved equal black native glyph colors for primary/secondary voices across all scores and visible tracks. Host resource settings preserve musical voices and independent green/red practice overlays; no grading/MIDI/transport changes.
- [x] 362 Node tests, host syntax and whitespace checks pass; bundled native settings parsing confirms both colors resolve to opaque #000000.
- [ ] Owner hard-refreshes Live Server and checks measures 37–44 of Four on six, All tracks display and green/red practice feedback. Browser/Fishman acceptance pending.

### Paired import gray-voice follow-up — 2026-10-20

- [x] Owner reports combine import appears to work. Explain screenshot gray bass as native secondary-voice coloring; retain native colors. Pitched notes in both voices remain targets.
- [x] Exact supplied repaired XML replay: 225 attack groups / 447 note slots, zero percussive groups; 100% with no errors/misses in Poly/Hex Realtime and both Wait chord modes. All 447 Wait feedback source-note marks become correct. Add independent synthetic two-voice regression.
- [ ] Physical Fishman and browser green-feedback alignment on both notation/tab remain owner acceptance, especially measures 37–44; synthetic replay does not establish hardware delivery or visual overlay placement.

### Optional paired MusicXML notation/tab import — 2026-10-20

- [x] Detect explicit two-part groups in uncompressed .xml/.musicxml on opening, including library reopen. Offer Combine parts / Keep separate only for closely matching notation-only/tab-only Guitar parts; no general track merge or multi-track grading.
- [x] Disclose differing measures; retain tab pitches, fingering, durations and ties, enable native notation, transfer chord symbols at original onsets, and remove the redundant notation track only after consent. Original/library bytes remain unchanged. Remember both choices by file SHA-256 and pair in this browser.
- [x] 361 Node tests pass; native SVG/MIDI checks pass. Supplied Four on six XML identifies measures 38/45 and transfers 67 chord symbols. Comparison measured about 1.5 ms after about 53 ms native parsing in one local Node run, not a browser performance guarantee.
- [ ] Owner checks the dialog, both choices, saved reopening, chord symbols (including measure 24), notation/tab, playback and Wait/Realtime with Fishman in the normal Live Server browser. Physical/browser acceptance pending.
- [ ] Compressed .mxl pairing, general manual merging, conversion/export and moving saved decisions with library backups are outside this increment; native .mxl loading remains supported unchanged.

### Optional brief off-target tolerance — 2026-10-20

- [x] Add visible Practice → MIDI input tolerance checkbox, Ignore brief off-target notes, default off. Correct pitches count immediately; wrong MIDI pitches released before the chosen threshold are forgiven. Wait Hex and Poly only; Realtime unchanged.
- [x] Default 30 ms, valid integer 5–100 ms; direct numeric entry and ±5 ms arrow buttons. Show duration when enabled. Save enabled choice and duration per MIDI input; disabling retains duration. Legacy/new device profiles default off/30. Device identity/reconnect behavior is preserved.
- [x] Keep pending errors anchored to their original target; mature held errors through the existing clock or releases. Preserve duration handling across target changes, Together retries, pause/resume, final completion and loop archival. Raw messages and later decisions remain in capture evidence.
- [x] 358 tests, changed-module syntax and whitespace checks pass. MG3 replay at 30 ms keeps all 84 correct attacks and target identities, removes 18 of 32 penalties (72% → 86% for that recorded segment). Synthetic browser check verifies checkbox, numeric entry and arrows; real app menu shows device-selection help when no input is selected.
- [ ] Owner hard-refreshes normal Live Server browser, selects MG3, enables at 30 ms, compares off/on, reloads and switches to TriplePlay to confirm independent saved choices. Check deliberate sustained errors, very short correct notes and loops. Physical acceptance pending.


### Weak precursor retrigger across Wait targets — 2026-10-19

- [x] Audit 48-message Christmas capture: measure-1 low C3 soft velocity-10 onset completes its target; release at 35 ms; same-channel/pitch velocity-119 retrigger at 42 ms is wrongly attributed to measure 2. This precedes every actual measure-2 chord attack; the held-note hypothesis is not the captured cause.
- [x] Under Filter confirmed tracking spikes (Wait Hex), tolerate one stronger immediate retrigger of an accepted soft single across exactly one target boundary: precursor velocity ≤20, matching raw/interpreted pitch and string/channel, captured release ≤70 ms, retrigger ≤60 ms from onset and ≤20 ms from release, ≥2× velocity. Never ignore a pitch required by the current target.
- [x] 342 tests, syntax and whitespace checks pass. Raw-router replay processes all 48 messages/24 selected-channel messages, preserves all 9 correct attacks and target identities, and changes the single disputed penalty from wrong to ignored-previous-onset.
- [ ] Owner hard-refreshes and retries measures 1→2 with confirmed-spike filtering enabled, including deliberate delayed wrong notes and genuine repeated written notes. Physical Fishman acceptance pending.


### Practice filter controls and menu layout — 2026-10-19

- [x] Capture both filter checkbox values before WaitController.stop publishes a synchronous repaint. Previously that repaint restored the old checkbox value before it was saved, preventing both directions of change.
- [x] Group MIDI tolerance options into full-width rows with attached descriptions, mode labels, and expandable technical help instead of alternating labels/help through the setup grid.
- [x] 328 tests pass, including both actual handler bodies under a simulated synchronous stop repaint; bootstrap syntax and whitespace checks pass. Live Server browser check confirms range on/off and visually grouped rows. The separate test browser has no WebMIDI, so live Hex checkbox/device acceptance remains with the owner.


### Captured MIDI artifacts and optional score-range tolerance — 2026-10-19

- [x] Audit the 452-message Christmas Time Is Here capture. All three disputed pitches occur in raw TriplePlay MIDI; string/fret feedback is a projection, not proof of a physical attack. See MIDI-ARTIFACT-AUDIT-2026-10-19.md.
- [x] Extend existing Wait Hex spike tolerance for wrong onsets released within 5 ms and replaced within 20 ms by the unique written same-string tone at equal/greater velocity, same target/retry. Preserve the earlier soft/distant policy and short correct notes.
- [x] Owner approved optional written-range tolerance for Wait Hex and Poly, default off and independently saved. Current fretted shape ±5 frets plus open strings; Hex uses reported string, Poly requires no plausible string. Invalid/missing fingering leaves input unchanged. This is score-based tolerance, not measured hand position or strict position grading.
- [x] Record enabled filters and ignored-range evidence without modifying raw MIDI. 326 tests, changed-module syntax and whitespace checks pass. Supplied-capture replay preserves all target identities and 88 correct notes; with both filters, 7 wrong remain, versus the captured 10.
- [ ] Owner hard-refreshes, keeps confirmed-spike filtering on, enables Practice → Ignore notes outside written fret range (Wait), retries the passage and deliberately tests nearby mistakes. Compare range off; verify saved choice after reload. Hardware/browser acceptance pending.


### Blank systems in imported GPX — 2026-10-19

- [x] Guard native alphaTab tab staff-line gap collection for notes without a valid string. Preserve pitches, score data, repeats, lazy loading and grading.
- [x] 309 Node tests and vendor syntax check pass. Supplied 32-measure GPX renders 11 chunks at 900px and 7 at 1800px in the native SVG renderer.
- [ ] Owner hard-refreshes Live Server, reloads Christmas Time Is Here, and confirms second/later systems, repeats, cursor and Fishman feedback in the usual browser.


### Confirmed Wait Hex tracking-spike tolerance — 2026-10-16

- [x] Implement optional saved Practice filter (default on) requiring a very soft, released, distant wrong pitch and stronger correct next attack on the same configured Hex channel, same target/retry. Bounds: velocity ≤20, duration ≤70 ms, distance ≥9 semitones, follow-up ≤200 ms and ≥2× velocity.
- [x] Preserve short correct notes, high written frets, unconfirmed/adjacent/loud/sustained errors, Poly and Realtime. Keep original raw MIDI and wrong outcome plus explicit reconciliation evidence. Candidates clear on pause/new session and cannot cross targets or retries.
- [x] 308 automated tests, changed-module syntax checks and whitespace checks pass. Capture-derived measure-2/7 patterns covered; measure-6 adjacent errors remain visible.
- [ ] Owner hard-refreshes and repeats the passage in Wait Hex, checks on/off behavior and intentional neighboring-fret errors. Hardware acceptance pending. Older entries saying extreme-spike handling is missing are historical and superseded by this section.


### Saved MIDI device profiles and late connection — 2026-10-16

- [x] Save Poly/Hex, single channel, Hex base/reverse, pitch-bend range and latency per input; restore before attaching its listener. Global Practice/feedback preferences remain independent.
- [x] Remember the last selected input across reloads and wait for late connection without switching to Microsoft loopback. First use and explicit None select no input; None cancels pending reconnection while retaining profiles. Manual selection replaces the remembered input.
- [x] Prefer browser port ID; recover a changed ID only from one matching name/manufacturer, preserving that profile. Ambiguous matches wait for manual choice. Invalid or blocked browser storage is contained.
- [x] 285 Node tests pass, including saved settings, multiple devices, startup/late plug/reload/unplug orders, explicit None, ID fallback and the first message using restored Hex/channel settings. Previous disconnect-storm checks still pass.
- [ ] Owner hard-refreshes, selects/configures TriplePlay once, then tests reload while connected and opening the app before plugging in. Verify both restore settings; test choosing None while waiting, switching to another device and back, and paused unplug/replug. Browser/Fishman acceptance remains pending.

### USB disconnect robustness and MIDI UI workload — 2026-10-16

- [x] Owner reports Chrome hanging, possibly coinciding with unplugging TriplePlay rather than file updates. No full-browser crash reproduced; do not claim a confirmed browser/driver root cause.
- [x] Ignore disconnected ports and output-only/unchanged connection notifications. Detach and close the old selected input once; discard queued stale listener callbacks. Keep the selected input preference during unplugging, reconnect that ID when it returns, and show Select MIDI input if manual choice is needed instead of silently picking another device.
- [x] Prevent late permission requests from overwriting newer access sessions. Emit one completed device transition instead of notifying UI while a listener switch is half-finished.
- [x] Group MIDI device/debug DOM updates by frame, cache dropdown options and eliminate duplicate trainer paints from message-state notifications and completed Wait gates. All raw capture and grading callbacks remain immediate; trainer/capture feedback still publishes synchronously.
- [x] Cache completed report text until evidence changes and serialize without cloning the entire capture first. Public report objects still return independent copies; the final capture-limit row is populated before automatic text generation.
- [x] 279 Node tests and changed-module syntax/whitespace checks pass. New evidence includes 10,000-event disconnect/output/unchanged storms, 100 reconnect cycles, stale callbacks, out-of-order permissions, all 5,000 MIDI messages delivered before UI paint, one publish per solved gate and report-cache invalidation.
- [ ] Owner hard-refreshes, tests one unplug/replug while paused, then during Wait practice if stable, with and without recording. Confirm the tab remains responsive and the same input returns; a changed OS device ID requires selecting it again. Real Chrome/Fishman/native-driver freeze acceptance remains pending. Live Server and the owner's Chrome session were not closed or replaced during this work.
- [ ] Extreme tracking-spike handling remains pending after stability testing; this change intentionally leaves pitch grading rules unchanged.

### Fix stale bend state blocking the first chord — 2026-10-16

- [x] Latest capture confirms a regression: raw G3/E4 were shifted +7/-10 semitones by unrelated channel bend values retained before recording. The first raw strum actually contains all four required Am7 pitches.
- [x] Apply only bend offsets observed within 60 ms of their own active raw onset. Exact repeats of that raw base can retain the observed correction; a different raw base, late/unassociated bend, pause or new session/attempt clears its applicability. Bare cached channel bend values never offset a fresh onset. This is scoped onset recognition, not universal continuous-bend interpretation.
- [x] 273 Node tests pass, retaining prior E7/Bm correction cases and adding stale ± offsets, changed-base isolation, pause/new-attempt/start resets and the captured first Am7 sequence. Actual raw-message replay through the router/controller advances on the first strum's E, 58.1 ms after A; only its separate raw F4 spike remains an error. Syntax and whitespace checks pass.
- [ ] Owner hard-refreshes and retries normal strums with the saved ±12 unchanged. Physical browser/Fishman acceptance remains pending. Extreme tracking spikes remain a separate policy decision.

### Wait Hex pitch-bend interpretation — 2026-10-16

- [x] Owner confirms Fishman range ±12. Wait Hex now interprets per-channel Note-On + bend using that saved matching range, with ±2/±24/Ignore choices in MIDI settings. Normal attacks remain immediate; ordinary short notes are retained.
- [x] A received bend within 60 ms may revise an initially wrong onset on its original occurrence, without adding an attack. Corrected pitches remove their false penalty/history/live marker; still-wrong pitches retain one penalty with updated pitch detail. Raw MIDI remains intact in capture, with separate interpretation/correction evidence. Poly and Realtime are unchanged.
- [x] Raw Note-Off releases the corrected sounding pitch. Pause cancels correction eligibility; channel bend state survives ordinary Pause/Resume and session restarts. MIDI/score reconfiguration clears it. No extreme-fret/velocity/duration filter was added; fret-26 tracking spikes remain a separate decision.
- [x] 269 Node tests, changed-module syntax and whitespace checks pass. Isolated supplied-sequence replays correct measure-2 E7 and measure-2/4 Bm7b5 onset errors; measure-4 E7 with no bend correction still fails as its received pitch requires. No new whole-performance percentage claimed.
- [ ] Owner hard-refreshes Live Server, confirms MIDI → Wait pitch-bend range ±12, then checks the same chords and a deliberate unbent fret-8 mistake with capture on. Physical browser/Fishman acceptance and separate extreme-tracking-artifact policy remain pending.

### MIDI input audit and repeated Hex chord recognition — 2026-10-16

- [x] Replayed all 486 raw messages from the latest capture through the actual router: all 486 preserved byte-for-byte; all 243 selected-channel messages delivered; no held duplicates suppressed. This is reproducible code-path evidence, not proof of live device/browser delivery before the capture boundary.
- [x] Wait One at a time can recognize one still-held matching tone in a repeated identical six-string Hex chord with at least three tones, when all other tones have fresh attacks on distinct channels within a short gesture. It waits min(200 ms, configured window) from gesture start plus at least 60 ms quiet before settlement through the existing controller clock. Fresh full chords remain immediate.
- [x] Release, changed pitch, noncentral pitch bend, wrong notes in the gesture, paused/restarted practice, stale gestures, ambiguous/reused channels, new chords, Poly and Together prevent support. Support cannot chain to another chord without a real reattack of that tone.
- [x] Diagnostics/history/snapshot reports distinguish held-note support from verified attacks; help explains chord recognition versus reattack verification. Capture also records browser dispatch delay and app handler duration without altering routing.
- [x] 255 Node tests pass; raw-router/controller/recording-on-and-off tests cover evidence preservation, delayed settlement and wrong-fret retention. Isolated replay of all three held-E chord pairs now completes each without errors. The final C case remains pending: it was released with no fresh Note-On and cannot safely be inferred. No personal capture/score data added.
- [ ] Owner fresh Live Server/Fishman check: normal repeated Am7 strums in Hex / One at a time, with diagnostics recording on. Observe held-note support count, X transitions and intentional wrong upper notes. If the released-C stall remains, compare the same short passage in the existing Fishman monitor separately; this distinguishes missing-before-capture input from app decisions. Physical/live browser acceptance remains pending.

### Wait X handoff and repeated chord tones — 2026-10-16

- [x] Keep repeated/changing pitch messages inside one X gesture out of the next target. A quiet 60 ms gap or a repeated starting identity after 60 ms starts a new gesture, within the existing maximum 200 ms (or shorter configured window) guard. Pitched-chord handoff and Realtime remain unchanged.
- [x] Replaying collected required tones in Wait adds neither credit nor a wrong-note penalty. Hex unisons still require distinct channels; Together expiry still clears partial hits. Genuine wrong pitches retain their penalties and feedback.
- [x] 243 Node tests, changed application-module syntax and whitespace checks pass. Synthetic cases cover the captured changing-pitch X sequence, consecutive X targets, reversed strums, fast singles, Hex unisons, Together expiry and the measure-4 fret-7/fret-6 correction.
- [ ] Fresh Fishman acceptance in the normal Live Server/browser: enable Allow muted-string noise (Hex), clear results, then check X → chord transitions, repeated/reversed strums and correcting measure 4. Compare Strict separately. Very rapid X/chord gestures remain subject to the bounded heuristic; MIDI alone cannot prove gesture identity. No new overall accuracy claim from replaying the old, differently advanced performance.

### Muted strums, Hex tolerance and handoff — 2026-10-16

- [x] All-X beats accept one fresh attack at any pitch in Wait/Realtime and Hex/Poly. Mixed X notes impose no pitched requirement; native rendering is preserved.
- [x] Saved Practice → Allow muted-string noise (Hex), default off/Strict, ignores omitted-string input only for supported six-string chords. Ignored input neither penalizes nor fills required tones; Poly stays strict.
- [x] Wait protects remaining tones of a completed strum at the next gate. Realtime favors a started chord within its existing tolerance. Fast repeated single notes retain immediate acceptance.
- [x] No blanket <100 ms filter or fret-distance rejection. Feedback describes received-pitch interpretations; X notes no longer prescribe frets.
- [x] 235 Node tests and an isolated actual-GP5 Chrome/simulated-MIDI check pass.
- [ ] Owner enables Hex tolerance in Practice and checks the jazz standard with Fishman: fifth-string rakes, one attack for X chords, transitions at measures 3/4, repeated chords, fast notes, reversed strums and Strict comparison. Muted strums with no MIDI still need a detectable attack. Physical/audio acceptance remains pending.

### Independent measure and recording selections — 2026-10-15

- [x] Measure/beat fields, timeline guides, saved marker clicks and secondary point-list selection change only the score target. Selected recording time, audio position and playing/paused state are preserved. The sheet reveals the measure without seeking its playback cursor.
- [x] Waveform clicks still select/seek recording time while retaining the score target. Add/Update joins the selections; actual dragging and 50 ms adjustments still edit/audition saved points.
- [x] 224 Node tests, 100 desktop / 99 phone app checks and 17 native/storage checks pass. Tests cover paused/playing target changes preserving recording time, native playhead and playback state, plus continued drag/nudge audition.
- [ ] Owner checks sound → measure → Add/Update, as well as measure → sound → Add/Update, with the usual MP3/video sources.

### Alignment indicator colors — 2026-10-15

- [x] Selected recording time uses dotted red and a red pointer, matching the solid red measure target. Moving playhead remains charcoal; saved/estimated points retain blue. Help text updated; no timing/transport changes.
- [ ] Owner checks the paired red indicators in the usual browser after reload.

### Audition adjusted sync point — 2026-10-14

- [x] Each 50 ms adjustment immediately moves the selected saved point, seeks recording/sheet to its new time, and preserves the previous playing/paused state. It no longer merely shifts playback relative to its distant old position.
- [x] 224 Node tests, 98 desktop / 97 phone app checks and 17 native/storage checks pass. Browser regressions seek from 3/5 seconds back to the adjusted 1.700/1.650-second marker and verify continued playback; paused adjustment also verified.
- [ ] Owner checks repeated left/right adjustments while listening well past the selected marker, plus paused adjustments, with the usual recording sources.

### Selected recording time stays fixed — 2026-10-14

- [x] Waveform/marker seeks select a recording time that stays fixed while playback continues. Editable Selected time and a dashed blue indicator show it separately from the moving dark playhead.
- [x] One Add sync point / Update sync point action saves the selected seconds for the chosen measure/beat and pauses. Use playhead time only copies current playback time into the selection, without seeking, saving or pausing. No added buttons or hidden live-capture mode.
- [x] 224 Node tests, 96 desktop / 95 phone app checks and 17 native/storage browser checks pass, including click → listen onward → save original time, non-saving playhead copy, and existing paused/running drag behavior.
- [ ] Owner checks the revised click → listen → Add/Update workflow with a representative MP3/video in the usual Live Server/browser.

### Drag audition and Start label — 2026-10-14

- [x] Dragging a saved anchor pauses during movement, seeks to the placed time on release, and resumes only if playback was running before the drag. Paused drags stay paused; explicit Align still pauses.
- [x] The score's opening anchor says Start, paired with End. Labels depend on score position rather than just being first/last in the saved point list.
- [x] 224 Node tests, 91 desktop / 90 phone app checks and 17 native/storage checks pass. Real-pointer checks verify pausing during a running drag, resuming at its placed time, and retaining pause after a paused drag.
- [ ] Owner checks running/paused drags and Start/End with the usual MP3/video sources in Live Server/browser.

### Ungraded sync editing and 50 ms adjustment — 2026-10-14

- [x] Open sync editor previews the selected source independent of saved Realtime/Wait. Scoring, old feedback overlays, practice loops and count-in are suspended. Closing pauses and restores practice/loop choices with a fresh attempt; preferences are unchanged.
- [x] Playing waveform/guide/saved-point clicks seek and continue; paused seeks stay paused. Capture and actual anchor dragging pause. Provider state reports cannot toggle playback on their own; paused position samples cannot trigger native completion.
- [x] Buttons move selected anchors immediately by 50 ms and keep preview running. Existing keyboard behavior is unchanged. Endpoint labels say End; intermediate anchors identify their beat.
- [x] Preview can seek/play past a moved score endpoint without native completion stopping the audio. Paused endpoints do not finalize grading. Checks: 224 Node tests, 91 desktop / 90 phone app checks, actual opposing pointer drags/playing seeks and 17 native/storage browser checks pass.
- [ ] Owner checks representative MP3/TrueFire/local video/YouTube editing, especially near the last measure, then closes the editor and checks normal Realtime/Wait with Fishman.

### Timeline without a waveform — 2026-10-14

- [x] Missing waveforms show a faint baseline/divider and “Waveform unavailable · Click timeline to seek” inside the existing timeline, with no fabricated waveform or extra panel height. Pending local decoding has a Building waveform hint; real data replaces the hint. No online processing added.
- [x] 221 Node tests, 81 desktop / 80 phone app checks and 17 native/storage browser checks pass, including fallback display and replacement by real peaks.
- [ ] Owner checks the hint with the working TrueFire URL. Owner confirmed the preceding target/playhead workflow works.

### Fixed alignment target and independent playhead — 2026-10-14

- [x] Measure/guide clicks select a target and seek audio plus score; waveform seeks preserve that target. Main Play/Pause does not change target or save sync points. Double-clicking a guide now only selects/seeks.
- [x] Red target indicator ends in the measure strip; dark playhead occupies only the waveform. Visible target/recording summary and **Align selected measure here** clarify capture. Recording seconds follows playback unless explicitly typed; seeking refills it.
- [x] Paused manual media seeks reveal the native sheet cursor once without changing Auto-scroll. Playback following retains the saved preference.
- [x] 221 Node tests, 79 desktop / 78 phone app checks and 17 native/storage browser checks pass. Syntax and whitespace checks pass; physical MIDI/provider acceptance remains local.
- [ ] Owner verifies the select-measure → listen/seek → align flow with a representative MP3/video, saved profiles and normal Live Server/Fishman setup.

### Readable media timeline zoom — 2026-10-14

- [x] Keep measure/time text readable at high zoom and waveform/playhead strokes at constant screen width. Declutter overlapping measure labels without removing guides or changing alignment.
- [x] 221 Node regression tests pass; application/browser harness syntax checks pass.
- [x] Actual app harness passes 69 desktop / 68 phone checks, including 516% zoom geometry and waveform redraw. Desktop zoom screenshot visually inspected.
- [ ] Owner checks the same MP3 at 100% and around 516% in the usual Live Server/browser: readable labels, finer waveform detail, horizontal scrolling and unchanged point dragging/sync.

### Shared media transport, grading and point capture — 2026-10-14

- [x] Media Sync only in More. One main Play/Pause uses Synth audio or Recording; Tempo percentage is shared, and the optional panel is for video. Duplicate media Play/speed controls removed.
- [x] Realtime grades MIDI against recording sync-point timing at the selected percentage; Wait pauses/mutes the source while its target seeks update the media frame. Original pitch rules and score timeline retained. This explicitly supersedes earlier recording-grading deferral.
- [x] Paused waveform seeking positions audio and native cursor together; guide hit areas no longer cover the waveform body.
- [x] Add / update point uses the playhead by default. Adjacent seconds/Use typed time is the single alternative, with no duplicate playhead button or redundant Undo for identical updates.
- [x] 221 Node tests and 65 desktop / 64 phone app checks pass, including recording-clock MIDI acceptance, shared Tempo and silent Wait advancement.
- [ ] Owner checks Fishman Realtime accuracy with representative media, silent Wait video positioning, real YouTube seek/rate/buffering and normal Live Server/browser acceptance. No version or Git publishing change.

### Compact, discoverable sync editing — 2026-10-14

- [x] Visible Add point creates the selected measure/beat at its estimated time for dragging; existing positions select their point without duplication. Use playhead time is the immediate timestamp alternative. One inline Apply time and adjacent nudges replace the hidden two-button fine adjustment.
- [x] MIDI practice/Use recording and Show whole recording replace ambiguous labels. Save stays visible; profile fields, waveform retry and duplicate point list move to Load/options. First-pass and point-list labels are plain language.
- [x] 217 Node tests, 59 desktop / 58 phone browser checks pass; desktop essential editing/save actions verified visible without scrolling. Current contract is in MEDIA-SYNC.
- [ ] Owner verifies the revised Add-and-drag MP3 workflow and physical/browser acceptance. This supersedes the earlier unified editor layout below.

### Unified Media Sync editor — 2026-10-14

- [x] Direct Media Sync toolbar/More action opens the editor. Source loading, Practice/Recording selection and profile picker/name/save live there; layout and profile management remain secondary options. Selecting Recording does not autoplay or overwrite saved visibility. Main transport keeps native media behavior and Practice restoration.
- [x] Estimated repeat-aware measure/beat guides are distinct from anchors. Capture immediately creates/updates the selected score position at recording time and pauses. Fine adjustment, pointer preview/bounds, 10/100 ms nudges, magnifier zoom/Fit, timeline seeking and Undo/Redo retain native point validation.
- [x] Automatic detailed stereo waveform for supported local files; visible-column rendering, resource limits and stale-result protection. Existing profiles/backups remain compatible; save status distinguishes unsaved edits.
- [x] 217 Node tests pass; browser validation and remaining acceptance are recorded in DEV-NOTES and MEDIA-SYNC.
- [ ] Owner checks audible alignment, real MP3/video/YouTube/direct URLs, touch interaction and Fishman Realtime/Wait restoration in the usual Live Server/browser. Graded recording practice, GP export/code generation and other deferred features remain outside scope.

### Workspace panel cleanup and UX review — 2026-10-14

- [x] Listen reveals recording and dismisses the menu; Edit sync opens the editor separately. Direct × controls hide recording/editor/fretboard and synchronize saved visibility without discarding work.
- [x] Editor/fretboard dividers support pointer/keyboard resizing, bounded persistence, viewport fitting and resets. Recording divider keyboard direction follows right/bottom placement correctly.
- [x] Collapsed alignment help, unsupported-score fretboard explanation and desktop fretboard fitting. Phone fretboard retains readable horizontal scrolling.
- [x] Fixed missing host score-loading/error callback registration: changing scores clears old recording/alignment and updates library loading/error state.
- [x] 209 Node tests pass. Expanded browser checks cover close/reopen, resizing, score switching, embedded media, menu width/Escape and reload persistence; see UX review for browser evidence.
- [ ] Owner Chrome/PiP, touch divider and Fishman Realtime/Wait acceptance. TrueFire integration, media pitch shifting and grading changes remain deferred.

### Match Piano Trainer folder deletion — 2026-10-14

- [x] Single and bulk folder Delete now warn that contained saved scores will also be deleted, with their count, focused Cancel and Escape dismissal. Confirmed deletion removes folders and their contents atomically. This supersedes earlier move-to-Unfiled deletion behavior.
- [x] All 207 Node tests and changed-module syntax checks pass; regressions cover selected contents, other folders, Unfiled and invalid/system IDs.
- [ ] Owner checks Cancel/Escape and confirmed deletion with disposable folders/scores in Live Server. Browser dialog acceptance remains pending.

### Bulk library management — 2026-10-14

- [x] Add compact Manage/Done controls to both library panes, checkboxes, selection counts, Select All/Deselect All, bulk score move/delete and folder removal to Unfiled. Keep extra actions hidden during normal browsing and retain per-item menus.
- [x] Scores header groups the folder name and count on the left, with Add File(s) immediately before Manage on the right. Search uses a full row; header groups wrap at narrow widths.
- [x] Atomic database operations preserve unselected records and original score data. Full Node suite: 205 passing; changed-module syntax checks pass.
- [ ] Owner checks Manage at desktop/phone widths in Live Server, search/folder selection clearing, cancel/confirm dialogs, multi-score moves and folder removal. Browser visual acceptance remains pending.

### Chord placement fallback for scores without diagrams — 2026-10-14

- [x] Only scores with zero chord diagram shapes use Score Default temporarily. Display shows Score Default with the selector disabled and a short explanation; any score containing at least one diagram, including mixed name/diagram scores, uses the saved preference.
- [x] The automatic fallback never changes or saves the preferred placement. Saving other Display options retains it; loading a score with diagrams restores it. Native host and storage/UI regressions cover these transitions.
- [ ] Owner checks a name-only score followed by a mixed score in Live Server, including changing zoom and reloading the page. Score Default restores the source stylesheet exactly.

### Persistent chord-diagram placement — 2026-10-13

- [x] Added Display choices in order: Score Default, Above Chord, Top of Score, Off. Score Default restores each loaded score's embedded alphaTab placement; the other choices override alphaTab's native diagram placement/visibility settings.
- [x] Save the selection with Display preferences in localStorage and apply it after each score load. Chord names and score content remain native; no grading, MIDI, transport or deferred feature changes.
- [x] Regression coverage checks preference validation/round-trip and each native stylesheet override plus restoring a score's original settings.
- [ ] Owner visually checks all four choices on Guitar Pro and MusicXML scores in Live Server, confirms chord names remain useful with diagrams Off, reload persistence, and that score layout/playback still behave normally.

### Relink recovered local media to a saved sync profile — 2026-10-13

- [x] Selecting a saved profile, then choosing a renamed/recovered local recording, reuses the saved sync points and updates that profile's source details after validation.
- [x] Reject a selected profile from another score or source type. Validate saved measure/repeat references and recording duration before restoring; show errors without applying invalid alignment.
- [ ] Locally verify selecting an older profile, relinking a renamed/timestamp-changed copy of the same recording, and confirming the profile is automatically recognized on the next load.

### Scores library menu cleanup — 2026-10-13

- [x] Group Open File, Save to Library, Backup Library, and Import Library (Merge) at the top; keep Add File(s) as a multi-file import into the selected folder.
- [x] Replace the folder dropdown/inline Edit controls with folder navigation and per-folder/per-score three-dot action menus. Keep the compact current-score title and collapsed track controls; remove duplicate loaded-file, playback-status, and current-position readouts.
- [ ] Verify folder create/rename/remove, score rename/move/delete, multiple file import, backup merge, and current-score loaded badge in Live Server at desktop and phone widths. Confirm alphaTab still opens scores natively.

### Ignore duplicate held-note attacks — 2026-10-13

- [x] Suppress repeated Note-On messages for the same MIDI channel/pitch while it remains held. The release still reaches feedback; the next Note-On is a fresh attack. The captured E4 case showed a duplicate 27 ms after its first Note-On and no release until about 1.28 seconds later; the owner confirmed the note stayed held. Duplicate events do not leak into the next Wait/Realtime target or count as mistakes.
- [x] Keep the original onset when calculating captured hold duration; mark suppressed duplicates as `ignored-held-duplicate` in the optional MIDI report.
- [ ] Owner verifies held repeated pitches and deliberate retriggers after release with keyboard and Fishman in Poly and Hex, in Wait and Realtime. Normal guitar re-plucks should produce a release before the next Note-On.

### Cleaner tablature practice feedback — 2026-10-13

- [x] Removed blue expected outlines and historical green correct outlines from tablature; retained those states on standard notation. The tab visibility switch controls red error marks and green correct marks only on the active target. Historical correct tab frets stay unmarked. Marks are compact, translucent rounded rectangles without a solid border, preserving fret readability.
- [x] Added a narrower, lighter-blue cursor band with a horizontal fade on both edges, removed the narrow center fill and suppressed thin blue expected-note rings on the staff. The in-app legend describes cursor position separately from green correct and red error feedback. alphaTab cursor positioning, score rendering and grading behavior remain unchanged.
- [x] Automated tests cover active versus historical correct tab feedback, error marks, and unchanged notation feedback. JavaScript syntax checks and `git diff --check` pass.
- [ ] Owner checks clean/error chord feedback, retained mistakes, cursor visibility, zoom and narrow/wide layouts in Live Server/browser with Fishman Realtime and Wait. Then consider Poly inference improvements as a separate change.

### Synth playback pitch offset — 2026-10-13

- [x] Audio exposes a whole-semitone -12 to +12 offset for all alphaTab synthesized score tracks, with a reset-to-written-pitch action. The offset resets when a different score loads.
- [x] Native alphaTab live channel transposition is used. Written notation/tab and MIDI grading targets are unaffected. Automated host check confirms all tracks receive the offset without moving practice position or clearing results. Synth master volume applies to synth/metronome/count-in; separate Synced media volume controls recordings and YouTube.
- [ ] Owner checks synth/media volume and pitch audibly in Live Server/browser, including local media and YouTube, and confirms the Fishman Realtime/Wait workflow still behaves as expected. Score transposition by semitones/key remains deferred until notation, key signatures, guitar tab positions and expected practice pitches can be kept consistent. Media pitch shift is a separate feature; browser extensions may cover provider media that this app cannot process directly.

### Audio menu pitch-control cleanup — 2026-10-13

- [x] Tightened the Synth playback pitch group: semitone input and Reset stay together on one row when space permits, the live status is concise, and one static sentence explains its scope. This removes repeated wording without changing volume or pitch behavior.
- [ ] Owner reviews Audio menu spacing in Live Server on desktop and phone widths.

### Media & Sync listening/alignment — 2026-10-13

- [x] Local audio/video, direct media URLs, explicit YouTube loading and GP embedded audio using native external-media cursor/seek/sync points. Listening is separate from MIDI grading. Return retains original practice timing/position/results and paused Wait attempts; Wait remains silent.
- [x] Saved Above/Below/Left/Right layout, mouse/touch/keyboard divider, panel/editor visibility and local/direct-video PiP. Grouped Recording/Layout menu explains side-by-side and disabled YouTube floating.
- [x] Optional local waveform, zoom, measure/repeat/beat/time editing, marker drag, Undo/Redo, increasing-point validation and endpoint protection. Explicit Save retains edits.
- [x] IndexedDB per-score/per-recording profiles: picker, all-profile search/rename/confirmed-delete/KB size list, JSON export/import, library backup v2 with profiles and v1 score-backup compatibility. No recording bytes/waveform storage.
- [x] Narrow host compatibility fix for 1.8.4's recursive worker getter; immutable vendor files. Native transport/Wait-restoration and actual UI-wiring checks added; see MEDIA-SYNC.md for reproducible fixtures/evidence.
- [x] 200 Node tests, 17 native/storage browser checks and 15 app UI checks pass; generated WAV/video-with-audio and profile restoration checked. Owner screenshots establish YouTube loading/playback, not full alignment/hardware acceptance.
- [ ] Owner audible/Chrome/Fishman acceptance, actual recordings/GP backing tracks, YouTube restrictions and PiP. Graded stretched-media timing, TrueFire automation and desktop-player connections remain outside this increment. No Beta version/Git publishing change.

Supersedes the earlier Media & Sync placeholder/broad deferral below for listening and alignment only.

### Repository alphaTab updater — 2026-10-13

- [x] Optional `tools/alphatab` double-click launcher and PowerShell updater: choose latest stable or an exact version, verify official npm package SHA-512/version/assets, stage before replacement, retain ignored backups, and record asset hashes. No runtime updater/build dependency or Git publishing.
- [x] Real 1.8.4 package download verified in check-only mode using Windows PowerShell 5.1. Isolated fixture covers latest lookup, check-only, install/backup, invalid integrity, missing core module and failed-move rollback. Existing 189 regression tests pass.
- [ ] Owner runs the installer when ready, then accepts rendering/feedback, count-in, loops, tempo/metronome, Pause/Resume and Fishman Realtime/Wait locally before committing/pushing. Installed alphaTab remains 1.8.1; no actual upgrade or Guitar Trainer version bump in this tooling task.

### Fretboard first-use defaults — 2026-10-13

- [x] Show virtual fretboard defaults on; left-handed defaults off. Both retain existing validated localStorage persistence across sessions/score loads. Saved explicit choices override defaults, including fretboard off.
- [x] Defaults, malformed/empty storage and both saved true/false choices checked; 189 regression tests pass. Supersedes earlier default-off fretboard notes.

### Compact fretboard and relocated help — 2026-10-13

- [x] Neck panel contains only the neck and functional fret/string/note labels. Title, legend, explanations, track/capo details and out-of-range pitch messages are in Display → Fretboard help.
- [x] Reduced padding, string spacing and marker size. At 1280 × 720, six-string panel is about 170px and seven-string panel about 190px; neither scrolls vertically. Phone 390 × 844 seven-string panel also fits without vertical/page horizontal overflow.
- [x] Double inlays sit between strings 2–3 and 4–5 on six strings; other counts use symmetric available string gaps. Capo-aware physical frets and left-handed reflection retained.
- [x] 189 regression tests pass; 56 real-DOM scenarios rerun at laptop and phone sizes, including corrected inlays. Native help, Wait targets, panel fit and phone mirroring checked. Owner appearance acceptance pending.


### Score-defined fretboard — 2026-10-13

- [x] Narrowing fret spaces, nut, capo-aware inlays, variable string thickness, target note names, separate held-note rings and complete left-handed mirroring.
- [x] Selected tablature defines string count/tuning. Non-six-string Hex input explicitly uses possible pitch positions; grading/hardware mapping unchanged.
- [x] 188 regression tests pass; native GP import/track switching verified for 1/4/5/6/7/8/12 strings. 56 browser scenarios pass at desktop/phone widths. Reproducible tabs included; see FRETBOARD.md.
- [ ] Owner Fishman, appearance/orientation and real extended-range/bass tab acceptance.
- [ ] Discussed follow-up: note-name/fret-number/off marker labels and optional conservative Poly position inference. No new inference/label controls in this pass.


### Display cleanup and persistence — 2026-10-13

- [x] Shorter auto-scroll label, tighter sections, indented left-handed checkbox disabled while fretboard hidden (choice retained), collapsed Fretboard help.
- [x] Save zoom, auto-scroll, fullscreen-on-Play, visible-track view, fretboard visibility and left-handed orientation across sessions/score loads. First-use defaults unchanged. Native score loading preserves chosen view; fullscreen still requires Play.
- [x] 175 tests pass; Live Server reload/native score reopening, orientation availability, help and laptop/phone layouts verified. Owner fullscreen/orientation acceptance remains local.

- [x] Audio Master volume (%) label stays on one line with a content-sized desktop label column and existing phone stacking; Live Server desktop/phone checked, 2026-10-13.

### Compact Practice menu — 2026-10-13

- [x] Hide Wait chord controls in Realtime, retaining saved choices/window when returning to Wait. Shorter radio descriptions and collapsed Chord timing help replace long permanent explanations.
- [x] Tighter Practice section spacing retains 44px controls. 172 tests pass; Live Server verified mode round trips, window gating, help disclosure and laptop/phone layout. At 1280 × 720, Realtime feedback choices/help are visible without scrolling; the final results action still needs slight scrolling.

### Persistent Practice preferences — 2026-10-13

- [x] All four Score feedback options default checked, with independent saved true/false choices, including Poly estimates. Estimates remain conservative visual guidance.
- [x] Remember Practice mode across sessions/score loads; Realtime on first use. Remember Wait chord choice and window; One at a time/200 ms on first use.
- [x] Validated localStorage preferences restore before UI/native startup. 172 tests pass; Live Server verified defaults, reload, fresh tab and score-load retention. Supersedes earlier default-off Poly/session-only feedback notes.

### Practice menu composition follow-up — 2026-10-13

- [x] Track selector first/full width; mode above Wait chord choices, with window beside chords on wider screens and stacked on phones. Unavailable chord-window label/help dims with its existing disabled input.
- [x] Direct, indented Poly estimate checkbox below Incorrect fret numbers, short dependency help and fuller explanation in the existing feedback disclosure. Feedback stays vertical and independently controlled; estimates default off.
- [x] 169 tests pass; Live Server chord gating and desktop/phone/tablet layout verified. Owner appearance/touch review remains local.

### Practice/Display, Audio and score library — 2026-10-13

- [x] Shorter feedback/track labels; occasional timing/Poly/help controls in disclosures. Independent feedback switches and native Display/fretboard behavior retained. Chord-window edits commit on Enter/blur without repeating unchanged pause/reset intents.
- [x] Saved master volume includes native playback, Wait metronome and count-in. Native track volume/mute follows practice/backing switches and groups shared MIDI channels; track settings reset on score load. Mixer edits leave grading/transport state intact.
- [x] IndexedDB scores/folders: save, bulk import, open/search, rename/move/delete, folder create/rename/remove, JSON backup and validated atomic merge with content deduplication. Removing folders keeps scores. Original bytes pass unchanged to alphaTab.
- [x] 169 regression tests and 12 real-browser IndexedDB checks pass. Live Server checked two-track MusicXML, save/reopen after reload, folder creation, rename/move/search, actual backup download/reimport, audio and native Display controls. See SCORE-LIBRARY.md for workflows/storage boundaries.
- [x] Phone/tablet/desktop layouts checked without horizontal overflow; bulk import and invalid-version backup handling verified. Library removals use explicit in-page confirmations with Cancel focused.
- [ ] Owner listening/Fishman/tablet acceptance, real GP/MXL save/reopen, fullscreen and storage quota behavior. Keep the same browser/address/port and make backups.

Supersedes older audio/library placeholders below. Grading, deferred pitch/media/exercise features, Piano Trainer, version metadata and Git publishing remain outside this update.

### TriplePlay Wait diagnostic recording — 2026-10-12

- [x] Opt-in MIDI/feedback recording in Settings with screenshot markers, selectable text, clipboard fallback and .txt download; no grading or spacing changes. 166 automated tests pass; browser controls checked.
- [x] Owner observed brief ghost notes in Fishman's own app, particularly with thumbnail playing, and reports moving Play Style toward Finger fixed things overall. Retain opt-in diagnostics for future issues; no app-side filtering added. TriplePlay Realtime remains untested.

### Historical fret placement — 2026-10-12

- [x] Small left-only nudge: retained red fret numbers move 2 scaled pixels closer to their tab outlines; live numbers and vertical string alignment stay unchanged. 162 automated tests pass.
- [x] Owner confirmed the spacing is fixed. Additional zoom acceptance remains pending. No layout padding or collision omission added.

Updated 2026-10-11. This is the central status and priority list. Stage files retain implementation details and checks; DEV-NOTES records decisions. Proposed items below are recommendations, not implemented changes. The next implementation stage should be scoped from this ordered list.

## Current workflow and specification — 2026-10-11

### Menu follow-up — implemented 2026-10-11

- [x] Follow-up: desktop toolbar uses 36px buttons even when a secondary touchscreen is present; only a coarse primary pointer selects 44px. Display mode and MIDI input source are visible radio groups with existing readiness/availability behavior.

- [x] Smaller 14px toolbar text, retaining responsive collapse/stack thresholds and 44px coarse-pointer targets. Owner confirmed the preceding collapse behavior.
- [x] Visible Practice mode and **Wait Mode Chords** radio choices, Wait-only chord gating, shorter help and compact spacing. Small screens still scroll.
- [x] Display: native zoom slider/numeric entry/±5 buttons (50–200%), auto-scroll and fullscreen on starting/resuming a ready player's Play gesture. Preferences remain session-only.
- [x] Reverse Hex counts **downward from the selected lowest-string base**, with bases 6–16; forward bases remain 1–11. Invalid bases clamp when switching direction. Channel sequence is explicit, active notes/results clear on input-setting changes, and grading stays pitch-only.
- [x] 162 tests pass, including radio gating, native scale/scroll, zoom editing and reversed Hex routing/releases. Browser preview verifies controls and phone fit. Loaded-score zoom/scroll/fullscreen and physical Fishman direction remain local acceptance.

### Menu organization and Piano toolbar — implemented 2026-10-11

- [x] Compact shared-menu composition replaces oversized headings/cards and stretched file/fretboard controls. Toolbar follows Piano's 1060px Tempo/Loop collapse, 960px score-percentage hiding and 620px stacking; coarse-pointer buttons retain 44px height. Popups follow measured toolbar height.
- [x] Practice contains Realtime/Wait, practice track, existing timing/chord controls, independent Staff/tab highlight/fret-number controls and default-off Poly inference. Small **Clear practice results** retains the existing current-position attempt action; no grading/transport change.
- [x] Live trainer status, expected/detected notes and mistake history moved to collapsed Settings MIDI/practice diagnostics. Display owns practice-only/all-track visibility and the existing six-string/left-handed fretboard. Audio owns existing selected/backing-track playback toggles; Wait accompaniment stays paused.
- [x] Scores keeps working Open File, compact metadata and expandable track list. Library/folder/backup controls, Audio volume/mixer/output, Pitch & Transpose and Media & Sync are explicitly **Not implemented yet**. Help now provides a basic guitar-specific quick start.
- [x] 160 regression tests and toolbar syntax check pass. Browser smoke checks cover menu movement, tablet collapse, phone stacking, diagnostics disclosure and Media shortcut; no horizontal overflow in checked layouts. Physical Fishman/tablet and loaded-score playback acceptance remain local.
- [x] Audio mixer/master volume and IndexedDB score/folder library with JSON backups implemented 2026-10-13. The earlier layout pass itself added no persistence.
- [ ] Later: define playback-only semitone offset versus coordinated practice pitch offset versus full key/semitone score transpose. Do not present audio-only shift as capo/down-tuning grading support.
- [ ] Later: Media & Sync for local audio/video and supported online providers, score/media-specific saved sync profiles, export/import and inclusion in library backups. Media files are separate from settings; backing-media/synth mixing and Wait behavior need focused validation.
- [ ] Later: custom fretboard automatically follows score string count/tuning (bass/7-string); separately scope positional MIDI mapping. Future dots/exercise overlays stay display-only. No Follow or virtual piano addition in the guitar menu plan.

This entry supersedes older menu-placement recommendations; dated descriptions of **New attempt here** refer to the unchanged action now labeled **Clear practice results**.

### Loop menu refinement — implemented 2026-10-11

- [x] Loop stays highlighted while enabled, including its More shortcut and a narrow-screen More marker. Dragging shows a three-second nonblocking notice only when it enables looping; later enabled drags stay silent. Follow-up validation: 160 tests pass; browser verified measures 2–3 activation, silent 3–4 adjustment, notice expiry, tablet More indicator and disable cleanup. Owner normal-browser acceptance remains pending.
- [x] Compact Piano-style Looper uses shared menu CSS, linked measure sliders/number fields, and horizontal arrows stepping by one. Crossing an endpoint moves the other; edits apply immediately and retain the existing pause/reset rule.
- [x] Enable Loop and Loop Count-in default off on page/score load, session-only. Loop Count-in is disabled/grayed when looping is off. Numbers remain playback-order positions, including repeated occurrences; repeated scores show written-measure/occurrence context.
- [x] Play/resume starts with a one-bar native-sound click pre-roll in both modes. Checked Loop Count-in inserts a pre-roll on each pass; unchecked loops repeat directly. Wait score playback remains paused and its independent metronome is suspended only for the pre-roll. Pauses, Reset, range/mode changes and score loading cancel pending pre-roll; note acceptance waits until completion. Resumed Together windows exclude pre-roll time.
- [x] Native alphaTab mouse drag selection expands to whole measures, updates the menu and enables looping. Single clicks retain the enabled loop; out-of-range seeks return to its start. Realtime playback uses native tick ranges/continuous looping, with explicit finish/pre-roll/restart only for repeat count-in.
- [x] Passive gray SVG shading uses native bounds outside selected written measures, redraws after layout changes, and disappears with looping off/full-song selection. A repeated written measure stays unshaded if any selected occurrence uses it. No custom score hit testing, MIDI output or grading-formula changes.
- [x] 159 automated tests and syntax checks; browser checks loaded Four On Six, selected measures 2–3 by native dragging, confined an outside click to 1,200ms, exercised count-in/cancellation, and checked 1280-wide, 768 × 1024 and 390 × 844 layouts without horizontal overflow. Touch arrows are 44 × 44, ranges 44px high.
- [ ] Owner listening/Fishman/tablet acceptance: count-in to first-note timing, repeated short loops with count-in on/off in both modes, Pause/Reset during pre-roll, and shade alignment through zoom/track changes. No version/Git publishing changes.

### Tempo menu refinement — implemented 2026-10-11

- [x] Compact Piano-style Tempo layout: editable BPM, linked speed slider/number box, and reset. Native speed range remains 25–200%; source tempo map is preserved. Realtime BPM shows effective tempo at the current position; missing initial tempo falls back to native 120 BPM.
- [x] Side-by-side five-step buttons for BPM, speed and volume; up from 103 goes to 105 then 110, down to 100 then 95. Direct entries can remain off-grid. Edited numbers commit on change, Enter or blur.
- [x] Piano-style Tempo refinement supersedes the tall stacked-arrow touch layout: horizontal arrows, compact aligned rows, plain number boxes, 24px slider thumbs (28px on touch) and 44px interaction height. Shared menu-controls.css owns menu spacing/control settings for all popup shells and reusable row/number/option classes. Existing menus inherit common spacing; migrate their composition as each is refined. Touch arrows remain 44 × 44. Physical tablet dragging/tapping remains owner acceptance.
- [x] Native Sonivox metronome, linked volume controls, and functional Tempo-button visual pulse. Defaults: metronome off, volume 75% (saved volume overrides default), visual pulse checked. Volume/visual controls gray out with metronome off. Accented downbeat is a disabled, explicitly labeled placeholder. MIDI Out click is omitted.
- [x] Latest owner clarification: Wait metronome is independent of cursor/user pace. It runs at the selected BPM while Wait is active, stops on Pause/Reset/completion, and does not restart for solved notes or loop passes. Entering Wait latches the source tempo at that position; later score tempo changes do not change its rate. BPM/speed edits in Wait adjust the click without pausing/resetting results; Realtime retains its existing pause/reset behavior. Accompaniment remains paused in Wait.
- [x] Metronome volume persists in localStorage; other metronome preferences remain session-only. No output routing, grading changes, or version bump.
- [x] 152 automated tests pass after the timing/restart fix: native Sonivox click rendering, repeated Wait restarts, audio-clock/visual alignment calculations, cancellation and saved volume. Actual GP3 browser smoke checks verified 200 BPM, pulse in both modes, Wait restart and volume retention. Earlier desktop/390px layout checks remain applicable.
- [ ] Separately scope Realtime speaker/input latency calibration: current grading has manual input compensation but does not automatically account for speaker output latency. Grading unchanged in this task.
- [ ] Owner listening/Fishman checks: native click tone/volume and beat alignment; continue solving Wait targets across tempo changes/loops at a steady click; change BPM while retaining errors/partial chords; verify Pause/Resume, Reset, completion, and new-score loading.

The current baseline is **Beta v0.0.3**; `version.json` records `0.0.3`. The owner approved this checkpoint after the Tempo/metronome update and will create the `v0.0.3` tag after committing the metadata/documentation update. Earlier tags, including `v0.0.2`, remain unchanged. This version update changes no runtime behavior and does not establish full browser/Fishman acceptance.

Read root README.md and AGENTS.md when starting a task. Work directly in this folder, preserve VS Code Live Server and the owner's normal browser/Fishman Connect testing, and leave commits/tags/pushes/deployment to the owner unless requested. Documentation carries durable decisions between chats; full chat history is not assumed to be available. Earlier ChatGPT history is in **Guitar Trainer** if accessible.

Current feedback uses one Staff control, independent tab error highlights/fret numbers, and saved conservative Poly inference. Hex numbers require configured channels and valid score interpretation, not a mandatory setup/verification button. Poly numeric inference is implemented for an unambiguous remaining written note; it is not physical string detection or strict-position grading. Both Hex and inferred Poly numbers are plain red numbers with translucent backing, native tab font size, and side placement; no tilde, numeric border, pointer, or custom staff spacing. Accepted tones retain green notation feedback; tab itself shows red error marks only. Genuine wrong-pitch history is retained.

This summary and the latest user instructions override older dated entries below. Those entries and stage documents preserve historical ZIP instructions, control labels, whole-chord error rules, and earlier inference limitations; do not treat them as current requirements. The latest agreed Wait feedback table remains applicable with these clarifications.

- [x] Document direct local editing and standing agent instructions; align version metadata with the existing beta baseline.
- [x] Baseline verification: 142 tests pass; all 23 application JavaScript modules pass syntax checks.
- [ ] Complete browser/Fishman acceptance for Realtime retention, chord timing, releases, channel identity, loops/seeks, and visual layout. Existing user confirmations are narrower than full acceptance.

## Dated feedback implementation history

## Plain inferred fret numbers — 2026-10-10

User's screenshot showed dashed numeric badges resembling extra scored frets. Removed the inferred-number badge border. Both Hex and inferred Poly feedback now use plain red numbers with the existing translucent backing, native tab font size and side placement. No tilde or numeric badge outline is drawn. The inference checkbox/help/status and SVG title retain the distinction; expected-note highlights are separate from the numeric feedback and unchanged. This supersedes the dashed-badge presentation in the preceding font update.

142 tests pass after applying the changed-files ZIP. Locally verify live and retained inferred numbers appear without borders while expected-note highlights still follow their separate switch. Inference, scoring, releases, native layout and transport are unchanged. Apply after the fret-font update; no version/tag change or deferred/Piano Trainer work.

## Fret feedback size and compact inferred numbers — 2026-10-10

User requested larger Hex/Poly fret numbers closer to the expected on-score frets and questioned the wide tilde prefix. Feedback now uses alphaTab's configured tablature font size (14px by default, previously 12px), scaled with the score, for both live and retained Hex/Poly numbers. Badge height/width follow the selected font and full digit count; custom native font sizes are supported. Native score layout and original fret glyphs are unchanged.

Removed the **~** prefix from inferred Poly numbers. Their translucent badge has a dashed red border, and its tooltip identifies the estimated fret on the expected string. Hex badges keep their existing borderless appearance. Updated help/status text explains the distinction. The inference checkbox, attribution, scoring and release/history rules are unchanged.

142 tests pass, including default and custom tab font sizes, three score scales, compact inferred double-digit width, host rendering without a prefix, and prior live/retained inference/Hex checks. Browser/physical MIDI acceptance remains local. Apply the changed-files ZIP after the Visual Feedback/fret-number update. Locally compare feedback size against written frets at normal zoom and test dense chords, double digits, resize/zoom and dashed inferred badges. No version/tag bump or deferred/Piano Trainer work.

## Unified Staff control and actual inferred fret numbers — 2026-10-10

User requested a single Piano Trainer-style Staff checkbox and reported that inference never displayed a fret number. The prior Poly increment implemented only inferred target highlights; it did not render numeric fret estimates. This increment supplies those numbers and supersedes the earlier no-Poly-fret-detail limitation.

Display's Viewer card is now **Visual Feedback**. Staff and Tabs are separated with a divider. The single **Staff: Highlight correct / incorrect notes** control replaces all three notation options and controls target colors/current guidance plus live and retained wrong-pitch noteheads together. Removed the two obsolete UI/state switches and their filtering. Practice's textual mistake review stays available independently of visual visibility. Tab labels are now **Tabs: Highlight correct / incorrect notes**, **Tabs: Show incorrect fret numbers**, and **Tabs: Infer incorrect frets for non-hex pickups**. The last option defaults off, retains its conservative display-only attribution, and does not enable string grading.

`buildPolyWrongFretMarks` in poly-feedback.js derives an estimated fret from a genuine received-wrong MIDI pitch and the uniquely associated expected note's scored string/tuning/capo/transposition. It builds temporary projected records only, reusing tab-feedback's existing score validation, latest-per-string policy and native side placement. It never attaches an invented detected string to actual MIDI/history. Numeric estimates are prefixed with **~** (for example **~12**) and titled as inferred on the expected string. Geometry allows room for the prefix and full digits. Live estimates disappear on release and retained estimates remain after target completion; Wait and Realtime are supported. The fret-number and inference switches must both be on for Poly numbers. Staff and tab-circle visibility remain independent.

Single-note targets work because their sole pending written note is eligible immediately. Chords work when all but one required written note have already been accepted at the wrong attack. Multiple remaining notes, duplicate written unisons, wrong-first ambiguous chord attacks, unavailable/inconsistent score positions and inferred frets outside 0–36 remain omitted. There is still no nearest-pitch assignment or retrospective guessing. All actual pitch history and scoring survive toggling; Realtime accepted tones remain green, and corrected Wait errors can retain their existing optional inferred summary.

142 tests pass, including actual single-note/chord sessions to native fret geometry across four tab profiles and three scales, ~12 width/rendering, live release and retained estimates in both modes, invalid score mapping/ambiguity/repeat suppression, host visibility with Staff/circles off, and all prior Hex/scoring/transport checks. Browser/physical MIDI acceptance remains local. Apply this changed-files ZIP after the previous Poly update. Locally verify the new labels/grouping, toggle the single Staff control, then enable both tab fret switches and test one wrong single note and a chord with one correct tone before a wrong tone. Confirm ~ numbers disappear on release, return as retained history after correction, and remain hidden in ambiguous chord cases. No version/tag bump, deferred features or Piano Trainer edits.

## Poly correct-tone feedback and optional inference — 2026-10-10

User approved implementing confirmed-green Poly feedback and placing **Infer Poly mistake positions** with the Display feedback options. This supersedes all earlier whole-chord-red Poly summaries. Correct Poly pitches stay green on notation and their corresponding written tab frets by default, including completed Wait chords. Actual received wrong pitches remain in live/retained notation history and Practice review; no scoring or transport rule changes.

Inference defaults off and is a display-only preference for the page session. `poly-feedback.js` captures a candidate only when exactly one unhit/unmissed slot with exactly one written note ID remains at the wrong attack. Sessions attach `inferredNoteIds` to genuine wrong-pitch records irrespective of visibility, so toggling can review the same stored evidence without rescoring. Multiple pending pitches, duplicate written unisons, duplicate required attacks and out-of-window inputs do not invent an association. This is a remaining-note hypothesis, not proof of intended pitch or physical string. A wrong attack arriving before the other correct tones remains unassigned; later corrections do not retrospectively guess its intent.

When enabled, only the associated written note/fret gets an inferred red overlay. Live markers release independently. Wait preserves that one note's inferred error summary after completion, with clean tones green. Realtime accepted notes always stay green; pending/missing notes can carry an inferred red overlay, while ordinary misses still turn red after their deadline without requiring inference. Ambiguous cases retain actual pitch history but no guessed target circles. Tab inferred circles are dashed and SVG titles identify inference; notation uses existing filled target feedback. This increment does not derive guessed Poly wrong-fret numbers. Existing notation master and tab-circle switches independently hide their category; live/history notation switches still govern actual played-pitch noteheads, not target colors.

Validation: 139 tests pass, including unique/ambiguous attribution, release, repeats, default-off/toggle invariance, duplicate/unison handling, Wait Pause/new attempt, Realtime correction/miss behavior, host redraw/visibility, and native overlay geometry across five profiles and three scales. Hex per-string feedback remains covered. Browser/physical MIDI acceptance remains local. Apply this changed-files ZIP after the chord-feedback update. Test a dyad with correct first tone then wrong second tone, release/correction with inference off/on, wrong-first ambiguous input, a three-tone chord with several pending pitches, Realtime deadlines, and Pause/Resume. No version/tag bump, deferred features, Piano Trainer changes or menu restructuring.

## Hex chord completion by detected string — 2026-10-10

User confirmed live circles work and clarified completed chord behavior: a clean lower tone must remain green when the higher tone had mistakes. This supersedes earlier whole-chord-red rules for configured Hex input. Wait now retains each slot's written string and publishes completed error colors only for slots whose string has a received-wrong-pitch record. Realtime tab summaries use the same per-string rule; Realtime standard notation retains its existing hit/missed colors. Unknown/invalid Hex string metadata keeps the conservative whole-target summary. Poly now preserves accepted green tones, with optional single-remaining-note inference as specified above. Errors on a detected string absent from the written target retain history/fret detail without accusing clean written tones. This is display attribution, not strict-position grading or an inferred intended pitch.

The measure 83 case was tested using both correct pitches on MIDI channel 4 in Wait and Realtime. Both are accepted, remain green, produce 100% accuracy and zero wrong-fret labels. This passed even against the previous version: there is no channel-mismatch rejection to remove. The supplied screenshot's retained fret 17 therefore cannot be explained by those two correct attacks alone; the original score/MIDI sequence is needed if it recurs. Do not erase genuine earlier wrong-pitch history just because all required tones were eventually satisfied. No special completion exception or scoring change was added.

131 tests pass. New regressions exercise measure 85's Bb dyad and measure 83's D dyad through normalized MIDI, Wait controller publication and Realtime finalization; three chord regressions fail against the prior update. Native tab geometry now verifies two green tones plus one red completed-error tone across four profiles and three scales. Browser/physical MIDI acceptance remains local. Apply this changed-files ZIP after the live-circles update. No version/tag bump, menu restructuring, deferred features or Piano Trainer changes.

## Earlier feedback update (superseded control labels and inference limits)

Live Hex wrong-pitch circles now appear immediately around pending expected frets on the detected string in Wait and Realtime. Accepted partial chord tones remain green. Release restores pending guidance; Hex completion retains red only on strings with recorded wrong pitches, while Poly accepted tones remain green by default; optional unambiguous inference is described above. A detected string absent from the written target gets no guessed expected-fret circle. Physical Poly string detection and guessed fret-number detail remain deferred; optional remaining-note inference is implemented above. Circles work with fret details hidden and are independent of notation options.

The notation switches were overlapping master/detail controls, not duplicate functions: **Show all notation feedback** controls expected colors plus live/history noteheads; **Notation: show held wrong pitches** and **Notation: show completed mistake history** filter only their respective noteheads within that master. Labels/help now explain this. Hiding completed history retains expected target colors and tab feedback; hiding all notation hides both. The Practice menu stays unchanged.

139 tests pass. Local acceptance: hold/release wrong Hex notes on pending chord strings, retain green accepted tones, solve with errors, test multiple independent releases, and toggle notation/circles/frets separately in both modes. Physical MIDI/browser acceptance remains pending.

## Current status

- [x] Stage 1: foundation and MIDI normalization fixes.
- [x] Stage 2: occurrence-aware score/playback mapping.
- [x] Stage 3: Realtime attack matching and results.
- [x] Stage 4: Wait Mode, corrected to immediate silent stepping.
- [x] Stage 5: playback speed and occurrence-aware section loops implemented; user confirmed loop and tempo work locally.
- [x] Stage 6: notation outlines and six-string fretboard display implemented; user confirmed blue/green feedback with a MIDI piano. Other visual/hardware checks remain pending.
- [x] Stage 7: Wait chord matching options implemented, with configurable Together window; awaiting local validation.
- [x] Stage 8 first increments: Pause/Resume and completion-summary retention, occurrence/pass-aware Wait wrong-pitch history, red completed-target summaries, live/retained wrong-pitch feedback and visibility options; 124 tests pass. Wrong-pitch notation now uses staff-positioned red noteheads with key-aware explicit accidentals; expected notation feedback uses filled noteheads while tab keeps outlines. New attempt here is available in both modes. Realtime Pause protection now follows the Pause action rather than a predicted beat and ignores queued non-seek rollback while paused; local acceptance remains required. Live and retained Hex fret feedback for Wait/Realtime, configured Hex channel feedback and the tab display switch are implemented; physical MIDI/side-layout acceptance remains pending (STAGE-8-TAB.md).
- [x] User confirmed repeat playback works.
- [x] User confirmed corrected Wait Mode works with their local setup.
- [x] User confirmed both hex and poly MIDI modes work with their setup.
- [x] User confirmed Realtime green/correct and red/missed feedback works locally.
- [ ] Finish broader verification of timing, pause/seek/mode switching, per-string identity, and Together chord cases. Implementation tests do not prove every hardware/browser case.

- [x] Notation feedback correction: all live/retained wrong pitches stay in their own target’s horizontal cursor column, even when they overlap vertically. No sideways collision spreading; user confirmed the corrected alignment works.

## Stage 8 progress against the agreed feedback specification

Implemented: unchanged-position native seek retention and native Pause beat-start snap retention through Pause/Resume; final Realtime summary through automatic completion rewind; Wait wrong-pitch history through solving/retries/pause; red completed target outlines versus clean green; independent live releases; standard-notation red wrong-pitch noteheads at their played staff positions, key-aware explicit accidentals and ledger lines; filled expected-notehead feedback; history visibility and previous-pass review with fresh pass scores. Scoring formulas remain unchanged; duplicate required-pitch penalties remain distinct from received-wrong pitch history.

Implemented latest increments: larger live numbers remain visible regardless of crowding/digit count; retain only the last wrong fret per detected string/target beside its string, without pointers or custom staff spacing. Wait and Realtime are supported. Active wrong pitches now also circle pending expected frets on their detected Hex strings in red, preserving accepted green tones and releasing independently. The user rejected the mandatory string-check button: it and its feedback gate are removed. Selecting Hex and the correct base channel enables numbers immediately; **Show tab feedback (frets)** controls numbers and **Show tab feedback (circles)** controls outlines independently. No calibration or verification state is required. Tuning/capo/transposition validation remains; Poly inference and future strict-string grading are separate. The latest side-placement and active-circle decisions supersede earlier above-tab/pointer/verification requirements in historical notes.

## Ordered next priorities

1. **Validate score retention around Pause/resume.** The reported Realtime reset was reproduced through the full alphaTab API Pause handler and fixed (94 automated tests pass); user confirmed Wait retention, while this Realtime follow-up still needs local acceptance. Preserve results and feedback on Pause and ordinary Resume. Practice → **New attempt here** clears the percentage, outlines, and Wait history/partial chord without moving the cursor or changing running/paused state; targets before the current position are excluded from the new attempt. Clear when Reset/restart, a new score, or this explicitly new attempt starts; replay after completion starts a new attempt. Do not reset on every Play click, because Play also resumes. Investigate native seek/state notifications before assigning a cause. Keep the existing fresh score per loop pass for now; retaining the previous pass summary is a separate enhancement.
2. **Retain Wait mistake history, with different notation and tab displays.** Eventually solving a target must not erase earlier incorrect attempts. On tablature, circle the completed target red if any wrong pitch was attempted while that target was active; use green only for completion without wrong pitches. Red replaces green at an error target: do not stack both colors or draw every historical wrong pitch on tab lines. This must communicate mistakes even when standard notation is hidden. For unknown Hex strings use one target-level error outcome. Poly keeps confirmed correct tones green and shows received wrong pitches separately, with optional single-remaining-note inference. Configured Hex summaries now mark only expected tones on strings with recorded wrong pitches, preserving clean tones green without guessing intended replacement pitches. On standard notation, show the actual wrong pitches in red while held, hide those live markers on release, and show retained wrong-pitch history at the corresponding target position once the target is completed. Offer feedback visibility options. Implement reliable history and tab error markers first, then actual wrong-pitch notation where placement is reliable. Separate repeated occurrences and loop passes in the history. Keep Together timeouts/retries distinct from wrong pitches, and keep scoring rules explicit rather than silently changing the percentage formula.
3. **Validate hardware/transport and define tracking tolerance.** Hex/poly basic operation is confirmed; validate every string's channel identity, Together strums/latency, pause/resume, seeks, repeats, loop boundaries, resizing, and note release. Cover the reported score reset and Wait-history scenarios as they are fixed. For audio-to-MIDI input, distinguish received wrong pitches from expected pitches not received; do not pretend MIDI alone can establish whether a missing pitch was a playing error or a tracking omission. Test dense/classical chords, overlapping notes, repeated attacks, and duplicate pitches. Consider an explicit, adjustable tracking-tolerance profile after tests, without silently accepting missing chord tones or weakening every user's grading. Existing Collect/Together settings already provide chord accumulation/window options.
4. **Refine menus and feedback layout against Piano Trainer Studio.** Preserve the deferred Tempo/Loop refinement below. Capture the user's actual menu logic and examples before copying controls. Keep notation readable and tab fret numbers unobscured. Instrument-specific controls should appear only for the relevant instrument if a unified app is later chosen.
5. **Persist useful preferences and guitar profiles.** MIDI device/channel block, channel order, latency, chord mode/window, and display preferences are candidates; validate saved settings against the current device/score. Do not restore stale grading as a new attempt. Score library improvements remain a separate follow-up.
6. **Validate reversed Hex mapping; scope exact-string grading separately.** Reverse order now counts downward from the lowest-string base (6–16), following the owner's latest instruction. Forward channel-1 remains default. A string-by-string hardware/display check should confirm direction. Fretboard mirroring is separate. Exact-string grading remains deferred and requires verified mapping.
7. **Evaluate a piano alphaTab prototype before a rewrite or merger.** Keep the current OSMD piano application working. Test a separate small prototype against representative piano MusicXML: two staves, hand selection, dense chords/voices, repeats/endings, ties, pedal behavior, and stable feedback positioning through resize/zoom. Compare actual results with the current piano app. Only then decide whether migration and a shared instrument-selector app are worthwhile; hide hand/LED/MIDI-output controls by instrument where appropriate. MIDI input channels and score staves are separate concepts: two piano staves need not require two keyboard input channels.

Recommended next stage: priorities 1–2, with focused validation from priority 3. Notation-first visual refinement is implemented in STAGE-8-NOTATION.md; validate it before adding Hex tab detail. The later items are ordered follow-ups, not a commitment to implement them all in one stage.

## Latest agreed Wait feedback specification

This specification includes the user's final clarification and overrides earlier tab mockups/inference proposals for the default feedback flow. Stage 8 implements the history/summary and notation feedback increments documented above; notation noteheads/accidentals are implemented; configured-Hex live/retained fret labels are implemented in both modes; physical MIDI and retained-lane layout acceptance remain pending.

| Moment/view | Planned behavior |
| --- | --- |
| Active target | Keep original expected frets readable. Configured Hex wrong pitches held on pending written strings receive a compact red translucent mark at that fret; accepted partial chord tones retain their notation feedback without tab outlines. Release removes the live error mark. No expected fret on the detected string means no invented mark. Poly does not identify physical strings. Optional remaining-note inference can mark a pending expected note/fret red without claiming string detection. |
| Wrong note held, configured Hex | Show one latest active red detected fret per string beside the expected fret, with a translucent background. Use the native tablature font size (14px by default) at normal zoom; keep full digits visible even when crowded; no live pointer; for example, expected B-string fret 1, detected fret 2. Never replace the written 1. Derive fret only when configured channel/string, tuning/capo/transposition, and pitch interpretation are valid. |
| Wrong note released, configured Hex | Remove its temporary wrong-fret marker. Keep the internal error record. Multiple held notes require independent release handling. |
| Wrong note, Poly/unverified mapping | Do not display a guessed fret as confirmed. Poly retains green accepted tones and actual received-pitch notation history. Optional inference marks only the sole remaining written note captured at a wrong attack; ambiguous cases stay unassigned. Unknown Hex string metadata retains its target-level summary. |
| Target completed, tab | Remove temporary wrong-fret markers; show compact red marks only for target notes with wrong-pitch history. Clean tones have no tab outline. Unknown Hex string errors keep the whole-target red summary. Poly accepted tones stay green on notation; when inference is enabled, only uniquely associated wrong-note targets retain red in Wait. Red means completed after errors, not that the target was never solved. Retain only the last wrong fret per detected string beside that string, without pointers. Do not accumulate all attempts. |
| Wrong note held/released, standard notation | Show its actual pitch in red while held; hide that live marker on release. |
| Target completed, standard notation | Show the retained wrong-pitch history at that target's score position for later review. Keep this independent of the compact tab summary and feedback visibility settings. |

For ambiguous Poly chord errors keep confirmed green tones and show actual wrong-pitch history, without assigning a guessed red target. Unknown Hex string errors retain target-level summaries. Configured Hex uses detected-string history for per-string completed colors. Hex live markers identify the detected string, not necessarily the intended target string. These rules describe pitch grading; wrong-position feedback for future strict string grading must be separately defined. Pending/missing notes and Together retries are not wrong-pitch attempts. Keep history occurrence/pass-aware and preserve it on Pause/Resume under priority 1. History/tab summaries and actual wrong-note staff placement are implemented. The user confirmed notation placement and approved testing retained fret lanes. Validate both modes using STAGE-8-TAB.md.

## Starting a new development chat

Start a new chat in this same local project for each major task; keep implementation and follow-up testing for that task together. Read AGENTS.md, README.md, TODO.md for current priorities/specification, DEV-NOTES.md for decisions, ARCHITECTURE.md for boundaries, and relevant stage notes. Check Git status and inspect current source before editing. Edit this folder directly; ZIP exchanges are no longer required. Keep one coding chat actively editing the shared folder at a time.

Current source, the latest specification, and user confirmations govern status; pending proposals must not be reported as already implemented. Store decisions and validation results in the relevant documentation so future chats can recover context without relying on full transcripts. Unresolved choices such as Follow semantics, harmony rules, exact-string behavior, scoring formula changes, and unsupported notation layouts require a focused scope rather than assumptions.

Suggested prompt:

> Read AGENTS.md and the project documentation, check Git status, and continue with: [task description]. Edit this project directly, preserve the UI, native alphaTab behavior, and Live Server/browser WebMIDI workflow. Follow the latest agreed feedback specification, run appropriate checks, update relevant documentation, and explain what I should test locally. Provide a suggested commit description; leave commits, tags, pushes, and deployment to me. Keep deferred features and Piano Trainer changes outside this task.

## Screenshot clarification and core release checks

Reviewed all 13 supplied screenshots in filename order on 2026-10-10 (2026-10-09 234820 through 2026-10-10 000637). They provide direct excerpts beyond the earlier conversation-search summaries; the 000005 screenshot is the project sidebar, not an additional feature request. Earlier assistant recommendations are proposals, not automatically agreed requirements. The following details supplement priorities 2–6; the later feature ladder below remains deferred.

- [ ] **Separate input capability, grading policy, and score display.** Keep pitch grading the default for both Poly and Hex; adding string information must not silently enable stricter grading. Future selectable Pitch / String-position grading is independent of notation/tab/both viewing. Gate string-position grading on verified physical-string mapping. Green in pitch mode confirms pitch, not necessarily the written fingering.
- [ ] **Do not equate MPE channels with physical strings.** Per-note channel allocation is not a verified string mapping. Use explicit source/mapping configuration; do not automatically route an MPE poly stream through the six-string hex mapping just because it uses several channels. Preserve the common normalized pitch/time/velocity/optional-string contract and one shared practice engine rather than implementing separate Fishman/MIDI Guitar scoring engines.
- [ ] **Normalize expected targets to sounding pitch.** Include guitar octave-transposing notation, tuning, capo, and track transposition in Guitar Pro/MusicXML regression checks. Displayed written pitch and sounding MIDI pitch can differ.
- [ ] **Evaluate the chord as a whole before attributing a wrong pitch.** Match already-correct tones first; any later inferred expected-note association must have an unambiguous explanation. Do not use nearest-pitch matching to assign arbitrary wrong frets in dense chords/overlapping voices. Optional semitone/fret-offset details belong in a clearly labeled detail view; Poly inference is not confirmed position. Retained Hex tab feedback adds the last detected wrong fret per string/target beside its string without pointers, alongside target colors. Conservative Poly remaining-note inference is now implemented as an optional display setting.
- [ ] **Calibrate latency and tracking tolerance per setup.** Retain the implemented latency control and Together window, then validate with real input. The screenshots propose 150–250 ms chord settling as another starting range, not an agreed replacement for the current 200 ms Together default or a reason to add mandatory note duration. Any brief/low-velocity stray-note filter must be optional and must not discard legitimate soft/short/repeated notes. Preserve distinct received-wrong, not-received, and retry outcomes.
- [ ] **Run a small real-practice acceptance set.** One TrueFire lick, one jazz chord/voicing exercise, and one classical/fingerstyle passage on the intended guitars, including the Cordoba's existing piezo/audio-to-MIDI setup where available. Compare usable practice results and setup effort, not just whether MIDI arrives. Record notation-only, tab-only, repeats, chords, score retention, and input mode outcomes before recommending major new hardware/content conversion or feature expansion.
- [ ] **Scope Follow mode separately.** A screenshot includes Follow in a proposed core checklist, but current validated stages establish Wait/Realtime. Define whether Follow means cursor following received notes, accompaniment following the player, or another behavior before implementation. Do not silently add it to the next bug/feedback stage or claim it is complete.

## Deferred feature ladder after reliable piece practice

These are captured proposals, not additions to the next stage. Keep Guitar Trainer and Piano Trainer independently usable; sharing selected practice logic later does not require merging their UIs or rewriting the working piano app. The optional piano alphaTab experiment above is a separate evaluation, not a prerequisite for this ladder.

1. **Flexible chord practice.** Distinct from Collect/Together, which only changes attack collection timing. Offer Exact written voicing, Guide tones, and Flexible allowed voicings from explicit chord symbols/definitions. Define required 3rd/7th, permitted omissions/extensions, bass requirements, minimum note counts, octave treatment, and handling of extra tones. Do not accept arbitrary two chord tones as a complete seventh chord. Keep classical note-for-note grading exact; jazz harmony rules must be a deliberate mode. Example: an explicitly configured Cmaj7 guide-tone exercise may accept E and B without requiring C/G.
2. **Generated technique exercises.** Scales, triads/inversions, arpeggios, and chord inversions from a small shared exercise module; configurable guitar string sets/fretboard positions. Pitch checks work with Poly; position checks require validated Hex. These need not depend on importing every exercise as Guitar Pro/MusicXML. Scope one exercise type first.
3. **Harmony Explorer.** Use explicit chord symbols or a chord timeline to update chord tones, guide tones, and optional scale choices over progressions. Guitar can show positions/CAGED regions; piano can use keyboard highlights in a separate interface. Start as a separate module, not a full improvisation tutor or audio chord-recognition project. Do not grade free improvisation as binary right/wrong; any later observations should explain target selection/resolution.
4. **Local media synchronization research.** Investigate alphaTab-version support for synchronized local audio/video, Guitar Pro backing-track timing, and editing sync points. The screenshots describe this opportunity; compatibility with the bundled build has not been verified in this update. No automatic integration with hosted TrueFire/Soundslice playback is assumed. Prototype a score plus a user-provided recording only after core practice is useful.

Release focus: a practical companion for learning known pieces, not a replacement for course instruction or an entire learning platform. Scale/chord/harmony expansion should follow real practice benefit, not postpone fixing core feedback.

## Recovered cross-chat items: Hex/Poly feedback and tracking

Relevant portions of “Guitar Trainer Strategy Shift” and “Midi Guitar 3 Licenses” were recovered from conversation search on 2026-10-10, then supplemented by the user's chronological screenshots. Complete transcripts were not available. Current implementation and the user's latest tab rule supersede older recommendations.

| Feedback/grading | Poly / single-channel input | Hex / verified per-string channels |
| --- | --- | --- |
| Standard notation wrong-note detail | Actual received MIDI pitch; no string claim. | Actual received MIDI pitch, optionally associated with its channel-derived string. |
| Wait completed tab target | Accepted tones green by default; optional inference retains red only at the uniquely associated note. No detected fret numbers. | Red on expected strings with recorded wrong pitches; clean strings green. Last detected wrong fret per string stays beside that string, without pointers. |
| Tab pitch grading with notation hidden | Compare received pitches with scored target pitches; visible standard notation is not required. | Same pitch grading, with optional stricter string criteria only when implemented/configured. |
| Correct pitch on a different string | Cannot establish the played string from pitch-only input; do not grade it as a wrong string. | Can compare channel-derived string with expected string after mapping validation; exact-string grading remains deferred/opt-in. |
| Played fret display | A pitch can have several fret/string positions; show candidates or clearly labeled inference, not an exact detected position. | Can derive a candidate fret from received pitch and known string/tuning; validate capo, transpose, bends, and channel direction before calling it exact. |
| Expected chord pitch not received | Pending in Wait; once a Realtime window closes it may be missed/not detected, distinct from a received wrong pitch. | Same outcome distinction; per-string sensing does not eliminate all input errors. |

- [ ] Apply these rules to both feedback views, including tab-only viewing and toggling notation mid-attempt. Preserve the source score's fret numbers; do not replace them with guessed wrong frets. The latest user decision retains only the last Hex wrong fret per detected string/target beside that string without pointers; Poly inference marks expected positions without claiming detected frets.
- [ ] Store distinct received-wrong, pending/not-received, completed-with-errors, and completed-clean outcomes. Define how these affect the percentage before changing its formula. A missing MIDI note does not carry a trustworthy cause/confidence score by itself.
- [ ] Test source-appropriate chord tolerance with Fishman and MIDI Guitar 3, using the same representative passages. Existing Collect/Together mechanics are implemented; adjustable filtering/settling or additional profiles are proposals, not existing features. Reassess the previously suggested 100–200 ms settling range from measured behavior rather than imposing it globally. Avoid filtering intentional short/repeated notes.
- [ ] Retain clean separation between Practice Track, visible tracks, and playback/mute choices during UI changes; displaying all tracks must not automatically grade all tracks.
- [ ] During the menu pass, verify older UI requests: Play/Pause toggle, song name/score percentage, optional fretboard via Display, vertical score scrolling, functional/styled fullscreen, responsive Tempo/Loop controls, and menus appearing above the playback cursor. Check current behavior before labeling any of these a new missing feature.
- [ ] Keep Jam Origin SDK/WebSocket integration as optional research only. Ordinary MIDI remains the current integration path. Consider an adapter only if verified API capabilities provide useful information absent from the existing MIDI stream; do not assume standard poly input gains reliable string identity or confidence metadata.

Already addressed in Stages 1–7: MIDI normalization/held-note tracking, repeat-aware targets, Realtime and Wait foundations, chord collection and Together window, tempo/loops, and basic score/fretboard overlays. These remain regression/edge-case checks, not requests to rebuild them. Future scale/chord-tone/improvisation tools remain later ideas after reliable note-for-note training.

## Format and Fishman findings

- The bundled alphaTab importer list includes Guitar Pro 3–8, MusicXML, Capella, and alphaTex. It does not include a MIDI-file-to-score importer. MIDI synthesis/playback/export support is not evidence that this app can load a .mid file as sheet music.
- alphaTab documents mature MusicXML support, but not complete MusicXML feature/layout support. Piano migration needs a repertoire-based trial, not an assumption that alphaTab will solve every OSMD issue.
- Fishman's TriplePlay Utility manual documents poly on channel 1 and mono/hex on channels 1–6, with high E on 1 and low E on 6. No pickup-orientation/channel-reversal setting was found in that manual. Do not claim that every Fishman software/firmware version lacks one; confirm the user's exact model/software before advising a physical reversal.
- Sources checked 2026-10-10: https://www.alphatab.net/docs/formats/musicxml ; https://fishman.com/wp-content/uploads/2025/01/TriplePlayUtility-UserGuide.pdf (channel-mode section, printed page 13); bundled assets/vendor/alphatab/alphaTab.js, Environment.buildImporters().

## Next checks and proposed stage

- [ ] Complete Stage 5 edge-case checks as needed: pause/Stop, disabling loops, mode changes, loading a new score, and repeated-measure selection. Basic loop and tempo behavior is user-confirmed; individual edge cases have not all been explicitly confirmed.
- [ ] Validate Stage 6: notation alignment, repeats/loop resets, chord feedback, fretboard tuning/capo/string labels, note release, left-handed orientation, resize/scroll, and mode changes.
- [ ] Validate Stage 7: Together expiry/retry, chords within the window, Pause/resume, mode changes, and section loops. Check guitar strum/MIDI timing when guitar hardware is available.
- [x] Stage 8 implements retention and the first Wait-history/display increments; follow STAGE-8.md and STAGE-8-NOTATION.md for notation validation and temporary verified-Hex markers and their hardware acceptance, following the latest specification.

## Deferred Tempo and Loop menu refinement

- [x] Tempo refinement implemented from the owner's screenshots and clarification above.
- [x] Loop refinement is implemented; see the current 2026-10-11 entry above. Hardware/browser acceptance remains pending.
- Schedule a focused UI pass after core notation/fretboard feedback is working. Preserve the functional Stage 5 controls while building that core framework.
- Capture context whenever the user supplies it. If it changes tempo or loop behavior, range semantics, or transport requirements, review it before dependent development rather than treating it as cosmetic work.
- During the refinement, verify Realtime/Wait behavior, repeat-occurrence selection, accessibility, and narrow-screen layout.

## Chord matching option: implemented, tuning pending

- [x] Add Wait Practice setting: **Together / Collect notes**.
- Collect notes remains the default: correct pitches remain collected indefinitely, even after release.
- Together requires all fresh chord attacks within 200 ms by default, adjustable from 50–1000 ms. Tune this with guitar/MIDI tests; 200 ms is not an established optimum.
- [x] Expiry clears provisional chord hits and permits a new attempt at the same target. Single notes remain immediate; duration/held-note requirements are unchanged.
- [x] Pause freezes the chord window. Incorrect pitches still count as wrong; expiry increments a separate retry counter without missed/wrong penalties. Idle time cannot repeatedly increment retries.
- [x] Automated expiry, chord-edge, hex-unison, pause/reset, cursor-positioning, and setting-form tests.
- [ ] Validate with a real guitar, especially rolled strums and unequal string detection latency. Consider changing the default to Together only after local feedback.

## Notation appearance: implemented, local validation pending

- [ ] Validate the implemented Piano Trainer-style filled notation noteheads and separate wrong-pitch red dots/accidentals; retain tab outlines.
- Tab retains outlines so fret numbers remain readable. Standard notation now uses filled green/red noteheads with blue current-target guidance. New browser/hardware acceptance remains pending.

## Other planned work

- [x] Initial notation correctness feedback and functional six-string virtual fretboard.
- [ ] Refine visual feedback and fretboard ergonomics based on Stage 6 local testing.
- [ ] Exact-position/string grading for configured hex MIDI.
- [ ] Preference persistence and score-library improvements after core practice is stable.
- [ ] Articulation edge cases and normalization limitations recorded in STAGE-2.

## Longer-term ideas

Follow mode, scale/chord-tone overlays, bass/extended-range support, alternate-tuning depth, and LEDs remain ideas rather than committed stage work. Preserve the existing UI and native alphaTab capabilities; avoid broad refactoring for these additions.
