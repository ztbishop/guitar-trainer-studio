# Recording playback investigation — 2026-11-10

## Lesson 87750: observed before changes

The existing localhost Chrome session was inspected without changing score bytes or sync anchors. The Lesson Bridge chat **Investigate Wait-only export** provided historical reproduction details.

- Initially paused at 560.277314 seconds, seeking=false, readyState=4, networkState=1, no media error, with the recording ending buffered.
- Opening Edit sync at 592.809947 seconds (9:52.8) sought to 569.236210 seconds (9:29.236). Before: playing, seeking=false, readyState=4. After: paused, seek completed, readyState=4. The serialized anchor array was identical.
- A temporary currentTime setter trace attributed that seek to alphaTab's `_onPlayerStateChanged`, through tickPosition, ExternalMediaPlayer and the host media handler. The editor transition bypassed the existing outside-score Pause protection. The bootstrap's unconditional Wait pause also ran before the host could protect the position.
- A separate earlier editor transition sought from 571.071227 to 558.940694 seconds and hit `PipelineStatus::PIPELINE_ERROR_READ: FFmpegDemuxer: data source error`. The video remained paused, seeking=true, readyState=1 despite reported buffered ranges. Reloading the same video element restored readyState=4 and playback without changing the score or anchors.

The decoder failure is evidence of a media-level failure, not proof of the original intermittent bar-51 stall or its underlying network/container cause. The exact Pause-button/frozen-clock state was not reproduced in this investigation. Do not alter timing or score data to compensate. If it recurs, capture currentTime over time, paused, seeking, readyState, networkState, media error and buffered/seekable ranges before resending or reloading. A stuck seek alone is not enough to diagnose the cause.

Temporary tracing was removed; the original lesson was left paused at 569.236210 seconds with the editor closed and anchors unchanged. This live tab still runs the pre-fix module until refreshed.

## Transport fix and alphaTab upgrade inventory supplement

Host integration: `nativeMediaHandler`, `mediaPausePosition`, `setMediaEditing`, `toggleMediaPlayback`, and `applyPracticeLoop` in `js/alphatab-host.js`; editor callback in `js/app-bootstrap.js`.

The recording playhead is protected before native Pause on editor entry, and through editor exit without a practice loop. No-op editor updates keep protection. Play and deliberate seeks release it. An explicit restored loop still controls its destination. Wait retains its separate pause path. No vendor code, source score, anchor, grading rule or provider source changes.

Upstream search anchors: `AlphaTabApi._onPlayerStateChanged`, `ExternalMediaPlayer.updateTimePosition`, `ExternalMediaSynthOutput.seekTo`. This existing public-handler integration is not a version-gated vendor monkey patch. When upgrading, verify synchronous and delayed native Pause seeks, editor entry/exit inside and outside the score, resume, explicit seeks, Wait and loop restoration. Retire the guard only if upstream preserves arbitrary recording time across those transitions; preserving score time alone is insufficient. The shared classic/core player behavior and worker-originated state callbacks must remain compatible.

The pre-existing full upgrade inventory was untracked at task start. Its local entry links here; this tracked supplement avoids including unrelated dependency work in the recording fix commit.

## Validation and remaining acceptance

- All 563 Node regressions pass on Node 24.14.0; changed application modules and browser test pass syntax checks.
- Extended `tests/run-full-recording-browser.cjs` fails on the prior implementation (intro jumps from about 0.42 to 2 seconds), then passes with the fix. It checks intro, in-score and outro entry; paused exit; unchanged anchors; no-op updates; resume; existing completion, grading, seek reentry and loop behavior.
- `tests/run-sync-practice-browser.cjs` and `tests/run-loop-media-repeats-browser.cjs` pass, including Wait gates and repeat/navigation occurrences.
- Sandbox localhost restrictions required running server/browser regressions with ordinary localhost access. Synthetic media checks do not establish real provider or physical MIDI reliability.
- Owner acceptance: refresh Trainer, resend/reopen the same lesson, play beyond 9:42, open and close Edit sync, resume, then seek to bar 51 repeatedly. The editor should pause at the current video time. The intermittent decoder/stall issue remains open; no automatic reload or speculative seek retry was added.
