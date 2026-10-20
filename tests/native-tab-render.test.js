import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('native tab painting tolerates pitched notes without guitar-string assignments',()=>{
  const context=vm.createContext({console,process});
  vm.runInContext(readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js',import.meta.url),'utf8'),context);
  const at=context.alphaTab;
  for(const width of [900,1800]) {
    const settings=new at.Settings();
    settings.core.engine='svg';settings.core.enableLazyLoading=false;settings.core.includeNoteBounds=true;
    const parser=new at.importer.AlphaTexImporter();
    parser.initFromString(Array.from({length:32},()=> '0.6.4 2.5.4 3.4.4').join(' | '),settings);
    const score=parser.readScore();
    const note=score.tracks[0].staves[0].bars[17].voices[0].beats[0].notes[0];
    note.string=-1;note.fret=-1;note.octave=4;note.tone=6;
    const before={string:note.string,fret:note.fret,pitch:note.realValue};
    const renderer=new at.rendering.ScoreRenderer(settings);renderer.width=width;
    const chunks=[];
    renderer.error.on(error=>{throw error;});
    renderer.partialRenderFinished.on(result=>{if(result.renderResult)chunks.push(result);});
    assert.doesNotThrow(()=>renderer.renderScore(score,[0]));
    assert.ok(chunks.some(chunk=>chunk.firstMasterBarIndex<=17&&chunk.lastMasterBarIndex>=17));
    assert.ok(chunks.some(chunk=>chunk.lastMasterBarIndex===31),'final system is painted');
    assert.deepEqual({string:note.string,fret:note.fret,pitch:note.realValue},before,'drawing must preserve source notes');
  }
});
