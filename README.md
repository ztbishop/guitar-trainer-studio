# Guitar Trainer Studio

Practice guitar with sheet music, tablature, playback and feedback from your MIDI guitar. Slow a piece down, repeat a section, or let the app wait while you find the notes.

Guitar Trainer Studio runs in a browser and uses alphaTab to display and play your scores. MIDI feedback needs a MIDI-capable guitar setup, such as Fishman Connect or a guitar-to-MIDI application, and a browser that supports Web MIDI. You can explore scores and playback without MIDI input.

[Repository](https://github.com/ztbishop/guitar-trainer-studio) · [Download ZIP](https://github.com/ztbishop/guitar-trainer-studio/archive/refs/heads/main.zip) · [Formatted guide](README.html)

## Start here

- [Open the app or run it locally](#open-the-app-or-run-it-locally)
- [Your first practice session](#your-first-practice-session)
- [Scores and your library](#scores-and-your-library)
- [Where to find music](#where-to-find-music)
- [Practice modes and feedback](#practice-modes-and-feedback)
- [Settings and other menus](#settings-and-other-menus)
- [Updating your local copy](#updating-your-local-copy)
- [Troubleshooting](#troubleshooting)

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
4. The launcher starts a small server on your computer and opens `http://127.0.0.1:8081/` in your default browser. The address also appears in the launcher window. Press **C, then Enter** there to copy it and paste into your preferred Web MIDI browser. If automatic copying fails, select and copy the displayed address.
5. Keep the launcher/terminal window open while practicing. Press Ctrl+C in it to stop the server when finished.

The app, score playback sounds, demo scores and this guide are bundled. You can practice offline with downloaded score files and local recordings. YouTube, linked online recordings and music download sites still need internet access. Guitar-to-MIDI software may have its own requirements.

On a Mac, the downloaded `.command` file may need permission to run. If necessary, open Terminal in the extracted project folder and run:

```sh
chmod +x "Launchers/Guitar Trainer - Mac.command"
```

Then open the launcher again. You can also start the local server directly from that folder with `node local-web-server.cjs --open`. Mac security prompts may depend on how the ZIP was downloaded; only allow files you trust.

The launcher serves only this computer. It is not a Wi-Fi/tablet server. It needs no VS Code or Live Server. Opening `index.html` directly as a disk file is not supported.

### Already using VS Code and Live Server?

Keep using it. Open this folder, start Live Server for `index.html`, and use its actual localhost/127.0.0.1 address and port in your usual browser. No build step is required. After an update, hard-refresh if the browser shows old controls.

## Your first practice session

1. Connect your MIDI guitar interface and start any MIDI conversion software it needs.
2. Open **Settings** and select the correct MIDI input. Match **Poly** or **Hex** to your device output:
   - **Poly / single channel:** notes share a MIDI channel; the app knows pitch but cannot reliably identify the played string.
   - **Hex / six channels:** each string sends on a different channel. Set the lowest-string base channel and channel order to match your device.
3. Open **Scores**. Choose **Open File**, or expand **Try a demo score** and open **First notes**.
4. Open **Practice**, select the guitar track you want to practice, and choose **Wait** to learn at your own pace or **Realtime** to practice timing.
5. Press **Play**. There is a one-bar count-in. In Wait, play the expected note or chord to move forward. In Realtime, follow the score at the set tempo.
6. Use **Pause** for a break; ordinary Pause/Resume preserves your results. You can also pause during count-in or while playback is starting. **Reset** returns to the start. **Clear practice results** starts fresh at the current position.

Both Poly and Hex currently grade **pitch**, not exact string/fret position. Playing the right pitch at another guitar position can still count. Feedback about strings depends on your MIDI configuration; optional Poly fret estimates are guidance, not detected hand positions.

## Scores and your library

Supported files are **Guitar Pro** (`.gp`, `.gp3`, `.gp4`, `.gp5`, `.gpx`) and **MusicXML** (`.xml`, `.musicxml`, `.mxl`). A PDF, image, ordinary text tab, MIDI file or webpage is not a supported score file.

- **Open File** opens a score for this session. It does not save it automatically.
- **Save to Library** keeps a browser copy of the open score.
- **Add File(s)** saves one or more files to the library without opening them. Files go into the selected folder, or Unfiled when All Scores is selected.
- Click a saved score to open it. Use its three-dot menu to rename, move or delete it. Use folders and search to organize your collection.
- **Manage** lets you select multiple scores or folders. Deleting a folder also deletes its saved scores after confirmation. Original files on your computer are unaffected.
- **Backup Library** downloads a JSON backup. **Import Library (Merge)** adds a Guitar Trainer backup without replacing your existing library. Piano Trainer backups use a different format and cannot be imported.

**Keep backups outside your browser.** The library belongs to this browser profile and website address. The hosted site, local launcher, and Live Server can have separate libraries. Even `localhost` and `127.0.0.1`, or different ports, are separate. Clearing browser data can remove saved scores. Backups include saved sync profiles but exclude recordings, MIDI settings, display preferences and practice results.

Some uncompressed MusicXML files contain separate, closely matching notation and tab guitar parts. When offered **Combine notation and tab**, you can combine them for practice or keep them separate. The original file is not changed. The app asks each time; compressed `.mxl` uses its normal import path.

### Included demos

Scores → **Try a demo score** offers three original, four-measure exercises in standard six-string tuning:

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

The score moves at the selected tempo. Play along to practice pitch and timing; missed notes and wrong attacks affect the result. Slow down in Tempo and work on a smaller Loop if needed.

### Wait

The app stays on each target until the required pitches are supplied. Score accompaniment stays paused. Choose a chord approach in Practice:

- **One at a time:** collect the required notes without a time limit.
- **Together:** play the required attacks within the selected chord window (200 ms on first use).

Repeated notes normally need a fresh attack. The **Allow held notes in repeated chords** option can credit eligible still-held tones in consecutive identical chords, but at least one required note must receive a fresh attack. Off, One, Two and Three select the allowance; Two is the initial choice.

Written muted **X** beats need a fresh MIDI attack. If your muted strum produces no MIDI at all, Wait cannot detect it. In mixed chords, pitched notes remain required.

### Reading the feedback

- The light-blue score cursor shows the current beat.
- Staff feedback uses green for correct notes and red for mistakes; wrong pitches can appear as red noteheads.
- Tab shows green correct frets on the active target and red errors. Original written frets remain intact; incorrect fret numbers appear beside them where supported.
- The fretboard uses blue targets, green correct notes and red mistakes. Optional upcoming-note views use gold outlines; earlier positions in the bar are faint.

Accepted notes still ringing from an earlier target stop drawing extra fretboard rings after you advance, including tones replayed while completing a Wait chord; they do not become mistakes. Genuine wrong-note rings remain visible, and fresh notes played while paused appear in neutral purple.

Practice has independent switches for Staff, tab highlights, incorrect fret numbers and Poly estimates; all four start on. Hiding feedback does not change grading. Poly estimates are shown only when the remaining written note makes the estimate unambiguous. These are estimated positions, not detected fingering; turn off Poly estimates or incorrect fret numbers if you prefer simpler feedback. Fret numbers can be particularly useful when the virtual fretboard is hidden.

## Settings and other menus

Some toolbar items move into **More** when the window is narrow.

### Practice and MIDI input tolerance

Practice selects one track and the practice mode. **Check MIDI input tolerance during setup**, especially if tracking causes unexpected errors or repeated chords stall. MIDI guitars and conversion software can report extra or lingering notes; these settings help balance comfortable practice against how strictly mistakes are counted. They do not replace correct device/channel setup.

- **Held notes** helps recognize repeated identical chords while allowing some tones to keep ringing.
- **Ignore extra chord strings (Hex)** can forgive selected unwritten strings in chords. It does not supply missing required pitches.
- **Filter confirmed tracking spikes (Hex)** filters specific MIDI sequences that indicate tracking artifacts.
- **Ignore notes outside written fret range** uses the written shape as a guide, not your actual hand position.
- **Ignore brief off-target notes** forgives wrong notes shorter than your chosen duration, including real brief mistakes.

These options apply in Realtime and both Wait chord choices; string-based options need Hex input. First use allows **Two held notes**, selects **Skipped strings only** for Hex extra-string tolerance, and enables **confirmed tracking-spike filtering**. Written-fret-range filtering and brief-note filtering start off; the brief-note duration starts at 30 ms when enabled. All four score-feedback switches start on. Saved choices take precedence over these defaults.

Change one option at a time and compare both comfortable playing and deliberate mistakes. More tolerance can also hide genuine mistakes. Two held notes verifies fewer reattacks than One, skipped-string tolerance forgives some real extra-string mistakes, and written-range filtering can omit distant wrong pitches. Brief-note filtering at 60 ms, for example, also forgives real wrong notes shorter than 60 ms. Correct required notes still count immediately.

The maintainer's current preferred setup is Two held notes, Skipped strings only, tracking-spike filtering on, written-range filtering on, and brief off-target filtering on at 60 ms. This is an optional starting point for tracking-prone setups, not a requirement or the app defaults. Brief filtering and duration save separately for each MIDI input; the other tolerance choices save as general practice preferences in this browser. Changing a tolerance option pauses practice and clears results. Realtime timing adjustment helps when your MIDI notes arrive late.

### Tempo and Loop

Tempo links BPM and playback percentage. Metronome volume and visual pulse help you keep time; Wait's metronome runs independently. Changing playback speed pauses practice and resets results.

Loop selects the section to repeat. Native score dragging selects whole measures; sliders allow precise repeat-occurrence choices. Changing the enabled range moves the cursor to its start and brings it into view while paused, without pressing Play. This one-time reveal also works with playback auto-scroll off; it does not change that setting. Play/resume has a one-bar count-in; Loop Count-in adds one at each repeat. Loop enablement and Loop Count-in reset when a score loads; they are not saved preferences.

### Display and the fretboard

Display controls zoom, auto-scroll, full screen on Play, chord diagrams, visible tracks and fretboard visibility. Showing all tracks does not change which single track is graded.

Use the **gear on the fretboard** for Beat / Beat + Next Beat / Beat + Bar views, note/fret/finger labels, left-handed orientation and help. Finger labels need explicit fingering in the score; the app does not invent it. Left-handed display does not reverse MIDI channel mapping.

The fretboard starts visible with **Beat + Bar**, note-name labels, alternate positions off, left-handed display off and automatic panel sizing. Your saved choices take precedence and return across score loads and visits, including manual sizing and choices made while the fretboard is hidden.

**Beat + Bar** shows the current measure. On its last beat it also previews the next beat in gold, then shows the full new measure when you enter it. Previews follow repeats and enabled loops; an upcoming rest has no fret markers.

Optional **Show alternate positions** adds faint dashed blue guides for the current target's exact pitches elsewhere on the neck. It defaults off and saves your choice. The guides help you explore other positions; they are not detected fingering, octave substitutions or extra notes to play. Written targets and grading stay unchanged, and alternate positions never invent finger numbers.

Fretboard arrows pause and browse targets while clearing the current attempt. Drag the divider to resize the panel; double-click it to restore automatic fit. Saved display choices return when you reopen the app.

### Audio and recordings

Audio has separate synth and synced-recording volumes, practice/backing playback switches, and track volume/mute controls. These control the app's sounds, not your guitar interface's own sounds. Track mix resets for each score; master volumes are remembered.

Synth playback pitch shifts the synthesized sound only. It does not transpose the written score, tab, MIDI targets or recordings.

**More → Media Sync** lets you align local audio/video, direct media URLs, YouTube or embedded score audio with your score. Use Synth audio or Recording as the playback source. While the sync editor is open, the main button says **Preview**: grading, score feedback, fretboard targets and loops are paused. Switching to Synth audio keeps the editor open. Choose **Finish editing / Return to practice** (or the editor's ×), then **Play**, to practice with your selected source and restored loop. Alignment stays available; save the profile to keep unsaved changes after reloading. In Wait, the recording stays paused/muted while solved targets can advance video.

Video starts **Left of score** on first use. Change it in Media Sync → Load / options → Video placement; your saved choice is remembered, and a saved sync profile can restore its own placement. Narrow screens stack the panels. See the [media guide](docs/MEDIA-SYNC.md) for detailed alignment instructions. Local recordings can work offline; linked online sources need a connection.

Sync follows the score's playback order, including repeats, alternate endings and recognized D.C./D.S./Coda/Fine markings. Each return to a written measure has its own position on the recording timeline. Your recording must follow the same musical order; add sync points at the appropriate passes when alignment needs adjustment.

### Settings and saved choices

Settings selects the MIDI input and its mode/channel/bend configuration. Device settings save separately for each input. The last selected device can return automatically when reconnected; choosing None cancels that automatic selection.

Practice mode, Wait chord settings, feedback switches, display choices and master volumes are remembered in this browser. Use a consistent website address and port to keep access to those saved choices. Practice results are temporary. Expand diagnostics only for troubleshooting or to record a MIDI report; recording does not change grading.

## Updating your local copy

Open **More → Help & Guide → Downloads & releases** to visit the [GitHub Releases page](https://github.com/ztbishop/guitar-trainer-studio/releases). Published releases provide named versions and download links. If no releases are listed yet, use the [current project ZIP](https://github.com/ztbishop/guitar-trainer-studio/archive/refs/heads/main.zip). That ZIP follows the latest work on the main branch and can include changes since a published release.

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

This is beta software. Compatibility depends on score contents, browser and MIDI device behavior. Automated checks do not establish physical MIDI accuracy or every score/provider combination.

## For developers and contributors

The app has no frontend build step. Keep native alphaTab rendering/playback and the existing MIDI/session boundaries. Start with [AGENTS.md](AGENTS.md), then [architecture](docs/ARCHITECTURE.md), [TODO](docs/TODO.md) and [development notes](docs/DEV-NOTES.md). [Development setup and checks](docs/DEVELOPMENT.md) covers the server, demos and guide. Detailed subsystem references include the [score library](docs/SCORE-LIBRARY.md), [fretboard](docs/FRETBOARD.md) and [media sync](docs/MEDIA-SYNC.md).
