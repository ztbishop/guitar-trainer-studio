# Guitar Trainer Studio Architecture

## Paused loop reveal and repeat/jump media evidence — 2026-10-24

`alphatab-host.js` now shares revealScoreCursor between explicit media seeks and applied practice-loop ranges. applyPracticeLoop still pauses native transport, applies native range/loop settings and seeks to the start; it additionally schedules one destination reveal, repeated on the matching playerPositionChanged acknowledgement. cursorRevealTick records that pending destination and cursorRevealGeneration cancels obsolete frame callbacks, disabled-loop choices, source return and score replacement. Two animation frames allow native cursor bounds to update. With Auto-scroll on, native scrollToCursor forces the reveal; with it off, the existing bounded score-viewport fallback reveals the rendered cursor without changing preferences or scrolling the outer page. No interval-based following, playback, grading or count-in changes; restoration suppresses reveals until ready. No new runtime modules.

`score-playback.js` continues to consume alphaTab tickLookup.masterBars in performed order, retaining written measure + occurrence + monotonic playback tick. `media-sync.js` resolves barIndex/barOccurence/barPosition against that expanded sequence; repeated visits never share a recording time by written measure alone. Tests now explicitly cover ordinary repeats, alternate endings, D.C. al Coda, D.S. al Coda and D.C. al Fine through actual native GP generation/import, native sync points, nonlinear per-visit mapping, paused seeks and continuous recording traversal. This adds evidence, not a custom repeat/jump parser. Recordings must follow the score's native recognized form.

`tests/media-repeat-fixtures.js` owns synthetic native score/GP exports and expected forms shared by `media-repeats.test.js` and `run-loop-media-repeats-browser.cjs`. The browser runner owns its temporary server/profile/in-memory WAV and checks long-score paused range reveals in both sources/auto-scroll states, rapid and same-position range edits, per-visit media seeks and actual recording-clock traversal. Existing sync editor/practice regressions remain separate. See DEV-NOTES for final evidence and physical/listening limits.

## Explicit sync preview exit and Left video default — 2026-10-24

`media-controls.js` adds Finish editing / Return to practice, sharing the editor close handler with ×. It hides/persists the editor, calls the existing host.setMediaEditing(false) through renderLayout, and focuses main Play without starting playback or changing the selected source. Existing bootstrap afterEdit callbacks prepare fresh sessions; the host retains native pause/range/count-in restoration. Current unsaved alignment is retained, not implicitly saved. Main transport text/accessible labels in app-bootstrap.js distinguish Preview from Play; editor help states that targets, grading and loops are suspended even with Synth audio selected.

`loop-controls.js` gates both inputs and injected intents during media.editing or media.returning. It explains suspension/restoration while preserving the saved enabled range/count-in and existing native host ownership. No MIDI, matching, feedback projection or Wait progression changes. `media-controls.js` first-use layout and media-sync.js invalid/missing profile layout fallback are Left; valid existing preferences and profile layouts still win. No storage schema changes or new runtime modules.

`tests/run-sync-practice-browser.cjs` starts/closes its own loopback server and isolated Chrome profile; uses bundled native demo import, in-memory WAV and synthetic MIDI to check source/editor transitions, native range/shading/cursor, staff/tab/fretboard grading, Wait gating and placement persistence. See DEV-NOTES for actual results and pending physical/video acceptance. Existing media restoration is asynchronous: playerReady and the saved seek acknowledgement must complete before normal input is used; no new transport path is introduced.

## MIDI tolerance first-use defaults and setup guidance — 2026-10-24

`practice-preferences.js` now defaults heldNoteTolerance to two and extraStringTolerance to internal (Skipped strings only). `app-state.js`, initial HTML selections, save-validation fallbacks and the display-only practice-menu summary agree. Existing validated stored choices always win, including One/Off. Legacy allowMutedStringNoise booleans now explicitly map true→all and false→off, so a previously disabled choice is not replaced by the new first-use default. Missing/invalid fields use the new defaults; no migration rewrites valid preferences or session/grading algorithms.

Tracking spikes stay on; written-range and per-device brief-note filtering stay off, with unchanged 30 ms duration. All four independent feedback preferences stay on at first use. README records setup advice, first-use defaults, risks and the owner's optional more-tolerant setup; Help and the expanded tolerance section add a brief pointer without a badge. Poly helper text distinguishes estimated positions from detected fingering. Existing eligibility, pause/reset, persistence ownership, native transport and MIDI matching remain unchanged. `run-tolerance-defaults-browser.cjs` covers fresh/returning UI and reload/phone layouts in isolated profiles.

## Alternate-guide paint contrast — 2026-10-24

style.css applies alternate opacity independently: pale-blue circle stroke uses 0.7 opacity/1.8px width, while 12px labels use brighter pale blue at 0.9 opacity. Group-wide opacity is removed so text can be clearer than the outline and the dark fill masks underlying strings. Dashed shape, marker radius, render order, view models and all feedback/grading ownership remain unchanged. The existing preview browser runner optionally saves unobstructed screenshots after closing the popup for visual review.

## Collected-tone replay display provenance — 2026-10-24

`FretboardHeldNotes.remember` additionally consumes the evaluator's existing ignored-collected-tone outcome. Bootstrap supplies read-only expected events and the current session note-state snapshot; the helper resolves only that outcome's event and interpreted pitch to already accepted note IDs (correct/completed-with-errors). It links the new raw held object to those IDs without modifying outcomes, slots, scores, MIDI held state or source data. Repeated release/replays therefore retain display attribution across target advancement. Missing event/credit is not inferred; wrong/pending/filter/strum-tail outcomes are not promoted to acceptance. Original correct/onset-correction and paused-input handling remain unchanged. This is specific to replay outcomes the evaluator already forgives; Realtime error rules are untouched.

## Measure continuity and alternate-position projection — 2026-10-24

`fretboard-context.js` now accepts `{loop}` in fretboardContext. Next-onset selection uses the filtered native playback event sequence and wraps to its first onset only for enabled loops. Bar mode appends that single next onset (all simultaneous voices) only when its current playback-measure context contains no future onset. Past positions remain neutral; entering the next occurrence selects its own full bar. Rests/ties are not converted into required attacks. Bootstrap supplies the existing loop-enabled state; no native transport or grading events are changed.

`app-state.js`/`display-preferences.js` own boolean `ui.showAlternatePositions`, default false, validated and saved independently under existing gts.displayPreferences. `fretboard-controls.js` wires one local checkbox. `practice-visuals.js` computes exact pitch-minus-open-string fret candidates from current supported written targets only, within its already-selected display range; it deduplicates by string/fret after written target/context priority. This computation ignores note correctness and MIDI input mode, never supplies finger data and never changes score/session notes. Alternatives cannot widen the neck or add attack requirements.

`fretboard-ui.js` renders alternatives before written context/targets and live rings, using a distinct faint dashed-blue style and accessible explanation. Alternate guides cannot inherit green/red states. Correctness, live wrong rings, accepted-tail suppression and tab feedback retain their existing owners. README is updated as the player guide; this section and FRETBOARD.md retain technical semantics/limitations. Native repeat/loop/end browser coverage is in tests/run-fretboard-preview-browser.cjs (isolated profile, in-memory native GP fixture, optional GTS_PLAYWRIGHT_MODULE/GTS_BROWSER_CHANNEL/GTS_SCREENSHOT_DIR and base URL). Pure tests cover rests, simultaneous voices, exact pitches, capo/tuning, deduplication, neutral colors, unavailable fingers and independent preference storage.

## Held-tail fretboard display provenance — 2026-10-24

New `fretboard-held-notes.js` owns display-only `FretboardHeldNotes`: a WeakMap links the router's actual held Note-On object to the accepted outcome's event/note IDs and interpreted pitch; a WeakSet marks fresh ungraded attacks. It consumes existing `correct`/successful `pitch-corrected` outcomes after grading, never writes raw MIDI, session records, outcomes or note states, and never classifies errors. Exact object identity prevents release/reattack or same-pitch/channel input from borrowing earlier acceptance. Onset correction resolves the raw held object via the existing correction metadata. Weak keys expire with released/reset router objects rather than accumulating performance history.

Before projecting fretboard input, `visible` suppresses known accepted attacks from a prior target only while their note IDs retain accepted result states. Current-target attacks, explicitly credited held pitches, unclassified input and existing live wrong attribution remain visible. Result reset invalidates old attribution through the existing note-state snapshot; release/new attacks have distinct identities. Ungraded attacks are copied into the visual projection with `fretboardUngraded`, and practice-visuals uses neutral played state ahead of stale lastFeedback colors (existing live wrong attribution still wins). Raw input is not mutated. This affects Poly and Hex equally; only their existing possible-position/string-mapping geometry differs.

Bootstrap now isolates the unchanged fretboard build/render path in `renderPracticeFretboard`. The router callback remembers display provenance after the existing evaluator returns. Wait can synchronously publish/advance before returning its outcome; in that case bootstrap refreshes only the fretboard after remembering, avoiding a second score/tab feedback paint or any extra session operation. Ordinary trainer paints use the same helper; hidden fretboards still accumulate provenance so revealing one is consistent. Editing retains existing ungraded presentation guards. Score/tab mark builders, capture, matching, Wait progression and held-note tolerance are unchanged.

`tests/fretboard-held-notes.test.js` uses actual Wait Collect/Together and Realtime sessions in Poly/Hex, checking no mutation of records/stats/held evidence/tab marks, fresh object identity, accepted-with-errors tails, wrong-ring preservation, correction identity, current held credit and paused neutral input. `tests/run-fretboard-held-browser.cjs` injects synthetic MIDI into an isolated Live Server browser using a single-track native GP fixture and exercises real bootstrap/DOM behavior in both practice modes/input layouts. No physical device/profile is touched; Playwright remains an optional test dependency (`GTS_PLAYWRIGHT_MODULE`, `GTS_BROWSER_CHANNEL`, optional base URL).

## Player guide, optional demos and ZIP launchers — 2026-10-24

Player-guide policy: omit the app version number and deferred-feature inventory from README; explain current pitch grading where relevant. Node.js is required by the optional bundled launcher server, not browser runtime or existing Live Server use. README.html inherits these content changes from the same Markdown source.

The root README.md is the beginner-facing guide and single content source for GitHub and README.html. Technical setup/checks are indexed in DEVELOPMENT.md; dated technical history stays here, in DEV-NOTES and TODO. README.html loads only local assets: guide.css, pinned/licensed Marked 15.0.12 and js/readme-guide.js. The script fetches the trusted repository README, renders headings with stable IDs for its plain headings, honors initial deep links and provides a readable failure message. It never receives uploaded Markdown. Keep content links usable in GitHub and the local guide. More → Help & Guide remains a brief quick start and opens the full formatted guide in a separate tab; it does not navigate the practice tab.

js/demo-scores.js owns a fixed three-entry original score catalog, same-origin fetch, transient busy state and status/error text. Bootstrap initializes it with the existing loadScoreFile injection. The module converts bundled bytes into an ordinary File; alphatab-host.js remains the only runtime alphaTab integration. Native load callbacks refresh score/library controls as for an ordinary user file. No first-run storage migration, JSON seeding, automatic save/play or special MIDI/grading behavior is introduced. Explicit Save to Library uses existing score-library/library-store ownership and original bytes. assets/demos includes CC0 originals, editable AlphaTex source and generated GP files; tools/generate-demo-scores.cjs is offline authoring tooling using bundled alphaTab, never runtime code.

local-web-server.cjs is an optional Node 22+ static server for extracted ZIPs, separate from app runtime and the owner's Live Server. Launchers/Guitar Trainer - Windows.bat and Guitar Trainer - Mac.command resolve the project root and call it with --open. It binds to loopback only, defaults to port 8081 (GTS_PORT override), opens the default browser after successful listen and reports startup/port errors without opening a different server. Static GET/HEAD routes are allowlisted with decoded-path and realpath containment checks; JS, native worker/worklet/font and guide assets retain correct content types. No dependencies, build, LAN hosting, helper integration or installation are added. The Mac launcher has LF enforced by .gitattributes; executable permissions/security prompts remain platform acceptance items. Local/hosted/Live Server origins keep separate existing IndexedDB/localStorage; a stable hostname/port is important.

Runtime scoring, Wait progression, feedback interpretation, MIDI normalization and native transport are unchanged. tests/guide-launchers.test.js verifies actual HTTP routing and native import/SVG/MIDI/practice targets; tests/run-guide-demos-browser.cjs uses an isolated browser/library and blocks remote requests to check local/offline flows. Detailed commands and platform limits are in DEVELOPMENT.md; final evidence is recorded in DEV-NOTES.

