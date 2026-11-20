# Explanation timing receiver

This is the Trainer half of the 2026-11-15 Lesson Bridge handoff. Bridge remains a separate private project. An explanation plan describes recording time and a reviewed subset of the original score's native playback visits. It never edits the original score, inserts rests, stretches notes through speech, or guesses breaks from long gaps.

This original format is unchanged. The separate [matched timing contract](TIMING-MATCH.md) adds `musical-visits-and-intervals` v1 / `score-timing-match-v1` for neutral source-rest intervals and verified full-rest score omissions. It uses the same outer v4 envelope but its own required capability and fields; do not send its fields with this format. Capability replies may include both entries below the same `timingPlans` array.

## Transfer and capability contract

Before sending, Bridge must query the target Trainer window using the existing same-window, same-origin message route:

```js
window.postMessage({type:'gts-lesson-capabilities-request',id:'unique-request-id'}, location.origin);
// Response, matching id:
{
  type:'gts-lesson-capabilities', id:'unique-request-id',
  lessonVersions:[1,2,3,4],
  timingPlans:[{
    format:'musical-visits-and-explanations', version:1,
    capability:'explanation-timing-v1'
  }]
}
```

Require all three plan fields and lesson version 4. A missing response, unsupported capability, different version, or changed destination invalidates preparation/Send. The alphaTab version is not this capability. The ordinary `gts-lesson-offer` / `gts-lesson-reply` route is unchanged; a successful reply means the offer was accepted for review or automatic loading, not that import finished or that the recording passed validation. The reply is sent before waiting for score/media loading.

The envelope is:

```js
{
  format:'gts-lesson', version:4, title:'Lesson title',
  lessonUrl:'https://provider.example/lesson',
  score:{fileName:'original.gpx',base64:'UNCHANGED_ORIGINAL_BYTES'},
  recording:{kind:'local-choice',id:'provider-recording-id'},
  // Or recording:{url:'https://provider.example/video.mp4',label:'Lesson video',id:'provider-recording-id'}
  timingPlan:{
    format:'musical-visits-and-explanations',version:1,
    scoreSha256:'64-lowercase-hex',sourceSha256:'64-lowercase-hex',timingSha256:'64-lowercase-hex',
    recordingId:'provider-recording-id',
    originalPlaybackOrder:[1,2],
    musicalVisits:[
      {visit:1,scoreMeasure:1,occurrence:1,originalVisit:1,startSeconds:0,endSeconds:2,
        anchors:[{offset480:0,seconds:0},{offset480:120,seconds:0.6},{offset480:480,seconds:2}]},
      {visit:2,scoreMeasure:2,occurrence:1,originalVisit:2,startSeconds:8,endSeconds:10,
        anchors:[{offset480:0,seconds:8},{offset480:480,seconds:10}]}
    ],
    explanations:[{id:'explanation-1',label:'Breakdown',startSeconds:2,endSeconds:8,
      boundary:{after:{visit:1,scoreMeasure:1,occurrence:1,originalVisit:1},
        before:{visit:2,scoreMeasure:2,occurrence:1,originalVisit:2}}}],
    repeatResolution:{kind:'unchanged',omittedOriginalVisits:[]}
  }
}
```

`syncPoints` must be absent, including null/undefined. `keepRecording` must be absent or false. Score, recording, and timingPlan are required together. Versions 1–3 retain their previous behavior and reject any `timingPlan` property. The version-4 envelope, score/recording objects, plan, visits, anchors, boundaries, and repeat resolution use strict allowed fields. Do not send preparation evidence fields (`sourceSlot`, `sourceMeasure`, `sourceOccurrence`, `inputPoint`, explanation anchors, or `sendable`) in the runtime plan; construct it explicitly.

- `recording.id` must equal `timingPlan.recordingId`. IDs are 1–200 characters, start alphanumeric, and otherwise use letters, digits, `.`, `_`, `:`, `-`; URL schemes and local paths are rejected. Explanation IDs follow the same grammar and are unique.
- `scoreSha256` hashes original score bytes. Trainer checks it before review/loading and again against the loaded original. Source/timing hashes identify UTF-8 `JSON.stringify(parsedInput)` in input property/array order. Trainer validates their form; Bridge must establish their provenance because raw source/timing inputs do not cross this contract.
- Measures, occurrences, visits, and original visits are one-based. `visit` is consecutive in the proposed plan; `originalVisit` indexes the exact original native traversal. `occurrence` counts that written measure's native visits, not alternate-ending numbers. `originalPlaybackOrder` must match the loaded score exactly.
- `offset480` ranges from 0 to 480 across one whole measure, regardless of meter. Seconds are recording-absolute, finite, nonnegative, at most 86400. Precision is preserved. Each musical visit has exact start/end anchors; internal offsets and times strictly increase.
- Music visits form an ordered subsequence of native visits. Only later occurrences may be omitted; every first occurrence remains. All omissions must appear, in order, in `repeatResolution.omittedOriginalVisits`. A changed traversal requires kind `source-visit-plan`; unchanged requires `unchanged` and an empty list.
- Explanations are half-open recording intervals `[startSeconds,endSeconds)` at adjacent musical visits. Use `after:null` for an introduction and `before:null` for an ending. Consecutive explanations retain separate IDs/labels and the same boundary references. Repeat-back boundaries may lead to a lower written measure and later occurrence.
- All internal time is covered once by music or an explicit explanation, without overlap or guessed gaps. Prefix/suffix outside the supplied plan remains unclassified. Musical endpoints are not stretched to the provider's nominal duration. Actual selected recording duration is checked after media loads (1 ms rounding allowance).
- Limits: 4096 original visits, 4096 musical visits, 4096 explanations, 16384 musical anchors total. The existing 12 MB original-score limit applies. Labels/titles are bounded to 240 characters.

