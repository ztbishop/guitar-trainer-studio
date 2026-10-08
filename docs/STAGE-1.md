# Stage 1: foundation fixes

Based only on the attached GuitarTrainerStudio(20261007-025645).zip. The original archive is unchanged. This update preserves the CSS, assets, alphaTab 1.8.1 and its cursor adjustment. No deployment or Git push was performed; the archive excludes Git metadata so it will not overwrite your repository history.

## Changes

- Chord pitch diagnostics reject extra wrong pitches and retain partial-match feedback.
- MIDI note release no longer independently advances targets. alphaTab playback is the sole progression source in this foundation.
- Target intervals exclude their end boundary; passing the final target clears it. Seeking back restores targets.
- Removed constant-zero timing checks which always returned success. Diagnostic matching now returns its actual status; timed grading is still unfinished.
- Removed no-op cursor synchronization and its callers; the native alphaTab cursor stays in place.
- Changing input mode/channel/base or device clears held-note and debug state. Releases remove tracked notes even after filter changes. Unrelated port changes preserve held notes on the selected input.
- Fixed hex string labels: base channel is string 6 (low E), base+5 is string 1 (high E).
- MIDI normalization retains message timestamps, separates controller data from notes and velocity, and decodes signed pitch bend. This does not implement bend grading or sustain handling.
- More-menu secondary panels participate in closing, switching, backdrop and Escape behavior.
- Settings updates now use the bundled alphaTab settings serializer followed by updateSettings() and render().
- Replaced the hardcoded 100% with a dash until scoring exists.

## Automated verification

Run with Node 22 or newer from the project root:

```sh
node --test tests/stage1.test.js
```

Eight regression tests cover pitch matching, release behavior, event boundaries, MIDI normalization/hex labels, mocked MIDI routing, popup dismissal, and host loading/transport/callback/settings wiring. Settings parsing uses the actual bundled alphaTab Settings class. Host and DOM checks use fakes; they do not verify real rendering, audio or hardware MIDI. All application JavaScript files also passed syntax checks.

## Local browser verification still required

Serve this folder using your existing development server, or:

```sh
python -m http.server 8000
```

Open http://localhost:8000 in Chrome or Edge. Localhost permits Web MIDI; opening index.html directly is unsuitable for module, worker and asset loading.

1. Load a known Guitar Pro score. Check notation, playback sound, green cursor, scrolling, play/pause and reset.
2. Select another practice track. Check practice-only/all-track views and the selected/backing playback toggles.
3. Open each More submenu; switch panels, click the backdrop, and press Escape. Repeat at narrow window widths.
4. With your MIDI device selected, check note-on/off debug output and partial/exact/extra-note diagnostics on a simple score without repeats.
5. While holding notes, change mode/channel/base, switch device, and unplug the device. Confirm detected pitches clear and no notes stay stuck. Play a fresh attack after changing filters.
6. On hex hardware, check the configured base channel identifies the low string as 6 and the last channel identifies the high string as 1. This assumes the documented low-to-high channel order; configure the device accordingly.
7. Verify release does not advance the target while paused; playing advances through alphaTab and reset returns to the beginning.

## Remaining scope

This is not yet a functional note-for-note trainer. Held-pitch diagnostics still do not distinguish retriggers, strum attacks, sustained strings, identical pitches on multiple strings, or evaluate input timing. Written-score extraction still does not map repeated playback occurrences; overlapping voices and articulation policies need the next-stage adapter. Wait Mode, realtime grading/misses, tempo/loop panels, notation feedback, and exact-position grading are not implemented.

Next: Stage 2 occurrence-aware score/playback mapping. Browser and real-device checks above remain prerequisites for calling the foundation fully verified.
