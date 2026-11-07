import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {tapProbe,rawMarks,modelMarks,writtenNotes,performance,connections,witness,savedInputs} from './right-hand-tap-fixtures.cjs';

const probe=tapProbe(),{at}=probe;
const baseline=process.env.GTS_TAP_BASELINE ? tapProbe(process.env.GTS_TAP_BASELINE) : null;
const bridge=process.env.GTS_TAP_REFERENCE;
const savedFixture=bridge && createRequire(import.meta.url)(path.join(bridge,'integrations','soundslice','tests','right-hand-fixture.cjs')).rightHandFixture;

function assertRoundTrip(bytes){
  const score=probe.read(bytes),expected=rawMarks(probe,probe.xml(bytes));
  assert.deepEqual(modelMarks(score),expected,'exact original GPIF note mask in model');
  const codec=probe.p.JsonConverter,settings=new at.Settings();
  const json=codec.jsonToScore(codec.scoreToJson(score),settings);
  const worker=codec.jsObjectToScore(structuredClone(codec.scoreToJsObject(score)),settings);
  const gp=probe.gp(score),reopened=probe.read(gp);
  assert.deepEqual(rawMarks(probe,probe.xml(gp)),expected,'inspect the actual GP archive, not only the importer');
  for(const copy of [json,worker,reopened]){
    assert.deepEqual(modelMarks(copy),expected);
    assert.deepEqual(connections(copy),connections(score));
    assert.deepEqual(performance(at,copy),performance(at,score));
  }
  if(baseline){
    const original=baseline.read(bytes);
    assert.deepEqual(connections(score),connections(original));
    assert.deepEqual(performance(at,score),performance(baseline.at,original));
  }
  return score;
}

function svg(score,view='both',effects=true){
  for(const track of score.tracks)for(const staff of track.staves){
    staff.showStandardNotation=view!=='tab';staff.showTablature=view!=='score';
  }
  const settings=new at.Settings();settings.core.engine='svg';settings.core.enableLazyLoading=false;
  if(!effects)settings.notation.elements.set(at.NotationElement.EffectTap,false);
  const renderer=new at.rendering.ScoreRenderer(settings),chunks=[];renderer.width=1000;
  renderer.error.on(e=>{throw e;});
  renderer.partialRenderFinished.on(e=>{if(e.renderResult)chunks.push(e.renderResult);});
  renderer.renderScore(score,score.tracks.map(t=>t.index));
  assert(chunks.length>0);
  return chunks.join('');
}
const markIds=(markup,view)=>[...markup.matchAll(new RegExp(`at-right-hand-tap-${view} at-right-hand-tap-note-(\\d+)`, 'g'))].map(m=>Number(m[1])).sort((a,b)=>a-b);
function mixedIds(score){
  return writtenNotes(score).filter(({n})=>n.isVisible && n.isRightHandTapped && n.beat.notes.some(p=>!p.isRightHandTapped))
    .map(({n})=>n.id).sort((a,b)=>a-b);
}

for(const kind of ['plain','tie','hammer','pull','shift','legato']){
  for(const boundary of kind==='plain'?['safe']:['safe','entry','exit'])test(`${kind}, ${boundary}: mixed flag stays on its note and playback/connections are identical`,()=>{
    const source=savedFixture?savedFixture(kind==='shift'?'slide':kind):null;
    const {bytes,control}=witness(probe,{kind,boundary,source});
    const score=assertRoundTrip(bytes),plain=probe.read(control);
    assert.deepEqual(modelMarks(score),[[0,0,0,3,0,true,false]]);
    assert.deepEqual(connections(score),connections(plain));
    const plays=performance(at,score);
    assert.deepEqual(plays,performance(at,plain));
    if(boundary==='safe'){
      assert.deepEqual(plays.order.map(x=>x[0]),[1,2,1,2,3]);
      const beat=score.tracks[0].staves[0].bars[0].voices[0].beats[3],n=beat.notes[0];
      assert.equal(beat.tap,false);
      if(kind==='tie')assert(n.tieDestination?.isTieDestination);
      if(kind==='hammer'||kind==='pull')assert(n.hammerPullDestination?.isHammerPullDestination);
      if(kind==='shift'||kind==='legato')assert(n.slideTarget);
      const selected=probe.p.NoteCloner.clone(n),chord=probe.p.BeatCloner.clone(beat);
      assert.equal(selected.isRightHandTapped,true);
      assert.deepEqual(Array.from(chord.notes,n=>n.isRightHandTapped),[true,false]);
    }
    if(baseline && kind==='plain'){
      assert.deepEqual(rawMarks(probe,baseline.write(baseline.read(bytes))).map(m=>m[4]),[0,1],'unmodified reader/writer expands the same witness');
    }
  });
}

