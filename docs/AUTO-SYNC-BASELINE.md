# Blind Auto-sync baseline for archived Lesson Bridge lessons

November 23, 2026. One-click Auto-sync ran on 200 lesson pages with original GPX or GP5 scores and real recordings. Of those, 197 met the recording-duration check. The other three completed analysis and are listed separately below.

## Results

A measure visit is one written measure on one particular pass. A placement counts even when the times are wrong. The accuracy column requires both the start and the end of the same visit to be within 250 ms of the reference. Missing visits stay in the denominator.

| Reference | Lessons | Timed visits | Placed | Both within 250 ms | Start over 2 s off |
| --- | ---: | ---: | ---: | ---: | ---: |
| Verified original GP + timing | 154 | 4005 | 2919 (72.9%) | 1903 (47.5%) | 343 |
| Additional reviewable draft | 40 | 1146 | 601 (52.4%) | 317 (27.7%) | 179 |
| Owner spot-checked draft | 3 | 84 | 48 (57.1%) | 29 (34.5%) | 1 |
| All comparable pages | 197 | 5235 | 3568 (68.2%) | 2249 (43.0%) | 523 |

Across selected reference visits the median absolute error was 0.10 s at the start and 0.11 s at the end. The 90th percentiles were 18.03 s and 18.58 s. A median alone hides both missing measures and distant performances of a similar phrase.

## Drafts the owner checked

| Lesson | Placed / reference visits | Both within 250 ms | What happened |
| --- | ---: | ---: | --- |
| R&B Fill 1 (64197) | 0 / 10 | 0 | The selected Electric Guitar track returned no candidates anywhere. Its archived first musical visit starts at 23.35 s. |
| Country Vol. 1, Song 1 practice session (90539) | 36 / 60 | 19 | Twenty of the 24 missing visits had at least one candidate. One selected start was over two seconds off. |
| Bluegrass Blaze, Right Hand Technique (97797) | 12 / 14 | 10 | Zero overlap with the marked introduction and breakdown, including the breakdown from 90.28 s to 206.73 s. |

The owner confirmed the R&B timing, reported that Song 1 lined up and spot-checked the Bluegrass draft workflow. These observations establish specific playback examples. The per-visit comparisons use the archived or reconstructed draft boundaries. The additional reviewable drafts have automated activation evidence only.

## Where the next change is most likely to help

- **Recover a missing phrase from both neighbors.** There were 159 missed visits in 65 runs bracketed by two accurate selections. Within each run the reference visits are consecutive, with less than 80 ms between each end and the following start. Shuffle in E (97031) supplies 14 such visits in three runs. These are retrospective test cases. During real Auto-sync only the score, audio and estimated neighbors are available.
- **Measure the cost of filling a break.** Selected music already overlapped 286.11 s of the 12,602.52 s marked as introductions, breakdowns or explanations. On 36 lessons overlap reached at least one second. Use Easy Guitar Lesson (90720, 21.37 s of overlap) as a challenging control and Bluegrass Blaze as a break-preservation control. A marked breakdown can itself contain a played example. The metric measures intrusion into the provider’s excluded interval, regardless of whether someone is speaking at that instant.
- **Separate finding a candidate from choosing one.** Of 1,667 missing visits, 737 had no candidate and 930 had at least one. Across all missing or inaccurately placed visits, 217 had a candidate with both raw boundaries already within 250 ms. Selection changes can help those cases. For R&B Fill 1, start by examining short-phrase retrieval and the practice-track audio evidence.
- **Check repeated takes separately.** Of 523 starts over two seconds off, 24 selected midpoints fell inside a different reference pass of the same written measure. Other large errors need listening or additional evidence before attributing them to a wrong take.

## Replay and comparison rules

