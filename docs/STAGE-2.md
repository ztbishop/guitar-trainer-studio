# Stage 2: occurrence-aware score/playback mapping

Built from the tested Stage 1 copy. No Git push or deployment was performed. The archive omits Git metadata; the UI, CSS and bundled alphaTab files are unchanged.

## Behavior

Practice targets now come from alphaTab's generated playback lookup. A written beat that plays twice has two distinct playback occurrences and note IDs. Repeats and alternate endings follow alphaTab's order. Actual onset ticks also respect swing/triplet feel. Targets become idle in rests, tie-only gaps and beyond the last attack; seeking/resetting uses the current playback tick to select the proper occurrence. Earlier sustained voices no longer hide later onsets.

A new `js/score-playback.js` adapter retains per-note source identity, occurrence identity, pitch, string/fret, attack/continuation status, tie links, start/end ticks, durations and score-time milliseconds. Same-pitch notes on different strings stay separate. Contiguous played ties extend the original note's sustain duration without adding another required attack. The adapter retains rests and continuation beats even though the current pitch diagnostic uses attack groups only.

alphaTab uses low-to-high string numbering. Normalized string numbers now use the familiar guitar convention (1 = highest string); `sourceString` preserves alphaTab's number. Pitch comes from alphaTab's resolved value, including its tuning/capo model. Exact-position grading is still a future stage.

The tempo map uses alphaTab's generated tempo points. Tick-to-time and time-to-tick helpers support a supplied playback speed, defaulting to 1. These are score-time conversions, not an input-latency clock. Later realtime grading still needs a performance timestamp/playback-clock anchor, latency compensation and navigation resets.

## Integration and data contract

- `alphatab-host.js` reads `api.tickCache` on `midiLoaded`, normalizes it and stores `AppState.playbackTimeline`. The cached sequence is available after MIDI generation, not during `scoreLoaded`.
- `onPlaybackTimelineChanged` rebuilds selected-track targets. Score loading immediately invalidates the previous timeline and disables transport readiness.
- `buildExpectedEventsFromPracticeTrack` filters the normalized timeline by selected track. There is deliberately no written-tick fallback while playback data is unavailable.
- `getPracticeEvents` groups simultaneous attacks across voices/staves without discarding individual note identities. `targetEndTick` caps a diagnostic target at the next onset; note sustain durations remain separately available.
- alphaTab owns audio transport and the native cursor. The adapter only provides data; it does not implement Wait Mode or timed grading and can also support other practice modes later.

## Verification

Run from the project root with Node 22 or newer:

```sh
node --test tests/stage1.test.js tests/stage2.test.js
```

18 tests pass. Stage 2 exercises the actual bundled alphaTab importer and MIDI generator for repeat order, alternate endings, ties across beats/bars, rests, unison chord identities, tempo changes/repeats, overlapping voices, swing and mid-measure tempo automation. Additional checks cover target seeking/end boundaries and invalidation. The host wiring test uses fake DOM/transport with an actual generated tick cache. All application JavaScript passes syntax checks.

Browser/audio and physical MIDI verification are still required. No new claim of hardware validation is made.

## Quick local check

1. Copy this archive's contents into your existing GuitarTrainerStudio folder, preserving your own `.git` directory. Serve it with your usual local development server and refresh the browser.
2. Load your GP3 file and confirm sound, green cursor, scrolling and transport still work.
3. Open Practice. On a score with repeats, watch the expected measure and pitches as playback returns to the repeated passage. The displayed event number counts playback occurrences rather than only written beats.
4. If available, check a score with first/second endings. Expect the skipped ending not to appear as a target on that pass.
5. Pause/reset or seek with the existing score interaction. Check that targets follow the new playback position. Rests and tie-only passages should show no active required attack.
6. Switch practice tracks and load another file. Confirm targets switch/reset and no old-score pitches remain.

## Remaining work and limits

The existing Match/Partial/Mismatch feedback is still a held-pitch diagnostic, not completed realtime grading. It can treat ringing extra strings as incorrect and does not require new attacks. Wait Mode, missed-note scoring, tempo/loop controls and notation feedback remain later stages.

The timeline uses beat playback spans and contiguous ties for musical duration. It does not reproduce every synthesizer gate length, staccato/let-ring effect, brush delay, bend, ornament or dead-note policy. Special cases such as pre-bar grace notes, simile bars, count-in offsets and externally synchronized backing audio still need dedicated fixtures and browser validation before claiming complete score coverage. Future grading must define those policies explicitly.

Next: Stage 3 timestamped realtime matching, chord attack accumulation and correct/wrong/missed results.