The local server also owns the interactive launcher URL-copy action: C then Enter invokes clip.exe on Windows or pbcopy on Mac through stdin, without a shell or browser clipboard permission. It prints success or a manual-copy fallback and leaves server/playback unaffected. Tests inject clipboard processes without modifying the real clipboard. The address is localhost for this computer, not a LAN IP.

## Scale the neck into shorter manual frames — 2026-10-24

Pure `fretboardFit` in fretboard-geometry computes one scale <= 1 from available width/height and horizontal-scrollbar allowance. Horizontal layout can reflow at the inverse scale to use the frame width while keeping circles/text undistorted. `fretboard-ui` includes available height in its model/size signature and applies this fit only within the bounded `.fretboard-panel`; unconstrained standalone render fixtures retain natural sizing rather than feeding their own content height back into layout. The existing ResizeObserver handles both dimensions. Physical geometry and grading data are unchanged.

SVG `viewBox` retains logical geometry; pixel width/height apply the same scale. `data-natural-width`/`data-natural-height` retain unscaled dimensions and `data-scale` records display scale. workspace-panels uses natural dimensions to calculate automatic fit, preventing a scaled short frame from becoming the new automatic default. Current sparse-label selection uses rendered width; right-edge anchoring accounts for height-driven pixel-width changes. The neck scroller suppresses vertical overflow after fitting, and browser tests verify the strings actually fit, not just that a scrollbar is hidden. Existing height/mode localStorage is unchanged.

## Automatic versus manual fretboard frame — 2026-10-24

`workspace-panels.js` replaces the unconditional content floor with explicit automatic/manual modes. Pure `fretboardPanelHeight` (renamed from fretboardPanelMinimum) computes automatic fit from neck height, measured frame chrome and optional horizontal-scrollbar allowance; `usesAutomaticFretboardHeight` reads mode compatibility. `gts.workspacePanelSizes` retains existing numeric panel fields and adds `fretboardAutoHeight`: absent numeric fretboard preference means automatic first use, legacy numeric preferences mean manual, and an explicit boolean takes precedence. Storage failures retain in-memory operation.

Automatic fit uses its computed height as both desired and minimum; it does not retain the old fixed 190px default as extra padding. Horizontal overflow reserves at least 18px (or measured native scrollbar thickness); otherwise it reserves zero. Manual mode uses the stored size and a 144px tools floor, permitting vertical scrolling. Drag/Up/Down selects manual mode; double-click/Home and global layout reset select automatic mode. Existing viewport fitting/media panel sizing remain. Automatic calculations never rewrite stored numeric preferences. `workspace-panels.css` trims only fretboard top/bottom padding (12px/4px). The native score, neck geometry, labels, marker size, transport and MIDI/session rules are unchanged. This supersedes the prior unconditional minimum documented below.

## Fretboard frame content minimum — 2026-10-23

`workspace-panels.js` owns fitting the frame without changing fretboard geometry or grading. Pure `fretboardPanelMinimum` reserves SVG height, measured panel padding/borders, 18px for horizontal scrolling and at least 144px for local tools, within the existing 400px ceiling. `fitPanelSizes` accepts optional per-panel minimums: the effective desired height is at least the current content floor, and constrained screens cannot shrink below it. Stored preferred heights are neither overwritten nor migrated by automatic fitting. Larger saved preferences remain authoritative above the floor; drag/keyboard/reset still use existing persistence.

The workspace MutationObserver also watches fretboard-content child replacement, so startup/load/track changes recalculate the minimum from the renderer's explicit SVG height. Existing workspace resize/visibility observers handle enable/reveal and viewport changes. `workspace-panels.css` removes the overriding 32vh fretboard cap; the existing outer workspace scrolling and score minimum handle short screens. Orientation, help, rendering, MIDI and transport remain independent. Browser checks seed a small saved preference, assert no vertical overflow in frame/content/neck scroller for all fixture string counts and responsive widths, and confirm auto fitting leaves the saved preference unchanged.

## Fretboard popup owns orientation/help — 2026-10-23

Display's duplicate orientation checkbox and help disclosure are removed; Show virtual fretboard remains. `fretboard-controls.js` now writes `AppState.ui.leftHanded`, calls the existing `saveDisplayPreferences`, and invokes the injected repaint directly. It no longer dispatches through the deleted Display checkbox. `display-controls.js` and bootstrap no longer query/wire that checkbox. The preference key/schema/default and render model are unchanged; hidden-neck choices are retained. Full help guidance and `fretboard-help-status` move into the popup's existing help disclosure, preserving `fretboard-ui`'s live status target and Help's existing toggle/reposition behavior. Obsolete Display-only styles are removed. This supersedes older orientation-forwarding descriptions.

## Fretboard readability and resize projection — 2026-10-23

`fretboard-geometry.js` accepts an optional available width in geometry/fret-wire/note-center helpers. Width is clamped to `160 + 26 × maxFret`; each cell reserves 24px and distributes remaining space with the exponential taper. Vertical geometry depends only on string count (24px spacing), not viewport. Pure `fretNumberVisible` selects all labels at comfortable widths or 0/landmarks/final/current targets when compressed. These are display coordinates, never score or MIDI fret transforms.

`fretboard-ui.js` uses explicit equal SVG pixel/viewBox dimensions so markers/text stay round and readable. A single ResizeObserver watches the container; its callback redraws the last model only when the model/available-width signature changes. Initialization disconnects the former observer, avoiding duplicate ownership. Feedback redraws retain scroll; width changes in left-handed mode preserve right-edge distance using the previous viewport width. Hidden/zero-width containers use fallback geometry until observed at a usable width. The renderer adds a mirrored nonzero-capo badge from existing model metadata. No app state, persistence, native alphaTab, normalization or session behavior changes.

Available width excludes container padding reserved for the close control. `workspace-panels.css` no longer forces SVG height to panel height or overrides phone minimum width to 1200px; geometry owns SVG dimensions while the existing panel/scroll container owns clipping and resizing. Browser checks compare rendered dimensions to SVG attributes as well as measuring markers, so SVG letterboxing cannot mask a conflicting stylesheet rule.

`tests/fretboard-readability.test.js` covers invariant height, minimum cell widths, round-marker coordinate geometry, mirroring and sparse-label exceptions. The existing isolated browser runner additionally measures actual 20px round circles/12px text and unchanged SVG height at 1440/800/390 widths, checks sparse labels/capo and runs existing geometry/app UI regressions.

## Fretboard previews, labels and paused browsing — 2026-10-23

- `fretboard-context.js` is a pure display/timeline adapter: filters selected-track native events by enabled playback range; selects next-onset or same-playback-measure context; finds adjacent distinct onset ticks across voices; formats explicit fret/finger/blank label choices. It never changes sessions, scoring, MIDI or native state. Written `nextBeat` links alone are not used for repeat navigation.
- `score-playback.js` now retains native `leftHandFinger` on normalized notes (unknown = -2). Imported fingering travels with existing note/beat identities through grouped practice events. No matching, attacks or tie rules change.
- `practice-visuals.js` accepts display-only context events and label mode. It resolves supported positions using the current staff, deduplicates context positions with current > future > past priority, and extends geometry through fret 36 where needed. Historical noteStates are never applied to context. Current targets still consume existing pitch-based session states; alternate-position Poly acceptance remains green. Played-note projections retain their existing separate behavior.
- `fretboard-ui.js` renders context before targets and held rings. Labels remain readable beside small correctness accents; finger mode never invents missing data. `fretboard-controls.js` owns the local popup, validated preference changes, help, orientation forwarding to the existing Display handler, and injected navigation callbacks. Native popover positioning avoids clipping in the short panel; outside click/Escape/resize dismiss it. It does not import alphaTab or grade MIDI.
- `display-preferences.js` validates/saves independent `fretboardView` (`beat`/`next`/`bar`) and `fretboardLabels` (`notes`/`frets`/`fingers`/`none`). Missing/invalid values default to beat/notes; saved visibility/orientation and score feedback remain independent. `app-state.js` carries matching first-use values.
- Bootstrap injects navigation and builds preview context from `playbackTimeline`, not grading targets. Arrow browsing stops/configures existing Wait state, pauses native transport, clears held MIDI and resets Realtime through existing lifecycle owners. Host-only `seekPausedTick` cancels count-in, pauses and sets native ticks without Play. A transient browsing tick selects native rests/ties for display without creating grading targets. It is used only while still at that position and paused, cleared on Play/foundation rebuild, and superseded by later score/loop seeks. Normal native seek acknowledgements update existing controllers. No new Wait progression or feedback-attribution rules are introduced.

`tests/fretboard-context.test.js` covers pure context/range/priority/persistence/fingering, including actual bundled-native Guitar Pro fingering round-trip. `tests/run-fretboard-browser.cjs` uses an isolated browser against existing Live Server, imports the public native fixture, exercises real controls/navigation and runs the older geometry/media UI harnesses. It accepts `GTS_PLAYWRIGHT_MODULE`, optional `GTS_BROWSER_CHANNEL`, base URL argument and optional `GTS_SCREENSHOT_DIR`; these are test dependencies only. Physical MIDI/listening acceptance remains separate.

## Idle fretboard target preview — 2026-10-23

practice-visuals.js exports fretboardDisplayEvent, a pure display selector. Bootstrap uses it only for the fretboard: prefer trainer.currentEvent; before a session starts, fall back to the first expected attack at/after tickPosition. Expected events already honor the practice range. Idle previews use empty correctness states. Editing blocks the preview, and started/completed sessions with no target do not acquire a fallback. No session/grading targets or transport state are written; score overlays continue to consume the actual trainer target.

## Startup fretboard fallback — 2026-10-23

buildFretboardModel accepts an explicit noScore display flag supplied by bootstrap from !AppState.score. Only when that flag is true and no track exists does it use a local standard six-string tuning; no state/track/expected events are fabricated. Loaded/unsupported tracks retain existing tuning validation and message behavior. Rendering, visibility/orientation preferences and grading owners are unchanged.

## Settings status text — 2026-10-23

The primary MIDI status now hides known routine confirmations only while an input is active; exceptional/unknown, waiting, no-input and access-error statuses remain visible. Diagnostics retain the full status. The main-view profile label is removed; persistence guidance stays in Device settings help. Hex mapping text reports the channel sequence without explaining automatically enforced dropdown bounds. Device controls/IDs, persistence and routing remain unchanged.

## Settings composition and profile feedback — 2026-10-23

index.html/menu-controls.css give Settings a single device/mode reading column with responsive channel/bend rows and native help/diagnostics disclosures. Existing control IDs remain; MIDI support and the duplicate status readout move into diagnostics, while the primary status/error line remains visible. renderMidiUi identifies the selected device profile and disables Settings mode/channel/base/order/bend edits without an active input, preventing changes that cannot be saved to a device. Existing handlers retain their owners and saveActiveMidiSettings calls.

The per-device audit confirmed existing MidiDevicePreferences/router behavior: separate validated mode/channel/base/reverse/bend/latency profiles, remembered-input return even before score loading, no substitute device, and explicit None/manual selection priority. No router, persistence schema, score-loading, transport or grading changes. tests/run-midi-settings-browser.cjs exercises actual handlers with synthetic ports in an isolated browser, including late arrival and reload; physical acceptance remains separate.

## Practice menu composition — 2026-10-23

index.html and menu-controls.css own the Practice menu order and responsive presentation: setup, Score feedback, collapsed MIDI tolerance, collapsed Realtime timing, clear-results action. Native details/summary provides keyboard/touch-accessible disclosure; existing control IDs, help associations, conditional Wait/duration controls and event handlers are retained. Long tolerance policies remain in inline help. Disclosure openness is transient DOM state and is not rewritten by trainer renders or saved as a preference.

js/practice-menu.js owns only the compact tolerance summary. Bootstrap refreshes it from AppState during renderTrainerUi; it counts available optional filters (Hex extra-string/spike choices only with Hex, brief errors only with a selected input) and reports held-note allowance separately. It never writes application state, storage, MIDI or session results and never calls alphaTab. Existing owners retain preference persistence, eligibility, pause/reset and grading behavior. Automated and pending physical acceptance evidence is in DEV-NOTES.md.

## Explicit held-note limits — 2026-10-21

Owner requested bounded One / Two / Three choices because unlimited Multiple is too forgiving with MIDI Guitar. Dropdown retains Off and first-use One. Shared recognition enforces a maximum of 1/2/3 pending held-note slots per repeated chord, with at least one fresh required attack in every case. Two and Three retain the prior refreshed-tone/corrective-strum evidence and continued carryover rules. One, same-chord checks, releases, timing windows and X behavior remain unchanged. Saved legacy multiple migrates to two; valid explicit choices persist independently of other preferences. No unlimited runtime option remains.