1. Start with the consolidated original-score inventory (145 native-accepted pairs) and the subsequent course, Bakersfield, Knock on Wood and reviewed-activation reports. Include the three identifiable owner checks. The resulting inventory contains 155 verified originals, three owner-checked drafts and 42 additional reviewable drafts. Six pairs of lesson pages share identical score and timing hashes. Counts are per lesson page.
2. Use the archived original score and the recording associated with its timing-file digest. Reuse the 21 existing media controls in the inventory. Fetch other recordings serially and analyze local files in isolated Chrome pages. Each page uses the default practice track and ordinary lesson Auto-sync with Continuous off. The score and audio enter through the regular file controls. The benchmark never imports the Bridge plan, supplies pins or uses the reference times to select candidates.
3. Capture the browser worker choices, then normalize the selections with the trainer’s selectedVisits function. Compare the expanded original visit, displayed measure and repeat occurrence. Seven reference visits lacked positive finite boundaries and were excluded. Another 67 selections had no comparable timed visit in the reference. Partial drafts cannot establish whether those extra placements are correct.
4. Compare recording length to the archived duration with the same two-second tolerance used in the earlier benchmark. Union overlapping labeled explanations before measuring seconds. Exclude ordinary rests and unmatched source rests from that metric. The 24 previous saved controls, including three outside this inventory, reproduced all 458 previously selected visit starts and ends exactly.
5. Local evidence is under tests/.media-fixtures/bridge-baseline. full.json contains reference identities and visit maps. Each lesson has a worker result keyed by lesson ID and score/timing digest prefixes. score.mjs, qualify.cjs and totals.cjs regenerate the comparison from those saved results without requesting recordings. compare-controls.mjs compares earlier endpoint selections. Recordings, private plans and authenticated links stay outside version control. The run exercised the working trainer at base commit 20a204a. This is a timing benchmark; live MIDI grading and individual note attacks were outside the measurement.

## Recording-duration exceptions

The analyzer ran on each recording. Both official video qualities agreed on media duration. Without a verified explanation for the metadata discrepancy, these rows are retained for diagnosis and excluded from the headline totals.

| Lesson | Archived duration | Browser duration |
| --- | ---: | ---: |
| Juggling, Lick 14 (46649) | 53 s | 132.23 s |
| R&B Fill 2 (64198) | 217 s | 214.85 s |
| R&B Fill 9 (64205) | 143 s | 129.30 s |

## Per-lesson results

