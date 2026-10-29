# Practice fretboard

## Wide-screen proportions — 2026-10-29

The neck is centered and its requested width is capped at eight times the usable panel height. Taller manually resized panels permit wider necks; the panel itself stays full width. Smaller viewports retain readable fret cells and horizontal scrolling. Marker/text scaling, orientation, saved sizing and feedback semantics are unchanged.


## Missed targets stay blue — 2026-10-29

Current targets no longer turn red merely because their Realtime attack window was missed. They remain blue until ordinary advancement replaces them or presents them as context. Score notation/history and miss totals are unchanged. Incorrect played-note rings keep their existing red/release behavior, and green accepted feedback (including partial Wait chords) is unchanged. Completed-with-errors feedback is also unchanged: this is specifically suppression of missed-target red, not a redesign of all error feedback. This supersedes older descriptions of red missed targets below. No saved preference or new control is added.

Updated 2026-10-23. Supersedes Stage 6's original six-string-only display.

## First-use defaults and saved choices — 2026-10-24

Owner selected visible fretboard, Beat + Bar, note-name labels, alternate positions off, left-handed off and automatic sizing. Only the view default changed from Beat. App-state, initial selector and display preference read/save fallbacks agree on internal `bar`; valid saved `beat`, `next` and `bar` modes still override defaults. Other settings/persistence already matched. `gts.displayPreferences` stores visibility/view/labels/alternates/orientation; `gts.workspacePanelSizes` separately stores manual sizing/automatic fit. Hiding/showing and score loading retain saved choices; temporary target/played/browsing data remains session state. No MIDI, grading, native alphaTab or preview algorithm change.

## Alternate-guide contrast — 2026-10-24

Alternate guides retain their size, dashed outline and dark fill, with a slightly thicker pale-blue border at 70% opacity and brighter labels at 90%. They remain distinct from solid current targets, gold previews and stronger correctness feedback. This styling-only adjustment changes no settings or practice behavior.

## Replayed collected tones also clear after advancement — 2026-10-24

If a player releases and replays an already collected Wait chord tone before supplying the remaining notes, the evaluator's existing ignored-collected-tone outcome supplies no extra credit or error. That replay is now associated with the existing accepted target pitch for fretboard display, so holding it into the next target no longer leaves purple rings. This applies to Poly and Hex, including repeated replays; current partial-chord feedback remains visible. An ignored outcome alone is insufficient: its exact event/pitch must already have accepted note states. Wrong, filtered, unknown and fresh paused input retain existing behavior. No grading, note-release, held-note tolerance or score/tab feedback change; alternate-guide styling is unchanged.

## Continuous bar preview and optional alternate positions — 2026-10-24

Beat + Bar retains the current measure's faint past and gold future positions. On its final written onset, when no later onset remains in that playback measure, it also previews exactly the next onset in gold. Entering that measure replaces the context with its full contents. Previews follow native repeat occurrences and enabled loop returns; Beat + Next Beat also previews the loop's first onset at its endpoint. Rests remain empty rather than skipping to a later attack. A nonlooping song end adds no preview. Simultaneous voices at the next tick are one preview beat; current written targets still win at overlapping positions.

Gear → **Show alternate positions** is independent, saved in display preferences and off on first use. It draws faint dashed blue guides for the current written target's exact sounding pitches elsewhere within the displayed fret range, using selected tuning/capo/transposition. It does not show octave equivalents, infer physical fingering or grade input. Written positions (including bar/next-beat context) take priority at shared coordinates; live held/wrong rings render above guides. Alternatives remain faint regardless of correctness. Note-name/fret labels apply normally; finger labels are blank on alternatives because different positions have no explicit supplied fingering. It applies equally to Poly and Hex, independently of score feedback and Poly mistake inference. README now describes these features and accepted-tail/paused-ring behavior for players.

## Accepted held tails stay out of the next target — 2026-10-24

In Poly and Hex, a held attack already accepted on an earlier target no longer draws its leftover played-position rings after the target advances. This hides clutter without releasing the input, creating a wrong note or changing held-note tolerance. Current-target green feedback and genuinely wrong held rings retain their existing behavior: Poly shows possible wrong-pitch positions; configured Hex uses its string mapping. If the current target explicitly earns held-note credit, its accepted feedback remains visible. Accepted pitches from chords completed with errors are still accepted tails; the session's errors and score feedback remain intact.

Pausing keeps previously accepted tails hidden, while fresh ungraded notes played during pause remain visible in neutral purple. Release/replay is a new attack and does not inherit the old hidden status, even for identical pitch/channel. Fresh ungraded rings do not borrow stale green/red last-feedback colors. They never add grading credit or errors. Staff/tab feedback, results, MIDI held state and Wait progression remain independent and unchanged. Earlier descriptions of all held positions staying visible until release are superseded for these known accepted tails only.

## Short frames scale the full neck — 2026-10-24