Validation: all-mode Poly/Hex regression matrix checks each cap with one, two or three fresh tones in a four-note chord; preference tests cover legacy migration, round trips and invalid values. Final suite/syntax/whitespace results appear in handoff. Physical MIDI/browser acceptance remains pending: owner should hard-refresh and try Two on the repeated MIDI Guitar passage, then compare One/Three and confirm saved choice after reload. No version, native renderer, commits or pushes.


## Multiple held-note refresh correction — 2026-10-21

Owner authorized fixing Multiple after the E7 stall in the 16:14 capture. Prior exact-onset checks rejected a correct previous-chord tone refreshed in its protected strum tail. Multiple also required all already-collected tones to originate in the latest short gesture, defeating Wait Collect correction across several attempts.

Wait now records separate heldRefresh evidence for an unambiguous correct pitched-tail attack or a replay of an already-collected correct tone, only with Multiple enabled. Original credited hitAt and score credit are unchanged. Shared eligibility uses that real attack's channel/time for Multiple; still-held identity must match exactly. Multiple requires at least one fresh required tone in the bounded gesture, without requiring every previously collected tone to be freshly recollected in that same gesture. One/Off retain their former rules. Expired Together attempts and new credited attacks clear stale refresh evidence. Same-chord signatures, release/replacement checks, Hex channel/string safeguards, wrong-note blocking and X/single exclusions remain. No UI/default/preference, MIDI normalization, native rendering, X-tail or X-completion changes.

Validation: 404 Node tests pass, including Poly/Hex tail-refresh support in both Wait chord modes, released-note rejection, corrective gestures and no extra score credit. Read-only replay of the supplied GP5/capture through sequence 4183 allows the stalled second E7 to settle at 19.120 seconds (one real fresh tone plus three still-held pitches), using the E4 tail refresh at 18.903 seconds. The following all-X target still has no credit. This isolated replay does not establish how the owner would play after earlier advancement; no new overall accuracy claim. Existing Realtime/mode/filter/X regressions pass. Changed module syntax and whitespace checks pass. Fresh normal Live Server/Fishman/MIDI Guitar acceptance remains pending. No personal capture files added, commits, pushes, version or tag changes.


## Lightweight MIDI recording readout — 2026-10-21

Owner reports progressively slow Settings opening, delayed cursor jumps and difficulty retrieving captures. Prior start/stop clearing restored responsiveness. Fix diagnostics before further held-note/X acceptance: the report textarea now contains only a bounded preview (last 12 messages and three snapshot labels). Complete evidence remains in memory; full cached text serialization happens only on explicit Copy/Save, never Stop or the 10,000-message limit. Clipboard failure temporarily exposes selectable full text and restores the preview on blur. Clear recording discards capture rows, snapshots, held-message links, metadata and cached text without touching practice/MIDI/session state. Start retains its existing replace behavior. UI help explains preview versus export and unsaved clearing.

Bootstrap no longer performs a full trainer/score paint on every bend/controller message without a grading outcome; raw capture and synchronous routing/grading stay intact. Note-on/off events, grading outcomes and Wait controller publications retain existing rendering. This reduces unnecessary feedback projection/cloning under dense traffic without changing tolerance or X semantics. The live Chrome tab is not accessible through this chat; no attempt was made to reload it or claim its unsaved capture was recovered.

Validation: 400 Node tests pass. New 10,000-message UI test verifies zero full JSON serializations through auto-stop, a preview below 4 KB, all 10,000 raw messages retained, full Copy contents, and Clear cleanup. Tests also verify temporary manual-copy fallback returns to preview and fresh recordings discard stale held links. Separate Live Server browser confirms Settings/diagnostics startup and Start/Stop preview behavior; actual long Fishman/MIDI Guitar sessions and loaded-score responsiveness remain pending. Physical claims about Multiple eligibility and apparent X skips remain unconfirmed without a fresh responsive capture. No version/native renderer/vendor changes, commits or pushes.


## MIDI tolerance across practice modes — 2026-10-21

Owner authorized a shared Allow held notes in repeated chords control: Off / One note (default) / Multiple notes. It applies to Poly/Hex, Realtime and both Wait chord choices. Only consecutive identical pitched chords qualify; all required pitches must be supplied by fresh attacks or still-held evidence, and at least one required attack must be fresh. One does not chain inferred tones; Multiple can carry original held attacks through successive identical chords. Released/replaced notes, wrong-note gestures, first/new chords, X targets and singles cannot earn held credit. Hex retains distinct-channel and six-string mapping checks; Poly compares pitch slots without inventing strings. Diagnostics preserve held-credit provenance and freshAttack:false.

wait-chord-gesture owns shared eligibility. Wait settles after its bounded late-note check; Together uses its configured window, settling before expiry. Realtime settles inside its existing timing window after its real-time chord grouping interval. Fresh attacks retain immediate credit. Pause clears held evidence; Wait/Realtime active clocks exclude paused time for duration checks. Seek, loop/session reset and new attempts clear tolerance evidence.

RealtimeSession extends the pure WaitSession evaluator to reuse range, confirmed Hex spike/retrigger, brief-error and onset-bend processing while overriding timed target selection, grading, completion and stats. No native API/UI calls are added. Original-target errors, raw-release identity and bounded corrections remain traceable. Realtime pending brief errors are excluded until their minimum duration; releases can reconcile a prior decision on its original target. Finish holds the final result briefly for outstanding decisions, with a bounded engine timer cancelled on session replacement. Realtime capture returns actual grading outcomes.

All existing MIDI input tolerance controls now apply in Realtime and both Wait chord modes. Input-specific eligibility remains: string-based tolerance and confirmed tracking spikes require Hex; written-range and brief-error filters support Poly/Hex. Existing saved choices/defaults remain; heldNoteTolerance validates off/one/multiple and defaults to one. Brief settings remain per input. Control changes pause and clear results in both sessions; UI no longer labels these filters Wait-only. Written-X semantics remain unchanged.

Validation: all 398 Node tests pass, including late-window onset correction after miss finalization. All changed application modules pass node --check; git diff --check passes. Automated scenarios cover all six practice/input combinations, Off/One/Multiple, continued provenance, no attack/no credit, releases, wrong pitches, changed chords, X/single exclusions, non-unit speed, pause clocks, range/brief coexistence, original-target reconciliation, confirmed spikes, onset bends and preference migration. Isolated Live Server browser confirmed menu startup, Realtime availability, choice changes and persistence across reload. WebMIDI permission was unavailable in that browser; actual Fishman/browser acceptance remains pending. No native renderer/vendor/transport changes, version bump, commits or pushes.

## Disconnected MIDI cleanup policy — 2026-10-20

This supersedes October 16 close-on-disconnect wording below. midi-router invalidates its listener epoch before detachment, clears held notes and drops its binding on physical removal without calling close on the disconnected port. Browser/driver removal owns native teardown; JavaScript promise catches cannot contain native deadlocks. Connected selection changes/None still close the former owned input once without await/retry. Initialization uses the same state gate and retains protection against closing a rebound port. Saved profiles and automatic reconnect remain unchanged. Tests cover application lifecycle only; see MIDI-DISCONNECT.md for context and physical acceptance.

## Native voice colors and paired-score grading

Native alphaTab defaults to black first-voice and translucent gray secondary-voice glyphs. Owner decision 2026-10-20 overrides both mainGlyphColor and secondaryGlyphColor to opaque black in alphatab-host.js initialization for all scores/tracks, including paired imports. Native voice structure is preserved; custom green/red correctness overlays keep their independent colors. score-playback.js includes attacks from every voice of the selected track and groups simultaneous onsets into one practice target. Staff notation and tab render the same retained note identities, rather than forming independent grading streams. practice-visuals.js projects their session results back to source-note IDs. Voice color has no role in MIDI matching, target eligibility or correctness. The paired-import two-voice regression checks this interaction through native MIDI lookup, Wait/Realtime evaluation and source-note feedback publication.

## Optional paired MusicXML import — 2026-10-20

alphatab-host.js owns format gating, browser DOM inspection of explicit MusicXML part groups and native model parsing. Only opening uncompressed .xml/.musicxml invokes detection, including library reopen; bulk library imports do not. Non-MusicXML, compressed .mxl and files without qualifying groups retain native loading. Every qualifying open asks explicitly; legacy gts.musicxmlPair.v1 localStorage keys are ignored, with no new decision storage. The host preserves original pendingScoreFile bytes. Score-load generation guards and cancellation of a pending pairing dialog prevent stale asynchronous choices from loading an older score. app-bootstrap.js clears the file-picker value after capturing its File so selecting identical bytes again triggers a fresh open.

musicxml-pairing.js is a pure native-model adapter with no alphaTab API/DOM/storage access. findNotationTabPairs validates a narrow two-part pairing, compares written notation pitches against tab sounding pitches and returns initial-import discrepancies without mutation. It is a candidate screen, not proof of musical fidelity. After XML reconciliation and native reimport, combineNotationTabPair enables both views, removes the redundant notation track and reindexes tracks. Its chord-transfer support is retained for model-level callers; the application XML path already includes source chord symbols. It never combines grading targets from two parts.

musicxml-repair.js owns DOM-only original-source reconciliation, with no alphaTab API/MIDI/grading access. describeMusicXmlPart tracks divisions, transposition, backup/forward, chord onsets and voice-specific raw tie starts/stops. rebuildPairedMusicXml clones the document, matches notation notes to tab fingering by measure/onset/sounding pitch, and rebuilds selected tab parts from notation structure with tab tuning/clef. It retains source visibility, rhythms, voices, ties and symbols. Tied notes inherit their chain's original fingering; explicit tied-number IDs bypass native transposed-origin lookup errors. Pitched-note instrument references are omitted in rebuilt parts to avoid native percussion-articulation classification; part headers still define instrument playback. Missing fingering, orphan ties, unsupported grace notes or unmatched pitches fail closed to original separate parts. The host reparses through native ScoreLoader before its ordinary load path. This extra parse happens only after Combine is chosen. No vendor patch or grading-rule change is introduced.

musicxml-pairing-controls.js owns the modal and explicit choice/cancellation only. No arbitrary manual merge or multi-part grading is implemented. tests/musicxml-repair-browser.html checks original raw source notes/ties independently of imported expectations, native SVG/MIDI, GPX attack parity and six session configurations. tests/run-musicxml-repair-browser.cjs runs it with external source paths and tests actual app Combine/Keep separate/Combine reopening, including an old saved decision. It requires Live Server and an available Playwright/browser runtime; neither is an app runtime dependency.

## Per-device brief-error duration tolerance — 2026-10-20

brief-error-filter.js owns duration validation/defaults; brief-error-controls.js owns the visible checkbox and conditional number/arrow UI. midi-device-preferences validates ignoreBriefErrors (false initially) and minErrorMs (30 initially; integer 5–100), midi-router saves/restores them with each active input profile, and bootstrap passes them only to WaitController/WaitSession. Global practice preferences and Realtime behavior are independent.

WaitSession stores pending wrong entries in their original record with pending=true, tracked separately from counted wrongs. pendingErrors drives threshold maturation; activeBriefErrors retains onset/release identity for timestamp-based release reconciliation. Correct grading/progression remains immediate. Pending entries are excluded from public wrong histories and note-state projections. Raw-channel/raw-pitch releases below threshold remove a pending/counted duration-managed entry without credit; flushPendingErrors counts it once at threshold. Existing Hex corrections share removeWrong, preventing negative/double penalties. briefErrorDecisions records both counted and forgiven outcomes; capture rows retain raw data and selected duration settings.

WaitController services pending errors through its existing clock even after target advancement. Pause/release uses active time. When a final correct target has outstanding pending errors, phase=settling holds pass finalization until durations resolve; native seek acknowledgements preserve that phase, and loop history is archived only afterward. Stop/new attempt/configure/seek lifecycle still replaces sessions. Browser control tests use a clearly marked synthetic-input fixture with no persisted device changes. No extra native alphaTab integration or background scheduling service is introduced.


## Accepted-single precursor tracking — 2026-10-19

WaitSession.singlePrecursors is a bounded per-channel map of soft correctly completed single-note attacks, separate from wrong-onset spike candidates. Matching raw releases update anchors. Pure helpers in hex-tracking-spikes.js validate one same-identity stronger retrigger across one target boundary (velocity ≤20 then ≥2×, release ≤70 ms, onset gap ≤60 ms, release gap ≤20 ms). Required pitches on the new target bypass this tolerance. Same-channel attacks consume anchors; noncentral bends and Wait pause/inactive reset clear them. Recreated sessions clear state for loops/seeks/new attempts. An ignored-previous-onset earns no credit/penalty and adds an explicit trackingSpikes record with previousEventId; it does not create held support. Enabled only by the existing Wait Hex filterHexSpikes preference. Normal held-note releases, MIDI routing, native transport and Poly/Realtime are unchanged.


## Practice filter UI synchronization — 2026-10-19