| Lesson ID | Lesson | Reference | Timed visits | Placed | Both within 250 ms | Start over 2 s off | Marked break overlap (s) |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 20926 | Little Bass Run Intro & Outro Rhythm 1 01:08 | Verified original GP + timing | 3 | 3 | 0 | 3 | 0.00 |
| 20927 | Sliding Thirds Intro & Outro Rhythm 2 02:09 | Verified original GP + timing | 4 | 4 | 4 | 0 | 0.00 |
| 20935 | Sweet Pulloffs Intro & Outro Rhythm 10 03:27 | Verified original GP + timing | 12 | 12 | 0 | 12 | 0.00 |
| 20937 | Open Descent Verse Rhythm 1 02:08 | Verified original GP + timing | 8 | 8 | 6 | 2 | 0.00 |
| 20939 | Driving Chords Verse Rhythm 3 02:14 | Verified original GP + timing | 8 | 8 | 0 | 8 | 0.00 |
| 20940 | Train Out West Verse Rhythm 4 03:56 | Verified original GP + timing | 8 | 8 | 0 | 8 | 0.00 |
| 20943 | Acoustic Jimi Verse Rhythm 7 03:33 | Verified original GP + timing | 8 | 8 | 7 | 0 | 0.00 |
| 20945 | Twelve-Eight Wave Verse Rhythm 9 02:27 | Verified original GP + timing | 4 | 4 | 2 | 0 | 0.00 |
| 20951 | Train Turn Around Pre-Chorus & Bridge Rhythm 4 03:01 | Verified original GP + timing | 10 | 10 | 7 | 3 | 0.00 |
| 20955 | Tension and Release Pre-Chorus & Bridge Rhythm 8 02:22 | Verified original GP + timing | 8 | 8 | 7 | 0 | 0.00 |
| 20956 | Romantic Ballad Pre-Chorus & Bridge Rhythm 9 02:21 | Verified original GP + timing | 4 | 4 | 0 | 4 | 0.00 |
| 20957 | Diminished Setup Pre-Chorus & Bridge Rhythm 10 03:10 | Verified original GP + timing | 11 | 11 | 0 | 11 | 0.00 |
| 20959 | Percussive Doubles Chorus Rhythm 1 01:51 | Verified original GP + timing | 4 | 4 | 0 | 4 | 0.00 |
| 20961 | The Finish Line Chorus Rhythm 3 02:39 | Verified original GP + timing | 8 | 8 | 2 | 5 | 0.00 |
| 20967 | Melody Inside Chorus Rhythm 9 04:07 | Verified original GP + timing | 4 | 4 | 0 | 4 | 0.00 |
| 20984 | Full Song Form 8 Performance 01:32 | Verified original GP + timing | 50 | 41 | 27 | 0 | 0.00 |
| 20988 | Full Song Form 10 Performance 01:34 | Verified original GP + timing | 54 | 49 | 39 | 1 | 0.00 |
| 20991 | Mixing Rhythms for Songs 1 Performance 01:17 | Verified original GP + timing | 36 | 31 | 17 | 0 | 0.00 |
| 20993 | Mixing Rhythms for Songs 2 Performance 00:51 | Verified original GP + timing | 18 | 16 | 14 | 0 | 0.00 |
| 46636 | Climbing the Fence · Lick 1 | Verified original GP + timing | 8 | 3 | 0 | 2 | 0.00 |
| 46643 | Offsides · Lick 8 | Verified original GP + timing | 6 | 1 | 0 | 1 | 0.00 |
| 46649 | Juggling · Lick 14 | Verified original GP + timing (duration exception) | 8 | 4 | 4 | 0 | 0.00 |
| 46653 | Pressing Forward · Lick 18 | Verified original GP + timing | 15 | 4 | 0 | 4 | 0.00 |
| 46663 | Curly Q's · Lick 28 | Verified original GP + timing | 5 | 2 | 0 | 2 | 0.00 |
| 49458 | Major & Minor Chord Barre | Verified original GP + timing | 13 | 13 | 5 | 2 | 0.00 |
| 49460 | Octave Shapes | Verified original GP + timing | 15 | 10 | 1 | 1 | 0.00 |
| 49463 | Chord Scale 1 | Verified original GP + timing | 10 | 10 | 3 | 0 | 0.00 |
| 49465 | Chord Scale 2 | Verified original GP + timing | 21 | 21 | 15 | 0 | 0.00 |
| 49469 | Chord Scale 4 | Verified original GP + timing | 20 | 20 | 8 | 1 | 0.00 |
| 49471 | Chord Scale 5 | Verified original GP + timing | 24 | 23 | 17 | 0 | 0.00 |
| 49473 | Chord Scale 6 | Verified original GP + timing | 24 | 22 | 8 | 5 | 0.00 |
| 49475 | Chord Scale 7 | Verified original GP + timing | 16 | 16 | 9 | 0 | 0.04 |
| 49477 | Chord Scale 8 | Verified original GP + timing | 16 | 16 | 14 | 0 | 0.00 |
| 64197 | If I Had a Hammer-On  — R&B Fill 1 | Owner spot-checked draft | 10 | 0 | 0 | 0 | 0.00 |
| 64198 | The Bridge of 3rd’s — R&B Fill 2 | Additional reviewable draft (duration exception) | 10 | 1 | 0 | 1 | 0.00 |
| 64199 | HOPO Heaven — R&B Fill 3 | Additional reviewable draft | 10 | 3 | 0 | 3 | 0.00 |
| 64200 | Sunny with a Chance of C — R&B Fill 4 | Additional reviewable draft | 10 | 0 | 0 | 0 | 0.00 |
| 64201 | Encounters of the 4th Kind — R&B Fill 5 | Additional reviewable draft | 10 | 3 | 0 | 3 | 0.00 |
| 64202 | Sweet Little 16ths — R&B Fill 6 | Additional reviewable draft | 10 | 4 | 0 | 4 | 0.00 |
| 64203 | A Major Lift — R&B Fill 7 | Additional reviewable draft | 10 | 3 | 0 | 3 | 0.00 |
| 64204 | Vitamin C Shape — R&B Fill 8 | Verified original GP + timing | 9 | 0 | 0 | 0 | 0.00 |
| 64205 | The 6th Sense — R&B Fill 9 | Additional reviewable draft (duration exception) | 11 | 5 | 0 | 5 | 0.00 |
| 64207 | Gotta Have It — R&B Fill 11 | Additional reviewable draft | 10 | 0 | 0 | 0 | 0.00 |
| 64208 | Gotta Have It Slidin’ — R&B Fill 12 | Additional reviewable draft | 10 | 2 | 0 | 2 | 0.00 |
| 64209 | The Usual Sus-pect — R&B Fill 13 | Additional reviewable draft | 8 | 0 | 0 | 0 | 0.00 |
| 64210 | Remember me? — R&B Fill 14 | Verified original GP + timing | 10 | 4 | 0 | 4 | 0.00 |
| 64211 | Color Me Minor — R&B Fill 15 | Additional reviewable draft | 10 | 1 | 0 | 1 | 0.00 |
| 64212 | The Return Of HOPO — R&B Fill 16 | Additional reviewable draft | 10 | 0 | 0 | 0 | 0.00 |
| 64214 | Descend and Maintain — R&B Fill 18 | Additional reviewable draft | 10 | 3 | 0 | 3 | 0.00 |
| 64215 | 9 Lives — R&B Fill 19 | Additional reviewable draft | 9 | 0 | 0 | 0 | 0.00 |
| 64217 | Cornell Knows Best — R&B Fill 21 | Additional reviewable draft | 10 | 1 | 0 | 1 | 0.00 |
| 64218 | If 6 Moved Chromatically to 9 — R&B Fill 22 | Additional reviewable draft | 10 | 0 | 0 | 0 | 0.00 |
| 64219 | 6 + 9 = D7 — R&B Fill 23 | Additional reviewable draft | 10 | 1 | 0 | 1 | 0.00 |
| 64220 | Chromatilicious — R&B Fill 24 | Additional reviewable draft | 11 | 0 | 0 | 0 | 0.00 |
| 64221 | Trail Mix — R&B Fill 25 | Additional reviewable draft | 10 | 4 | 0 | 4 | 0.00 |
| 64222 | When Seven Met Nine — R&B Fill 26 | Additional reviewable draft | 10 | 5 | 0 | 5 | 0.00 |
| 64223 | The Corner of Benson & Green — R&B Fill 27 | Additional reviewable draft | 10 | 8 | 0 | 8 | 0.00 |
| 64224 | Altered Ego — R&B Fill 28 | Additional reviewable draft | 10 | 5 | 0 | 5 | 0.00 |
| 64225 | Flat 9-Sharp 9-Flat 9 — R&B Fill 29 | Additional reviewable draft | 10 | 3 | 0 | 3 | 0.00 |
| 64226 | Don’t Call Me Dim — R&B Fill 30 | Additional reviewable draft | 10 | 3 | 0 | 3 | 0.00 |
| 81451 | SINGING AND PLAYING | Verified original GP + timing | 15 | 13 | 1 | 7 | 16.26 |
| 87472 | Easy Strum / Lesson | Additional reviewable draft | 3 | 3 | 0 | 3 | 0.00 |
| 87753 | Breaking Down 7th Arpeggios | Verified original GP + timing | 77 | 41 | 27 | 8 | 4.37 |
| 87755 | Connecting Intervals | Verified original GP + timing | 40 | 27 | 14 | 2 | 1.41 |
| 87761 | Track Guide: Groove 90 | Verified original GP + timing | 20 | 19 | 16 | 0 | 0.00 |
| 87764 | Track Guide: Harlito | Verified original GP + timing | 25 | 19 | 14 | 0 | 0.00 |
| 90539 | Country Vol 1 Song 1 Practice Session | Owner spot-checked draft | 60 | 36 | 19 | 1 | 0.00 |
| 90630 | Buck Owens Acoustic Rhythm | Verified original GP + timing | 62 | 41 | 29 | 3 | 1.57 |
| 90631 | Don Rich Rhythm Riffs | Additional reviewable draft | 51 | 31 | 18 | 7 | 0.00 |
| 90632 | Don Rich Guitar Solo | Additional reviewable draft | 22 | 19 | 11 | 2 | 1.53 |
| 90633 | High Capo Second Acoustic Rhythm Part | Additional reviewable draft | 63 | 43 | 6 | 35 | 15.47 |
| 90634 | Country Shuffle Acoustic Guitar Rhythm | Verified original GP + timing | 72 | 35 | 0 | 35 | 16.37 |
| 90635 | Country Shuffle Electric Guitar Rhythm | Additional reviewable draft | 23 | 21 | 0 | 21 | 0.00 |
| 90636 | Country Shuffle Guitar Solo | Additional reviewable draft | 28 | 15 | 6 | 7 | 0.00 |
| 90637 | Country Ballad Acoustic Rhythm | Additional reviewable draft | 9 | 9 | 2 | 5 | 0.00 |
| 90638 | Country Ballad High Capo Acoustic Rhythm | Verified original GP + timing | 16 | 13 | 2 | 6 | 19.70 |
| 90639 | Country Ballad Pedal Steel-Style Solo | Additional reviewable draft | 11 | 5 | 0 | 5 | 0.00 |
| 90640 | Modern Bakersfield Guitar Solo, a-la Pete Anderson (Dwight Yoakam) | Additional reviewable draft | 22 | 16 | 11 | 3 | 2.44 |
| 90720 | Easy Guitar /Lesson | Additional reviewable draft | 46 | 35 | 8 | 13 | 21.37 |
| 90721 | Easy Guitar / Practice Session | Additional reviewable draft | 83 | 69 | 49 | 0 | 0.00 |
| 90722 | Easy Guitar / Playalong | Additional reviewable draft | 83 | 41 | 21 | 4 | 0.00 |
| 90724 | Electric Guitar / Practice Session | Additional reviewable draft | 83 | 32 | 18 | 6 | 0.00 |
| 90725 | Electric Guitar / Playalong | Additional reviewable draft | 83 | 21 | 4 | 17 | 0.00 |
| 90741 | Improv #2 Lazy Summer Morning — What to Play | Verified original GP + timing | 25 | 20 | 4 | 5 | 21.13 |
| 90744 | Improv #3: Boomerang — What to Play | Verified original GP + timing | 41 | 17 | 5 | 5 | 10.89 |
| 91522 | Easy Guitar / Practice Session — ATBL / Practice with the Instructor | Verified original GP + timing | 129 | 46 | 33 | 12 | 0.00 |
| 91523 | Easy Guitar / Playalong — ATBL / Play with the Band | Verified original GP + timing | 129 | 36 | 8 | 27 | 0.00 |
| 91542 | Tapped Harmonics / Playalong — DTNA / Play with the Band | Additional reviewable draft | 99 | 4 | 0 | 2 | 0.00 |
| 91546 | Easy Guitar / Practice Session — FYLT / Practice with the Instructor | Verified original GP + timing | 123 | 81 | 50 | 7 | 0.00 |
| 91547 | Easy Guitar / Playalong — FYLT / Play with the Band | Verified original GP + timing | 123 | 52 | 25 | 7 | 0.00 |
| 91561 | Acoustic Guitar / Practice Session — FWYS / Practice with the Instructor | Verified original GP + timing | 132 | 99 | 74 | 2 | 0.00 |
| 91562 | Acoustic Guitar / Playalong — FWYS / Play with the Band | Verified original GP + timing | 132 | 52 | 6 | 23 | 0.00 |
| 95552 | Playing Rhythm Guitar · Concept and Demo | Verified original GP + timing | 13 | 11 | 9 | 0 | 0.09 |
| 95557 | Songwriting · Concept and Demo | Verified original GP + timing | 17 | 13 | 8 | 0 | 0.00 |
| 95570 | Guitar Phrasing · Concept and Demo | Verified original GP + timing | 4 | 4 | 3 | 0 | 0.00 |
| 96870 | Country Open Lick 2 — Lesson & Demonstration | Verified original GP + timing | 6 | 3 | 0 | 3 | 11.35 |
| 96873 | Country Open Lick 5 — Lesson & Demonstration | Verified original GP + timing | 7 | 2 | 0 | 2 | 9.86 |
| 96874 | Country Bending Lick 1 — Lesson & Demonstration | Verified original GP + timing | 7 | 3 | 0 | 3 | 7.58 |
| 96878 | Country Bending Lick 5 — Lesson & Demonstration | Verified original GP + timing | 7 | 2 | 0 | 2 | 3.32 |
| 96879 | Country Sixth Lick 1 — Lesson & Demonstration | Verified original GP + timing | 7 | 1 | 0 | 1 | 1.46 |
| 96880 | Country Sixth Lick 2 — Lesson & Demonstration | Verified original GP + timing | 7 | 2 | 0 | 2 | 5.20 |
| 96881 | Country Sixth Lick 3 — Lesson & Demonstration | Verified original GP + timing | 7 | 2 | 0 | 2 | 6.18 |
| 96882 | Country Sixth Lick 4 — Lesson & Demonstration | Verified original GP + timing | 7 | 3 | 0 | 3 | 7.06 |
| 96885 | Country Rhythm Lick 2 — Lesson & Demonstration | Verified original GP + timing | 7 | 6 | 4 | 0 | 0.39 |
| 96886 | Country Rhythm Lick 3 — Lesson & Demonstration | Verified original GP + timing | 7 | 6 | 1 | 3 | 5.26 |
| 96887 | Country Rhythm Lick 4 — Lesson & Demonstration | Verified original GP + timing | 7 | 6 | 3 | 0 | 0.00 |
| 96888 | Country Rhythm Lick 5 — Lesson & Demonstration | Verified original GP + timing | 7 | 2 | 0 | 2 | 8.74 |
| 97031 | Shuffle in E — Performance | Additional reviewable draft | 52 | 27 | 16 | 0 | 0.00 |
| 97046 | Piedmont Fingerstyle Blues — Performance | Verified original GP + timing | 33 | 33 | 32 | 0 | 0.00 |
| 97049 | Boogie in A — Performance | Additional reviewable draft | 54 | 52 | 44 | 0 | 0.00 |
| 97052 | Lightnin' Boogie  — Performance | Additional reviewable draft | 113 | 109 | 103 | 0 | 0.00 |
| 97220 | Bends, Slides & Vibrato — Lesson | Verified original GP + timing | 15 | 8 | 4 | 2 | 3.67 |
| 97228 | Space, Pocket & Feel — Lesson | Verified original GP + timing | 10 | 6 | 3 | 1 | 0.00 |
| 97237 | Carry My Name / Solo — Performance | Verified original GP + timing | 41 | 40 | 35 | 0 | 0.00 |
| 97245 | How to Perform In a Trio Setting — Key Insight | Verified original GP + timing | 11 | 9 | 8 | 0 | 0.01 |
| 97247 | Jezebel / Melody  — Performance | Verified original GP + timing | 17 | 15 | 8 | 0 | 0.00 |
| 97249 | Jezebel / Solo — Performance | Verified original GP + timing | 18 | 18 | 13 | 0 | 0.00 |
| 97312 | C, Am, F, G / Level 1 — Workout 1 Play-Along | Verified original GP + timing | 18 | 15 | 15 | 0 | 0.00 |
| 97313 | C, Am, F, G / Level 2 — Workout 2 Lesson | Verified original GP + timing | 24 | 22 | 19 | 1 | 1.91 |
| 97314 | C, Am, F, G / Level 2 — Workout 2 Play-Along | Verified original GP + timing | 17 | 15 | 8 | 0 | 0.00 |
| 97316 | C, Am, F, G / Level 3 — Workout 3 Play-Along | Verified original GP + timing | 20 | 16 | 9 | 0 | 0.00 |
| 97318 | Shapes / Level 1 — Workout 4 Lesson | Verified original GP + timing | 17 | 17 | 16 | 0 | 0.05 |
| 97319 | Shapes / Level 1 — Workout 4 Play-Along | Verified original GP + timing | 19 | 17 | 17 | 0 | 0.00 |
| 97320 | Shapes / Level 2 — Workout 5 Lesson | Verified original GP + timing | 11 | 8 | 3 | 2 | 3.78 |
| 97321 | Shapes / Level 2 — Workout 5 Play-Along | Verified original GP + timing | 18 | 16 | 5 | 0 | 0.00 |
| 97323 | Shapes / Level 3 — Workout 6 Play-Along | Verified original GP + timing | 18 | 15 | 0 | 0 | 0.00 |
| 97324 | Introduce Etude 3 / Low Bass Note — Overview of Changes & Feel | Verified original GP + timing | 3 | 2 | 2 | 0 | 0.06 |
| 97327 | Low Bass Note / Level 2 — Workout 8 Lesson | Verified original GP + timing | 18 | 16 | 13 | 0 | 0.00 |
| 97328 | Low Bass Note / Level 2 — Workout 8 Play-Along | Verified original GP + timing | 19 | 17 | 10 | 0 | 0.00 |
| 97330 | Low Bass Note / Level 3 — Workout 9 Play-Along | Verified original GP + timing | 18 | 17 | 16 | 0 | 0.00 |
| 97333 | Abnormal Shapes / Level 1 — Workout 10 Play-Along | Verified original GP + timing | 19 | 16 | 13 | 0 | 0.00 |
| 97335 | Abnormal Shapes / Level 2 — Workout 11 Play-Along | Verified original GP + timing | 27 | 25 | 12 | 0 | 0.00 |
| 97342 | House Rises / Level 2 — Workout 14 Play-Along | Verified original GP + timing | 36 | 29 | 23 | 0 | 0.00 |
| 97483 | Pentatonic Strategies for Improvising — Jazz Affection: Analysis | Verified original GP + timing | 16 | 16 | 10 | 0 | 0.51 |
| 97797 | Right Hand Technique | Owner spot-checked draft | 14 | 12 | 10 | 0 | 0.00 |
| 98063 | Root 6 Chords: Bass Arpeggio Shapes | Verified original GP + timing | 28 | 27 | 7 | 12 | 16.20 |
| 98064 | Root 5 Chords: Bass Arpeggio Shapes | Verified original GP + timing | 28 | 28 | 14 | 7 | 14.98 |
| 98067 | Major Pentatonic Boxes | Verified original GP + timing | 21 | 21 | 21 | 0 | 0.00 |
| 98068 | Minor Pentatonic Boxes | Verified original GP + timing | 21 | 21 | 21 | 0 | 0.02 |
| 98070 | Major & Minor Scales Workout | Verified original GP + timing | 33 | 33 | 32 | 0 | 0.00 |
| 98072 | Groove's Next | Verified original GP + timing | 17 | 0 | 0 | 0 | 0.00 |
| 98074 | Leading Tones Workout | Verified original GP + timing | 17 | 16 | 13 | 0 | 0.00 |
| 98077 | "Big Blue Sky" / Classic Rock | Verified original GP + timing | 49 | 48 | 44 | 0 | 0.00 |
| 98083 | "Back Alley Blush" / Blues | Verified original GP + timing | 49 | 49 | 48 | 0 | 0.00 |
| 98098 | The Ionian Mode | Verified original GP + timing | 26 | 24 | 23 | 0 | 0.28 |
| 98099 | Soloing With The Ionian Mode | Verified original GP + timing | 34 | 25 | 23 | 0 | 0.00 |
| 98101 | The Dorian Mode | Verified original GP + timing | 26 | 21 | 18 | 2 | 2.83 |
| 98102 | Soloing With The Dorian Mode | Verified original GP + timing | 34 | 34 | 32 | 0 | 0.00 |
| 98103 | Quartal Harmony in Dorian Mode | Verified original GP + timing | 33 | 29 | 27 | 0 | 0.01 |
| 98104 | The Phrygian Mode | Verified original GP + timing | 25 | 24 | 19 | 3 | 6.93 |
| 98105 | Soloing With The Phrygian Mode | Verified original GP + timing | 24 | 22 | 16 | 0 | 0.00 |
| 98106 | Quartal Harmony in Phrygian Mode | Verified original GP + timing | 33 | 27 | 11 | 0 | 0.04 |
| 98107 | The Lydian Mode | Verified original GP + timing | 33 | 30 | 28 | 2 | 7.46 |
| 98108 | Soloing With The Lydian Mode | Verified original GP + timing | 33 | 31 | 27 | 0 | 0.00 |
| 98110 | The Mixolydian Mode | Verified original GP + timing | 27 | 25 | 23 | 2 | 3.80 |
| 98111 | Soloing With The Mixolydian Mode | Verified original GP + timing | 33 | 28 | 23 | 0 | 0.00 |
| 98112 | Quartal Harmony in Mixolydian Mode | Verified original GP + timing | 73 | 49 | 34 | 3 | 2.44 |
| 98113 | The Aeolian Mode | Verified original GP + timing | 27 | 26 | 24 | 2 | 0.28 |
| 98114 | Soloing With The Aeolian Mode | Verified original GP + timing | 33 | 28 | 15 | 0 | 0.00 |
| 98115 | Quartal Harmony in Aeolian Mode | Verified original GP + timing | 37 | 33 | 7 | 3 | 0.00 |
| 98116 | The Locrian Mode | Verified original GP + timing | 22 | 18 | 11 | 6 | 3.15 |
| 98117 | Soloing With The Locrian Mode | Verified original GP + timing | 33 | 31 | 28 | 0 | 0.00 |
| 98118 | Quartal Harmony in Locrian Mode | Verified original GP + timing | 39 | 33 | 17 | 2 | 0.00 |
| 98119 | Upper Structure Substitution of Modes | Verified original GP + timing | 9 | 8 | 5 | 2 | 8.01 |
| 98120 | "So What" Changes | Verified original GP + timing | 67 | 63 | 58 | 0 | 0.00 |
| 98121 | "Maiden Voyage" Changes | Verified original GP + timing | 71 | 61 | 49 | 2 | 7.45 |
| 101136 | Acoustic Guitar 2 / Practice Session — Practice with the Instructor | Verified original GP + timing | 106 | 70 | 56 | 5 | 0.00 |
| 101137 | Acoustic Guitar 2 / Playalong — Play with the Band | Verified original GP + timing | 106 | 58 | 47 | 10 | 0.00 |
| 101209 | Single-Note Rhythmic Ideas — Demonstration | Verified original GP + timing | 32 | 18 | 12 | 3 | 0.38 |
| 101210 | EX. A1 — Performance | Verified original GP + timing | 9 | 1 | 0 | 0 | 0.00 |
| 101212 | EX. A2 — Performance | Verified original GP + timing | 9 | 2 | 0 | 2 | 0.00 |
| 101214 | EX. A3 — Performance | Verified original GP + timing | 9 | 7 | 7 | 0 | 0.00 |
| 101216 | EX. A4 — Performance | Verified original GP + timing | 9 | 9 | 7 | 0 | 0.00 |
| 101218 | EX. A5 — Performance | Verified original GP + timing | 9 | 9 | 8 | 0 | 0.00 |
| 101220 | EX. A6 — Performance | Verified original GP + timing | 9 | 9 | 7 | 0 | 0.00 |
| 101222 | EX. A7 — Performance | Verified original GP + timing | 9 | 6 | 3 | 1 | 0.00 |
| 101224 | Harmonic Intervals Over Diatonic Progressions — Demonstration | Verified original GP + timing | 4 | 4 | 2 | 1 | 0.23 |
| 101225 | Harmonic Intervals Over Diatonic Progressions: Third Intervals — Demonstration | Verified original GP + timing | 27 | 27 | 24 | 0 | 0.32 |
| 101226 | EX. B1 — Performance | Verified original GP + timing | 17 | 12 | 6 | 0 | 0.00 |
| 101233 | EX. B4 — Performance | Verified original GP + timing | 17 | 17 | 13 | 0 | 0.00 |
| 101235 | EX. B5 — Performance | Verified original GP + timing | 17 | 12 | 11 | 0 | 0.00 |
| 101237 | EX. B6 — Performance | Verified original GP + timing | 17 | 13 | 7 | 0 | 0.00 |
| 101239 | Harmonic Intervals Over Diatonic Progressions: Sixth Intervals — Demonstration | Verified original GP + timing | 20 | 20 | 17 | 0 | 0.49 |
| 101244 | EX. B9 — Performance | Verified original GP + timing | 16 | 16 | 4 | 0 | 0.00 |
| 101246 | Harmonic Intervals Over Diatonic Progressions: Octave Intervals — Demonstration | Verified original GP + timing | 39 | 35 | 24 | 1 | 1.76 |
| 101247 | EX. B10 — Performance | Verified original GP + timing | 17 | 12 | 10 | 0 | 0.00 |
| 101251 | EX. B12 — Performance | Verified original GP + timing | 17 | 1 | 0 | 1 | 0.00 |
| 101260 | EX. C2 — Performance | Verified original GP + timing | 17 | 15 | 5 | 0 | 0.00 |
| 101262 | EX. C3 — Performance | Verified original GP + timing | 17 | 14 | 4 | 0 | 0.00 |
| 101264 | EX. C4 — Performance | Verified original GP + timing | 18 | 18 | 9 | 0 | 0.00 |
| 101266 | EX. C5 — Performance | Verified original GP + timing | 17 | 17 | 11 | 0 | 0.00 |
| 101268 | EX. C6 — Performance | Verified original GP + timing | 17 | 14 | 3 | 0 | 0.00 |
| 101270 | EX. C7 — Performance | Verified original GP + timing | 17 | 17 | 0 | 0 | 0.00 |
| 101276 | EX. E1 — Performance | Verified original GP + timing | 16 | 1 | 0 | 1 | 0.00 |
| 101278 | EX. E2 — Performance | Verified original GP + timing | 17 | 2 | 0 | 2 | 0.00 |
| 101280 | EX. E3 — Performance | Verified original GP + timing | 17 | 15 | 10 | 0 | 0.00 |
| 101282 | EX. E4 — Performance | Verified original GP + timing | 17 | 6 | 1 | 3 | 0.00 |
| 101284 | EX. E5 — Performance | Verified original GP + timing | 17 | 17 | 15 | 0 | 0.00 |
| 101287 | EX. F1 — Performance | Verified original GP + timing | 21 | 21 | 20 | 0 | 0.00 |
| 101289 | Bonus 1: Creative Rhythmics Concepts — Demonstration | Verified original GP + timing | 32 | 0 | 0 | 0 | 0.00 |
