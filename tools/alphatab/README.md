# Update the bundled alphaTab assets

Read the [upgrade inventory](../../docs/ALPHATAB-UPGRADES.md) before changing versions. The updater uses Windows PowerShell 5.1, Git and Windows `tar.exe`. The app still needs no build step or runtime internet access.

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
