# Licensing and third-party notices

Copyright © 2026 ztbishop and contributors.

Except for the components listed below, Guitar Trainer Studio's original code, documentation and project artwork are licensed under the GNU Affero General Public License, version 3 or (at your option) any later version (**AGPL-3.0-or-later**). You may use, modify and redistribute this work under those terms. It is provided without warranty. The complete, unmodified license text is in [LICENSE](../LICENSE).

The copyright statement above identifies the application contributors, not ownership of third-party components. Third-party notices and licenses remain in effect. User-loaded scores, recordings and other third-party content are not relicensed by this application. The license does not grant rights to music that a user imports.

## Source and redistribution

- Application source: [Guitar Trainer Studio repository](https://github.com/ztbishop/guitar-trainer-studio). Use the commit/tag matching the copy being distributed, including launchers, maintenance scripts and documentation. The application has no frontend build step.
- License and source access are linked from More → Help & Guide → License & Source and the root README. The local launcher serves these documents and license texts offline.
- Distribution of modified covered versions requires the applicable notices, license and corresponding source. AGPL section 13 also requires modified versions supporting remote interaction to prominently offer their corresponding source to those users. Commercial use is permitted; AGPL is not a noncommercial license. Read the full license for the conditions.
- Before public hosting, make the matching application source accessible to recipients. A link to a private repository is not a public source offer. This licensing update does not change repository visibility or publish a release.

## alphaTab 1.9.0

The bundled alphaTab runtime is copyright Daniel Kuschny and Contributors, licensed under [MPL-2.0](../assets/vendor/alphatab/LICENSE). The [upstream source for v1.9.0](https://github.com/CoderLine/alphaTab/tree/v1.9.0), [integration header](../assets/vendor/alphatab/LICENSE.header) and [installed manifest](../assets/vendor/alphatab/vendor-manifest.json) identify the source, original package integrity and installed file hashes. The readable classic and core JavaScript bundles incorporate the following local modifications, maintained as MPL-2.0 patches against the official npm distribution.

- [Score model, GP import and export](licenses/alphatab-1.9.0/alphaTab-marked-scores.patch)
- [MIDI generation and sampled playback](licenses/alphatab-1.9.0/alphaTab-marked-playback.patch)
- [Score and MIDI worker serialization](licenses/alphatab-1.9.0/alphaTab-worker-compatibility.patch)
- [Note-specific native tapping notation](licenses/alphatab-1.9.0/alphaTab-native-tapping.patch)

## alphaTab 1.8.4 rollback source record

For the 1.8.4 rollback release, the runtime files in `assets/vendor/alphatab` come from the official `@coderline/alphatab` 1.8.4 npm package, with the local adaptations below. `vendor-manifest.json` records package integrity and SHA-256 hashes of the installed files.

alphaTab is copyright Daniel Kuschny and Contributors and licensed under **MPL-2.0**. Retain [its full license](../assets/vendor/alphatab/LICENSE) and [integrated-library header](../assets/vendor/alphatab/LICENSE.header). Preferred source and build instructions are available in the [matching upstream v1.8.4 source](https://github.com/CoderLine/alphaTab/tree/v1.8.4); [download that source](https://github.com/CoderLine/alphaTab/archive/refs/tags/v1.8.4.zip).

The installed `alphaTab.js` includes the 2026-10-19 `TabBarRenderer.collectSpaces` guard, which skips a nonexistent string-line slot rather than aborting a system's render. See the corresponding MPL-2.0 [TypeScript patch](licenses/alphaTab-tab-gap.patch) and [bundle patch](licenses/alphaTab-tab-gap-bundle.patch).

The per-note right-hand tapping and explicit ghost release fixes adapt `alphaTab.js` and `alphaTab.core.mjs`. The readable modified files and MPL-2.0 source patches for [tapping](licenses/alphaTab-note-tap.patch) and [ghost release](licenses/alphaTab-ghost-release.patch) are included. Other runtime files and notices remain as supplied. `vendor-manifest.json` records the installed and original package hashes for each modified file. The updater replays the patches in the order recorded in the [upgrade inventory](ALPHATAB-UPGRADES.md).

The same MPL-2.0 bundles include the source patches for [fine-bend playback](licenses/alphaTab-fine-bend.patch) [internal GP bar clocks](licenses/alphaTab-bar-clock.patch), [explicit source slide playback](licenses/alphaTab-source-slide.patch), and [explicit repeat-ending tie release](licenses/alphaTab-repeat-tie-release.patch).

The [whole note in written 6/8 patch](licenses/alphaTab-six-eight-clock.patch) extends the validated internal GP clock profiles in both bundles under MPL-2.0.

The [swung connected-grace clock patch](licenses/alphaTab-swung-grace-clock.patch) extends the marked GP profiles in both bundles under MPL-2.0.

The [sustained tied bend patch](licenses/alphaTab-tied-bend.patch) and [performed clock and peak patch](licenses/alphaTab-tied-bend-clock.patch) apply to both bundles under MPL-2.0.

The [sampled legato approach patch](licenses/alphaTab-sample-legato.patch) applies to both bundles under MPL-2.0.

The [falling tied bend patch](licenses/alphaTab-falling-tie.patch) applies to both bundles under MPL-2.0.

The [written vibrato patch](licenses/alphaTab-written-vibrato.patch) applies to both bundles under MPL-2.0.

The [pre-bent release patch](licenses/alphaTab-prebend-release.patch) applies to both bundles under MPL-2.0.

The [swung chord rise patch](licenses/alphaTab-swung-chord-rise.patch) applies to both bundles under MPL-2.0.

The [source articulation patch](licenses/alphaTab-source-articulation.patch) applies to both bundles under MPL-2.0.

The [paired falling exit patch](licenses/alphaTab-paired-falling-exit.patch) applies to both bundles under MPL-2.0.

The [continued bend restart patch](licenses/alphaTab-continued-bend-restart.patch) applies to both bundles under MPL-2.0.

The [held rise vibrato patch](licenses/alphaTab-held-rise-vibrato.patch) applies to both bundles under MPL-2.0.

The [short swing bends patch](licenses/alphaTab-short-swing-bends.patch) applies to both bundles under MPL-2.0.

The [source legato and swing clock patch](licenses/alphaTab-source-legato-clock.patch) applies to both bundles under MPL-2.0.

The [terminal held rise patch](licenses/alphaTab-terminal-held-rise.patch) applies to both bundles under MPL-2.0.

The [paired terminal release patch](licenses/alphaTab-paired-terminal-release.patch) applies to both bundles under MPL-2.0.

The [captured tapped harmonics patch](licenses/alphaTab-tapped-harmonic.patch) applies to both bundles under MPL-2.0.

The [tap practice pitch patch](licenses/alphaTab-tap-practice-pitch.patch) applies to both bundles under MPL-2.0.

The [captured hammer and chord release patch](licenses/alphaTab-held-hammer.patch) applies to both bundles under MPL-2.0.

The [swung reattack and chord release patch](licenses/alphaTab-swung-reattack.patch) applies to both bundles under MPL-2.0.

The [swung dyad release and sampled slide patch](licenses/alphaTab-swung-dyad-release.patch) applies to both bundles under MPL-2.0.

The [long vibrato rise and swung quarter dyad patch](licenses/alphaTab-long-vibrato-rise.patch) applies to both bundles under MPL-2.0.

The [straight paired bend and sampled legato patch](licenses/alphaTab-straight-paired-playback.patch) applies to both bundles under MPL-2.0.

The [terminal fall and sampled triplet patch](licenses/alphaTab-terminal-fall.patch) applies to both bundles under MPL-2.0.

The [sampled blues slides and releases patch](licenses/alphaTab-sampled-blues.patch) applies to both bundles under MPL-2.0.

The [compact blues bend and articulation patch](licenses/alphaTab-compact-blues.patch) applies to both bundles under MPL-2.0.

The [sampled rock restart and releases patch](licenses/alphaTab-rock-restart.patch) applies to both bundles under MPL-2.0.

The [fractional rock slides and bends patch](licenses/alphaTab-rock-lead.patch) applies to both bundles under MPL-2.0.

The [marked on-beat rock grace and written effects patch](licenses/alphaTab-rock-grace.patch) applies to both bundles under MPL-2.0.

The [pre-bent approach and paired release patch](licenses/alphaTab-prebend-approach.patch) applies to both bundles under MPL-2.0.

`js/alphatab-host.js` contains compatibility adaptations of native alphaTab methods as well as app integration. That file is explicitly MPL-2.0, with its modified source included in this repository. It owns native score loading, rendering, transport and compatibility integration; it interacts with separate application MIDI/session/visual modules. Its MPL coverage must survive future edits or extraction into other files. For the combined AGPL application, alphaTab covered code and this host file are additionally distributed under AGPL-3.0-or-later through MPL section 3.3, while their MPL source rights and notices remain available. This does not replace the licenses on fonts, sounds or other separately licensed assets.

alphaTab's integrated TinySoundFont, SFZero, Haxe standard-library portions, SharpZipLib and NVorbis use MIT terms; adopted libvorbis portions use BSD-3-Clause. Copyright notices, terms and upstream links are collected in [alphaTab integrated libraries](licenses/alphaTab-integrated.txt), alongside the unchanged vendor headers.

## PDF rendering, MIDI import and PDF timing

The PDF viewer includes Mozilla Foundation’s PDF.js 6.5.438 under Apache-2.0. Its character maps, standard fonts, color profile and image codecs carry additional notices in their respective asset directories. Keep those notices with the distribution. [PDF.js license](../assets/vendor/pdfjs/LICENSE) · [Version and upstream source](../assets/vendor/pdfjs/SOURCE.md)

MIDI import uses LibreScore’s webmscore 0.21.0, which incorporates MuseScore. The bundled license credits MuseScore BVBA and others and includes its font exception. The source record identifies the local JavaScript correction, upstream release and corresponding source. [Bundled GPL license](../assets/vendor/webmscore/LICENSE.GPL) · [Source and modification record](../assets/vendor/webmscore/SOURCE.md)

The PDF timing comparison and its measure-spacing recommendations are original Guitar Trainer Studio code covered by the application license.

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

The [source-marked pinch harmonic interval patch](licenses/alphaTab-pinch-harmonic-interval.patch) applies to classic/core under MPL-2.0. It preserves explicit captured pitch through GPIF, worker transport and native playback; the updater inventory and registered hashes must accompany future ports.

The owner-approved [short 12/8 clock patch](licenses/alphaTab-short-twelve-clock.patch) and [zero-midpoint bend-valley patch](licenses/alphaTab-bend-valley.patch) apply to classic/core under MPL-2.0. Keep these source patches, matching manifest/plan hashes and updater obligations with future ports.

The approved [terminal multi-part clock patch](licenses/alphaTab-terminal-clock.patch) is retained under MPL-2.0 for classic/core. Its registered replay plan, exact manifest/hash provenance and future updater obligations accompany the source.

The owner-authorized marked native-duration Tap/node-4 adaptation retains its readable MPL-2.0 [classic/core source patch](licenses/alphaTab-tap-node-four.patch), exact vendor manifest/patch-plan provenance and [mandatory updater obligations](ALPHATAB-UPGRADES.md). Unmarked ordinary GP behavior remains native.
