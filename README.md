# Guitar Trainer Studio

Practice guitar with sheet music, tablature, playback and feedback from your MIDI guitar. Slow a piece down, repeat a section, or let the app wait while you find the notes.

Guitar Trainer Studio runs in a browser and uses alphaTab to display and play your scores. **Guitar recognition, practice grading and Wait progression require a MIDI signal, not standard guitar audio.** The app does not listen to your microphone or audio interface and does not convert guitar audio to MIDI. Use a MIDI guitar system such as Fishman TriplePlay, or separate conversion software such as MIDI Guitar 3, then select its MIDI input in Settings in a browser that supports Web MIDI. You can explore scores and playback without MIDI input.

[Repository](https://github.com/ztbishop/guitar-trainer-studio) · [Download ZIP](https://github.com/ztbishop/guitar-trainer-studio/archive/refs/heads/main.zip) · [Formatted guide](README.html)

## Start here

- [Open the app or run it locally](#open-the-app-or-run-it-locally)
- [Your first practice session](#your-first-practice-session)
- [Getting clean MIDI from a standard guitar](#getting-clean-midi-from-a-standard-guitar)
- [Scores and your library](#scores-and-your-library)
- [Where to find music](#where-to-find-music)
- [Practice modes and feedback](#practice-modes-and-feedback)
- [Settings and other menus](#settings-and-other-menus)
- [Updating your local copy](#updating-your-local-copy)
- [Troubleshooting](#troubleshooting)
- [License and source](#license-and-source)
- [Appendix: MIDI input options](#appendix-midi-input-options)

## Open the app or run it locally

### Hosted website

Open the published Guitar Trainer Studio website in a Web MIDI-capable browser. There is nothing to install for the browser app. Allow MIDI access when prompted, and select your input in Settings. On desktop, Chrome is a useful starting point; your guitar's driver or MIDI software may also need setup.

### Download for local and offline practice

The included launchers use Node.js to serve the app on your computer. Node.js is needed for these launchers only; hosted use and an existing local web server such as Live Server do not require it. A local web server is needed because opening the HTML file directly is not supported.

1. [Download the project ZIP from GitHub](https://github.com/ztbishop/guitar-trainer-studio/archive/refs/heads/main.zip) and extract the whole folder. Do not run it from inside the ZIP.
2. Install [Node.js](https://nodejs.org/) version 22 or newer if needed. Do this while you have internet access. No npm installation is needed.
3. Open the extracted folder's **Launchers** folder:
   - Windows: double-click **Guitar Trainer - Windows.bat**.
   - Mac: open **Guitar Trainer - Mac.command**.
4. The launcher starts a small server on your computer and opens `http://localhost:8081/` in your default browser. The window shows that browser address and the server IP (`127.0.0.1`, this computer only). Use the localhost address for YouTube compatibility. Press **C, then Enter** there to copy it and paste into your preferred Web MIDI browser. If automatic copying fails, select and copy the displayed address.
5. Keep the launcher/terminal window open while practicing. Press Ctrl+C in it to stop the server when finished.

The app, score playback sounds, demo scores and this guide are bundled. You can practice offline with downloaded score files and local recordings. YouTube, linked online recordings and music download sites still need internet access. Guitar-to-MIDI software may have its own requirements.

On a Mac, the downloaded `.command` file may need permission to run. If necessary, open Terminal in the extracted project folder and run:

```sh
chmod +x "Launchers/Guitar Trainer - Mac.command"
```

Then open the launcher again. You can also start the local server directly from that folder with `node local-web-server.cjs --open`. Mac security prompts may depend on how the ZIP was downloaded; only allow files you trust.

If you previously used the launcher at `127.0.0.1`, your saved library and preferences remain at that address. The new localhost address has separate browser storage. Use **Backup Library** at the old address and **Import Library (Merge)** at localhost to transfer saved scores and sync profiles; choose your MIDI/display settings again.

The launcher serves only this computer. It is not a Wi-Fi/tablet server. It needs no VS Code or Live Server. Opening `index.html` directly as a disk file is not supported.

### Already using VS Code and Live Server?

Keep using it. Open this folder, start Live Server for `index.html`, and use `localhost` with its actual port in your usual browser (for example, `http://localhost:8081/`). No build step is required. After an update, hard-refresh if the browser shows old controls.

## Your first practice session

1. Connect your MIDI guitar system or start separate audio-to-MIDI conversion software. Make sure it sends MIDI to an input your browser can select; plugging a guitar into an audio interface alone is not enough.
2. Open **Settings** and select the correct MIDI input. Match **Poly** or **Hex** to your device output:
   - **Poly / single channel:** notes share a MIDI channel; the app knows pitch but cannot reliably identify the played string.
   - **Hex / six channels:** each string sends on a different channel. Set the lowest-string base channel and channel order to match your device.
3. Open **Scores**. Choose **Open File**, or select **Demo Scores** and open **First notes**.
4. Open **Practice**, select the guitar track you want to practice, and choose **Wait** to learn at your own pace or **Realtime** to practice timing.
5. Press **Play**. There is a one-bar count-in. In Wait, play the expected note or chord to move forward. In Realtime, follow the score at the set tempo.
6. Use **Pause** for a break; ordinary Pause/Resume preserves your results. You can also pause during count-in or while playback is starting. **Reset** returns to the start and brings the cursor into view when auto-scroll is enabled, without needing Play. **Clear practice results** starts fresh at the current position.

Both Poly and Hex currently grade **pitch**, not exact string/fret position. Playing the right pitch at another guitar position can still count. Feedback about strings depends on your MIDI configuration; optional Poly fret estimates are guidance, not detected hand positions.

## Getting clean MIDI from a standard guitar

A normal guitar audio cable does not send MIDI by itself. Guitar Trainer receives the resulting MIDI from external hardware or software; it does not process your guitar audio directly. Two options for using a standard guitar are:

- **Fishman TriplePlay:** a separate hexaphonic pickup senses the six strings individually and converts the playing to MIDI. Check that the pickup fits your guitar and follow [Fishman's installation and setup guidance](https://fishman.com/tripleplay-support/). Use TriplePlay Utility to adjust each string's sensitivity toward its target meter range with normal playing strength; pickup height also affects tracking. Match the app's Poly/Hex selection, channel order and pitch-bend range to the device output. A hex pickup can also send a combined Poly stream.
- **Jam Origin MIDI Guitar 3:** converts your guitar's ordinary audio signal, through an audio interface, into MIDI without a special pickup. Set the actual tuning and adjust interface input gain first; use the tracker's Input control only if the interface cannot supply enough level. Adjust the tracker's Gate while checking soft notes and chords. See [Jam Origin's tracker documentation](https://jam.live/modules/modules/). Route its MIDI output to an input your browser can select; your setup may need a virtual MIDI port. For MIDI generated from ordinary guitar audio, use standard MIDI output and the app's Poly mode. MPE channels do not establish physical string identity and should not be treated as Hex string channels.

### Start with a clean signal

Tune the guitar and test single notes before dense chords. Feed the converter a clean, direct signal, with enough input level for your quiet notes but no clipping on strong attacks. Keep distortion, delay and reverb after the tracking stage, rather than feeding them into it. Mute unused strings and reduce handling noise where possible. These are setup suggestions to try, not universal settings for every pickup or interface.

For software tracking, use the input/tracking gate where available, rather than just a gate on the final synth or amp sound. A low threshold can admit unwanted notes; a high threshold can lose quiet notes, chord tones or sustain. Change one setting at a time and compare both gentle and firm playing. The app's Audio volume controls do not adjust the signal going into your converter.

### Expect occasional tracking errors

Pitch-to-MIDI conversion is not perfect. It can produce extra, wrong, delayed, lingering or missing notes, especially when separating a complex chord from one combined audio signal. A hexaphonic pickup separates the strings before tracking, but does not guarantee error-free input. Guitar Trainer grades the MIDI it receives; it cannot always tell a conversion artifact from a playing mistake, or a missed detection from a note you did not play. Unexpected feedback is a reason to inspect setup and input, not proof that either the player or converter is at fault. Jam Origin also describes these [pitch-tracking limitations](https://jam.live/products/MG3/).

If a complex chord is not registering reliably, **try raking the strings a little more slowly and evenly**, especially with polyphonic audio-to-MIDI tracking without a hex pickup. This may help separate the attacks; it is an experiment, not a guaranteed fix. Start with **Wait → One at a time**, which collects the required pitches without a time limit. With **Together**, every required attack must still fit within the selected chord window; widen it deliberately if needed. In Realtime, lower the tempo while practicing rather than stretching a chord across later beats. “Poly” in Settings describes MIDI channel handling; it is not a guarantee about tracking quality.

After checking the converter, review **Practice → MIDI input tolerance** below. These options can make practice more comfortable but do not recover required notes that never arrive. For persistent problems, use **Settings → MIDI & practice diagnostics** to inspect or record the incoming events alongside the feedback.

For other hardware/software paths, see the [MIDI input comparison appendix](#appendix-midi-input-options).

## Scores and your library

**Scores → Open File** accepts Guitar Pro (`.gp`, `.gp3`, `.gp4`, `.gp5`, `.gpx`), MusicXML (`.xml`, `.musicxml`, `.mxl`) and Standard MIDI Files (`.mid`, `.midi`). MIDI opens through a bundled MIDI-to-MusicXML converter. Select the part to grade in **Practice**. MIDI supplies pitches and rhythm. For written string and fret positions, use a companion with tablature.

### Practice with a printed PDF

**Scores → Open File** also accepts `.pdf` for realtime play-along with just a local recording.

1. Open the PDF. The trainer finds the printed measure boxes across its pages. Use **Mark measures** to check the result. For manual marking from scratch, open **Scores → PDF + recording…** and clear **Find measure boxes on open** before choosing the PDF.
2. Choose **Open audio or video…** and play the recording. Click **Tap measure start** on a downbeat. The measure selector advances after each tap. To skip from measure 1 to measure 5, choose 5 and tap when you hear it. The trainer estimates measures 2–4 between those taps.
3. Add a tap at a previously estimated measure wherever a hold or tempo change causes drift. To correct a saved tap, choose it under **Adjust taps and mark breaks**, then enter seconds or use the playhead. Before an explanation, select the last played measure and **Mark end of selected measure**. Tap the next downbeat after the break.
4. Click a timed box to seek. Select the first and last measures and choose **Loop section**. The loop needs a later downbeat or a marked end. For a repeated passage, seek near the desired take first. **Tempo** adjusts playback from 25% to 200%.

If even spacing drifts during a slowdown, open **Compare audio timing between taps**. Choose one uninterrupted passage and click **Find audio estimates**. Pick an interior measure and listen to **Hear even spacing** and **Hear audio estimate**. Muted strokes and offbeat accents can sound like downbeats. If the estimates fit the passage, click **Use audio timing for passage**. **Restore even spacing** reverses that choice. Both actions keep your taps in place.

Reopen the same two files to restore the taps and any reviewed passage timing. The browser saves box positions and timing. PDF practice and the optional audio comparison run in the hosted app using your local files. For Wait mode and pitch grading, use the playable-score workflow below.

Use a PDF with a MIDI when the print is your reference for reading the music. A Guitar Pro or MusicXML companion also works when you prefer the publisher's layout. Written fingerings for the virtual fretboard come from the companion. TAB printed on a PDF is visible to you but supplies no string data to the trainer.

1. Open the playable score, then choose **Scores → Attach PDF…**. For a lesson with a downloadable PDF, select the saved PDF from your device.
2. Choose **Find boxes on page**. Set **First measure** to the companion measure that begins that page. Check the numbers at the beginning of each staff line. In **Correction**, split a box at a missed barline, join a box with the next one, remove an extra, or drag to draw or redraw. Choose **Use page boxes**, then select the next page. Existing mappings are kept. You can also select a measure and draw its box by hand.
3. Choose **Done marking** to practice. Click a mapped measure to pause there. Use **Jump to** to move to a particular note or chord in the companion. The blue box follows the current measure. When Loop is on, a light gray shade marks measures outside its range. Unmarked measures still play and grade.
4. In **Mark measures**, drag the blue **↔** handle between touching boxes to move their shared barline. You can also focus it and use the arrow keys. Moving the start of measure 5 widens or narrows measure 4 and adjusts measure 5. Measure 6 stays put. The handle stops before either box collapses. For an isolated box, choose its measure and redraw it.
5. To rebuild an already mapped page, choose **Find boxes on page**, check **First measure**, then select **Replace saved boxes on this page → Use page boxes**. If an earlier page had an extra division, check the first measure on each subsequent page. The editor blocks replacement if a number belongs to another page.

Written repeats reuse their box. If your MIDI writes out a repeat as separate measures, assign the additional measures to the same printed passage by hand. **Show notation** returns to the interactive score. **Show PDF** beside the full-screen button switches back.

In both PDF workflows, scroll vertically from one page to the next or use **Page** for a direct jump. With **Auto-scroll** enabled, the trainer brings the current measure into view as you play. Turn it off to browse freely. Both views use your saved zoom.

Boxes are saved in this browser for this exact pair of files. Reattach the PDF when you reopen the score. Library backups currently cover the companion score and sync profiles only. PDF pages are read on your device. The printed notes keep their original appearance, and grading continues through the companion.

- **Open File** opens a score for this session. It does not save it automatically.
- **Save to Library** keeps a browser copy of the open score.
- **Add File(s)** saves one or more files to the library without opening them. Files go into the selected folder, or Unfiled when All Scores is selected.
- Click a saved score to open it. Its three-dot menu offers Rename, Move, **Download original file**, and Delete. Download keeps the original filename and format (such as `.gp5` or MusicXML); it does not convert the score or include sync profiles.
- A folder’s three-dot menu offers **Export folder**: a JSON backup of that folder, its saved scores and their related saved sync profiles. Restore it with **Import Library (Merge)**. Recordings and app preferences are not included. Use folders and search to organize your collection.
- **Manage** lets you select multiple scores or folders. Deleting a folder also deletes its saved scores after confirmation. Original files on your computer are unaffected.
- **Backup Library** downloads saved scores (including library names), folders and saved media sync profiles with their sync points. **Import Library (Merge)** restores these into an empty library or adds them to an existing library. Identical score files already present keep their current name and folder; identical sync profiles are skipped, while different sync versions are retained. Recordings and app preferences are not included. Piano Trainer backups use a different format and cannot be imported.

For a separate transfer of sync settings, open **Media & Sync → Profile name & saved profiles → Transfer sync profiles only**. Export profiles includes all saved profiles, without scores or recordings. You do not need a separate profile export when using Backup Library.

**Keep backups outside your browser.** The library belongs to this browser profile and website address. The hosted site, local launcher, and Live Server can have separate libraries. Even `localhost` and `127.0.0.1`, or different ports, are separate. Clearing browser data can remove saved scores and sync profiles. Browsers can also remove site storage automatically when space is low or under inactivity/cleanup policies; private browsing is temporary. Use **Backup Library** regularly, especially after saving scores or editing sync profiles, and keep the downloaded JSON outside the browser. Restore it with **Import Library (Merge)**. Backups include saved sync profiles but exclude recordings, MIDI settings, display preferences and practice results.

Some uncompressed MusicXML files contain separate, closely matching notation and tab guitar parts. When offered **Combine notation and tab**, you can combine them for practice or keep them separate. The original file is not changed. The app asks each time; compressed `.mxl` uses its normal import path.

The current score appears beside the Scores heading; choose its practice track in Practice. All Scores, Unfiled and Demo Scores stay at the top; your folders follow alphabetically. Search by title or filename beside Add File(s). If an opened score is titled “Untitled” or “Untitled song”, Save to Library uses its filename instead. You can rename library entries without changing the original file.

### Included demos

Scores → **Demo Scores** offers three original, four-measure exercises in standard six-string tuning:

- **First notes:** a slow single-note melody on the top three strings.
- **Easy chords:** Em, Am and C, including repeated chords. Try Wait's One at a time before Together.
- **Gentle picking:** individual notes through Em and Am shapes.

Opening a demo replaces the current open score just like opening another file. It does not start playback or add anything to your library. Choose Save to Library if wanted. The demos are available offline and are offered under CC0; see [demo source and reuse details](assets/demos/README.md).

## Where to find music

You can use your own scores or download compatible files from music publishers and tab collections. A few starting points:

- [Guitar Pro's official free tabs pack](https://www.guitar-pro.com/free-tabs) offers downloadable Guitar Pro examples.
- [Michel Lelong's Music House](https://www.michel-lelong-music-house.com/en/free-tablatures/) offers guitar material in Guitar Pro and PDF formats. Choose the Guitar Pro file for this app.
- If you already write or edit music, export **MusicXML** from your notation program, preferably retaining guitar tablature and tuning information.

Check the actual download format before buying or downloading. An online player or PDF is not enough; save a supported file to your computer, then use Scores → Open File. Accounts, prices and download availability are set by the source. Follow each publisher's usage terms. These links are suggestions for finding files, not a promise that every arrangement has been tested with this app.

Scores with clear guitar tracks and written tab are especially useful for the virtual fretboard. Check the arrangement's tuning, capo and difficulty against your guitar before practicing. You do not need Guitar Pro installed just to open a supported file here.

## Practice modes and feedback

### Realtime

The score moves at the selected tempo. Realtime gives you the current written note or chord span to play the required pitches, up to the next required attack or the written end/rest, whichever comes first. Notes can also arrive up to 120 ms early for the immediately upcoming target. If both targets need the same pitch, an unfinished current target gets it first; another attack can then count for the upcoming target. Missed notes turn red on the score only after their opportunity closes, and still affect your result.

Chord tones can arrive separately anywhere within that span; they do not need to fit a tight strum window. Repeated notes still need fresh attacks, except for the existing held-note tolerance described below. Wrong pitches still count as mistakes. Slow down in Tempo and work on a smaller Loop if needed.

### Wait

The app stays on each target until the required pitches are supplied. Score accompaniment stays paused. Choose a chord approach in Practice:

- **One at a time:** collect the required notes without a time limit.
- **Together:** play the required attacks within the selected chord window (200 ms on first use).

Repeated notes normally need a fresh attack. The **Allow held notes in repeated chords** option can credit eligible still-held tones in consecutive identical chords, but at least one required note must receive a fresh attack. Off, One, Two and Three select the allowance; Two is the initial choice.

Written muted **X** beats need a fresh MIDI attack. If your muted strum produces no MIDI at all, Wait cannot detect it. In mixed chords, pitched notes remain required.

### Bends, pre-bends, whammy and vibrato

**Allow written bend ranges** is on by default under Practice → MIDI input tolerance. In Hex and Poly, Realtime and Wait, a marked C-to-D bend accepts C, C♯ or D for that note. Pre-bends, releases and whammy use the written base pitch and marked range too. This helps you practice the piece without requiring a perfectly tracked bend. Broad whammy ranges are deliberately forgiving; a correct result does not prove that you reached the endpoint or performed the bend's shape or timing accurately.

Each required chord note keeps its own range. One played attack cannot fill two chord requirements, even where their ranges overlap, and unbent chord notes still need their normal pitch. Tied continuations remain part of the original note. Fine bends retain their written limits: a bend halfway from C to C♯ does not make C♯ a correct starting note.

Vibrato alone does not widen the initial correct pitch. Continuous MIDI pitch-bend messages do not count as new attacks. If a converter reports a continuing bend or vibrato as new notes instead, an automatic safeguard can keep closely linked changes with the original note. Very quick separate notes can look similar, especially in Poly, so this is a limited tracking aid. Check both expressive passages and deliberate separate notes with your MIDI setup.

Turn this option off to restore the original exact-pitch matching for new attacks; the automatic continuation safeguard remains active. The choice persists across score loads and sessions; changing it pauses practice and clears results. Other MIDI tolerances and ordinary note requirements are unchanged.

### Reading the feedback

- The light-blue score cursor shows the current beat.
- Staff feedback uses green for correct notes and red for mistakes; wrong pitches can appear as red noteheads.
- Tab shows green correct frets on the active target and red errors. Original written frets remain intact; incorrect fret numbers appear beside them where supported.
- The fretboard uses blue targets, green correct notes and red mistakes. Missed notes stay blue until the target moves on, so watching a Realtime playthrough does not flash unplayed targets red. Misses still appear on the score and count in your results. Incorrect notes you play keep their red rings until release. Optional upcoming-note views use gold outlines; earlier positions in the bar are faint.

Accepted notes still ringing from an earlier target stop drawing extra fretboard rings after you advance, including tones replayed while completing a Wait chord; they do not become mistakes. Genuine wrong-note rings remain visible, and fresh notes played while paused appear in neutral purple.

Practice has independent switches for Staff, tab highlights, incorrect fret numbers and Poly estimates; all four start on. Hiding feedback does not change grading. Poly estimates are shown only when the remaining written note makes the estimate unambiguous. These are estimated positions, not detected fingering; turn off Poly estimates or incorrect fret numbers if you prefer simpler feedback. Fret numbers can be particularly useful when the virtual fretboard is hidden.

Tracking errors can make a correctly played note appear wrong or remain unrecognized. If the visual feedback becomes distracting, use **Practice → Score feedback** to turn off **Tab feedback highlights**, **Incorrect fret numbers** or **Estimate incorrect frets (Poly)** independently. This hides those visual cues without changing grading or Wait progression. Check your MIDI setup and **Practice → MIDI input tolerance** if recognition problems persist; hiding feedback does not fix detection or supply missing notes.

## Settings and other menus

Some toolbar items move into **More** when the window is narrow.

### Practice and MIDI input tolerance

Practice selects one track and the practice mode. **Check MIDI input tolerance during setup**, especially if tracking causes unexpected errors or repeated chords stall. MIDI guitars and conversion software can report extra or lingering notes; these settings help balance comfortable practice against how strictly mistakes are counted. They do not replace correct device/channel setup.

- **Held notes** helps recognize repeated identical chords while allowing some tones to keep ringing.
- **Allow written bend ranges** accepts each marked note's base pitch or bend/pre-bend/whammy range, without grading technique accuracy.
- **Ignore extra chord strings (Hex)** can forgive selected unwritten strings in chords. It does not supply missing required pitches.
- **Filter confirmed tracking spikes (Hex)** filters specific MIDI sequences that indicate tracking artifacts.
- **Ignore notes outside written fret range** uses the written shape as a guide, not your actual hand position.
- **Ignore brief off-target notes** forgives wrong notes shorter than your chosen duration, including real brief mistakes.

These options apply in Realtime and both Wait chord choices; string-based options need Hex input. First use enables **Allow written bend ranges**, allows **Two held notes**, selects **Skipped strings only** for Hex extra-string tolerance, and enables **confirmed tracking-spike filtering**. Written-fret-range filtering and brief-note filtering start off; the brief-note duration starts at 30 ms when enabled. All four score-feedback switches start on. Saved choices take precedence over these defaults.

Change one option at a time and compare both comfortable playing and deliberate mistakes. More tolerance can also hide genuine mistakes. Two held notes verifies fewer reattacks than One, skipped-string tolerance forgives some real extra-string mistakes, and written-range filtering can omit distant wrong pitches. Brief-note filtering at 60 ms, for example, also forgives real wrong notes shorter than 60 ms. Correct required notes still count immediately.

The maintainer's current preferred setup is Two held notes, Skipped strings only, tracking-spike filtering on, written-range filtering on, and brief off-target filtering on at 60 ms. This is an optional starting point for tracking-prone setups, not a requirement or the app defaults. Brief filtering and duration save separately for each MIDI input; the other tolerance choices save as general practice preferences in this browser. Changing a tolerance option pauses practice and clears results. Realtime timing adjustment helps when your MIDI notes arrive late.

### Tempo and Loop

Tempo links BPM and playback percentage. Metronome volume and visual pulse help you keep time; Wait's metronome runs independently. Changing playback speed pauses practice and resets results.

Loop selects the section to repeat. Native score dragging selects whole measures; sliders allow precise repeat-occurrence choices. Changing the enabled range moves the cursor to its start and brings it into view while paused, without pressing Play. This one-time reveal also works with playback auto-scroll off; it does not change that setting. Play/resume has a one-bar count-in; Loop Count-in adds one at each repeat. Loop enablement and Loop Count-in reset when a score loads; they are not saved preferences.

**Loop → Speed Trainer** gradually increases the tempo of a Realtime synth loop. Enable Loop, open Speed Trainer, set your speeds, choose **Enable speed training**, then press **Play**. The defaults play two full loops at 60%, two at 65%, and so on up to 100%. Playback continues at the target. **Loop Count-in** uses the upcoming pass’s tempo. Pause keeps your progress. Reset or changing the loop restarts training at the starting speed. End speed training to keep practicing at the current speed. Choosing a new tempo, switching modes or recordings, opening Media Sync, or disabling the loop ends training. In Wait, set the click speed in **Tempo**.

The menus keep controls compact; this guide provides the detailed explanations. Input errors appear when needed. Scores actions share one row on wider screens and wrap on smaller screens.

### Display and the fretboard

Choose **Display → Appearance** for **Light** (the default white page), **Soft Light** (a very light gray page) or **Dark** (soft-white notation on charcoal). Your choice returns across visits and score loads. After updating the app, reload the browser to load the latest appearance styles; the local launcher can keep running. Practice feedback keeps the same meanings in each appearance. Printing and Save as PDF use black notation on white regardless of your screen choice.

Display controls zoom, auto-scroll, full screen on Play, chord diagrams, visible tracks and fretboard visibility. Under **Visible tracks**, choose **Practice track only**, **All tracks**, or **Custom**. Custom opens a checkbox list: select your guitar track and **Chords**, for example, to see them together with aligned measures. At least one track must remain selected. The practice track is marked in the list, but you can hide it without changing which track is graded. Visible tracks do not change audio mute or playback settings.

The app remembers your viewing mode and custom choices for each song in this browser and website address, even if you rename the same file. An edited or different file is treated as another song. These choices are display preferences and are not included in library backups. Changing your practice track does not change a saved Custom selection.

Some scores put all chord diagrams in a separate **Chords** track. Showing it alongside your guitar displays its own staff; it does not move diagrams onto the guitar staff. Use **Chord diagrams → Above Chord** or **Top of Score** for the existing placement choices. Friendly names such as Chords and Strumming are shown without provider markers; your original downloaded file stays unchanged.

**Score display** offers Score Default, Notation + Tab, Tab Only and Notation Only. Score Default follows the file's original layout. A guitar tab score can also show notation using its written pitches and rhythms. Tracks without usable string/fret information keep notation instead of showing empty or guessed tab.

**Tab rhythm** controls the stems and beams that show timing on tablature. Automatic shows them when notation is absent and hides them when notation supplies the rhythm; Show and Hide override that choice. The control is unavailable while no tab is visible, but remembers your choice. Score display, tab rhythm and chord diagram placement save independently across visits and score loads.

Use **Scores → Print / Save PDF…** to print the full score for the currently visible tracks, using your score display, rhythm and chord diagram choices. The clean print view leaves out practice feedback and the fretboard. Choose a printer or Save as PDF in your browser's print dialog; allow pop-ups for the app if the print view is blocked.

Use the **gear on the fretboard** for Beat / Beat + Next Beat / Beat + Bar views, note/fret/finger labels, left-handed orientation and help. Finger labels need explicit fingering in the score; the app does not invent it. Left-handed display does not reverse MIDI channel mapping.

The fretboard starts visible with **Beat + Bar**, note-name labels, alternate positions off, left-handed display off and automatic panel sizing. Your saved choices take precedence and return across score loads and visits, including manual sizing and choices made while the fretboard is hidden.

**Beat + Bar** shows the current measure. On its last beat it also previews the next beat in gold, then shows the full new measure when you enter it. Previews follow repeats and enabled loops; an upcoming rest has no fret markers.

Optional **Show alternate positions** adds faint dashed blue guides for the current target's exact pitches elsewhere on the neck. It defaults off and saves your choice. The guides help you explore other positions; they are not detected fingering, octave substitutions or extra notes to play. Written targets and grading stay unchanged, and alternate positions never invent finger numbers.

Neutral fret-position dots help you locate your hand; larger double dots mark physical frets 12 and 24, and the displayed 12/24 labels are bold.

On wide screens, the fretboard stays centered with its width limited by the panel height. Drag the panel taller to allow a wider neck; small screens keep horizontal scrolling.

Fretboard arrows pause and browse targets while clearing the current attempt. Drag the divider to resize the panel; double-click it to restore automatic fit. Saved display choices return when you reopen the app.

### Audio and recordings

Choose **Auto-sync** in Media Sync for a one-click editable alignment. In **More → Media Sync → Suggest sync points from audio**, choose **Analyze lesson audio** to match the selected practice track to a recording. Listen to the suggested takes, choose one per written repeat pass, and open the draft to check the timing. Explanations and extra demonstrations can stay in the recording as unscored gaps. [Audio suggestions and supported sources](docs/MEDIA-SYNC.md#suggest-sync-points-from-audio)

For one uninterrupted performance, check **Continuous** before running Auto-sync. In **Edit sync**, **Fill gaps with standard sync points** lets the score follow the recording between known points. For a lesson with spoken breaks, keep **Continuous** unchecked and use **Edit timed measures** to adjust individual passages.

To tighten part of a standard alignment, choose **Refine between points** beside **Undo** and **Redo**. Click two blue markers whose timing you trust, with at least one point between them. Listen through the passage afterward. **Undo** restores the original points in one step. **Save profile** keeps the alignment for another session.

Audio has separate synth and synced-recording volumes, practice/backing playback switches, and track volume/mute controls. These control the app's sounds, not your guitar interface's own sounds. Track mix resets for each score; master volumes are remembered.

Synth playback pitch shifts the synthesized sound only. It does not transpose the written score, tab, MIDI targets or recordings.

**More → Media Sync** lets you align local audio/video, direct media URLs, YouTube or embedded score audio with your score. Loading a recording automatically selects **Recording**, without starting playback; choose **Synth audio** to switch back. While the sync editor is open, the main button says **Preview**: grading, score feedback, fretboard targets and loops are paused. Switching to Synth audio keeps the editor open. Choose **Finish editing / Return to practice** (or the editor's ×), then **Play**, to practice with your selected source and restored loop. Alignment stays available; save the profile to keep unsaved changes after reloading. In Wait, the recording stays paused/muted while solved targets can advance video.

While editing, the fretboard is temporarily hidden to leave room for the timeline; your saved display choices return when you finish. Choose a **score measure** in the top (purple) lane and **recording seconds** in the bottom (red) lane. **Use playhead time** copies the current recording position into **Time to apply (s)**. **Add/Update sync point** saves that value and pauses. The seconds arrows move by 0.01 s, and you can type three decimal places. Zoom and **Fit recording** sit beside the timeline. Timestamps stay sharp and show finer time intervals as you zoom in. **Paste sync points** is under **Load / options**.

**Drag / nudge** starts with **Move one point**. **Move all** and **Move selected section** shift points together and keep their spacing. If the passage lines up at its end, choose **Stretch selected section**. For example, choose points 3 through 10 and drag point 3. Point 10 stays fixed, and points 4–9 adjust in proportion to their original recording times. The nudge arrows also work on point 3. All moves respect neighboring points and recording boundaries. One Undo restores the entire edit.

If ordinary imported sync points do not fit, valid score and recording files can still load. The sync editor opens with a warning so you can align them manually. The rejected timing is not applied or automatically stretched; ordinary rejected point data is available under **Load / options → Paste sync points** for reference. A failed timing-only update leaves the existing alignment unchanged. Review the alignment before finishing editing and saving a profile.

Lessons imported with explicit explanation timing can play their spoken breaks without grading. The score waits until the music resumes; **Skip to music** jumps past the break. In Media Sync, choose a break and **Listen to explanation** to hear it in Preview. Wait mode stays silent and moves directly between musical targets. Import review shows the lesson, score, recording and any repeat adjustment. **Import lesson** confirms the selected recording; local recordings require choosing a file first. This timing is read-only in the point editor; import a revised lesson to change it. **Save profile** preserves the full plan, and switching to Synth audio restores the original score playback. Unsupported or mismatched explanation plans are rejected instead of guessed.

**Settings → Lesson imports → Import helper lessons automatically** starts on. The Lesson imports section starts collapsed; expand it to change the option. Your choice is saved in this browser, including turning it off. When enabled, incoming lessons replace the open score and unsaved alignment after validation. Local recordings still require choosing a file and clicking Import. Playback stays paused and saving remains your choice; an import failure shows what needs attention.

An explicitly imported **Draft timing** opens an optional recovery panel in Media Sync. Play the recording continuously beside the score, drag section boundaries or anchors, and use Undo/Redo. The usual blue playhead follows the draft recording during editing preview; missing endpoints stay unplaced. Missing endpoints and unresolved passages stay ungraded; choose **Use reviewed timing** only after review and validation. **Export draft** keeps the original timing/evidence and your edits. Ordinary imports do not show this panel.

Matched lessons can also contain **Unscored breaks** that are separate from spoken explanations. Listen through them or choose **Skip to music**; grading pauses during the break. Verified silent score measures may be skipped for that recording only. The original score and its synthesized playback stay intact, and notes are never stretched across these breaks.

Clicking notation or tab also chooses that score target in the sync editor while preserving the red dashed recording time. The black line follows playback/seeking. Clicking a timeline triangle selects that specific measure/beat and repeat pass, moves the sheet cursor and black playhead to its mapped recording time, and preserves the red dashed time. Sheet clicks follow native repeat navigation; check the Measure selector and choose a numbered repeat triangle if needed. Add/Update pairs that target with the red time.

Opening Media Sync also opens **Load / options** when no recording is loaded. Once a recording is attached, reopening takes you straight to the editor. Detailed instructions are available under **Load / options → Alignment help & waveform**. The compact editor keeps errors and action confirmations below the timeline; repeated editing reminders are hidden. Your saved panel height is preserved: double-click its top divider to reset it to the smaller default.

Video starts **Left of score** on first use. Change it in Media Sync → Load / options → Video placement; your saved choice is remembered, and a saved sync profile can restore its own placement. Narrow screens stack the panels. See the [media guide](docs/MEDIA-SYNC.md) for detailed alignment instructions. Local recordings can work offline; linked online sources need a connection.

While practicing in **Realtime**, clicking or scrubbing the recording timeline keeps playback running if it was already playing. If you are paused, seeking leaves it paused. Seeking still follows the usual practice-result reset rules. Wait mode stays silent.

With **Loop off**, Realtime lets the entire recording play, including material before and after the synced score. Practice results finish at the last measure while the video continues. Shaded sections of the recording timeline mark **Before synced music** and **After synced music**; those sections are not graded. Pause and resume there without losing your video position or completed result. Seeking back into the music follows the usual practice-reset rules. Enabled practice loops still repeat their selected measures, and Wait behavior is unchanged. These boundaries follow your saved alignment; the app does not automatically detect spoken introductions or endings. Original Guitar Pro files and sync points are not modified.

Sync follows the score's playback order, including repeats, alternate endings and recognized D.C./D.S./Coda/Fine markings. Each return to a written measure has its own position on the recording timeline. Your recording must follow the same musical order; add sync points at the appropriate passes when alignment needs adjustment.

YouTube loading may take a few seconds while the video length becomes available. If a video returns **code 150** on `http://127.0.0.1:8081/`, try the same server at [http://localhost:8081/](http://localhost:8081/) and load the same score/link. This resolved the tested All Of Me video; other videos may behave differently. These addresses have separate browser libraries and preferences: your original data stays at the original address. Use Backup Library/Import Library if you want to transfer saved scores and sync profiles. A video playing on youtube.com does not guarantee embedded playback in every context.

### Settings and saved choices

Settings selects the MIDI input and its mode/channel/bend configuration. Device settings save separately for each input. The last selected device can return automatically when reconnected; choosing None cancels that automatic selection.

Practice mode, Wait chord settings, feedback switches, display choices and master volumes are remembered in this browser. Use a consistent website address and port to keep access to those saved choices. Practice results are temporary. Expand diagnostics only for troubleshooting or to record a MIDI report; recording does not change grading.

## Updating your local copy

Open **More → Help & Guide → Downloads & releases** to visit the [GitHub Releases page](https://github.com/ztbishop/guitar-trainer-studio/releases). Choose a named release and download **Source code (zip)** for a complete copy, including its licenses, guide, demos and launchers. Beta releases are marked **Pre-release**. The [current project ZIP](https://github.com/ztbishop/guitar-trainer-studio/archive/refs/heads/main.zip) follows the latest work on the main branch and can include changes since a published release.

Updates are manual; the app does not check for new versions or replace your files automatically.

1. In **Scores**, choose **Backup Library** and keep the downloaded backup somewhere safe. It includes saved scores and sync profiles, but not your recordings or app preferences. Keep your original scores and recordings too.
2. Stop your local launcher or Live Server, then download and extract the whole updated project into a separate folder. Keep your previous copy until the update works.
3. Start the updated copy with your usual launcher or Live Server. Use the same browser profile, website address and port as before so your browser library and saved settings remain available. In particular, keep using either `localhost` or `127.0.0.1` consistently.
4. Refresh the page; hard-refresh if old controls remain. Open a familiar score and check playback and MIDI input. If your library appears empty, check the address and browser profile first, then use **Import Library (Merge)** if needed.

## Troubleshooting

- **No MIDI input?** Use a Web MIDI-capable browser, allow MIDI access, check the device/software connection, then select the input in Settings. A normal guitar audio cable alone does not provide MIDI.
- **Wrong strings or frets in Hex?** Check every string against the configured channel sequence. Left-handed orientation changes only the display. Pitch grading remains pitch-based.
- **Wait will not move?** Check the selected practice track, tuning and required notes. Release and replay a repeated note; try One at a time for chords. Muted notes need an actual MIDI message.
- **No sound?** Check Audio's synth/media volume, practice/backing switches, track mute and your computer output. Wait does not play score accompaniment. Start playback with the app's Play button.
- **Saved scores disappeared?** Confirm the browser profile, hostname and port. Import your downloaded Guitar Trainer backup if needed.
- **Launcher says Node.js is missing?** Install Node.js 22 or newer, then reopen the launcher. No npm commands are needed.
- **Port already in use?** Close the other Guitar Trainer launcher. Advanced users can set `GTS_PORT` to another port before starting; that address has its own browser library/preferences.
- **Guide or app will not load from disk?** Use the website, launcher or Live Server instead of double-clicking an HTML file.

The current stable release is **v1.0.2**. Compatibility depends on score contents, browser and MIDI device behavior. Automated checks do not establish physical MIDI accuracy or every score/provider combination.

## Appendix: MIDI input options

These are examples to research, not a complete list or a compatibility certification. The experience column reflects the maintainer's use of Fishman TriplePlay, MIDI Guitar 3 and MiGiC Poly; the remaining options are marked **not tested**. These are practical reports from the maintainer's setup, not a universal performance ranking. Results depend on configuration, software version and playing technique. Check current compatibility, availability and total setup cost before buying; prices are omitted because they change.

On a narrow screen, scroll the chart sideways to see all columns.

| Option | Instrument and signal | What else is needed / limitations | Experience with this app |
| --- | --- | --- | --- |
| [Fishman TriplePlay](https://fishman.com/tripleplay-support/) | Six-string guitar; dedicated pickup converts separate string signals to MIDI. | Compatible pickup fit and device setup. Poly or per-string Hex output must match the app; this is not a bass pickup recommendation. | Successful, with occasional tracking mistakes. More reliable than software conversion in the maintainer's tests. |
| [Jam Origin MIDI Guitar 3](https://jam.live/products/MG3/) | Guitar audio → polyphonic MIDI; software, no special pickup. | Audio interface plus MIDI routing to the browser. Use standard MIDI/Poly for ordinary guitar audio; MPE channels are not physical string channels. | Usable, with occasional extra notes. Some chords register more reliably with a gentle rake across the required strings rather than striking them all at once. [Demo available](https://jam.live/downloads/). |
| [Jam Origin MIDI Bass 3](https://jam.live/products/MB3/) | Bass audio → MIDI/MPE; software optimized for bass. | Audio interface and MIDI routing. Check current note-range/polyphony limits; bass setup in this app remains unverified. | Not tested. |
| [MiGiC NX / MiGiC Poly](https://migic.com/products/guitar-midi) | Guitar audio → MIDI; NX is monophonic, Poly supports chord tracking. | Audio interface, compatible software host/setup and MIDI routing. No bass compatibility claim. | Poly tested: can work in Wait with onscreen feedback turned off to reduce distraction, but sends many extra note attacks and incorrect notes. Scores can be misleading. NX not tested. [Demo available](https://migic.com/poly). |
| [Submarine SubSix](https://www.submarinepickup.com/pages/compare) | Six independent guitar **audio** channels; passive pickup, not a MIDI converter. | Multichannel audio input, breakout cabling and separate audio-to-MIDI conversion software. Submarine/SubPro have different routing; they are not equivalent six-channel MIDI devices. | Not tested. |
| [BOSS GK-5 / GK-5B + GM-800](https://www.boss.info/us/products/gm-800/) | Guitar or bass divided-pickup system; GM-800 provides guitar-to-MIDI output over USB or MIDI cable. | Compatible guitar/bass pickup, Serial GK cable and processor; the pickup alone is not a USB MIDI converter. Match outgoing channels to the app. | Not tested. |
| [Sonuus G2M V3](https://www.sonuus.com/products_g2m_spec.html) | Guitar or bass audio → monophonic five-pin MIDI. | MIDI-to-USB interface for the computer. Check the specific version, instrument mode, pitch-bend settings and current availability. | Not tested. |
| [REAPER ReaTune](https://www.reaper.fm/guides/ReaEffectsGuide.pdf) | Software pitch tracker with a MIDI-output option; a single-note experiment. | REAPER, an audio interface and MIDI routing. Included with REAPER; not a free standalone converter. Low-bass response and repeated-note attacks need testing. | Not tested; experimental route. |

**Monophonic** means one note at a time, not simultaneous chord recognition. Such converters may suit melody or single-note bass practice, but do not replace a polyphonic converter for simultaneous chord tracking. A product making a synth sound is not by itself evidence that it sends usable live MIDI to other apps.

Turning off feedback hides visual cues; it does not clean up incoming MIDI, change grading or make Wait accept missing required notes. For slower chord rakes, Wait → One at a time collects pitches without a time limit; Together still requires attacks within its selected chord window.

Whichever route you choose, confirm that it delivers live MIDI Note On/Off events at the expected pitches to an input your browser can select. A virtual MIDI port may be needed for software output. Try single notes, repeated same-pitch attacks, releases and the softest notes you normally play before testing chords; compare the converter's output with the app's diagnostics. Use a trial where available rather than buying on an untested compatibility assumption.

Bass entries are research pointers, not a claim of fully validated bass support. The app's configured Hex mapping is for six guitar strings; do not apply it to bass or MPE channels merely because several MIDI channels appear. Broader bass/position-mapping work remains separate from this comparison.

## License and source

Guitar Trainer Studio is free and open-source software under the **GNU Affero General Public License, version 3 or later (AGPL)**, with separately licensed components. You may use, modify and share it under the applicable licenses. It is provided **without warranty**. Copyright © 2026 ztbishop and contributors.

Read the [full license](LICENSE), browse the [application source](https://github.com/ztbishop/guitar-trainer-studio), or see [third-party licenses and source information](docs/LICENSING.md). Shared modified versions have source-sharing requirements; commercial use is permitted. alphaTab, its integration adaptations, fonts, sounds and the guide renderer retain their respective licenses. The original demo exercises are CC0. Your own scores and recordings keep their existing rights.

## For developers and contributors

For the owner: [GitHub license verification, release publishing and Pages setup](docs/PUBLISHING.md).

The app has no frontend build step. Keep native alphaTab rendering/playback and the existing MIDI/session boundaries. Start with [AGENTS.md](AGENTS.md), then [architecture](docs/ARCHITECTURE.md), [current status and to-do](docs/TODO.md) and [development notes](docs/DEV-NOTES.md). [Development setup and checks](docs/DEVELOPMENT.md) covers the server, demos and guide. Detailed subsystem references include the [score library](docs/SCORE-LIBRARY.md), [fretboard](docs/FRETBOARD.md) and [media sync](docs/MEDIA-SYNC.md).