bootstrap filter change handlers capture checked before invoking stop/pause, because WaitController.publish synchronously calls renderTrainerUi and restores form values from AppState. State is then updated, saved, configured and rendered. tests/practice-filter-controls.test.js exercises the real handlers against this reentrant repaint. Menu grouping belongs to index.html/menu-controls.css; each tolerance setting keeps its label and description together in a full-width parent group with expandable detailed policy text. Filtering semantics and availability rules are unchanged.


## Optional score range and released-onset tolerance — 2026-10-19

score-range-filter.js is pure score-geometry policy, called by WaitSession after Hex onset interpretation and before grading. It validates native tuning/capo/transposition against target notes; current nonzero written frets define the shape, expanded by ±5 with open strings separately allowed. Written target pitches always pass. Hex uses the reported string; Poly tests every possible string without attaching inferred physical identity. Missing/inconsistent geometry fails open. The optional filterScoreRange preference defaults false, is restored independently, and travels through bootstrap → WaitController → WaitSession with the selected track's staves. An ignored event earns no credit/penalty and cannot become held evidence; its raw event and explicit written-score range stay in midi-capture. This is Wait-only score-based tolerance, not a physical hand-position limit or strict fingering grading.

hex-tracking-spikes.js also confirms a second pattern besides the original soft/distant rule: wrong onset released ≤5 ms and replaced ≤20 ms after onset by the unique written same-string pitch at equal/greater velocity. Candidates remain channel-, target- and retry-bound and are removed on intervening same-channel attacks/pause/session replacement. Corrections retain a reason in trackingSpikes. The original correct-onset path stays immediate. UI help describes both policies; diagnostics include filterHexSpikes/filterScoreRange so future reports identify the policy actually selected. See MIDI-ARTIFACT-AUDIT-2026-10-19.md for captured evidence and limitations.


## Native tab rendering compatibility — 2026-10-19

Bundled assets/vendor/alphatab/alphaTab.js has a narrow TabBarRenderer.collectSpaces guard: emit a fret-number staff-line gap only when the indexed string line exists. GPX can contain pitched notes without string/fret assignments; indexing an absent line previously aborted the system paint. This patch covers both main-thread and worker rendering without score mutation or inferred fingering. All native layout, lazy loading, repeat transport and app grading remain unchanged. tests/native-tab-render.test.js exercises later/final systems through the actual renderer. Retain or reassess the guard on vendor updates.


## Confirmed tracking-spike reconciliation — 2026-10-16

hex-tracking-spikes.js is a pure candidate/confirmation policy (velocity ≤20, release ≤70 ms, distance ≥9 semitones, correct follow-up ≤200 ms and ≥2× velocity). WaitSession owns a bounded per-channel candidate map with references to original wrong entries and original target/retry. It always grades first and can remove exactly one penalty only after a captured raw release and the next correct same-channel attack on that same target/retry. Mapped written-string pitch establishes distance/confirmation, without making general grading position-based. Intervening attacks consume candidates; optional filterHexSpikes gates use in Hex only. Bend updates can edit the same entry, but removal requires it still exist. Pause clears candidates; session lifecycle resets them. Releases share the controller's pause-adjusted attack clock.

practice-preferences owns the independent validated filterHexSpikes boolean (first-use on), bootstrap wires its Wait-Hex-only toggle and existing stop/reconfigure path, and app-state carries the choice. Realtime, Poly, MIDI routing and native alphaTab do not filter input. feedbackHistory.trackingSpikes, confirming outcome.trackingSpike and capture snapshots expose reconciliation while original raw onset/wrong evidence stays intact. This supersedes historical statements that no spike filter exists. A brief provisional wrong mark is possible; no buffering or synthetic attack is used.


## MIDI device preferences — 2026-10-16

midi-device-preferences.js owns versioned, validated browser storage under gts.midiDevices: up to 64 profiles keyed by WebMIDI input ID and a last-selected identity (null means None). Profiles contain inputMode, singleChannel, hexChannelBase, hexChannelReverse, pitchBendRange and latencyMs. Exact ID wins; only the last-selected device can migrate automatically through a unique name/manufacturer match. This is browser/origin-local persistence, with safe in-memory operation when storage is unavailable.

midi-router saves the outgoing profile, restores the incoming profile before attaching its listener, and publishes the completed transition so bootstrap resets/configures existing sessions with restored settings. Controls save edits immediately through saveActiveMidiSettings; latency display reflects restored values. Inventory refresh waits for the persisted selection, including startup before USB insertion, with no first-device/loopback fallback. None clears automatic selection without deleting profiles. waitingInputName exposes a pending return to the device selector; its disabled placeholder allows choosing None even while no inputs are connected. Existing listener/access epochs, stale message guards and bounded detach/close behavior remain intact. No grading or native alphaTab behavior changes. This supersedes the older ID-only/manual-reselect guidance below.

## MIDI lifecycle and UI scheduling — 2026-10-16

midi-router owns connected input inventory, selected/preferred input identity and listener/access epochs. It ignores output-only or structurally unchanged connection notifications, filters disconnected ports, detaches/closes its former owned port once and rejects stale queued callbacks. Preferred input IDs survive unplugging; another device is not silently substituted. Reinitialization detaches prior handlers and late permission completions are ignored. If the same physical port is rebound during initialization, deferred old-port cleanup does not close the new binding. close failures are contained without retry loops. Availability/selection notifications publish after the transition completes, not from clearActiveMidiNotes mid-switch.

Router onStateChange supplies message/device/inventory/settings reasons. Bootstrap schedules only device/debug DOM work through frame-task.js and skips the redundant pre-grading full trainer refresh on ordinary messages. MIDI callbacks and capture remain synchronous. WaitController publishes the next gate once on completion; bootstrap tracks publication revisions to avoid drawing the same result again. Device resets suppress intermediate Wait DOM paints while preserving state updates. Cached dropdown options are rebuilt only when inventory/channel choices change. Native alphaTab timing, rendering ownership and grading decisions are unchanged.

midi-capture revision-caches formatted report text, invalidating on mutations to serialized evidence. Its internal reportData tree can be stringified synchronously without a full clone; the exported object API still clones to protect evidence. Capture-limit UI waits for the final grading outcome before generating text. These reduce repeated DOM/allocation work, but do not prove the cause of a reported full-browser USB-disconnect hang. Physical Chrome/Fishman acceptance remains pending.

## Onset-bound bend applicability and lifecycle — 2026-10-16

This supersedes the broad bend-state interpretation/persistence in the preceding implementation below. MidiPitchState keeps raw channel bends for diagnostics separately from active raw onsets and applicable correction anchors. noteOn binds channel/rawMidi/time; bend can anchor an applied value only within 60 ms of that active onset. interpret uses the anchor only for its own rawMidi. An exact raw-base repeat can reuse it; a changed base or late/unassociated bend removes it. Raw Note-Off ends active eligibility but preserves an already observed repeat anchor. Raw bend values alone cannot transpose a new base note. This is bounded attack correction, not a full MIDI expression model.

WaitSession construction resets its shared interpreter, so starts/new attempts/loops/configuration begin without inherited offsets; pause/paused attacks reset it as well. The chosen range remains unchanged. Session-local correction history, raw message preservation and original-target reconciliation remain intact. Applied bendValue and diagnostic channelBendValue are reported separately. The renderer uses the same anchored interpretation and has no grading authority. No alphaTab/native transport, Poly or Realtime changes.

## Wait Hex sounding-pitch interpretation — 2026-10-16

midi-pitch.js is the pure per-channel bend interpreter and saved range validator. WaitSession calls it for Hex Note-Ons; existing raw routing/channel acceptance/duplicate suppression remains in midi-router. Interpreted MIDI is round(rawMidi + bendValue * range / 8192). MIDI settings expose independently saved ±2/±12/±24 or Ignore, with owner-confirmed ±12 on first use. This affects Wait Hex only; playback pitch, score targets, Poly and Realtime are unchanged.

WaitController shares a MidiPitchState with session instances across start/loop/new-attempt actions and Pause/Resume; configure recreates it for changed score/input/settings. WaitSession retains channel-local attack identity/index/time and initial feedback. A bend within 60 ms can reconcile only an initially wrong still-held onset, on that onset's original record. If the resulting pitch is required, its old wrong count/history/live marker is removed before normal slot matching; otherwise the same single error's pitch is updated. Correction bypasses previous-target tail suppression and avoids adding another burst attack. It restores the current tail if editing history and cannot advance a different current gate. Raw releases clear corrected keys, old overlapping releases do not cancel newer attack identities, pause clears eligibility, and late bends invalidate held support without producing attacks. Already accepted onsets are not regraded for later expressive movement; full articulation grading remains deferred.

Capture rows retain raw input and initial decisions, with per-onset pitch interpretation, correction payloads and snapshot pitchCorrections. A false initial red mark may appear briefly until the follow-up correction arrives. History retains rawMidi/fromMidi/toMidi/range/bend/time and whether the interpreted note matches a requirement. Wait Hex fretboard held projections use the same interpreter; score overlays consume corrected session history. These display projections do not grade input. No extreme-fret, low-velocity or short-duration rejection is part of this change.

## Repeated Hex chord evidence — 2026-10-16

wait-chord-gesture.js owns pure eligibility for one supported held tone in a consecutive identical pitched chord. WaitSession owns held channel/pitch onset evidence, per-slot attack/held provenance and settlement; WaitController.advance invokes settlement using its existing pause-adjusted 50 ms clock and the same gate-completion path as received attacks. Routing remains raw normalization/filtering/held-duplicate suppression: it never manufactures a Note-On. Realtime is unchanged.

Scope is Collect/One at a time, six-string Hex, at least three slots, exactly one pending tone and all other tones freshly hit on distinct channels within min(200 ms, configured window). Matching prior/current MIDI+written-string signatures constrain repeated-chord recognition; fresh attack grading remains pitch-based. The prior tone must have actual-attack provenance, its original channel/pitch onset must remain held, and its channel must differ from the fresh ones. An inferred tone cannot support another occurrence. Releases, replacement pitches and noncentral bend invalidate evidence. Pause, session replacement, seeks, loops and new attempts clear it. Together, Poly, new chord shapes, muted targets and ordinary singles retain their attack rules.

Settlement waits the full bounded gesture window and at least chordGroupingMs quiet. The existing clock must service the decision within another chordGroupingMs; delayed/stale callbacks cannot create credit. Wrong pitches in a gesture prevent support. Fully attacked chords keep immediate progression. Supported slots count toward recognized chord correctness, with evidence='held'; feedbackHistory.supportedHeldNotes explicitly records freshAttack:false, stats.supportedHeld counts them and diagnostics disclose the distinction. Capture snapshots preserve the support list separately from raw events. This is conservative chord recognition, not independent detection of each string's reattack.

midi-router records listener-entry performance time before normalization; midi-capture stores receivedTimeMs, dispatchDelayMs and handlerDurationMs for an opt-in capture. These are browser/app timing diagnostics, not pickup or end-to-end latency. Existing capture remains before channel/held-duplicate filtering. Replay can verify every delivered byte and decision through this boundary but cannot establish whether a live physical strike generated or delivered a message upstream.

## Wait collected tones and percussive gesture boundary — 2026-10-16

WaitSession returns ignored-collected-tone for already-collected required pitches without adding credit, penalties or wrong-pitch history. Hex channel identity still prevents one channel from filling multiple same-pitch slots. Together expiry precedes duplicate handling and preserves its existing full-chord retry behavior. Real wrong pitches, stored feedback and Realtime grading are unchanged. This supersedes older statements that Wait duplicate required tones retain penalties.

Percussive tail state additionally retains lastAt and firstIdentity. Within the existing min(200 ms, configured chord window) bound, all X-tail messages remain ignored, including changing pitches on repeated channels. A quiet gap of TimingDefaults.chordGroupingMs (60 ms), or a repeated starting identity at least that long after the start, ends the guard. Hex identity is channel; Poly identity is pitch. Pitched tails retain the previous seen-identity/pitch rules. Sessions/seeks/loops reset the guard as before; the controller's pause-adjusted clock remains authoritative. This bounded heuristic can still merge exceptionally rapid gestures; hardware acceptance is pending. Rendering, alphaTab transport and MIDI normalization do not participate in this decision.

## Muted attack semantics and scoped tolerance — 2026-10-16

score-playback preserves isDead/stringCount, removes optional X notes from mixed practice groups, and flags all-X groups as isPercussive while retaining native source IDs. attack-rules builds shared Wait/Realtime slots: all-X groups have one wildcard slot covering their written notes. Native score/timeline data stays intact. practice-visuals omits dead-note frets from prescribed fretboard targets.

