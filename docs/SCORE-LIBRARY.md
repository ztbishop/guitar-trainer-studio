# Score library and audio controls

Implemented 2026-10-13. Keep using VS Code Live Server; no build or helper is required.

## Scores

- **Open File** loads Guitar Pro (`.gp`, `.gp3`, `.gp4`, `.gp5`, `.gpx`) or MusicXML (`.xml`, `.musicxml`, `.mxl`) through native alphaTab. Opening does not automatically save it.
- **Save open score** stores a successfully parsed original file, using its score title. **Import score files** stores multiple original files without opening them, using filenames as initial titles. Import reports saved/duplicate/failed counts; native parsing happens when a saved file opens.
- Choose a folder to browse and set the default save/import destination, or expand **Save location & edit score** to choose a destination explicitly. All scores defaults to Unfiled for new saves. Search matches title or filename.
- Click a saved title to open it. **Edit** exposes its title/destination; **Save changes** renames/moves it without replacing bytes. Identical file bytes are saved once, even with another filename/folder; use Edit to move an existing duplicate.
- **Folders & backup** creates single-level folders and renames the selected folder. Removing a folder keeps its scores in Unfiled. Deleting a saved score asks for confirmation and does not unload the current score or delete the original disk file.

The library belongs to this browser profile and origin (scheme, hostname, port). localhost, 127.0.0.1, another Live Server port and the published site have separate libraries. Browser data clearing/eviction or private browsing can remove it. Keep downloaded backups outside browser storage.

## Backup and import

**Download backup** exports folders, titles, filenames, original bytes and saved sync profiles to guitar-trainer-library.json (format version 2). **Import backup (merge)** accepts Guitar Trainer library versions 1 and 2. All entries validate before one atomic write transaction. Imports preserve existing metadata, merge folders by case-insensitive name and skip identical file bytes/profiles; they never clear/replace the library. Piano Trainer backups are not compatible import files.

Backups exclude recordings, waveforms, grades/results, MIDI configuration and audio/display preferences. Saved sync settings are included; see MEDIA-SYNC.md. Imported score bytes remain unchanged; alphaTab owns parsing/rendering. Storage failures appear in Scores while Open File remains available.

## Audio

- **Master volume** covers native score playback/metronome and independent Wait metronome/count-in, including edits during count-in. Its percentage persists in localStorage. Zero silences synthesized output without stopping transport or visual pulses. It does not control Fishman's own sounds or external software audio.
- **Play practice track / Play backing tracks** preserve existing Realtime routing. Wait accompaniment stays paused.
- **Track volume & mute** adjusts native track-channel playback. 100% keeps the score's mix; settings reset on score load and survive practice-track/view/mode changes. Explicit Mute overrides the playback switches.
- Tracks sharing primary/secondary MIDI channels have one mixer row, including transitive overlaps. Native alphaTab cannot distinguish their audio. If practice/backing switches disagree in a shared row, it plays when any member is enabled; row Mute wins.

Practice keeps independent Staff feedback, tab highlights and incorrect fret numbers. All four feedback switches, including the direct Poly estimates checkbox, start checked and retain each choice in localStorage. Practice mode also remembers your last choice (Realtime on first use), along with Wait chord choice/window (One at a time/200 ms on first use). MIDI timing adjustment and feedback explanations remain disclosures. Display keeps native zoom/scroll/fullscreen, track visibility and the existing six-string fretboard. Pitch matching/grading is unchanged.

## Verification

Run node --test tests/*.test.js (169 passing tests on 2026-10-13). Open tests/library-browser.html through Live Server and click **Run library checks** for 12 real IndexedDB checks; these use/remove a separate temporary database and leave the saved library untouched. Tests cover original bytes, validation-before-write, duplicate/additive merge, folder removal, persistence, restoration, channel grouping, native mixer calls, Wait/count-in master gain and unchanged grading state.

Owner acceptance remains: save/reopen actual GP/MXL scores, listen while adjusting master/track controls, check both modes with Fishman and test fullscreen/tablet controls. Preview/automated checks do not establish physical MIDI, audible balance, quota handling or every native score format.
