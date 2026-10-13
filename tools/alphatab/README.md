# Update the bundled alphaTab assets

Maintenance verification: run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\alphatab\test-updater.ps1` from the repository root. It uses a temporary fixture and simulated downloads to check latest-version selection, check-only, installation/backup, corrupt downloads, missing assets and rollback; it never edits the real vendor bundle.

In the repository, open `tools/alphatab` and double-click **update-alphatab.cmd**. It shows the installed version and asks which stable version to install. Press Enter to select the official npm registry's latest stable release, or type an exact version such as `1.8.4`. Internet access is needed only while updating. Windows PowerShell 5.1 and Windows' built-in `tar.exe` are required; no Node/npm installation or app build is needed for the updater.

From PowerShell at the repository root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\alphatab\update-alphatab.ps1 -Version 1.8.4
```

Verify the download without installing:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\alphatab\update-alphatab.ps1 -Version 1.8.4 -CheckOnly
```

The script downloads one official versioned npm package, verifies its SHA-512 digest against registry metadata, checks its version and required files, and stages everything before replacing `assets/vendor/alphatab`. It installs the UMD browser library, matching core/worker/worklet modules, Bravura fonts and Sonivox soundfont. `vendor-manifest.json` records the version, package integrity and individual asset hashes. No CDN is used by the running app. An integrity/download/extraction failure leaves the installed bundle untouched; a failed installation move attempts to restore the previous directory.

Previous assets are retained in `tools/alphatab/.backups`, excluded from Git. Temporary downloads are cleaned up. Backups can be large and are kept until you remove them after acceptance. To restore one, close playback, move the current `assets/vendor/alphatab` folder somewhere safe, then copy the chosen complete backup folder to `assets/vendor/alphatab`. Alternatively, use Git to restore a committed vendor checkpoint, taking care to preserve any wanted local changes.

After an update:

1. Review `git status` and the vendor diff. The script does not change application code, `version.json`, grading, scores or preferences, and does not commit, tag, push or deploy.
2. Run `node --test tests/*.test.js` using Node 22 or newer.
3. Hard-refresh your normal Live Server browser. Check score rendering/feedback alignment, zoom, track changes, Play/Pause/Resume, count-in, loops, tempo/metronome and silent Wait. Check Realtime and Wait with Fishman locally.
4. Record the update and verification in the project documentation, then commit and push when satisfied. Updating alphaTab does not automatically bump Guitar Trainer's version.

Do not run the updater while another chat or tool is editing vendor files. During replacement, avoid playback/reloading; reload after completion. Keep a known-good Git checkpoint before upgrading. A successful download establishes package integrity, not browser/hardware acceptance.
