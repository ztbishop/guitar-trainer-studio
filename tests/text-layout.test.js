import test from 'node:test';
import assert from 'node:assert/strict';
import {wrapScoreText,installAlphaTabTextLayout} from '../js/alphatab-host.js';
import {nativeAlphaTab} from './fretboard-fixtures.js';

test('display wrapping measures words, splits oversized tokens and retains explicit empty lines',()=>{
  const measure=s=>s.length*10;
  assert.deepEqual(wrapScoreText(['one two three','', 'abcdefgh'],50,measure),['one','two','three','','abcde','fgh']);
  assert.deepEqual(wrapScoreText(['same text'],200,measure),['same text']);
  assert.equal(wrapScoreText(['𝄞abc'],1,measure).join(''),'𝄞abc');
});

test('text adapter is idempotent, retains native SVG and worker support, and safely rejects incompatible APIs',()=>{
  const at=nativeAlphaTab(),svg=at.Environment.renderEngines.get('svg');
  const engine=installAlphaTabTextLayout(at);
  assert.equal(engine,'gts-text-svg');
  assert.equal(installAlphaTabTextLayout(at),engine);
  assert.equal(at.Environment.renderEngines.get('svg'),svg);
  assert.equal(svg.supportsWorkers,true);
  assert.equal(at.Environment.renderEngines.get(engine).supportsWorkers,false);
  assert.equal(new at.Settings().core.useWorkers,true);
  assert.equal(installAlphaTabTextLayout({Environment:{}}),null);
  assert.equal(installAlphaTabTextLayout({meta:{version:'1.8.4'},Environment:{renderEngines:{}}}),null);
  assert.equal(installAlphaTabTextLayout({...at,meta:{version:'1.8.5'}}),null);
});