Manually shortening the frame now scales the full fretboard down to show every string instead of adding a vertical scrollbar. Circles stay round; labels, capo and spacing scale together. Horizontal geometry reflows to use the available width, with horizontal scrolling retained where needed. Automatic fit remains at the normal readable size; enlarging a manual frame never enlarges markers beyond that size. Existing saved manual heights/mode and double-click/Home automatic reset are unchanged. Very short choices intentionally produce smaller text; reset to automatic to restore the standard size. This supersedes earlier descriptions of vertical scrolling for manual height choices below.

## Snug default with saved manual height — 2026-10-24

The divider can again make the frame shorter than the full neck. First use automatically fits the rendered neck; outer padding is trimmed by 8px, and horizontal-scrollbar space is reserved only when needed. Six strings normally fit about 188px at a wide window or 206px with horizontal scrolling, without changing circles, text or string spacing.

Dragging or using Up/Down on the divider saves a manual height, with a 144px minimum for the local controls. A deliberately short frame can scroll vertically. Legacy numeric saved heights remain manual choices; automatic fitting no longer forces them larger. Double-click the divider or press Home while it is focused to return to automatic fit; Reset panel sizes also restores automatic mode. Both modes survive reloads, hiding/showing and score loads. In automatic mode the frame adapts to string count/width; in manual mode the saved size remains subject to existing viewport fitting. This supersedes the preceding hard content-minimum decision documented below.

## Frame fits the selected neck — 2026-10-23

When visible, the frame now has a content-based minimum height: rendered neck plus panel padding/borders and room for a horizontal scrollbar (about 214px for six strings, 358px for twelve). Small saved heights remain stored but no longer squeeze the neck into a vertical scrolling area. Larger saved heights still apply; changing tracks recalculates the floor. Manual resizing cannot shrink below the current content floor. Horizontal scrolling remains available on narrow windows. The old 32vh cap is removed; on short screens the surrounding workspace can scroll while preserving score space. The existing 400px panel ceiling remains for unusually tall unsupported-by-fixture string counts. This supersedes older guidance about routine vertical scrolling for the supported 1/4/5/6/7/8/12-string profiles.

## Single location for orientation/help — 2026-10-23

Display retains **Show virtual fretboard**. Left-handed orientation and fretboard help now live only in the neck's gear popup. The existing `leftHanded` display preference, default off, still persists across reloads/score loads and survives hiding the neck; no storage migration or key change. Popup Help retains the explanatory guidance plus live selected-track/tuning/support status. Earlier references below to orientation/help in Display are superseded by this location change.

## Readability and capo cue — 2026-10-23

Targets/context now use 20px circles and 12px text; held rings are 24px, with 24px string spacing. The neck keeps a fixed vertical geometry for its string count as the window changes. Only horizontal fret geometry reflows; circles remain round and labels do not shrink. The tapered spacing reserves at least 24px per cell, with minimum overall width `160 + 26 × maxFret` (784px at 24 frets; 1096px at 36). Below that width, scroll horizontally. This supersedes the earlier 1200px minimum/uniform SVG scaling behavior. Larger string counts can still need vertical scrolling in the existing resizable panel.

At widths below `160 + 42 × maxFret`, show capo-relative fret numbers 0, 3, 5, 7, 9, 12, 15, 17, 19, 21, 24 (and matching landmarks above 24), plus the final displayed fret and any current target frets. Fret 1 is omitted in this sparse view unless currently targeted; comfortable widths retain every fret label. No additional saved option is introduced. Resizing preserves horizontal browsing; mirrored necks preserve distance from the right edge so their nut/capo side stays visible when a full-width neck becomes scrollable.

An explicit **Capo N** badge appears above the string labels only when capo > 0, mirrored with orientation. This visual cue uses the existing selected staff capo; it does not change the existing capo-relative fret labels, sounding pitch calculation or physical-fret inlays. The neck is custom UI: alphaTab supplies the score metadata. Help, feedback colors, saved choices, navigation, grading and release behavior remain as before. No fading animation is added.

## Preview modes and local controls — 2026-10-23

The neck's ← / → / gear controls provide paused beat browsing and a local settings popup. Show defaults to **Beat**; alternatives are **Beat + Next Beat** and **Beat + Bar**. Labels default to **Note names**, with **Fret numbers**, **Finger numbers**, and **None** alternatives. These choices save independently in `gts.displayPreferences` alongside existing visibility and orientation. First-use visibility on/orientation off and all existing saved choices remain authoritative across score loads/reloads. Popup openness and cursor browsing are transient, not saved.

Current written targets remain solid blue, or existing green/red correctness colors. Upcoming positions use dark-filled gold outlines/labels; earlier positions in Bar use faint neutral outlines. Earlier context never retains correctness colors. Shared context positions are deduplicated, with current over future over past. Labels remain visible during correctness feedback; small ✓ / ! accents supplement color. Held-input rings retain their existing pitch/string rules and disappear on release. A still-held wrong input can remain red after advancing; this is live input, not retained historical target feedback. Poly green means the required pitch was accepted, including playing another neck position; it does not establish the physical string/fret. Score feedback switches remain independent.

Finger numbers come only from explicit score `leftHandFinger` data: 1–4 or T for thumb. Missing/unknown fingering leaves a blank circle, without fallback or inferred fingers. Native fingering is carried through playback normalization without changing note IDs, pitch matching or required attacks. Both Poly and Hex still grade pitch.

