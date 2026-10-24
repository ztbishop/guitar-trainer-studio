# Licensing and third-party notices

Copyright © 2026 ztbishop and contributors.

Except for the components listed below, Guitar Trainer Studio's original code, documentation and project artwork are licensed under the GNU Affero General Public License, version 3 or (at your option) any later version (**AGPL-3.0-or-later**). You may use, modify and redistribute this work under those terms. It is provided without warranty. The complete, unmodified license text is in [LICENSE](../LICENSE).

The copyright statement above identifies the application contributors, not ownership of third-party components. Third-party notices and licenses remain in effect. User-loaded scores, recordings and other third-party content are not relicensed by this application. The license does not grant rights to music that a user imports.

## Source and redistribution

- Application source: [Guitar Trainer Studio repository](https://github.com/ztbishop/guitar-trainer-studio). Use the commit/tag matching the copy being distributed, including launchers, maintenance scripts and documentation. The application has no frontend build step.
- License and source access are linked from More → Help & Guide → License & Source and the root README. The local launcher serves these documents and license texts offline.
- Distribution of modified covered versions requires the applicable notices, license and corresponding source. AGPL section 13 also requires modified versions supporting remote interaction to prominently offer their corresponding source to those users. Commercial use is permitted; AGPL is not a noncommercial license. Read the full license for the conditions.
- Before public hosting, make the matching application source accessible to recipients. A link to a private repository is not a public source offer. This licensing update does not change repository visibility or publish a release.

## alphaTab 1.8.4

The runtime files in `assets/vendor/alphatab` come from the official `@coderline/alphatab` 1.8.4 npm package. `vendor-manifest.json` records package integrity and SHA-256 hashes of the installed files. The original runtime bytes are unchanged by this licensing update.

alphaTab is copyright Daniel Kuschny and Contributors and licensed under **MPL-2.0**. Retain [its full license](../assets/vendor/alphatab/LICENSE) and [integrated-library header](../assets/vendor/alphatab/LICENSE.header). Preferred source and build instructions are available in the [matching upstream v1.8.4 source](https://github.com/CoderLine/alphaTab/tree/v1.8.4); [download that source](https://github.com/CoderLine/alphaTab/archive/refs/tags/v1.8.4.zip).

The installed `alphaTab.js` already includes one project modification from 2026-10-19: `TabBarRenderer.collectSpaces` skips a nonexistent string-line slot instead of aborting a score system's rendering. Its readable modified JavaScript is included in this repository. The corresponding [TypeScript source patch](licenses/alphaTab-tab-gap.patch), also MPL-2.0, applies to the matching upstream source: from that source's root run `git apply /path/to/alphaTab-tab-gap.patch`, then use the upstream build instructions. No other runtime file differs from the verified upstream package. The manifest's `files` hashes describe this installed distribution; `upstreamFiles` retains the original alphaTab.js package hash, and `modifications` identifies the patch. A future updater install uses upstream assets; reassess the documented guard before accepting that upgrade.

`js/alphatab-host.js` contains compatibility adaptations of native alphaTab methods as well as app integration. That file is explicitly MPL-2.0, with its modified source included in this repository. It owns native score loading, rendering, transport and compatibility integration; it interacts with separate application MIDI/session/visual modules. Its MPL coverage must survive future edits or extraction into other files. For the combined AGPL application, alphaTab covered code and this host file are additionally distributed under AGPL-3.0-or-later through MPL section 3.3, while their MPL source rights and notices remain available. This does not replace the licenses on fonts, sounds or other separately licensed assets.

alphaTab's integrated TinySoundFont, SFZero, Haxe standard-library portions, SharpZipLib and NVorbis use MIT terms; adopted libvorbis portions use BSD-3-Clause. Copyright notices, terms and upstream links are collected in [alphaTab integrated libraries](licenses/alphaTab-integrated.txt), alongside the unchanged vendor headers.

## Fonts, sounds, guide renderer and demos

| Component | Applicable license and notices |
| --- | --- |
| Bundled Bravura notation fonts | SIL Open Font License 1.1; copyright © 2015 Steinberg Media Technologies GmbH, reserved font name Bravura. Preserve [Bravura-OFL.txt](../assets/vendor/alphatab/font/Bravura-OFL.txt), [FAQ](../assets/vendor/alphatab/font/Bravura-OFL-FAQ.txt) and [font log](../assets/vendor/alphatab/font/Bravura-FONTLOG.txt). Fonts retain OFL coverage; modified font names must respect the reserved-name condition. |
| Bundled Sonivox soundfont | Upstream alphaTab supplies an Apache-2.0 notice, copyright © 2004–2006 Sonic Network Inc. Preserve [the original notice](../assets/vendor/alphatab/soundfont/LICENSE), [upstream provenance README](../assets/vendor/alphatab/soundfont/README.md) and [full Apache 2.0 text](licenses/Apache-2.0.txt). This records upstream's declared terms, not an independent clearance of each sample's provenance. |
| Marked 15.0.12 | MIT; preserve [its original license and copyright notices](../assets/vendor/marked/LICENSE.md) and [version/source record](../assets/vendor/marked/README.md). Used by README.html only. |
| Three original demo exercises | CC0 1.0, as described in [the demo README](../assets/demos/README.md); this dedication covers their AlphaTex sources and generated GP files, not vendor code. |

The other committed GP test fixture is synthetic and generated by `tests/generate-fretboard-fixtures.js`, not a bundled commercial song. Do not add third-party scores, recordings or artwork without establishing permission and recording their terms. The original project artwork is covered by the application license to the extent the contributors hold rights in it; no third-party branding rights are granted.

## Maintenance responsibilities

`tools/alphatab/update-alphatab.ps1` requires and installs the package's LICENSE, LICENSE.header, Bravura notices and Sonivox notice/provenance with the runtime assets. It hashes these files in the manifest and rejects a package missing required notices before replacing the installed bundle. Its isolated test covers notice preservation and missing-license rejection. A future package layout change requires explicit review, not removal of the checks.

On every dependency update, review new/changed dependencies, licenses and source links here and in the integrated-library notice. The updater preserves package-supplied notices; it cannot decide whether a new dependency/license is suitable. Keep this notice set in hosted sites and downloadable archives. No runtime grading, MIDI or native playback policy depends on the licensing documents.

The owner authorized Beta v0.0.4 on 2026-10-24 after the licensing update, lifting the prior release hold. Repository visibility and Pages activation remain separate owner-controlled steps; see [PUBLISHING.md](PUBLISHING.md). The license/source files must remain available in every public deployment and release archive.