WaitSession owns a bounded previous-strum tail guard based on the final gesture's seen channel/pitch identities; WaitController keeps immediate cursor gating. Guard state resets with sessions/seeks/loops and uses the existing pause-adjusted clock. No generic single-note delay or short-note rejection is applied. Realtime favors an in-progress chord within its existing grouping window when matching overlapping occurrences; wildcard slots belong only to the nearest timed occurrence.

Superseded 2026-10-21: extraStringTolerance is off/internal/all, default off; legacy allowMutedStringNoise true migrates to all. Bootstrap passes scope to both sessions and pauses/clears results on changes. Shared ignoresMutedString always forgives explicit mutedStrings on supported six-string Hex targets, independently of scope and pitched-note count. Required pitched strings take priority. Optional unwritten-string tolerance requires two distinct pitched strings; internal uses their strict interior span, all includes outer strings. Ignored input cannot fill a required slot. Poly and unknown mappings cannot receive string-specific forgiveness. All-X targets still require one fresh arbitrary attack in either MIDI mode. This is not exact-position grading. Diagnostics retain scope/muted metadata and raw messages. Other filters remain independent.

## Independent score and recording selection — 2026-10-15

UI target selection preserves the selected recording-time field and never calls seekRecording. Saved marker click and drag diverge after the movement threshold; only an actual drag edits/seeks. The host reveals a chosen score target using boundsLookup.findMasterBarByIndex and bounded viewport scrolling, without native transport/cursor changes. Native tick/provider time continue to represent playback, while Measure/Beat is the independent edit target. Internal edit/nudge paths still update selected time and audition the saved point.

## Alignment indicator colors — 2026-10-15

CSS pairs the solid red measure target with a dotted red selected-time indicator. The moving playhead remains solid charcoal. This presentation change does not affect marker coordinates, interaction, grading or saved points.

## Absolute seek after point adjustment — 2026-10-14

media-controls.nudge commits the bounded point, then calls seekRecording with its new millisecondOffset and the prior running state. This final absolute seek overrides any relative provider movement caused by native updateSyncPoints, reusing source/seek generation guards and paused/playing preservation. No new host, grading or profile behavior is introduced.

## Fixed selected recording time — 2026-10-14

media-controls uses the Selected time field as the single explicit form-time value; the provider ticker updates only playback/status, never that selection. Seeks, typed input, point selection and point nudges/dragging update a separate noninteractive dashed SVG marker. renderPoints rebuilds it from the selected seconds, preserving selection through zoom/scroll/render. The Add/Update label derives from the target score position via anchorIndex; the one upsert path uses form seconds and pauses. Use playhead time copies provider time only. Profile data, native host boundaries and grading are unchanged; this replaces the prior live-default/typed-time split.

## Drag-release preview — 2026-10-14

media-controls snapshots playback state at anchor pointer-down. Actual movement pauses playback; successful pointer-up commits the bounded point and passes a resume request through seekRecording's existing source/generation guards. It seeks before resuming and resumes only in active sync editing when originally running. Paused/canceled drags do not start playback. syncPointLabel uses actual first score position for Start and final score position for End, independent of saved-list ordering.

## Sync editor preview state — 2026-10-14

media-controls projects editor visibility to ephemeral AppState.media.editing through host.setMediaEditing. Bootstrap pauses Wait before entry, gates practice callbacks/MIDI/clock, displays neutral feedback, and configures a fresh paused practice attempt on exit. practice-engine additionally guards direct entry points and rejects paused completion. Saved mode/preferences and external-source grading when closed are unchanged.

The host alone changes native range/loop/count-in/volume. Editing ignores Wait for audible playback and bypasses loop clamping; closing restores saved loop/mode behavior. Explicit media seeks retain playing state; paused samples never enter the native completion path. Provider notifications report state without initiating transport toggles. Saved-marker click versus drag uses a movement threshold. Anchor nudges use a preservePlayback option; explicit alignment/dragging pause. syncPointLabel distinguishes End, measures, fractional beats and repeats without changing profile points.

For editing beyond a mapped score endpoint, native cursor samples stop four ticks before End to account for alphaTab tick rounding; actual provider/clock time remains unrestricted within the recording. Provider seeking follows native tick seeking so a clamped score position cannot overwrite the requested recording time. Normal graded playback retains native completion behavior.

## Missing waveform presentation — 2026-10-14

media-controls.renderWaveform projects a noninteractive SVG baseline/divider and viewport-centered seeking hint when a recording has no decoded peaks. It refreshes on zoom/scroll and decoder state changes, then is replaced by actual peaks. Markers, playhead, timestamps and seek handlers are unchanged; no remote processing or synthetic waveform is introduced.

## Fixed media alignment target — 2026-10-14

media-controls keeps target Measure/Beat independent of the provider playhead. Timeline number/arrow clicks and measure fields select then seek; waveform seeking never changes target. Target status reads both positions; target lines occupy SVG y16–31 and the dark playhead y33–84. Explicitly typed seconds remain stable through transport; otherwise the field follows provider time, with deliberate seeks refilling it. Only explicit align/typed actions, anchor drags and nudges edit points (guide double-click creation removed). No profile migration or grading changes.

The host's explicit seekMediaTime schedules a one-time cursor reveal after UI positioning/seek acknowledgement. Public native scrollToCursor handles enabled scrolling; the rendered native beat cursor provides a bounded viewport reveal with ScrollMode.Off. Saved Auto-scroll and playback following are unchanged. Reveal/seek generation guards cancel obsolete work on source replacement/restoration.

## Media timeline screen geometry — 2026-10-14

The padded SVG time coordinate remains unchanged. media-controls counter-scales label text along X only, preserving font height as the timeline widens. It suppresses colliding measure text in screen coordinates, prioritizing selected/saved anchors while retaining guide hit targets. Visible waveform columns are reprojected from the detailed envelope on zoom/scroll; CSS non-scaling strokes prevent zoom from thickening the waveform/playhead. Time labels remain inside the SVG bottom edge. These are display projections only; sync points, native seeks and grading are unchanged.

## Shared media practice clock and native seek — 2026-10-14

Latest owner scope includes Realtime grading with external media. AppState.media.preview remains the internal flag for external source selection; it no longer means ungraded listening. media-practice.js projects attack onsets via existing flat sync points and exposes provider-clock interpolation, bounded to 100 ms and stopped during pause/buffering. practice-engine uses these projections only for Realtime timing; original expected events, note IDs/pitches and playback timeline are retained. Bootstrap routes MIDI/position/state callbacks in either source, suppressing them only during asynchronous source restoration. Source/alignment edits reset the Realtime attempt.

alphatab-host.js remains the only runtime native boundary. seekMediaTime explicitly sets media time and native tick position while paused. Shared Tempo updates handler rate/native speed together; rejected provider rates leave AppState unchanged. Source switches retain current Tempo percentage. Wait uses native paused target seeks with the recording muted; a separate click context supports its existing count-in/metronome when external output lacks a synth context. Media clock/sync-point state clears on source restoration or score change. YouTube's adapter applies cued seeks immediately, guarding seek-triggered autoplay until main Play.

Media Sync is More-only. The optional panel contains video/scrubbing, with no duplicate transport or rate selector. Audio-only playback uses the editor timeline. Add / update point captures the actual playhead; grouped Use typed time is the alternative upsert. Arrowhead-only selection hit regions allow waveform-body seeking. Existing saved profiles and visibility preferences remain compatible. This supersedes earlier listening-only architecture and estimated-time Add behavior below.

## Compact sync editor follow-up — 2026-10-14

The owner superseded the first unified layout. media-controls.js now keeps source/profile fields in media-popup; only mode choices, Save/status, zoom, inline point tools and waveform remain in the main editor. Add point projects the selected measure/beat via mediaTimeAtTick/pointTick and upserts only after explicit activation; an existing position is selected rather than modified by Add. Use playhead time and Apply time share the existing validated upsert path; the separate selected-update action was removed. Inline seconds/nudges and point controls precede the waveform. Popup point chips are a secondary selection aid, not another synchronization mechanism. Native calls, grading, flat point/profile formats and preference ownership are unchanged.

## Unified Media Sync workspace — 2026-10-14

media-controls.js moves existing source/mode/profile controls into the editor while retaining their IDs and storage handlers. Direct toolbar/More actions toggle editor visibility; secondary media-popup retains layout and profile management. Practice/Recording select the existing host modes; selection does not autoplay or alter panel visibility. Main transport retains existing native calls and practice-state restoration. This supersedes the earlier Listen/reveal contract.

media-timeline.js projects repeat-aware beat guides from the existing playback timeline and flat points, maps padded SVG coordinates, bounds anchor moves, preserves zoom focus and reduces detailed waveform envelopes to visible columns. Guides do not change grading or become saved anchors until explicitly activated. media-controls owns capture, selection, pointer preview, keyboard nudges and zoom. SVG preserveAspectRatio=none avoids the old centered-drawing/rect-width mismatch; endpoint padding preserves hit targets. Source changes invalidate waveform work. media-player.js decodes a bounded detailed multi-channel envelope; no raw audio or waveform enters profiles. Existing flat sync point/profile formats and alphatab-host.js runtime boundary remain unchanged.

Known audio/embedded sources use a dedicated HTML audio element outside the optional video panel. HTML media readiness waits for playable data; rapid native seeks coalesce until the current seek finishes, retaining the last requested target. Handler disposal removes seek listeners and pending work. The expanded editor's first-use/reset preferred height is 400 px; existing saved heights and viewport fitting remain intact.

## Workspace panel lifecycle — 2026-10-14

workspace-panels.js owns bounded editor/fretboard size preferences (`gts.workspacePanelSizes`), pointer/keyboard dividers and viewport fitting. workspace-panels.css uses a flexible vertical workspace with scroll fallback below minimum usable sizes; preferred sizes survive fitting to smaller viewports. The fretboard renderer targets a separate content element so its close/resize controls survive rendering. Unsupported tracks show a short explanation. Media visibility remains in gts.mediaLayout; fretboard visibility uses the existing Display change handler. Toolbar exposes its existing close operation for Listen. No sizing code calls alphaTab or grading.

The host forwards supplied onScoreLoading/onScoreLoadError callbacks during registration, fixing omitted lifecycle notifications that could retain old media on a new score. Browser regression covers ordinary score switching after alignment editing.

## Media listening, alignment and profiles — 2026-10-13

- media-sync.js validates sources, repeat-aware FlatSyncPoints and profile JSON and creates tempo-aware initial alignment. It has no player or grading calls. media-player.js owns HTML/YouTube handlers and optional waveform decoding; third-party scripts load only on explicit source loading.
- media-controls.js owns source/editor/profile UI, generation guards, undo/redo, passive SVG timeline, object-URL lifetimes and injected host intents. gts.mediaLayout stores placement, divider proportion and panel/editor visibility. Recordings are not stored; optional waveform generation is limited to short/small local files.
- library-store.js migrates guitarTrainerLibrary to schema v2 with mediaProfiles keyed by id. Profiles match original score SHA-256 and source metadata. A user-selected local profile can explicitly relink to a recovered file with changed metadata; its points validate against the loaded score timeline and media duration before the profile source is updated. Library backup v2 includes profiles; v1 remains readable. Merge validates before an atomic additive transaction, remapping/deduplicating profiles. Standalone sync backups use their own v1 format. Score/profile deletion is independent.
- alphatab-host.js snapshots practice cursor/speed/source sync/Wait settings, selects EnabledExternalMedia and restores EnabledSynthesizer. AppState.media.preview/returning gate bootstrap grading/clock/Wait notifications; initial recreated-worker zero positions are withheld through the restore seek acknowledgement. The original timeline/formulas are retained. Count-in/Wait click caches are invalidated when native output contexts change. Listening has no synth mix, metronome or count-in; scored stretched-media timing is separately deferred.
- A narrow host guard fixes the 1.8.4 worker's recursive loadedMidiInfo getter using its cached field, leaving correct versions untouched and vendor files immutable. Asset URLs resolve relative to the host module for consistent root-app/browser-harness loading.
- media-sync.css uses separate score/video grid regions, saved responsive placement/divider controls and narrow-screen stacking without modifying native score geometry. HTML-video PiP works where supported; YouTube floating has contextual help. TrueFire/extension/native-app automation remains absent.

## Optional vendor maintenance — 2026-10-13

tools/alphatab is repository maintenance tooling, independent of browser runtime. The updater resolves this checkout from its own path, downloads an explicit stable @coderline/alphatab package (latest suggested when omitted), checks SHA-512 registry integrity and staged asset/version completeness, then replaces assets/vendor/alphatab with rollback on installation-move failure. It installs the UMD library plus complete matching core/worker/worklet modules, Bravura fonts and Sonivox soundfont. vendor-manifest.json records version/source/integrity and per-file SHA-256 hashes. Tool-local .work/.backups are ignored; backups retain the full prior directory until manually removed. The tool never runs Git mutations, changes app version/state or edits application modules. alphatab-host.js remains the sole native runtime boundary and Live Server remains build-free. Tooling verification does not establish acceptance of an installed alphaTab upgrade; this task leaves 1.8.1 installed.

