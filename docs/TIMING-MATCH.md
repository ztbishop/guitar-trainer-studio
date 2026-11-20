# Matched score timing: Trainer receiver contract

This extends the private receiver for Bridge's broader timing matches. Work is local only; Bridge is not modified here. Existing lesson versions 1–4 and `musical-visits-and-explanations` version 1 keep their behavior. The new format keeps unlabelled source rests separate from explanations and permits independently verified silent score omissions. It does not infer silence from elapsed time, analyze audio, rewrite the original score, or manufacture a musical endpoint.

## Finite performed ties and plain vibrato — 2026-11-16

The native evidence reader can prove an ordinary cross-bar tie's finite release through reciprocal links in actual contiguous performed occurrences; a written pointer alone cannot cross a repeat jump. Known standalone vibrato does not extend native duration and uses its finite release only with complete plain-note evidence. Original practice events remain exact, including complete tied sustain, and the unchanged compiler still rejects true sustain through an inserted interval. Let-ring/unknown effects remain guarded. [Broad audit and controls](DEV-NOTES.md#shared-finite-carry-audit-across-saved-lessons--2026-11-16-local-only).

## Finite within-bar native ties — 2026-11-16

Complete ordinary ties with proved reciprocal native links, pitch/string/fret and contiguous clocks inside one bar/voice have a known release and no longer fabricate indefinite expressive carry. Original notes/ties and normalized practice durations are unchanged. Cross-bar/ambiguous/expressive/let-ring holds remain guarded by the existing compiler. The supplied 97483 original now passes the unchanged strict interval contract. [Diagnosis and evidence](DEV-NOTES.md#finite-native-ties-at-recording-breaks--2026-11-16-local-only).

## Capability gate

Use the existing same-window, same-origin `gts-lesson-capabilities-request` / `gts-lesson-capabilities` exchange. Require lesson version **4** and this exact additional `timingPlans` entry:

```js
{format:'musical-visits-and-intervals',version:1,capability:'score-timing-match-v1'}
```

The existing `musical-visits-and-explanations` / `explanation-timing-v1` entry remains separately advertised. Neither entry implies support for the other. Bridge must query the selected destination and require the new entry before sending a new-format plan; absence, timeout, version mismatch or changed destination must block Send. Never flatten these intervals into legacy sync points or relabel source rests as commentary to use an older capability.

An `ok` `gts-lesson-reply` acknowledges receipt for automatic loading or review, **not** completed import, verified silent measures or successful recording validation. The response precedes asynchronous resource loading. Automatic import remains on by default with saved On/Off choices retained; local-choice always requires selecting a file and Import. Nothing autoplays or saves automatically.

## Exact envelope and plan

The outer envelope is the existing strict version 4:

```js
{
  format:'gts-lesson', version:4, title:'Lesson title',
  lessonUrl:'https://provider.example/lesson',
  score:{fileName:'original.gpx',base64:'EXACT_ORIGINAL_BYTES_AS_BASE64'},
  recording:{url:'https://provider.example/recording.mp4',label:'Lesson recording',id:'recording-123'},
  // Alternative: recording:{kind:'local-choice',id:'recording-123'}
  timingPlan:{
    format:'musical-visits-and-intervals', version:1,
    scoreSha256:/* SHA-256 of original score bytes */ 'a'.repeat(64),
    sourceSha256:/* Bridge source evidence hash */ 'b'.repeat(64),
    timingSha256:/* Bridge timing evidence hash */ 'c'.repeat(64),
    recordingId:'recording-123',
    originalPlaybackOrder:[1,2,3],
    musicalVisits:[
      {visit:1,scoreMeasure:1,occurrence:1,originalVisit:1,
        startSeconds:0,endSeconds:2,
        anchors:[{offset480:0,seconds:0},{offset480:480,seconds:2}]},
      {visit:2,scoreMeasure:3,occurrence:1,originalVisit:3,
        startSeconds:5,endSeconds:7,
        anchors:[{offset480:0,seconds:5},{offset480:480,seconds:7}]}
    ],
    intervals:[
      {id:'source-rest-1',kind:'unmatched-source-rest',label:'Recording break',
        startSeconds:2,endSeconds:5,
        boundary:{
          after:{visit:1,scoreMeasure:1,occurrence:1,originalVisit:1},
          before:{visit:2,scoreMeasure:3,occurrence:1,originalVisit:3}
        }}
    ],
    scoreOmissions:[
      {originalVisit:2,scoreMeasure:2,occurrence:1,reason:'unmatched-full-rest'}
    ],
    repeatResolution:{kind:'unchanged',omittedOriginalVisits:[]}
  }
}
```

This illustrates the schema, not a sendable lesson: the original bytes, hashes, source evidence and timestamps must be real and mutually consistent. Measure 2 must independently pass the Trainer's native full-rest check. Do not send comments or preparation-artifact fields.

Required plan fields are exactly `format`, `version`, `scoreSha256`, `sourceSha256`, `timingSha256`, `recordingId`, `originalPlaybackOrder`, `musicalVisits`, `intervals`, `scoreOmissions`, and `repeatResolution`. Unknown fields reject. `intervals` and `scoreOmissions` are required arrays, even when empty. The old `explanations` field is forbidden in this format. Conversely, `intervals`/`scoreOmissions` are not accepted in the old format.

The existing envelope rules still apply: score, recording and timingPlan are required together; `syncPoints` is forbidden even when null; `keepRecording` may only be absent or false. Earlier lesson versions reject timingPlan. Original score size is limited to 12 MiB. Never send the evidence-only `lesson-bridge-timing-match` artifact itself.

## References, times and coverage

- Score/source/timing SHA-256 values are 64 hexadecimal characters, normalized to lowercase. `scoreSha256` must match the unchanged bytes. `recordingId` and interval IDs are 1–200 characters, start alphanumeric, and otherwise use only letters, digits, `.`, `_`, `:`, `-`; URL schemes and local paths are rejected. `recording.id` must equal `recordingId`. Source/timing hashes use Bridge's existing evidence convention: UTF-8 `JSON.stringify(parsedInput)` in input property/array order.
- `originalPlaybackOrder` is the exact native expanded written-measure sequence, including repeats and alternate endings. All measure, occurrence, visit and originalVisit numbers are one-based. `occurrence` counts the written measure's visits in the original native traversal, including omitted visits.
- `musicalVisits` is a nonempty ordered subsequence. `visit` runs consecutively from 1; every `originalVisit`, `scoreMeasure` and `occurrence` must agree with the original traversal. Retained ordinary rests remain musical visits. There is no special permission to remove the final sounding first occurrence.
- Each visit has finite nonnegative recording-absolute `startSeconds < endSeconds` and complete ordered anchors. First/last anchors are exactly offsets 0/480 and the visit's start/end seconds. Internal offsets and times strictly increase. Offset480 is proportional to a whole native measure regardless of meter. Supplied precision is preserved.
- Every interval has exactly `id`, `kind`, `label`, `startSeconds`, `endSeconds`, and `boundary`. Kind is only `explanation` or `unmatched-source-rest`. ID is unique across all intervals. Label is nonempty, at most 240 characters and contains no control characters. Use a neutral label for an unlabelled source rest; do not invent an explanation.
- `boundary` contains exactly `after` and `before`. Each non-null reference contains exactly `visit`, `scoreMeasure`, `occurrence`, `originalVisit`, matching a retained musical visit. Interior references identify adjacent retained visits. For a leading interval, after is null and before is visit 1; for a trailing interval, before is null and after is the last retained visit. Both cannot be null.
- Interval times lie wholly within their declared boundary. Intervals are ordered, nonoverlapping and half-open `[startSeconds,endSeconds)`. Consecutive or repeated source blocks retain separate IDs and their own intervals, even when their boundary references match.
- Music and intervals together cover every internal recording span exactly once. No overlaps, uncovered internal gaps, invented timing, stretching through speech/rests or duration-derived endpoints. Recording head/tail beyond the supplied plan remains unclassified and ungraded.
- Limits: 4096 original visits, 4096 musical visits, 4096 intervals, 4096 score omissions and 16384 musical anchors total. Seconds are at most 86400. Actual media duration must be positive and cover every supplied endpoint, with the existing 1 ms rounding allowance.

## Omission partition and native silence

Every original playback visit must occur **exactly once** among retained musical visits, repeatResolution.omittedOriginalVisits, and scoreOmissions. These lists are disjoint and ordered by originalVisit; missing, duplicate, out-of-order and inconsistent references reject.

`repeatResolution` retains its original semantics. Its omittedOriginalVisits list may contain only later occurrences, never a first occurrence. Its kind is `source-visit-plan` when that repeat list is nonempty and `unchanged` when empty. Silent omissions are listed separately: a plan containing only score omissions therefore uses `kind:'unchanged'` for repeatResolution. Existing reviewed extra-repeat omissions are not silently reclassified as full-rest omissions.

Each score omission has exactly `originalVisit`, `scoreMeasure`, `occurrence`, and `reason:'unmatched-full-rest'`. First visits are allowed only here and only after the Trainer verifies that the original native measure is a complete silent rest across all tracks, staves and active voices. Selected practice track, visibility and mute settings cannot make a sounding measure eligible. Missing/incomplete proof rejects; an empty or note-free grading target list is insufficient. Overlapping notes, ties and ambiguous sustained/expressive holds also reject. Review does not override these checks.

Native `isFullRest`, `ambiguousHoldEvidenceComplete` and `ambiguousHoldRanges` are receiver-internal evidence, never payload fields. New-format compilation requires complete evidence and a ranges array even when there are no score omissions. Unsupported sustain-pedal/simile playback and unresolved expressive carry remain blocked conservatively; a source label cannot waive that requirement.

Score hash and native traversal are checked against the loaded original, not Bridge's claimed silence. The recording ID must match the plan, and actual duration is checked after loading. Source/timing hashes are validated identifiers of Bridge evidence; their underlying source data is not transmitted, so Bridge remains responsible for establishing a unique verified match and explicit commentary evidence. Recording ID is binding metadata, not cryptographic verification of recording content.

## Playback, grading and storage

Unmatched source rests display as **Unscored break**, with **Listen to break** and **Skip to music** (or **Skip break** at an ending). Explicit explanations keep their own label and Listen action. The cursor holds the completed passage while recording time continues; no musical note is stretched across a break. Consecutive blocks can be listened to separately; Skip to music jumps to the next retained musical visit. All nonmusic regions suspend grading, and Wait targets only retained music. Held/transient input does not complete the next passage.

Score omissions affect only this recording plan. Native score bytes, engraving and standalone synthesized traversal remain unchanged. Seeking an omitted score location moves to the next retained visit, or the final retained endpoint when none remains. Reset, loops and grading use retained visits; a loop containing only omitted measures is rejected. Normal final musical endpoints and unclassified recording tails are preserved.

Plan timing is read-only in the ordinary sync-point editor. Explicit Save profile stores the complete original-format plan, including interval kinds, references and omission lists. Existing media-sync backup version 2 and library backup version 3 carry it without flattening. Validation and native silence checks run again when applying a saved plan; older Trainers reject an unsupported plan format rather than approximate it.

## Bridge follow-up

Bridge currently detects these matches but intentionally blocks Send. A separate Bridge task must enable them only after the exact new capability check, construct this strict runtime plan from reviewed evidence, keep all existing identity/staleness/permission guards, and preserve its blocked/manual-recovery paths for ambiguity or missing evidence. Trainer support alone does not turn on Bridge Send.

## Verification and acceptance

The local implementation passes 173 focused Node checks, syntax/whitespace checks, and three isolated browser runners: new interval playback, existing explanation playback and legacy lesson imports. These cover original bytes/native traversal, complete silence proof in classic/core/worker models, both interval kinds, boundaries, seek/Reset/loops, Wait/Realtime, profiles, stale activation, sounding-omission and duration rejection. The full 87753 control remains 77 musical visits / 20 explanations, with only original visits 50–53 omitted and all 106 original timing values retained. Tests use small synthetic playback fixtures plus this single supplied positive control; no catalog was replayed.

After Bridge's follow-up integration, hard-refresh Trainer before querying capabilities and check one newly supported lesson in the owner's normal browser. Automated matching/playback evidence does not establish audible recording alignment or physical MIDI acceptance. No Bridge files, commits, pushes or deployment were part of this Trainer update.
