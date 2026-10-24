# GitHub release, license and website publishing

The application is a static browser app. Publishing does not require npm, a frontend build, changing the alphaTab host or replacing the owner's Live Server/browser/Fishman setup.

## License on GitHub

The root `LICENSE` contains the standard GNU AGPL v3 text. README and [LICENSING.md](LICENSING.md) explicitly grant AGPL-3.0-or-later for original application content and identify exceptions. GitHub detects the root file automatically; there is no additional license setting to enable. Its label may say AGPL-3.0 even though our application grant permits later versions.

1. Open the repository's Code tab and select LICENSE. It should begin “GNU AFFERO GENERAL PUBLIC LICENSE”, Version 3.
2. Check the About/license area for AGPL-3.0. Detection can lag; the committed license and scope statements remain authoritative.
3. Keep the separate alphaTab/MPL source information, font/sound notices, Marked MIT and CC0 demo terms. Do not replace the root file with an all-components MPL or MIT license. See [the full inventory](LICENSING.md).
4. Release source archives include committed license files. Keep all of them if packaging a separate download. For public hosting, the corresponding source must be accessible to recipients; a private GitHub link is not a public source offer.

Official reference: [GitHub repository licensing](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).

## Make the repository public when ready

The repository was private at beta preparation. Publishing a release does not change visibility; private releases remain restricted to people with access. The owner controls this change.

1. Review the tracked files and Git history before making them public, including project artwork/contribution rights. No personal practice captures or third-party music should be added without permission. Sonivox terms are recorded as declared by upstream, not independent sample clearance.
2. Open repository Settings → General → Danger Zone → Change repository visibility → Change to public. Follow GitHub's confirmation steps.
3. While signed out or in a private browser window, verify the repository, LICENSE, docs/LICENSING.md and the beta release/source download are accessible.

GitHub Free supports Pages for public repositories. Keeping a private repository requires a qualifying paid plan for Pages; the resulting site is generally public. This setup recommends a public source repository for the intended public open-source beta.

## Enable GitHub Pages

1. Open [repository Pages settings](https://github.com/ztbishop/guitar-trainer-studio/settings/pages).
2. Under Build and deployment, choose **Deploy from a branch**.
3. Select **main** and **/(root)**, then Save. Do not select `/docs`: the app's `index.html` is in the root.
4. Wait for the Pages build/deployment to finish. Check the Actions tab if it fails, then return to Pages and use the displayed Visit site link.
5. Enable **Enforce HTTPS** if offered. Expected default address: `https://ztbishop.github.io/guitar-trainer-studio/`. This address is a setup expectation until a live deployment is verified.
6. In a Web MIDI-capable desktop browser, open the site, allow MIDI permission and choose the Fishman/input configuration in Settings. Test one demo, a personal score, Play/Pause, Wait and Realtime. Confirm Help → License & Source and its public source link.

Root `.nojekyll` tells Pages to serve the committed static files without Jekyll processing. Runtime assets use relative/module-relative URLs so they remain under the repository subpath. License/notice files ship with the site. There is no backend or server installation on Pages, and the local launcher is not run there.

Browser library/preferences belong to the browser profile and origin. Back up the local library, then import it on the hosted site if wanted; local settings do not automatically migrate. Uploaded scores/recordings remain browser-side; this publishing procedure does not upload them to GitHub. Online recording providers still have their own connectivity/embedding constraints.

Publishing from main means every later push to main updates the website. Release tags remain fixed snapshots, so the live site can move beyond a tagged beta. A future release-only deployment workflow would be separate work.

Official reference: [GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Beta release maintenance

For an explicitly authorized release: verify that the proposed version/tag is unused, update version.json and current project guidance, run appropriate checks, review/commit/push the release files, create and push a new annotated tag, then publish a GitHub Release marked prerelease. Use the saved notes under docs/releases as the release body. Verify the published tag, target commit, prerelease status and download/source links. Preserve older tags and unrelated changes. Publishing a release never implicitly changes repository visibility or Pages settings.

Beta v0.0.4 was explicitly authorized on 2026-10-24, lifting the prior documentation/licensing hold. Its checks and publication result belong in DEV-NOTES.md and the task handoff; physical hardware acceptance and actual public hosting are separate from automated evidence.