Preview uses the selected track's native playback events, including rests/tied continuations and all voices. Next means the next written onset/subdivision, not a fixed quarter-note interval; a rest has no positions. Bar context stays within the current playback measure occurrence, not another repeat of the same written measure. Context respects the enabled loop and current staff tuning; different-staff context is omitted rather than drawn using a mismatched tuning. Existing pre-Play preview still starts with the next required attack; explicit arrow browsing can select a rest or tied continuation without making it a required attack.

Arrows pause transport, cancel count-in, clear held MIDI and existing attempt results through the normal session reset/configure paths, then seek natively. They never resume automatically. Press Play to start practice from that position; the normal count-in still applies. Arrows include written rests/subdivisions, respect loop endpoints, and disable without a ready player or during sync editing. Score clicks/loop changes supersede a stale browsing position. Gear orientation remains synchronized with Display's existing left-handed choice. Help explains colors, pitch acceptance and finger availability. The popup uses the browser popover top layer so the compact resizable neck does not clip its options.

Verification details and physical acceptance are recorded in the latest DEV-NOTES/TODO entries. The older sections below describe earlier checkpoints; their claim that label selectors are only follow-ups is superseded here.

More → Display → Show virtual fretboard uses the existing saved visibility/orientation preferences. The selected staff supplies string count, tuning, capo and sounding transposition, without an instrument-name gate. Before a score loads, the panel shows a standard six-string EADGBE neck with zero capo and frets 0–24. Once loaded, the selected track replaces that startup neck. Missing/invalid tuning and percussion in a loaded score still show an explanation instead of a guessed guitar neck.

First use defaults to Show virtual fretboard on and Left-handed off. Both choices persist in localStorage across sessions/score loads; saved preferences override defaults, including turning the fretboard off.

Narrowing fret spacing, nut, single/double inlays and pitch-based string thickness provide location cues. Thickness is illustrative, not measured gauge. Notes sit within fret spaces; open notes sit outside the nut. Fret numbers are relative to capo; inlays reflect physical frets. Left-handed mode mirrors the neck and positions. Horizontal scroll retains readable high frets and survives feedback updates. The height-limited panel protects score space; larger string counts can need vertical scrolling.

The compact panel shows only the neck and its functional labels. Its title, legend, explanations and current track/range status are in Display → Fretboard help. Reduced padding and string spacing let six/seven-string necks fit without vertical scrolling at 1280 × 720 (about 170/190px tall). Double inlays on six strings sit between strings 2–3 and 4–5; other counts use symmetric available gaps. One/two-string necks use a single center.

Before Play, the next written practice target previews in blue as soon as score events are ready, including after changing track or loop range. This is display-only and starts no grading or playback. Pause retains the current session target.

Targets are blue, accepted targets green ✓, and missed/error targets red × / !. Separate held-note rings are green for accepted pitches, red for wrong attacks, purple without current correctness attribution. Targets and rings can coexist. Release removes rings. This consumes existing session results/live wrong notes without changing grading or transport.

Poly/pitch-only input shows every possible position within the displayed range, not detected strings. Configured six-channel hints restrict positions only on six-string tablature. Other string counts explicitly explain the mismatch and fall back to possible pitch positions. This does not expand Fishman hardware mapping or enable exact-position grading. The neck shows frets 0–24 and extends through 36 for current targets. Unsupported target positions are explained; other score feedback remains available.

Expected markers currently show pitch-class names; fret numbers and open-string pitches stay labeled. Note-name/fret-number/off selectors and optional conservative Poly position inference are discussed follow-ups, not implemented controls. A future estimate should reuse the unambiguous-remaining-target rule where applicable and never silently pick among equally possible strings. The existing tablature estimate checkbox still governs score overlays independently; custom incorrect fret-number overlays retain their six-string limits. This pass generalizes the virtual neck.

## Verification

- 189 regression tests pass: native GP export/import and MIDI normalization for 1/4/5/6/7/8/12 strings, first/last strings, drop D/capo, selected staff/transposition, deduplication/release, simultaneous green and multiple red pitches, invalid tuning/positions, mirrored rendering, corrected inlay gaps, relocated help and geometry through fret 36. Native fixture sessions verify existing Wait/Realtime pitch acceptance.
- Synthetic `tests/fixtures/fretboard-multistring.gp` and normalized JSON regenerate with `node tests/generate-fretboard-fixtures.js` using bundled alphaTab.
- Live Server `tests/fretboard-browser.html` runs 56 real-DOM combinations (seven profiles × two orientations × four feedback states) without touching preferences/library/MIDI. Desktop and 390px phone checks pass without document horizontal overflow.
- Native app imported the generated GP file; all seven selected tracks produced matching drawn string counts. Physical Fishman, owner appearance/orientation acceptance and representative real bass/extended-range files remain local checks. Synthetic fixtures cannot establish every external file's tuning conventions.

No build, runtime dependency, vendor, grading, Piano Trainer, version or publishing changes.