## Fretboard first-use defaults — 2026-10-13

AppState.ui and display-preferences.js both default showFretboard to true and leftHanded to false. Existing gts.displayPreferences booleans override these defaults independently; no migration resets saved false visibility or true orientation. This supersedes older Display defaults without changing persistence, native rendering or grading.

## Compact fretboard/help ownership — 2026-10-13

initFretboard accepts a Display help status element alongside the neck container. renderFretboard projects explanatory/model status there while the neck container contains only its accessible SVG/scroll wrapper. index.html owns static Display help text. fretboard-geometry.js owns compact string spacing and symmetric inlay gap positions; six-string double inlays are between 2–3 and 4–5. Rendering still consumes existing model/session evidence and never changes MIDI, native score geometry, grading or preferences.


## Score-defined fretboard — 2026-10-13

practice-visuals.js projects selected-staff tuning length, capo/transposition, tab targets, accepted note states and live wrong-note evidence into the neck model. Arbitrary usable tuning counts are supported; six-channel hints restrict positions only for six-string tracks. Pitch-only output enumerates possible positions without new inference or grading. fretboard-geometry.js owns equal-temperament wire spacing, distinct note centers, adaptive width and left-handed reflection. fretboard-ui.js consumes this model for SVG neck/inlays/strings/markers and preserves scroll during feedback. Bootstrap passes existing liveWrongNotes so multiple held wrong pitches remain red. No alphaTab integration or MIDI/session rules moved. See FRETBOARD.md for tests and limits; original Stage 6 six-string restrictions are superseded for this visual only.


## Display preferences — 2026-10-13

Scores without any diagram shape data temporarily use Score Default (2026-10-14). alphatab-host.js detects diagram data across the loaded score and publishes transient AppState.scoreHasChordDiagrams; display-preferences.js derives an effective placement for the host and UI without mutating the preferred AppState.ui.chordDiagramPlacement. The storage writer still saves only that preferred value. Mixed scores with at least one shape retain the preference. Bootstrap resynchronizes Display after score load; the fallback selector is disabled with contextual help. This restores source stylesheet settings exactly and does not modify native engraving or vendor assets.

display-preferences.js owns validated gts.displayPreferences localStorage data for zoom, auto-scroll, fullscreen-on-Play, chord-diagram placement, view mode, fretboard visibility and left-handed orientation. bootstrap restores before control/native startup; display-controls.js persists zoom/scroll/fullscreen/chord placement, bootstrap persists view/fretboard intents. Orientation availability follows visibility without clearing orientation. alphatab-host.js's native track initialization keeps AppState.viewMode instead of overwriting it. Native zoom/render/scroll, chord-diagram stylesheet rendering and gesture-based fullscreen remain alphaTab/native behavior; placement can follow each score's saved defaults or globally select in-score, top-of-score or hidden diagrams. Persistence never starts playback or fullscreen. Preferences exclude track identities, audio, scores and results. This supersedes prior session-only Display persistence notes.

## Compact Practice composition — 2026-10-13

chord-controls.js synchronizes visibility of the practice-wait-controls wrapper with AppState.mode, hiding it in Realtime without clearing or rewriting saved settings. Existing chord enablement/commits and native/grade intents remain unchanged. index.html keeps detailed timing guidance in a collapsed disclosure and menu-controls.css reduces Practice-only spacing while preserving touch-target heights and phone stacking.

## Persistent Practice preferences — 2026-10-13

practice-preferences.js owns validated localStorage data under gts.practicePreferences: Practice mode, four independent Score feedback booleans and Wait chord mode/window. bootstrap restores these before wiring controls and native initialization; existing UI intents save after setting state. Score-load handling keeps them. First-use defaults are Realtime, collect/200 ms and all feedback on, superseding older default-off Poly guidance. Reads tolerate malformed/inaccessible storage and invalid fields; writes tolerate storage failures. Session results, MIDI, track selection, other Display preferences and transport state are excluded. No preference read invokes playback, grading or alphaTab.

## Library and mixer boundaries — 2026-10-13

- library-store.js owns IndexedDB transactions, original-byte fingerprints, versioned backup validation/serialization and atomic additive merge. guitarTrainerLibrary v1 has folders/scores keyed by id; scores carry title/fileName/folderId/hash/original Uint8Array bytes. Imported ids remap and content deduplicates without replacing existing metadata. This is separate from score-playback.js's parsed timeline and Piano storage.
- score-library.js owns the Scores panel: top-level open/save/backup/merge actions, folder navigation, search, multi-file import, per-item action dialogs and the compact loaded-score context. Parsing is an injected loadScoreFile intent. AppState.currentScoreFile is populated only on successful native scoreLoaded from pending original bytes; loading clears it and stale asynchronous reads are guarded. Bulk imports parse only on opening. No alphaTab rendering or trainer logic here.
- audio-controls.js owns saved master-volume preference/form state and connected groups of overlapping native primary/secondary MIDI channels. AppState.audio.tracks holds session percentages/mutes keyed by group indices; scoreLoaded resets the mix. Backups exclude preferences/results.
- alphatab-host.js remains the native boundary for masterVolume/changeTrackVolume/changeTrackMute. Mixer edits apply without rerender/seek/grade reset. Practice/backing gates combine with group Mute; any enabled member permits a shared group. Independent Wait/count-in gain multiplies by master. count-in.js exposes gain-only setVolume on its cancellation function, retaining timing/cancellation behavior.
- Practice/Display changes affect labels/composition/disclosures. chord-controls.js adds Enter/blur commits and ignores unchanged intents; WaitSession matching is unchanged. See SCORE-LIBRARY.md for workflows, browser-origin boundaries and acceptance. No build/vendor/deferred-feature changes.
- Practice composition follow-up puts track selection first and exposes the existing Poly checkbox directly under incorrect fret numbers. Responsive CSS places the chord window beside Wait choices and dims unavailable fields; chord-controls.js retains its existing enablement rules. This is markup/CSS only, with the same IDs and feedback/grading intents.

## MIDI and feedback text recording — 2026-10-12

Added opt-in Start/Stop recording, Mark screenshot, Copy report and Save text report in Settings → MIDI & practice diagnostics. The readonly text block contains a readable message timeline followed by complete JSON evidence in the same .txt report; no Chrome logs are needed. Capture records normalized raw channel bytes before filtering, pitches/channels/velocities, paired durations, duplicate held attacks, device/configuration, score/tuning context, target before/after and returned grading outcome. It also records relevant feedback projections after messages and up to 100 timestamped screenshot/stop snapshots with current target, visibility, results, live mistakes and overlay marks. Capture stays in page memory, defaults off, replaces the previous run on Start, and caps at 10,000 messages. No uploads, score-file content, saved preferences, filtering or grading changes. The accepted historical-number left nudge and native spacing are preserved.

Validation: 166 tests pass, including routed Hex/Poly Wait evidence, 3ms octave attacks tied to retained fret 25, screenshot snapshots, limits and selectable-text clipboard fallback. Browser Start/Mark/Stop report generation and compact controls checked without physical MIDI. The cause of the owner's unexpected historical errors remains unconfirmed; TriplePlay Realtime has not been tested. Owner should hard-refresh, record a short Wait passage, pause at unexpected feedback, mark/take a screenshot, stop and copy/save the report; use separate Hex/Poly recordings.

## Historical fret-number horizontal nudge — 2026-10-12

Historical wrong fret numbers now sit 2px left of their previous position at 100% zoom (scaled with score zoom), closer to the right edge of the corresponding tab outline. Their vertical alignment, live numbers, Hex/Poly inference, grading and native score spacing are unchanged. This is a small horizontal adjustment, with no collision hiding, stacking or padding.

Validation: 162 automated tests and module syntax/diff checks pass. Owner browser acceptance remains pending: hard-refresh and compare retained numbers with live feedback at normal and enlarged zoom.

## Menu follow-up boundaries — 2026-10-11

Display mode and MIDI input source are native radio groups. Host UI synchronization enables/selects display radios; bootstrap dispatches the same existing display/input intents. Toolbar touch enlargement depends on the primary pointer rather than any available pointer, avoiding oversized buttons on desktop touchscreen systems. Popup touch controls and collapse thresholds remain unchanged.

`display-controls.js` owns zoom/scroll/fullscreen form state. `alphatab-host.js` applies native scale and scroll mode, rerendering only for scale changes. Bootstrap requests fullscreen on a ready player's start/resume gesture, then follows existing transport handling. Preferences stay in AppState for the page session.

Practice and Wait chord modes are named native radio groups; chord-controls.js gates chord inputs while WaitSession owns matching. Reverse Hex (`midi.hexChannelReverse`) is input normalization, independent of mirroring: lowest string uses base and subsequent strings use base−1 through base−5. Valid bases are 6–16 reversed or 1–11 forward. Router filtering and normalized hints share channelToStringHint; pitch grading is unchanged.

## Loop/count-in contract — 2026-10-11

- loop-controls.js owns the persistent enabled highlight on Loop and its More shortcut, plus a More marker when the toolbar collapses. Bootstrap routes native drag selections through transport-controls to selectByDrag. Only an off-to-on drag shows the nonblocking, polite status notice for three seconds; subsequent enabled drags stay silent. Disabling/loading or further range edits clear stale notices. Presentation uses menu-controls.css and does not change native selection, transport or grading.
- transport-controls.js composes loop-controls.js and tempo-controls.js. Loop controls issue validated playback-order range intents; both sliders/number fields are linked, arrows step by one and crossed endpoints push the other endpoint. Bootstrap owns pause/reset/session configuration. Loop CSS composition reuses menu-controls.css; no independent slider/spacing design.
- AppState.practiceLoop contains enabled/countIn/startIndex/endIndex/range. Both switches start off and reset on score load; no localStorage. Full song is the initial range choice. An enabled range constrains seeks; native mouse dragging expands native beat selections to whole playback measures and enables that range. Runtime native calls/events remain in alphatab-host.js.
- Native isLooping/playbackRange handle continuous Realtime repeats. Repeat count-in instead leaves isLooping false and restarts native playback after its finished/rewind sequence plus a pre-roll. Wait loops its existing filtered target list; accompaniment remains paused. No grade-formula change.
- count-in.js computes a one-bar timing plan and schedules the cached native click on the shared Web Audio context. Meter comes from the starting written measure, Realtime BPM from the source tempo map × speed, Wait BPM from its fixed reference. Volume uses the saved metronome percentage independently of the enable switch. Play/resume always pre-rolls; loop pre-roll is optional. Host generations cancel stale preparation/completion on pause/reset/mode/range/score changes; AppState.countInActive keeps native cleanup callbacks from starting Realtime grading during pre-roll. Existing manual latency policy is unchanged.
- WaitController accepts an injected countIn operation and a loopCountIn setting. The count-in phase blocks note acceptance and independent metronome activity; completed pre-roll opens the normal gate. Its duration is excluded from Together chord active time. Repeated passes bypass pre-roll when unchecked. No alphaTab or audio dependency in the controller.
- loop-visuals.js projects excluded written measures to native bounds and expands native tick selections to full playback measures. The host draws a passive, pointer-transparent SVG, clears it during rendering and redraws after layout/range changes. Repeated written bars are visible whenever any selected occurrence uses them. Loop off/full selection produces no shading. Visual geometry never changes grading or MIDI interpretation.

## Tempo/metronome contract — 2026-10-11

