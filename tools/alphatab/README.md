# Update the bundled alphaTab assets

## When a new alphaTab version comes out

1. In File Explorer, open the **GuitarTrainerStudio** folder that contains `tools`. Type `powershell` in the address bar and press Enter.
2. Run the command below, replacing **only** `1.9.0` with the exact new release number.

```powershell
.\tools\alphatab\qualify-alphatab.cmd 1.9.0 --install
```

3. Wait for **Installed and verified alphaTab**. Then press **Ctrl+F5** in the Trainer tab.

The command downloads the release, automatically tries the four current patches in a separate copy, and tests saved GPX and Soundslice lessons in Trainer. If a patch or a required test fails, the install step is skipped. Keep using your current Trainer. The console prints the report path and names the failed check.

For a test run only, omit `--install`. Every successful replacement keeps the previous files in a backup. If the **final installed-file verification** reports an error after replacement, the backup is available and rollback is manual. See the [rollback command and backup location](../../docs/ALPHATAB-UPGRADES.md#qualifying-19-and-later-releases).

### Previous 1.8.4 procedure and initial staging result

Read the [upgrade inventory](../../docs/ALPHATAB-UPGRADES.md) before changing versions. The updater uses Windows PowerShell 5.1, Git and Windows `tar.exe`. The app still needs no build step or runtime internet access.

The approved node-4 native-duration tap adaptation is mandatory: preserve alphaTab-tap-node-four.patch after all prior patches (**43 registered total**). It changes only stringed Tap/node 4 with numeric GtsTappedHarmonicTicks=-2 to the captured +4 pitch; unmarked node 4 and other marker values stay native +28. Preserve native duration/whammy and earlier node/fixed-release profiles. Port GPIF/GP export, cloning and classic/core worker handling of the existing -2 marker with the getter. Run node --test tests/tap-node-four-reader.test.js tests/tapped-harmonic.test.js tests/pinch-harmonic-reader.test.js plus retained clock/bend/timeline controls, complete prepared 94723/94724 imports and old/mixed/cached-reader refusal before qualifying new hashes. Verify normal/SMF whammy and complete ties, not just parsing. Full patch replay and offline maintenance must pass; update plan, manifest and MPL source notices together. See [mandatory port details](../../docs/ALPHATAB-UPGRADES.md).

Double-click **update-alphatab.cmd** to see the installed, latest and qualified versions. Enter selects the qualified version. A new upstream version is blocked until it passes the upgrade checklist.

From PowerShell at the repository root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\alphatab\update-alphatab.ps1 -Version 1.8.4
```

Verify the qualified version without installing:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\alphatab\update-alphatab.ps1 -Version 1.8.4 -CheckOnly
```

To evaluate a new release, pass its exact version with `-PrepareOnly`. This retains the verified archive and staged candidate under `tools/alphatab/.work`, including when a patch fails. Follow the inventory to locate upstream changes and run behavioral checks. `-PrepareOnly` without a version uses the registry's latest stable release. It never installs.

The 1.9.0 staging run reached patch replay and stopped at the TAB string-gap patch. The installed version remains 1.8.4. See the [1.9.0 checkpoint](../../docs/ALPHATAB-UPGRADES.md#alphatab-190-staging-checkpoint--2026-11-20) for marked-score cases that still need compatibility work.

The updater verifies the archive SHA-512, version, required runtime assets and licenses. It searches for each patch's context with `git apply --check`, replays the patches on staged files, and verifies the qualified upstream and final bundle hashes. Only then does it replace `assets/vendor/alphatab` and write a manifest with patch provenance and runtime/notice hashes. A conflict or mismatch leaves installed files untouched. A failed installation move attempts to restore the previous directory.

Run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\alphatab\test-updater.ps1` for the offline maintenance tests. They cover staged patch application, changed contexts, the version and hash gates, downloads simulated locally, and rollback.

Previous assets are retained in `tools/alphatab/.backups`, excluded from Git. Temporary downloads are cleaned up. Backups can be large and are kept until you remove them after acceptance. To restore one, close playback, move the current `assets/vendor/alphatab` folder somewhere safe, then copy the chosen complete backup folder to `assets/vendor/alphatab`. Alternatively, use Git to restore a committed vendor checkpoint, taking care to preserve any wanted local changes.

Captured pinch-harmonic pitches are a required local adaptation. Preserve the registered `alphaTab-pinch-harmonic-interval.patch` when staging a new alphaTab version; it carries `GtsPinchHarmonicSemitones` through classic/core GPIF, cloning, worker JSON and GP export. The marked +5 interval must sound MIDI 62 at the regression fixture’s A-string fret 12; the unmarked GP node must still sound MIDI 81. Run `node --test tests/pinch-harmonic-reader.test.js tests/tapped-harmonic.test.js` and the receiving Bridge old/mixed-core no-send check before qualifying new hashes. Do not retire this patch merely because the new reader imports the file: prove the same marked/unmarked pitches, source TAB, full ties, repeats, normal/SMF MIDI and worker roundtrips. See [the upgrade inventory](../../docs/ALPHATAB-UPGRADES.md).

After an update:

1. Review `git status` and the vendor diff. The script does not change application code, `version.json`, grading, scores or preferences, and does not commit, tag, push or deploy.
   Review dependency licenses, integrated-library notices and matching source links in [LICENSING.md](../../docs/LICENSING.md). Update them if upstream changes; the updater does not evaluate legal compatibility. Never drop required notices to bypass a changed package layout.
2. Run `node --test tests/*.test.js` using Node 22 or newer.
3. Hard-refresh your normal Live Server browser. Check score rendering/feedback alignment, zoom, track changes, Play/Pause/Resume, count-in, loops, tempo/metronome and silent Wait. Check Realtime and Wait with Fishman locally.
4. Record the update and verification in the project documentation, then commit and push when satisfied. Updating alphaTab does not automatically bump Guitar Trainer's version.

Do not run the updater while another chat or tool is editing vendor files. During replacement, avoid playback/reloading; reload after completion. Keep a known-good Git checkpoint before upgrading. A successful download establishes package integrity, not browser/hardware acceptance.

The approved short 12/8 clock and zero-midpoint bend-valley patches are mandatory update obligations. Preserve alphaTab-short-twelve-clock.patch and alphaTab-bend-valley.patch after the prior 39 patches, or prove equivalent upstream behavior before retiring either. Port numeric 5520 GPIF/model/worker clock handling and Note.finish valley preservation together in classic/core. Run tests/short-clock-valley-reader.test.js, retained clock/bend/tie controls, full saved 95578 readback and Bridge old/mixed/cached-core refusal checks. Printed meter, exact boundary sustain, bend MIDI midpoint, source TAB and every actual note/tie must survive. Replay all patches and maintenance tests before qualifying new hashes. See [the upgrade inventory](../../docs/ALPHATAB-UPGRADES.md).

Terminal multi-part clocks are an approved required adaptation. Retain alphaTab-terminal-clock.patch after all prior patches (42 registered at that checkpoint, before the node-4 extension). Preserve numeric 4440 GPIF/model/worker handling, complete final voice validation and ordinary unmarked isolation in both classic/core. Run terminal-clock-reader.test.js, all affected clock/hold controls, full 97232 source/Trainer proof, ordinary original-file comparisons and Bridge old/mixed/cached-core no-send controls. Replay all patches and updater maintenance before qualifying hashes. Keep the printed meter and all source notes/attacks/ties/final rests; opening the file is not sufficient. See [mandatory port checks](../../docs/ALPHATAB-UPGRADES.md).
