# Original demo scores

These three short exercises were authored for Guitar Trainer Studio in this repository on 2026-10-24. They do not copy a published song or third-party arrangement. The `.alphatex` files are the editable source; `.gp` files are generated using the bundled native alphaTab importer/exporter.

- First notes: 15 single-note attacks on the top three strings, 80 BPM.
- Easy chords: seven attacks across Em, Am and C, 70 BPM. Repeated chords are separate attacks, not ties.
- Gentle picking: 29 single-note attacks across Em/Am shapes, 75 BPM.

All use standard six-string tuning (E A D G B E), no capo, one guitar track, four measures, and native notation/tab. They are optional examples, not a device calibration or an assessment of guitar technique. Play only after choosing practice mode; opening does not start playback or save to the library.

To the extent copyright applies, the project contributor dedicates these original exercises and their source/generated score files to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). You may use, modify and redistribute them without attribution. This dedication does not apply to alphaTab or other project/vendor code.

Rebuild from the project root with `node tools/generate-demo-scores.cjs`. This is optional authoring tooling, not a runtime build step. The app consumes only the generated `.gp` files through the existing host loading path. Tests parse those files with bundled alphaTab, render SVG and generate practice timelines.
