# Draft timing: explicit recovery contract

After **Use reviewed timing**, Realtime grades the first attack of a tie if that attack is inside a synced measure. It stops its hit window at the edge of the synced passage. A tie that begins during unmapped material has no new target when the score reappears. Other attacks in the same chord remain playable. If the draft still plays with grading off, the review status names the first blocking check.

Implemented locally, 2026-11-15. Lesson Bridge is read-only in this task. This optional editor appears only for an explicit draft import. Ordinary Media Sync and verified imports keep their current workflow. Existing v1–v4 payloads are never reinterpreted as drafts.

## Capability and envelope

Query the existing same-window/same-origin capabilities route. Require lesson version **5** AND this exact timingPlans entry:

```js
{format:'draft-recording-timing',version:1,capability:'draft-timing-v1'}
```

An old explanation or interval capability does not authorize a draft. Bridge must keep draft Send blocked until this exact response exists at the selected, unchanged destination. A positive offer acknowledgement means review was opened, never validated timing or completed import. Drafts always require Import/Cancel review, even with automatic helper import enabled. Local-choice still requires choosing a recording file.

The envelope permits exactly these fields, all required:

```js
{
  format:'gts-lesson', version:5, title:'Lesson title',
  lessonUrl:'https://provider.example/lesson',
  score:{fileName:'original.gpx',base64:'EXACT_ORIGINAL_BYTES'},
  recording:{url:'https://provider.example/video.mp4',label:'Lesson recording',id:'recording-123'},
  // Or recording:{kind:'local-choice',id:'recording-123'}
  draftTiming:{
    format:'draft-recording-timing', version:1,
    scoreSha256:'64-lowercase-hex', recordingId:'recording-123',
    originalPlaybackOrder:[1,2],
    originalTimingText:'[[0,0],[1,2]]',
    matchingEvidence:{ /* original matching evidence and all alternatives */ },
    candidatePlan:{ /* explanation-v1 or interval-v1 plan, possibly incomplete */ },
    unresolved:[{originalVisit:2,reason:'Final sounding endpoint is missing'}]
  }
}
```

`syncPoints`, `timingPlan`, `keepRecording` and other outer fields are forbidden, including null. Title/resource URL/filename/base64 limits and schemes use existing receiver policy (12 MiB score). Recording id must match the draft. The score SHA-256 is checked against the exact original bytes before review/loading and against the loaded score before draft editing; native expanded traversal must match exactly. Resource identity failures are hard failures, not draft recovery.

Required draftTiming fields are exactly those shown. `originalPlaybackOrder` is nonempty, at most 4096 one-based measure numbers (1–4096), with repeats in native order. IDs use existing opaque alphanumeric-first grammar (letters, digits, `.`, `_`, `:`, `-`, maximum 200), excluding URL schemes. Hash is exactly 64 lowercase hexadecimal characters.

`originalTimingText` is the exact supplied timing text, not a normalized/rescaled representation, required and at most 2,000,000 characters. `matchingEvidence` is a required JSON object/array retaining source notation identity, matching decisions, verified sections, alternatives, reasons and provenance. It is evidence, not executable correspondence or verified grading permission. Keep all source timestamps, including invalid/out-of-range points, here or in the exact original text; never drop one just because the candidate cannot represent it. Do not infer an ambiguous mapping to populate the candidate.

`candidatePlan` is a JSON object using one existing strict plan shape from EXPLANATION-TIMING.md or TIMING-MATCH.md. Its identity/hash/original traversal must remain bound to the wrapper before activation. `musicalVisits` must be an array of visit objects with anchor arrays; `intervals` (new format) or `explanations` (old format), repeatResolution.omittedOriginalVisits and optional scoreOmissions are arrays. Unknown/missing numeric endpoint values use **null**, never a guessed duration; a missing final anchor may be absent. Candidate references, anchors and interval boundaries can remain unresolved and will be diagnosed, never executed until strict compilation succeeds. Preserve all known exact internal anchors and explanation versus unmatched-source-rest kinds. Matched ordinary rests remain music. No dummy measures, rewritten score or first-sounding omission permission is introduced.

`unresolved` is required, at most 4096 entries, each exactly `{originalVisit,reason}`. originalVisit is a valid one-based native visit or null for unassigned source material/ambiguous correspondence. reason is a nonempty string up to 1000 characters. Bridge must list every unresolved passage/ambiguity. The owner must review and remove/resolve these entries explicitly; even an empty list does not bypass native strict validation.

All draft JSON must be finite, acyclic plain JSON, maximum 4,000,000 serialized characters, 100,000 nodes, nesting 32, array length 16384. Undefined, nonfinite numbers, sparse arrays and unsafe prototype keys reject; nothing is truncated silently. This bounds draft evidence separately from the existing score limit.

## Editing and playback policy

On Import, the exact original score and recording load paused; no provisional plan is installed in the native transport. Media Sync opens a visual alignment workspace beside the original notation/TAB. It replaces the former per-passage recording-only preview forms. Ordinary imports do not show this workspace.

The single draft timeline shows candidate music (blue), explanations (purple), ordinary unmatched source rests (gray), unresolved areas (amber), and exact original timing dots. Actual recording end is a red boundary; supplied points beyond it remain visible, never clamped. Zoom changes only the view. Unknown start/end values appear in the unplaced list and remain null until explicitly placed. Playback and seeking are continuous across the recording. Select a section to seek its known start and reveal its score measure/occurrence. The main Preview/Reset buttons also operate the draft recording; no synth or practice clock is started.

