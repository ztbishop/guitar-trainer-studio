# TriplePlay USB disconnect investigation

## Owner disposition — 2026-10-24

The owner reports the Fishman disconnect freeze on every Web MIDI site they have used, not only Guitar Trainer. Close the app-specific fix investigation for beta and retain this as a known cross-site compatibility limitation. This is owner evidence, not proof of a particular Chromium/Windows/driver cause or confirmation that the symptom is fixed. The earlier native-cleanup mitigation remains; avoid treating the pending destructive-trigger comparisons below as mandatory release acceptance. Reopen if fresh evidence identifies app-specific behavior. The owner separately confirms normal real-guitar practice checks are complete.

## Status — 2026-10-20

The owner confirms that removing active Fishman TriplePlay can freeze all of Chrome, requiring Task Manager. Inactive-device removal has not been physically tested. Earlier guards did not resolve the reported freeze. No physical reproduction or native crash dump was available here.

The router now avoids explicit close on an already-disconnected device, including initialization cleanup, and invalidates callbacks before detaching. Connected switching/None still closes once. Saved settings, reconnect preference and existing session-reset behavior remain intact. This removes an unnecessary operation during teardown; it is not a proven whole-browser freeze fix.

## Evidence and limits

- [Chromium issue 40209841](https://issues.chromium.org/issues/40209841) reports USB-disconnect WebMIDI lockup on Windows. Similarity supports investigating the native path, not conclusively attributing this incident.
- [Chromium Windows MIDI cleanup change](https://chromium.googlesource.com/chromium/src/media/midi/+/09f20f7fea6b1e803e82654af90c8a4362df8fd0), August 25, 2026, addresses reset/unprepare/close ordering and retained handles. It is a separate issue; release inclusion and relevance to this machine are unverified.
- [Web MIDI specification](https://www.w3.org/TR/webmidi/) defines implicit opening on listener attachment and port connection states. Native teardown happens independently of application callbacks. JavaScript timeouts/catches cannot recover a blocked native process.
- Installed Chrome executable: 155.0.8059.85. This is file-version evidence, not a running-process or update-eligibility check.
- Automated: 366 Node tests pass, including 10,000-event storms, 100 reconnect cycles, stale callbacks, inactive removal, zero closes on dead ports and throwing/rejected/unresolved connected closes. Simulated ports cannot reproduce Windows USB deadlocks.

## Pending owner acceptance

Use the existing http://127.0.0.1:5500/index.html and hard-refresh. Save unrelated browser work before testing the known freeze trigger.

1. While paused, remove selected TriplePlay once. Confirm Chrome tabs remain usable, held notes clear and the app waits for that input. Reconnect and verify saved settings and fresh notes.
2. If stable, repeat during Wait and Realtime, then with diagnostic recording enabled. Device changes retain existing practice-reset behavior; partial-attempt preservation is not introduced.
3. Compare selecting MIDI input **None while still connected**, then unplugging. Reselect TriplePlay afterward: None cancels automatic selection. This is a diagnostic/workaround trial, not a guarantee; Chrome still has MIDI access and observes removal.
4. Separately remove an unselected device while another input is active. Its held notes and selection should remain intact.

If it freezes again, stop repeated attempts and record the failing case, whether waiting status appeared before the freeze, running Chrome version from chrome://version, Windows build, and whether another MIDI application was open. Absence of waiting status does not prove the callback never ran. Further diagnosis needs browser/OS evidence; the app MIDI report cannot capture a native deadlock. This update made no browser/driver changes or restarts.