**Settings → Lesson imports → Import helper lessons automatically** skips review for non-local-choice offers when enabled. It starts on, preserves a saved On or Off choice in localStorage, and applies to all supported lesson versions. Its Settings section starts collapsed. While on, it allows subsequent valid offers to replace the current score and unsaved alignment and use the selected online recording. The same strict pipeline still validates the hash, original bytes, native traversal and actual recording duration. A progress notice stays visible during automatic loading; failures open **Import needs attention**. An acknowledgement is not proof of completed import. Turning the option off restores review for future offers.

When review is needed, the compact dialog shows the lesson, original score, selected recording and a plain-language repeat adjustment. Clicking **Import lesson** confirms use of that recording; there is no additional recording checkbox. Local-choice always requires a valid file selected in Trainer and Import, even with automatic import enabled. **Cancel** changes nothing. Technical recording ID and exact omitted native visits are in optional **Details**, collapsed for each new review. Paths and recording bytes never cross Bridge. Recording ID and acceptance are binding metadata, not cryptographic verification of video content. All score-byte, actual-duration and native-traversal checks remain mandatory. Nothing autoplays or saves automatically.

## Playback and practice

During Realtime recording practice, explanations continue playing while the cursor waits and grading is suspended. Previous results remain; held-note, bend, and pending transient evidence cannot satisfy a new passage. Music resumes at its own first attack. Wait mode stays silent, excludes explanation targets, and jumps directly to the next retained musical target. The existing input-tolerance settings are unchanged.

Media Sync lists explanations with a **Listen to explanation** button, using Preview mode so grading and loops are paused. During an explanation, **Skip to music** jumps to the following musical visit; consecutive explanations at that boundary are skipped together. At an ending the button skips the explanation. Seeking and pause/resume use actual recording time. Loops contain only retained musical visits; a selection entirely within omitted visits is rejected, and retained endpoints bound mixed selections. Loop edges end before any following explanation.

The original score timeline, repeat engraving, and score bytes remain intact. The host translates recording time into the original native musical clock, and translates native seeks back through the plan. Temporary identity sync points only support that clock adapter; they are not flattened lesson timing. Returning to synthesized playback restores the original sync data and original traversal.

For this first version, explanation plans are read-only in the ordinary sync-point editor. Move one/all/section and ordinary point editing remain available for ordinary profiles. Import a revised explanation plan to change its timing. Save profile stores the complete plan separately from the recording. Explanation profiles use media-sync backup version 2 and library backup version 3; older backups remain readable, and ordinary exports retain their old versions.

Sustains or ties crossing an explanation or omitted traversal boundary are rejected conservatively. Ties entirely inside unchanged, contiguous music remain supported. Unclassified video time has no grading. No automatic source matching, pause inference, tempo redistribution, or audible-alignment claim is made.

## Supplied lesson verification

The external `93196.gpx` control is checked without copying private lesson assets into this repository. It has 72 written measures and 81 native visits. The reviewed plan retains 77 musical visits and 20 explicit explanation intervals, omitting only original visits 50–53 (second occurrences of measures 46–49). Measures 67–69 and 70–71 still repeat, and final measure 72 remains once. All 106 supplied timing values remain represented. The final music ends at 648.3715609999994 seconds; the remaining recording tail stays unclassified.

The fixture is constructed explicitly from the private preparation artifact and validated against the unchanged bundled reader and original byte hash. Optional evidence tests use `GTS_EXPLANATION_EVIDENCE` and `GTS_EXPLANATION_ORIGINAL`. Synthetic tests cover other placements, consecutive explanations, repeat-back/alternate endings, ordinary rests, missing boundaries, precision, ties, grading, and native transport. On 2026-11-15 the owner confirmed lesson 87753 works and requested this shorter review. That is owner-reported lesson acceptance, not a new automated audible or physical-MIDI test.

## Bridge workflow status

The initial Bridge implementation handoff is complete. Its current private `docs/EXPLANATION-TIMING.md` and `dist/lesson-workflow-20261115/REPORT.md` supersede the earlier proposal for an unchecked Advanced option: Bridge now keeps its explanation option beside Score, on by default with the saved choice retained. The compact review and optional automatic import are Trainer-only changes; the same strict offer/capability protocol works without a sender update. Bridge's preparation, capture, permissions and files are unchanged here. Bringing the destination tab's Chrome window forward after successful handoff is a separate Bridge task; delivery acknowledgement must not be described as proof that timing passed or import completed.
