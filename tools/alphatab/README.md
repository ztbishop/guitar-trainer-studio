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

## Reinstall or verify the current bundles

Guitar Trainer Studio v1.0.2 includes the qualified alphaTab 1.9.0 bundles. Use an explicit version at the repository root to reinstall the same release.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\alphatab\update-alphatab.ps1 -Version 1.9.0
```

Add `-CheckOnly` to verify the qualified package without installing it. Use `-PrepareOnly` with a candidate version to stage an upgrade for inspection. The staged files stay under `tools/alphatab/.work` and the installed reader stays in place.

The 1.8.4 patch inventory and initial 1.9.0 staging attempt remain useful for comparison and rollback. The current four replay patches carry forward the supported marked-score behaviors, including the captured pinch and tap pitches. Follow the inventory when qualifying a new release. [Upgrade inventory and rollback](../../docs/ALPHATAB-UPGRADES.md)

The updater verifies the archive SHA-512, version, required runtime assets and licenses. It searches for each patch's context with `git apply --check`, replays the patches on staged files, and verifies the qualified upstream and final bundle hashes. Only then does it replace `assets/vendor/alphatab` and write a manifest with patch provenance and runtime/notice hashes. A conflict or mismatch leaves installed files untouched. A failed installation move attempts to restore the previous directory.

Run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\alphatab\test-updater.ps1` for the offline maintenance tests. They cover staged patch application, changed contexts, the version and hash gates, downloads simulated locally, and rollback.

Previous assets are retained in `tools/alphatab/.backups`, excluded from Git. Temporary downloads are cleaned up. Backups can be large and are kept until you remove them after acceptance. To restore one, close playback, move the current `assets/vendor/alphatab` folder somewhere safe, then copy the chosen complete backup folder to `assets/vendor/alphatab`. Alternatively, use Git to restore a committed vendor checkpoint, taking care to preserve any wanted local changes.

After an update:

1. Review `git status` and the vendor diff. The script does not change application code, `version.json`, grading, scores or preferences, and does not commit, tag, push or deploy.
   Review dependency licenses, integrated-library notices and matching source links in [LICENSING.md](../../docs/LICENSING.md). Update them if upstream changes; the updater does not evaluate legal compatibility. Never drop required notices to bypass a changed package layout.
2. Run `node --test tests/*.test.js` using Node 22 or newer.
3. Hard-refresh your normal Live Server browser. Check score rendering/feedback alignment, zoom, track changes, Play/Pause/Resume, count-in, loops, tempo/metronome and silent Wait. Check Realtime and Wait with Fishman locally.
4. Record the update and verification in the project documentation, then commit and push when satisfied. Updating alphaTab does not automatically bump Guitar Trainer's version.

Do not run the updater while another chat or tool is editing vendor files. During replacement, avoid playback/reloading; reload after completion. Keep a known-good Git checkpoint before upgrading. A successful download establishes package integrity, not browser/hardware acceptance.

The approved short 12/8 clock and zero-midpoint bend-valley patches are mandatory update obligations. Preserve alphaTab-short-twelve-clock.patch and alphaTab-bend-valley.patch after the prior 39 patches, or prove equivalent upstream behavior before retiring either. Port numeric 5520 GPIF/model/worker clock handling and Note.finish valley preservation together in classic/core. Run tests/short-clock-valley-reader.test.js, retained clock/bend/tie controls, full saved 95578 readback and Bridge old/mixed/cached-core refusal checks. Printed meter, exact boundary sustain, bend MIDI midpoint, source TAB and every actual note/tie must survive. Replay all patches and maintenance tests before qualifying new hashes. See [the upgrade inventory](../../docs/ALPHATAB-UPGRADES.md).

Terminal multi-part clocks are an approved required adaptation. Retain alphaTab-terminal-clock.patch after all prior patches (42 registered at that checkpoint, before the node-4 extension). Preserve numeric 4440 GPIF/model/worker handling, complete final voice validation and ordinary unmarked isolation in both classic/core. Run terminal-clock-reader.test.js, all affected clock/hold controls, full 97232 source/Trainer proof, ordinary original-file comparisons and Bridge old/mixed/cached-core no-send controls. Replay all patches and updater maintenance before qualifying hashes. Keep the printed meter and all source notes/attacks/ties/final rests; opening the file is not sufficient. See [mandatory port checks](../../docs/ALPHATAB-UPGRADES.md).