- `js/tempo-controls.js` owns BPM/speed/volume validation and presentation, five-step buttons, control availability, and the short visual pulse. It reads the normalized tempo map, dispatches injected intents and never calls alphaTab or grades MIDI. Numeric commits keep precise state separate from rounded display values.
- `menu-controls.css`, loaded after style.css, is the shared menu design source: the .toolbar-popup variables define padding, gaps, control dimensions, number/arrow sizes, slider track/thumb sizes and colors. All popup shells and existing card/form groups inherit common spacing and form heights; new/refined menus reuse .menu-content, .menu-row, .menu-number, .menu-steppers and .menu-option. Tempo-specific composition remains at the bottom of this file. Horizontal arrow pairs keep rows 44px tall; range inputs are 44px high with 24px visible thumbs, increasing only to 28px on coarse-pointer devices. Touch arrows are 44 × 44 (fine-pointer arrows 32 × 44); narrow rows wrap. Both WebKit and Firefox retain native input behavior. Previous duplicated Tempo CSS in style.css was removed. Avoid copying these design values per menu; reuse the classes or override a shared variable for a justified layout difference.
- `js/transport-controls.js` composes Tempo and occurrence-aware Loop controls (see current Loop contract above). `AppState.metronome` owns startup defaults (off, volume 75%, visual pulse true); tempo-preferences.js validates/restores/saves volume only in localStorage. Downbeat accent is only an explicitly disabled UI placeholder. MIDI output is absent.
- Realtime BPM is current score tempo × native playback speed; editing BPM derives that same multiplier, preserving the source tempo map. Bootstrap retains the existing Realtime pause/reset path. Wait tempo edits apply the multiplier without resetting/pausing the Wait attempt.
- Wait latches a reference score BPM on mode entry/score readiness. Its effective BPM is reference × speed and does not follow subsequent cursor movement, source tempo changes, note solving or loop rewinds. The click runs only for an active, non-paused Wait session; accompaniment stays paused and no grading event comes from it.
- `js/alphatab-host.js` is the sole alphaTab boundary. Main playback retains native metronome volume/filter/events; visual callbacks map the native event within its processed audio block to the speaker output timestamp (latency fallback), canceling pending pulses on pause/seek/disable/mode exit. Wait renders one native AlphaSynth/Sonivox click, then metronome-clock.js schedules copies on the main player audio context with matching visual callbacks. It cancels sources/timers on stop, skips stale beats after stalls, and never seeks or grades the score. Repeated UI sync/volume updates leave beat phase intact; BPM changes restart the independent clock. Async preparation consults the latest state; errors disable the metronome and surface player status. The bundled vendor is unchanged.
- Rendering, MIDI normalization, grade formulas, and deferred features are unchanged. Browser smoke checks cover desktop/narrow layout and actual Wait pulse; automated coverage includes the native output buffer and click samples. Physical Fishman and audible acceptance remain pending.

## Current maintenance contract — 2026-10-11

Root README.md describes running and checking the app; AGENTS.md records standing agent instructions. This remains a static browser app using bundled alphaTab and WebMIDI, edited directly in the local project folder and served through VS Code Live Server in the owner's normal browser with a Fishman Connect. This documentation/version cleanup introduces no runtime or build-system changes.

Current baseline: **Beta v0.0.3**, with `version.json` value `0.0.3`; owner creation of the `v0.0.3` tag follows the version-update commit. The previous `v0.0.2` tag remains a historical checkpoint. This metadata update introduces no runtime or architectural changes. Git publishing and deployment remain owner actions unless requested. Project documentation is the durable handoff between chats; earlier ChatGPT **Guitar Trainer** history is optional context if accessible.

Current feedback contract: one Staff visibility control; independent tab feedback highlights and incorrect fret numbers; saved conservative Poly inference enabled on first use; no mandatory Hex string-check gate. Staff feedback draws green correct history and red mistakes; thin blue expected-note outlines are omitted. The narrower, faded light-blue cursor marks the active beat. Tab draws compact translucent red error marks and darker green correct marks for the active target only, above the cursor; historical correct tab frets remain unmarked. Numeric Hex/Poly feedback is plain red at the native tab font size beside the score string, with translucent backing and no prefix/border/pointer or custom spacing. Both input modes grade pitch; strict-position grading remains deferred. Historical entries below preserve earlier designs and validation results, not current instructions where superseded.

## Dated implementation history

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

User confirmed live circles work and clarified completed chord behavior: a clean lower tone must remain green when the higher tone had mistakes. This supersedes earlier whole-chord-red rules for configured Hex input. Wait now retains each slot's written string and publishes completed error colors only for slots whose string has a received-wrong-pitch record. Realtime tab summaries use the same per-string rule; Realtime standard notation retains its existing hit/missed colors. Poly or unknown/invalid string metadata keeps the conservative whole-target summary. Errors on a detected string absent from the written target retain history/fret detail without accusing clean written tones. This is display attribution, not strict-position grading or an inferred intended pitch.

The measure 83 case was tested using both correct pitches on MIDI channel 4 in Wait and Realtime. Both are accepted, remain green, produce 100% accuracy and zero wrong-fret labels. This passed even against the previous version: there is no channel-mismatch rejection to remove. The supplied screenshot's retained fret 17 therefore cannot be explained by those two correct attacks alone; the original score/MIDI sequence is needed if it recurs. Do not erase genuine earlier wrong-pitch history just because all required tones were eventually satisfied. No special completion exception or scoring change was added.

131 tests pass. New regressions exercise measure 85's Bb dyad and measure 83's D dyad through normalized MIDI, Wait controller publication and Realtime finalization; three chord regressions fail against the prior update. Native tab geometry now verifies two green tones plus one red completed-error tone across four profiles and three scales. Browser/physical MIDI acceptance remains local. Apply this changed-files ZIP after the live-circles update. No version/tag bump, menu restructuring, deferred features or Piano Trainer changes.

## Active Hex tab outlines and notation control scope — 2026-10-10

`tab-feedback.js` now prepares live `tab-error` marks with state `wrong` for pending expected frets on strings identified by active received-wrong Hex events. It consumes published live errors, note states and occurrence history; it does not grade, alter MIDI, or infer Poly positions. Accepted chord tones retain green. Completed error summaries take precedence, independent note releases remove only the live marks, and current repeat occurrences override older feedback. Realtime can retain attribution to an earlier event until finalization, using session event IDs.

Bootstrap calls this projection in both modes independently of the wrong-fret-number switch. Existing `notation-feedback.js` geometry limits `tab-error` to native tab bounds and suppresses the corresponding normal outline, so there is one red outline without recoloring standard notation. CSS adds solid red for live `wrong`; missed/done states retain their prior styles. alphaTab owns all layout and transport; scoring and native spacing remain unchanged.

Notation visibility remains a master plus two detail filters: **Show all notation feedback** hides expected note colors and actual played-pitch overlays; held/history toggles select only those mistake noteheads under the master. Tab circles/frets are separate categories, and full internal history survives every visibility change. UI labels/help clarify this existing contract. 127 automated tests pass; native geometry is covered across four tab profiles and three scales. Browser/physical MIDI acceptance remains pending.

## Side fret feedback and independent display switches — 2026-10-10

Live and retained Hex wrong-fret numbers now share the same position beside their detected string, with no connector lines or placement routing. The latest wrong fret per string remains after completion in Wait and Realtime. Double digits remain visible at 12px scaled with the score. Native score spacing and pitch grading are unchanged. Dense adjacent targets may overlap; users can hide fret details independently while keeping circles.

Display now groups three default-on switches: **Show notation feedback**, **Show tab feedback (circles)** and **Show tab feedback (frets)**. Each affects only its overlay category. Existing live/history notation controls remain. No Practice menu reorganization or string verification is introduced. 124 tests pass, including independent host visibility, pointer-free retained rendering and six-string side geometry at three scales.


## Remove mandatory string setup — 2026-10-10

User explicitly rejected the check-string button and its feedback gate. Removed its UI, runtime import/wiring, MIDI interception and verification state. Configured Hex channels now enable live/retained fret numbers immediately; **Show mistakes on tab** remains the display option. No verification flag, saved setup, checkbox or calibration is required or consulted. Existing channel-base mapping and score tuning/capo/transposition validation remain. Poly positional inference is still deferred. Native spacing stays restored. The old standalone setup helper/tests are inactive historical code; no browser module imports it.

124 tests pass, including normalized Hex MIDI → Wait live/retained geometry and Realtime feedback without verification. The user's Four On Six GP3 was imported and its first target exercised end-to-end: live and retained fret 12 both produced visible geometry without setup. This decision supersedes all earlier mandatory setup/verification requirements for tab feedback; optional future strict-position grading remains separate.


## Tab setup usability and native spacing correction — 2026-10-10

The user's Four On Six GP3 reproduced the spacing regression: native first-system notation-to-tab gap is 56 units; the prior 108-unit padding raised it to 164. Removed all custom staff padding. Retained markers now use at most two compact rows in native inter-staff space, trying neighboring horizontal placements with pointers before allowing overlap in extremely dense feedback. No empty six-row lane is reserved. Live two-digit visibility remains unchanged.

The guided-check button was disabled during active practice, preventing the user from reaching the required verification. It now stays enabled for a selected Hex device; clicking pauses via the existing Wait/Realtime pause path and starts the guide, preserving grading. Display shows a clear status when Hex selection or string verification is needed. Fret feedback still requires completed physical-string/channel verification; Poly is not guessed. Native rendering of the supplied song was inspected with live 16 and retained 12. 122 tests pass, including a running-practice setup-button regression. Physical MIDI setup/feedback acceptance remains local.


## Live/retained tab lanes and Realtime feedback — 2026-10-10

Latest user agreement supersedes the earlier disappearing-history and collision-omission rules. Live wrong frets are 12px, translucent-backed, directly on the detected string beside the target; no pointer, and no suppression for crowding or double digits. Retained detail is the last wrong fret per detected string/target in a six-row lane above the tab, with a thin string pointer. Native alphaTab display padding reserves the lane, increasing vertical score spacing. Retained collisions try another row; extreme density may overlap within the lane, a deliberate prototype limitation requiring local acceptance. Native black frets remain unchanged; live overlap is temporary and intentional.

`string-setup.js` replaces the manual checkbox with a guided **Check string setup** action, low-to-high channel checks, and browser-storage verification keyed by MIDI device ID/base channel. The Display **Show mistakes on tab** switch defaults on and controls live/retained numbers independently of string setup and notation-history visibility. Setup must be run paused; its attacks do not grade, while releases still clear prior live errors. Saved configurations can be restored; recheck after external hardware-routing changes.

`RealtimeSession` now stores target-attributed received-wrong pitch/channel/string records, independently released live markers and finalized history. `practice-engine.js` publishes them and handles releases while paused. Existing timing attribution, accuracy and notation correct/missed colors remain unchanged. Finalized Realtime wrong-pitch targets now retain a red tab outline, even with detail hidden, so errors remain marked in place. Duplicate required tones/out-of-time attacks do not fabricate wrong-fret positions; Poly string inference and strict-position grading remain deferred. Wrong-pitch notation and Practice review now consume both modes' histories. `tab-feedback.js` owns occurrence-aware latest-per-string projection and geometry; the alphaTab host owns SVG badges/pointers and native padding. All feedback follows score scale. See STAGE-8-TAB.md for behavior/acceptance. 121 tests pass; native SVG visual checks completed; physical MIDI testing remains local.


## Temporary Hex tab detail — 2026-10-10

`tab-feedback.js` implements display-only Wait wrong-fret markers. MIDI settings now include a manually confirmed **String mapping checked** checkbox. It defaults off, is not persisted, and clears on input-device, input-mode, or base-channel changes. Verify every physical string using MIDI Debug before enabling; configured channels or MPE alone are not verification.

The adapter accepts only six-string non-percussion tuning, valid capo/sounding transposition, and expected notes whose MIDI agrees with their written fret. It derives one latest active wrong fret per detected string (0–36), using occurrence-specific live records. Native alphaTab reverses string numbering relative to trainer events; geometry converts explicitly. It prefers the expected fret on that string as the horizontal anchor, otherwise the target column, and projects onto the detected string's native tab line. A small red number with a white background sits to the right; original black frets remain unchanged. Native fret bounds, bar edges, inter-string spacing and badge collisions gate placement; crowded/unsupported cases omit the badge. No retained wrong-fret list is painted.

Release updates the live markers independently; completion removes them and preserves existing red/green expected-target outlines. Existing live-errors and score-feedback visibility controls apply. Pause/Resume, grading, full pitch history, Poly behavior and Piano Trainer are unchanged. This increment is Wait-only, not Realtime wrong-note attribution or strict-position grading. Poly inference remains deferred; a future experiment may start with ±1 fret and require a unique remaining assignment, but must not treat inference as detected position.

Validation: 110 automated tests; native tab geometry across Default/ScoreTab/Tab/TabMixed and zoom, all six detected-string lines, capo/transposition, latest-active selection, release/completion gates and collision omission. Native SVG visual check confirms expected black frets remain readable. Physical MIDI and Chrome local acceptance remain required; see STAGE-8-TAB.md.


## Overview

Implementation status and priorities are tracked in `TODO.md`; development decisions and user validation are recorded in `DEV-NOTES.md`. The v1 scope below is a design goal, not a list of completed features.

Guitar Trainer Studio should be a sibling app to Piano Trainer Studio, not an instrument mode inside it.
The app should preserve native alphaTab features wherever possible and layer custom trainer logic on top.

### Core split

**alphaTab owns**
- score loading
- notation/tab rendering
- zoom and layout
- track rendering and track visibility
- playback transport and playback timing
- per-track mute / solo / volume behavior
- repeat and ending playback behavior

**Custom app code owns**
- MIDI input normalization
- single-channel vs hex MIDI interpretation
- practice track selection
- correctness and scoring
- realtime / wait-for-me mode behavior
- fretboard rendering and overlays
- saved preferences and app-specific UI