The translucent blue playback marker follows **only** spans bracketed by explicit candidate anchors with valid native measure/occurrence references. It uses native rendered beat geometry and the original traversal. It never extrapolates an unanchored ending or crosses an explanation, rest interval, overlap or unresolved gap. Matched ordinary score rests remain candidate music. The cursor is a separate display overlay, not native synchronization, an approved plan, or grading evidence. The current measure, pass and original visit are shown during preview. Every draft remains ungraded until complete strict validation and explicit activation.

Choose **Change one boundary / anchor** or **Move whole section**. Drag a handle (or a section body in whole-section mode), or select the timestamp and type precise seconds / place it at the current playhead. The change description shows exactly which timestamps change. Whole moves shift only that section's known endpoints and internal anchors by the same delta; unknown endpoints remain null and other sections stay fixed. Boundary edits move/create the paired 0/480 endpoint anchor explicitly; internal edits leave the endpoints alone. Crossing ordered anchors or separate neighboring sections is rejected, as are newly placed times outside actual duration. Supplied invalid values remain preserved for review. A drag is one Undo step, and pointer cancellation commits nothing.

For ambiguous material, **Add a passage or anchor** allows an unassigned passage or an explicitly chosen matching-evidence suggestion. Choose its native measure/pass/visit and place observed times before preview can track it. Suggestions are advisory: the editor understands the saved Bridge evidence's visitAlternatives array when available; other evidence is still retained intact in optional details. No alternative is selected automatically, no time is inferred from a suggestion, and 97311's extra sounding material still prevents full strict activation. Advanced JSON remains an optional escape hatch for complex boundary references, not the primary timing editor.

Review issues are collapsed into a concise count. **Clear reviewed notices** removes owner-reviewed declarations in one action; it cannot clear generated errors or bypass structural/native checks. There is no per-section confirmation gate. Undo/Redo, Restore supplied draft, export and reopen retain immutable original text/evidence and alternatives. No fit/rescale action is provided.

This first version conservatively keeps the **entire draft** out of recording grading, including otherwise useful sections, until review is complete. Verified section evidence and anchors are preserved for visual editing and provisional tracking; they are not thrown away. Partial verified-section grading and arbitrary sounding-excerpt omission are not implemented. The owner can continue standalone score practice separately.

Use reviewed timing becomes available only after all declared issues are resolved and the candidate passes the existing complete strict plan compiler: original score hash/traversal, occurrence/boundary references, exact internal coverage, allowed repeat/rest omissions, sustain/tie checks, recording identity and actual duration. Activation checks that score/source and working revision remain current and that native recording selection succeeded. It then returns to normal practice paused. Applying reviewed timing is explicit and does not claim audible correspondence was automatically verified.

## Keeping work

Nothing saves automatically. Export draft and original evidence downloads:

```js
{format:'gts-draft-work',version:1,original:/* complete original draftTiming */,
 working:{candidatePlan:/* current edit */,unresolved:/* current edit */}}
```

This preserves originalTimingText exactly plus original matching evidence and original candidate. Open saved draft work restores edits only when original evidence matches the currently loaded draft; it is not a new lesson envelope and never activates automatically. Reimport the same draft/recording first after a browser reload, then open the work file. Export remains available in Media Sync after reviewed timing is applied. Save profile is disabled for unresolved drafts; after activation it saves the reviewed strict plan using existing profile rules. The separate exported draft retains the original evidence; a normal profile alone does not archive that evidence. No recording bytes are exported.

## Focused examples and limits

97311 has excerpted source examples and multiple equivalent starting locations in a fuller GP arrangement; neither an offset nor a duration fit supplies correspondence for the extra sounding passages. Keep alternatives/unmapped material unresolved. A draft is useful evidence and editing space, not permission to omit first sounding music. A different score or complete manually established correspondence is still needed for strict recording grading.

97322 and 97326 have unanchored sounding material. Preserve all known earlier endpoints/internal anchors, use null for unknown endpoints, and list the missing final material. Owner-observed times must be entered explicitly; duration alone is not an endpoint.

97330 is a verified positive control. Final anchor 64.20852700000009 s fits actual media duration 64.42666666666666 s. A rounded 1:04 label must never cause draft recovery or clamping. Keep its existing verified interval route.

Automated evidence uses focused unit cases and isolated synthetic score/WAV browser checks, plus read-only saved findings for these examples. No course catalog replay, owner screen control, Bridge modifications, commit, push or deployment. Provider/audible alignment and physical MIDI acceptance remain owner checks after Bridge integration.

## Visual workflow handoff — 2026-11-15

No wire extension or new capability is required. Continue the existing explicit lesson-v5 envelope and draft-recording-timing version 1, capability draft-timing-v1, exactly as specified above. Bridge remains read-only. Keep verified 97330 on v4; do not automatically downgrade strict imports. Hard-refresh Trainer to receive the visual editor. Receipt still means review opened, not validated import. Keep all exact timing, original bytes, alternatives, null endpoints and unresolved declarations. The editor is not permission for sounding omissions or a changed native traversal.

Focused automated coverage includes moving native-rendered score highlights and a recording playhead; continuous playback; seeking into commentary; pointer and numeric edits; original timestamp preservation; missing endpoints; Undo/Redo; export/reopen; complete strict activation; no autoplay/autosave; original 97322/97326 repeat occurrence tracking; explicit unmapped 97311 choices; and the verified 97330 v4 positive control. Saved examples use silent local recording fixtures, not provider playback. Actual video/audible correspondence, streaming-provider buffering/seeking and physical MIDI acceptance remain owner checks. No catalog replay or owner-screen control.
