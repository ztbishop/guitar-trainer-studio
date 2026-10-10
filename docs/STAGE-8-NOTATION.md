# Stage 8 notation feedback refinement — 2026-10-10

## Delivered behavior

- Wrong pitches in Wait now appear as separate red notehead-sized dots on their actual staff lines/spaces, horizontally anchored at that target. The long Heard/Errors pitch lists are removed from the score. Exact attack history remains in Practice.
- Live markers appear while held, disappear independently on release and return as retained history when the target is completed. Identical repeated wrong pitches share one displayed dot; the full attack list remains in history. Visibility controls, repeat/pass isolation and resets remain unchanged.
- Wrong-pitch spelling uses the local bar's key signature. In Bb major, a received Bb appears on the B line with a flat rather than on the A line with a sharp. Chromatic spelling remains a key-based inference, since MIDI supplies no enharmonic spelling. Explicit accidentals, including naturals, are shown on supplemental mistake markers even when the key signature supplies them; they never alter native score accidental state.
- Ledger lines are drawn for wrong notes outside the staff. All wrong pitches stay vertically aligned at their own target’s horizontal cursor position. Same-line or neighboring-space dots/accidentals may overlap; no collision avoidance moves them into another beat. Dense clusters can still require local layout acceptance.
- Expected standard-notation noteheads receive filled green/red overlays, while current ungraded targets retain blue outline guidance. In Wait, completing after wrong pitches still leaves red on the expected target even if the final attack was correct. Realtime correct/missed targets also use filled notehead overlays. Additional received-wrong pitch dots remain the existing Wait feature; Realtime grading is unchanged.
- Tab feedback stays as readable outlines around the written fret numbers. Completed-with-errors stays red, clean completion green; no wrong-fret inference or permanent detected-fret replacement is included.

## Placement and limits

The pure adapter uses native note/beat/bar bounds and the current engraving metrics. Five-line treble, bass, alto and tenor staff projection includes native display transposition, beat ottava and clef ottava. Sounding input is not assumed to equal guitar's written octave. The projected original notehead positions must match actual native bounds before extra dots are allowed. Tab-only profiles, percussion/neutral or non-five-line staves, unsupported extra notation and inconsistent/special geometry omit wrong dots instead of guessing; the Practice history remains available. Native expected-note overlays continue to use their actual bounds.

Feedback uses filled ellipses and vector accidental shapes. Original noteheads, stems, beams, accidentals, score structure and native playback are untouched. Drawings are non-interactive overlays, rebuilt after render/zoom/layout changes. Preferences remain session-only. Existing Pause protection and New attempt here behavior remain in this update.

## Verification

Run `node --test tests/*.test.js`: **105 tests pass**. New tests compare projected wrong pitches with independently laid-out native reference notes in 60 clef/key/zoom combinations, plus transposition, capo and octave markings. Coverage also checks key-aware Bb/A# and naturals, ledger lines, single-column alignment for same-line and neighboring pitches, distinct-pitch deduplication, notehead versus tab shapes and unsupported/invalid layout handling. Host redraw/toggle assertions now cover wrong-note groups, accidental paths and preserved tab outlines. Prior lifecycle/history/transport tests remain passing.

Native SVG output with combined score/tab, flat-key accidentals, ledger notes, chord mistakes and green/red/blue targets was rasterized and visually inspected. Browser automation could not run because no Chromium executable was available. Actual Chrome worker rendering, scrolling and physical MIDI still require the local checks below. Package reconstruction and JS syntax are checked during ZIP creation.

## Local acceptance

Apply this changed-files ZIP over the latest Pause Guard project and hard-refresh Chrome (Ctrl+Shift+R).

1. **Single wrong note:** in Wait, hold a wrong pitch. Its red dot must sit at the played staff line/space, not the expected note's position. Release: it disappears. Complete the target: it returns in retained history, and the original expected notehead/tab outline stays red. Complete another target cleanly: green.
2. **Bb spelling:** load a Bb-key passage, with G as a target. Play Bb. Confirm a red dot on the B line/space with an explicit flat; it must not appear as A#. Play B natural too: confirm an explicit natural at the B position, with compact separate placement if both are retained.
3. **Chord/release:** play two wrong pitches, release one, and verify only its live marker disappears. Solve the chord and review both. Try repeated attacks of the same wrong pitch; one dot should represent it while Practice retains all attacks.
4. **Octaves/ledger lines:** check low and high wrong notes on the guitar track; written placement should match the score's octave convention. Check capo/transposed material if available.
5. **Views/zoom:** test notation-only, combined and tab-only views; resize, scroll, change zoom and switch tracks. Dots/accidentals must follow the staff, tab frets remain readable, and tab-only grading still works. Toggle live errors, retained history and all score feedback, then restore them without losing grades.
6. **Transport/regressions:** Pause/Resume must retain results and drawings. New attempt here clears them without moving the cursor. Reset and intentional seeks clear them as before. Check repeats/loops for occurrence/pass separation. Realtime keeps its existing grading and fills expected noteheads green/red.

## Next scope

Validate this notation increment before adding temporary verified-Hex detected-fret markers. Preserve tab's original-number red/green completed summary. Poly fret inference, strict-string grading, Follow, harmony/media work and Piano Trainer changes remain deferred.

## Target-column correction — 2026-10-10

Removed the sideways collision-avoidance layout after the user screenshot showed second-target mistakes extending across the correctly played first target. All live/retained wrong noteheads and ledger lines now share their target anchor’s horizontal center; accidentals use one fixed adjacent position. Same-line pitches may overlap, but belong visibly to the correct beat. The detailed attack list remains available in Practice. All 105 tests pass.

Local check: play the first target correctly, then several neighboring wrong pitches on the second target. Release them and complete the second target. All retained red dots must remain vertically aligned with the second target; none should migrate over the first green note. Repeat while holding several wrong pitches, at another zoom, and with a chord target. Tab outline behavior and Pause/Resume should remain unchanged.