for(const scope of ['single','all','none','legacy'])test(`ordinary ${scope} keeps conventional beat-level display and exact GP flags`,()=>{
  const {bytes,score:legacyModel}=witness(probe,{scope}),score=assertRoundTrip(bytes),render=svg(score);
  assert.equal(modelMarks(score).length,{single:1,all:2,none:0,legacy:2}[scope]);
  assert(!render.includes('at-right-hand-tap'));
  assert.equal(/>T<\/text>/.test(render),scope!=='none');
  if(scope==='legacy'){
    assert.equal(modelMarks(legacyModel).length,0);
    assert.match(svg(legacyModel),/>T<\/text>/);
  }
});

test('the module entry point preserves the same two-of-three model and GP masks as the classic bundle',async()=>{
  const module=await import('../assets/vendor/alphatab/alphaTab.core.mjs');
  const {bytes}=witness(probe,{scope:'pair'}),score=assertRoundTrip(bytes);
  const other=module.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes),new module.Settings());
  assert.deepEqual(modelMarks(other),modelMarks(score));
  assert.deepEqual(performance(module,other),performance(at,score));
  assert.deepEqual(rawMarks(probe,probe.xml(new module.exporter.Gp7Exporter().export(other,new module.Settings()))),modelMarks(score));
  const settings=new module.Settings(),renderer=new module.rendering.ScoreRenderer(settings),chunks=[];
  settings.core.enableLazyLoading=false;renderer.width=1000;
  renderer.error.on(e=>{throw e;});renderer.partialRenderFinished.on(e=>chunks.push(e.renderResult));
  renderer.renderScore(other,[0]);
  assert.deepEqual(markIds(chunks.join(''),'score'),mixedIds(other));
});

test('mixed dual-hand chords render only the selected T on staff/TAB; left-hand flags and unisons stay distinct',()=>{
  const score=assertRoundTrip(witness(probe,{dual:true,unison:true}).bytes),ids=mixedIds(score);
  assert.deepEqual(modelMarks(score),[[0,0,0,3,0,true,true],[0,0,0,3,1,false,true]]);
  for(const view of ['score','tab','both']){
    const markup=svg(score,view);
    assert.deepEqual(markIds(markup,'score'),view==='tab'?[]:ids);
    assert.deepEqual(markIds(markup,'tab'),view==='score'?[]:ids);
    if(view!=='tab')assert.match(markup,/>T1<\/text>/,'unison staff mark identifies the selected string');
  }
  assert(!svg(score,'both',false).includes('at-right-hand-tap'));
});

for(const input of savedInputs(bridge))test(`saved original ${input.id}: source evidence, original GPX, display and exported GP agree`,()=>{
  const bytes=fs.readFileSync(input.file);
  assert.equal(probe.xml(bytes),fs.readFileSync(input.extracted,'utf8'));
  const score=assertRoundTrip(bytes),staff=score.tracks[0].staves[0];
  for(const e of input.evidence){
    assert(e.refs.length>0);
    for(const r of e.refs){
      assert(r.exactTapFlags);
      const beat=staff.bars[r.bar-1].voices[e.voice].beats[e.event];
      assert.deepEqual(Array.from(beat.notes,n=>[6-n.string,n.fret,n.isRightHandTapped,n.isLeftHandTapped]).sort(),
        r.notes.map(n=>[n.string,n.fret,n.tap,n.lefttap]).sort());
    }
  }
  const markup=svg(score),ids=mixedIds(score);
  assert(ids.length>0);
  assert.deepEqual(markIds(markup,'score'),ids);
  assert.deepEqual(markIds(markup,'tab'),ids);
  assert.deepEqual(fs.readFileSync(input.file),bytes);
});