## Cleaner tablature feedback — 2026-10-13

The alphaTab host still uses native bounds for custom feedback but filters expected/correct tab outlines; staff notehead feedback remains intact. The independent tab highlight preference now gates red error-state targets only. Those marks use compact, upward-shifted translucent rounded fills without a border, snug to native fret bounds. A CSS pseudo-element widens the visible green beat band with a horizontal fade on both sides and replaces the narrow center fill, compensating alphaTab's cursor scaling without changing its native bounds, timing or positioning. Fret-number overlays remain independently controlled. The in-app legend distinguishes staff, tab, cursor and fretboard colors. No grading, MIDI/history, Poly inference, native score rendering or transport behavior changes. 201 Node tests and changed-module syntax checks pass; visual/browser/Fishman acceptance remains pending.

## Menu organization — 2026-10-11

index.html composes existing controls without changing their IDs or business logic. Practice contains mode/track/timing and visual-feedback switches; Display contains visible-track scope and existing custom six-string fretboard controls; Audio contains selected/backing playback switches. Settings hosts a closed native details disclosure for MIDI/practice diagnostics and full retained history. Clear practice results is the renamed existing attempt action, preserving position and playing/paused state. Help supplies basic setup guidance.

menu-controls.css remains the shared touch-friendly menu design owner, including compact remaining-menu composition and Piano-style toolbar appearance. toolbar-ui.js uses 1060/960/620px collapse/condense/stack boundaries and publishes measured toolbar height for popup positioning. All alphaTab integration remains in alphatab-host.js.

Library, mixer/output and Media & Sync were future destinations and are now implemented. The Audio menu supports a synthesized-score playback offset from -12 to +12 semitones through alphaTab's native per-track channel transposition; `pitch-controls.js` owns the form and `alphatab-host.js` owns the native call. It resets for each newly loaded score and does not change written score/tab or practice expectations/results. Separate saved Synth master and Synced media volumes are owned by `audio-controls.js`; `media-controls.js` applies the media value to loaded local/direct/embedded HTML media and YouTube playback. Full score transposition by semitones or key remains deferred: alphaTab's staff transposition offset changes pitch for notation/playback but does not rewrite guitar string/fret fingering, and practice targets must remain aligned with the chosen transposed notes. A playback-only offset never updates trainer expectations. Generalizing the custom fretboard to score-defined string counts is separate from extending six-channel positional input mapping. No Follow/virtual piano implementation is planned in this menu pass.

## Module responsibilities

### `js/app-state.js`
- Source of truth for app session state, user preferences, selected tracks, and trainer mode.
- Holds normalized data shared across modules.
- Must not contain renderer logic or correctness rules.

### `js/alphatab-host.js`
- Owns all alphaTab integration.
- Initializes alphaTab, loads files, reads track data, updates rendering settings, and forwards playback events.
- Must be the only module that talks directly to alphaTab APIs.

### `js/midi-router.js`
- Owns MIDI device setup and note event normalization.
- Tracks held channel/pitch pairs and suppresses duplicate Note-On messages until the matching Note-Off; it records no grading decision, and forwards the release and next fresh attack normally.
- Emits normalized note-on/note-off events for the practice engine.
- Must not decide whether an event is correct.

### `js/practice-engine.js`
- Owns trainer correctness logic, scoring, and active-target management.
- Reads expected note events from the selected practice track only.
- Consumes normalized MIDI input and playback position updates.

### `js/score-playback.js`
- Normalizes alphaTab's generated playback occurrences, including repeats and endings.
- Exposes required attack groups and tempo conversion helpers; tied continuations do not become new attacks.

### `js/practice-range.js` and `js/transport-controls.js`
- Practice-range validates measure occurrence selections and filters attacks by onset within the selected tick range.
- Transport-controls owns Tempo/Loop form wiring and invokes bootstrap actions. All alphaTab speed/range operations remain in alphatab-host.
- AppState.practiceLoop records the applied range. Realtime uses native looping; Wait loops its filtered target list without starting score playback.

### Realtime transport retention
- alphatab-host freezes app-side playing state on manual Pause and forwards one-shot `isPauseSnap` metadata for the native Pause seek; it does not predict the cursor beat from delayed playback ticks. Play, stopped events and score mouse-down clear unused protection. practice-engine reanchors the Pause position without resetting grades and retains results through non-seek position rollback while paused.
- practice-engine preserves grades on unchanged-position native seek acknowledgements and the non-loop Finished → rewind → Paused sequence; actual seeks, loop passes, explicit resets and completed replay start fresh grading.

### `js/attempt-controls.js`
- Owns Practice → New attempt here button wiring/readiness only. Bootstrap routes the intent to `newRealtimeAttemptHere` or `WaitController.newAttemptHere` and clears held MIDI display.
- Session modules clear results/feedback at the current position without issuing transport calls; preserve running/paused state and exclude earlier targets. Wait clears partial chord/retry/live/history/pass data while retaining the gate and any outstanding cursor acknowledgement.

### `js/realtime-session.js`
- Owns attack matching, chord timing, misses, and scoring for Realtime.
- Receives normalized events and clock values without directly calling alphaTab.

### `js/wait-session.js` and `js/wait-controller.js`
- WaitSession collects required attacks and computes untimed results. It stores occurrence-specific wrong-pitch attack history and live channel/pitch errors separately from retry/duplicate-required penalties; note-off removes only the corresponding live error.
- WaitController owns target progression and manual pause state through injected transport operations.
- A completed target immediately seeks to the next target while native playback remains paused. No duration requirement or backing playback is used.
- Collect notes accumulates pitches without a time limit. Together uses a configurable active-time attack window, expires incomplete attempts, and keeps retries separate from wrong-note scoring. WaitController subtracts paused time from the MIDI/controller clock.
- WaitController publishes history/live feedback and archives completed pass records for review, preserving grading/history through Pause/Resume and clearing live markers at target completion.
- Loop completion starts a fresh Wait pass; Realtime native loop seeks reset grading for the next pass. Score loading clears section selection, while playback speed is retained for the session.

### `js/practice-timing.js`
- Owns timing thresholds and helper rules such as early/late windows and chord grouping tolerance.
- Keeps timing math out of rendering and UI files.
- Validates Wait chord setting limits; Realtime retains its separate existing chord tolerance.

### `js/chord-controls.js`
- Owns Wait chord-setting form wiring and validation feedback. Bootstrap pauses/resets the Wait session when settings change.

### `js/fretboard-ui.js`
- Owns visual neck rendering and display overlays.
- Renders expected notes, played notes, and correctness feedback.
- Must not contain correctness rules.

### `js/practice-visuals.js`
- Converts published grading records into per-note display states and resolves repeat occurrences onto written source-note IDs.
- Prepares six-string target and possible played positions using score tuning/capo, without enforcing string correctness.
- Prepares occurrence-aware live/retained wrong-pitch records separately from target red/green summaries and identifies supported standard-notation bounds; it never guesses Poly frets.
- Maps prepared marks to native note bounds supplied by the host. Current occurrence feedback takes priority over earlier results for the same written note.

### `js/notation-feedback.js`
- Owns pure wrong-pitch spelling and notation-overlay geometry. Host supplies native note bounds, stave profile, zoom and engraving metrics; this module never calls alphaTab.
- Chooses spelling using the local bar key signature. Explicit vector accidentals (including naturals), notehead-sized red dots and ledger lines show wrong pitches without long score text. All wrong pitches use the target anchor’s single horizontal cursor column, with a fixed adjacent accidental position. Same-line/neighboring pitches may overlap; never spread them horizontally into other targets. Repeated identical pitches share a dot, while Practice retains the complete attack history.
- Projects sounding MIDI to displayed pitch with beat/clef ottava and staff display transposition, using native five-line treble/bass/alto/tenor staff coordinates. Checks the projection against actual rendered original notehead bounds and omits unsupported/inconsistent wrong-note geometry. Never uses the native accidental helper's unregistered-pitch fallback or mutates renderer/model accidental state.
- Returns native staff notehead and tab target bounds; the host filters historical clean targets, draws compact active-correct green and error-red tab marks, then renders SVG after native post-render completion. Grading/lifecycle stay in Wait/Realtime modules.

### `js/tab-feedback.js` and `js/poly-feedback.js`
- Tab-feedback projects live/completed Hex errors to expected strings and validates sounding pitch, tuning/capo/transposition, and native tab bounds before deriving wrong-fret display geometry. Accepted clean tones retain their mode-specific green feedback; unknown Hex string metadata uses conservative target summaries.
- Poly-feedback captures an association only when one pending slot with one written note remains at the wrong attack. It prepares optional inferred target/fret overlays from genuine wrong-pitch records, without changing grading or attaching an invented detected string to stored MIDI/history. Ambiguous attacks remain unassigned.
- The host renders these pure projections through independent Staff, tab highlight, and fret-number visibility settings. Numeric estimates use the same native font-size/side geometry as Hex numbers; SVG titles and the inference control explain their estimated status. `js/string-setup.js` is inactive historical code, not a runtime prerequisite.

### `js/toolbar-ui.js`
- Owns menu wiring and user controls.
- Updates state and dispatches intents to other modules.
- Must not contain trainer or alphaTab business logic.

### `js/score-library.js`
- Owns file-browser and score-library behavior.
- Folder UI deletion now matches Piano Trainer (2026-10-14): a Cancel-first warning precedes deleting selected folders and their contained saved scores through library-store.js's atomic `deleteFoldersAndScores` transaction. The loaded score and sync profiles are independent. This supersedes UI removal-to-Unfiled behavior below; legacy storage retention methods remain available.
- Scores-pane header composition groups folder title/count separately from Add File(s)/Manage actions; existing IDs retain their handlers. Search spans its own full row, and CSS wraps header groups at narrow widths.
- Owns transient independent folder/score Manage modes and selection sets. Search/folder changes clear score selection; bulk controls appear only while managing. `library-store.js` owns atomic bulk moves/deletes and folder removal that retains scores in Unfiled. These operations do not change loaded score state, sync profiles or display preferences.
- Can later mirror the Piano Trainer Studio library model.

### `js/app-bootstrap.js`
- Owns startup wiring.
- Initializes modules in the correct order and attaches cross-module events.

## Data flow

1. User loads a score.
2. `alphatab-host.js` loads the file and exposes track data.
3. `app-state.js` stores available tracks and the current practice/playback selections.
4. `toolbar-ui.js` lets the user choose a single practice track and optional playback tracks.
5. `alphatab-host.js` mutes/unmutes tracks and forwards playback position updates.
6. `score-playback.js` normalizes the generated timeline; `practice-engine.js` selects expected events for the configured practice scope.
7. `midi-router.js` emits normalized user input events.
8. Bootstrap routes input to the Realtime engine or Wait controller/session. Those modules evaluate correctness.
9. Bootstrap prepares visual data through practice-visuals.js. Fretboard-ui renders the neck, while alphatab-host places non-interactive staff feedback and compact tab error marks at native note bounds. These displays do not grade input.

## Key rules

- Only `alphatab-host.js` may talk directly to alphaTab.
- Never mix MIDI parsing with correctness logic.
- Never let UI files decide whether a note is correct.
- Never let fretboard rendering own trainer rules.
- Practice logic should operate on normalized score data and normalized MIDI data.
- V1 should allow exactly one practice track.
- V1 should support zero or more playback tracks.
- Drum tracks may be playable as backing tracks later, but should not be valid practice tracks in v1.

## MIDI modes

### Single-channel MIDI
- Typically provides pitch and timing only.
- Does not reliably identify string or fret.
- Best paired with `Pitch Only` correctness.

### Hex 6-channel MIDI
- Maps one channel per string.
- Can provide string identity when configured correctly.
- Enables `Exact Position` correctness.

## Correctness modes

### Pitch Only
- Accept if pitch and timing match.
- Best for single-channel input or looser practice.

### Exact Position
- Accept only if pitch, string, and position requirements match.
- Best for hex MIDI and fretboard-specific practice.
- Planned: current hex handling distinguishes same-pitch attacks by channel, but does not yet enforce the required string/fret position.

## Recommended v1 scope

### Keep in v1
- alphaTab rendering
- track selection
- app playback
- realtime mode
- wait-for-me mode
- virtual fretboard
- left-handed display option
- single-channel and hex MIDI input modes
- pitch-only and exact-position correctness modes

### Defer
- follow-me mode
- MIDI import
- LED integration
- live scale recommendation overlays
- chord-tone theory overlays
- advanced articulation grading
- bass / 7-string / alternate tuning depth beyond basic architecture support

## Future extensions

- Alternate tunings and capo-aware fretboard transforms
- Bass mode
- Scale / chord-tone overlays
- LED hardware integration
- Deeper alphaTab preference persistence
- More advanced track practice combinations
