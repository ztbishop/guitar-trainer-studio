import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {EventEmitter} from 'node:events';
import {nativeAlphaTab} from './fretboard-fixtures.js';
import {buildPlaybackTimeline, getPracticeEvents} from '../js/score-playback.js';
const {createAppServer,copyAddress} = createRequire(import.meta.url)('../local-web-server.cjs');

test('launcher copies the exact local URL and handles missing/failed clipboard tools without changing the real clipboard', async () => {
  const url = 'http://127.0.0.1:8081/';
  for (const result of ['success','failure','missing','pipe']) {
    let written;
    const copied = await copyAddress(url, (command,args,options) => {
      assert.ok(['clip.exe','pbcopy'].includes(command)); assert.deepEqual(args,[]); assert.equal(options.windowsHide,true);
      const child = new EventEmitter(); child.stdin = new EventEmitter();
      child.stdin.end = text => { written=text; queueMicrotask(() => {
        if (result === 'missing') child.emit('error',new Error('missing'));
        else if (result === 'pipe') child.stdin.emit('error',new Error('closed'));
        else child.emit('close',result === 'success' ? 0 : 1);
      }); };
      return child;
    });
    assert.equal(written,url); assert.equal(copied,result === 'success');
  }
});

test('launcher server reports invalid and occupied ports without opening a browser', async t => {
  const run = port => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(new URL('../local-web-server.cjs', import.meta.url))],
      {env:{...process.env, GTS_PORT:String(port)}, windowsHide:true});
    let output = ''; child.stdout.on('data', data => {output += data;}); child.stderr.on('data', data => {output += data;});
    child.on('error', reject); child.on('exit', code => resolve({code,output}));
  });
  const invalid = await run('invalid'); assert.equal(invalid.code,1); assert.match(invalid.output,/GTS_PORT/);
  const server = createAppServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const occupied = await run(server.address().port); assert.equal(occupied.code,1); assert.match(occupied.output,/already in use/);
});

test('local ZIP server serves offline app/guide assets and rejects nonpublic paths and methods', async t => {
  const server = createAppServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const port = server.address().port;
  const request = (path, method = 'GET') => new Promise((resolve, reject) => {
    const req = http.request({hostname:'127.0.0.1', port, path, method}, res => {
      const chunks = [];
      res.on('data', data => chunks.push(data));
      res.on('end', () => resolve({status:res.statusCode, type:res.headers['content-type'], body:Buffer.concat(chunks)}));
    });
    req.on('error', reject); req.end();
  });
  for (const [url, type] of [['/','text/html'], ['/README.html','text/html'], ['/README.md','text/plain'],
    ['/LICENSE','text/plain'], ['/docs/LICENSING.md','text/plain'], ['/docs/licenses/Apache-2.0.txt','text/plain'],
    ['/assets/vendor/alphatab/LICENSE','text/plain'], ['/assets/vendor/alphatab/font/Bravura-OFL.txt','text/plain'],
    ['/assets/vendor/alphatab/soundfont/LICENSE','text/plain'],
    ['/js/demo-scores.js','text/javascript'], ['/assets/vendor/marked/marked.umd.js','text/javascript'],
    ['/assets/vendor/alphatab/alphaTab.worker.mjs','text/javascript'], ['/assets/vendor/alphatab/font/Bravura.woff2','font/woff2']]) {
    const response = await request(url);
    assert.equal(response.status, 200, url); assert.ok(response.type.startsWith(type), url); assert.ok(response.body.length);
  }
  assert.equal((await request('/assets/demos/first-notes.gp')).status, 200);
  const head = await request('/README.html', 'HEAD'); assert.equal(head.status, 200); assert.equal(head.body.length, 0);
  for (const url of ['/.git/config', '/local-web-server.cjs', '/AGENTS.md', '/assets/../.git/config', '/assets/%2e%2e/.git/config', '/assets/%2e%2e%5c.git/config', '/missing']) {
    assert.equal((await request(url)).status, 404, url);
  }
  assert.equal((await request('/assets/%zz')).status, 400);
  assert.equal((await request('/README.md', 'POST')).status, 405);
});

const at = nativeAlphaTab();
for (const [file, count, chordSize] of [['first-notes',15,1], ['easy-chords',7,6], ['gentle-picking',29,1]]) {
  test(`bundled ${file} imports, renders notation/tab and creates playable practice targets`, () => {
    const settings = new at.Settings();
    settings.core.engine = 'svg'; settings.core.enableLazyLoading = false;
    const score = at.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(readFileSync(new URL(`../assets/demos/${file}.gp`, import.meta.url))), settings);
    assert.equal(score.tracks.length, 1); assert.equal(score.masterBars.length, 4);
    const staff = score.tracks[0].staves[0];
    assert.deepEqual([...staff.tuning], [64,59,55,50,45,40]);
    assert.equal(staff.capo, 0); assert.ok(staff.showTablature && staff.showStandardNotation);
    const renderer = new at.rendering.ScoreRenderer(settings); renderer.width = 900;
    let chunks = 0; renderer.error.on(error => { throw error; });
    renderer.partialRenderFinished.on(result => { if (result.renderResult) chunks++; });
    renderer.renderScore(score, [0]); assert.ok(chunks);
    const midi = new at.midi.MidiFile();
    const generator = new at.midi.MidiFileGenerator(score, settings, new at.midi.AlphaSynthMidiFileHandler(midi)); generator.generate();
    const events = getPracticeEvents(buildPlaybackTimeline(generator.tickLookup), '0');
    assert.equal(events.length, count); assert.equal(events[0].notes.length, chordSize);
    assert.ok(events.every(event => event.notes.length && event.notes.every(note => note.string >= 1 && note.string <= 6 && Number.isFinite(note.midi))));
  });
}
