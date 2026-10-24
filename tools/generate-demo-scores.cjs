// Offline authoring only, never loaded by the app. Rebuild with Node 22+.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({console, process, TextEncoder, TextDecoder});
vm.runInContext(fs.readFileSync(path.join(root, 'assets/vendor/alphatab/alphaTab.js'), 'utf8'), context);
const at = context.alphaTab;
for (const file of ['first-notes', 'easy-chords', 'gentle-picking']) {
  const settings = new at.Settings();
  const importer = new at.importer.AlphaTexImporter();
  importer.initFromString(fs.readFileSync(path.join(root, `assets/demos/${file}.alphatex`), 'utf8'), settings);
  const score = importer.readScore();
  score.copyright = 'CC0 1.0 — Guitar Trainer Studio original demo';
  const bytes = new at.exporter.Gp7Exporter().export(score, settings);
  fs.writeFileSync(path.join(root, `assets/demos/${file}.gp`), bytes);
  console.log(`Created ${file}.gp (${bytes.length} bytes)`);
}
