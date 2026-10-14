import test from 'node:test';
import assert from 'node:assert/strict';
import {panelSizes,fitPanelSizes} from '../js/workspace-panels.js';
test('panel preferences reject malformed values and clamp restored sizes',()=>{
  assert.deepEqual(panelSizes(null),{'media-editor':400,'fretboard-container':190});
  assert.deepEqual(panelSizes({'media-editor':Infinity,'fretboard-container':900}),{'media-editor':400,'fretboard-container':400});
  assert.equal(panelSizes({'media-editor':280})['media-editor'],280);
});
test('small viewports fit panels without destroying the preferred sizes',()=>{
  const preferred=panelSizes(),visible=Object.keys(preferred),fitted=fitPanelSizes(preferred,visible,350);
  assert.equal(Object.values(fitted).reduce((a,b)=>a+b,0),350);
  assert.deepEqual(fitPanelSizes(preferred,visible,600),preferred);
  assert.deepEqual(fitPanelSizes(preferred,visible,100),{'media-editor':180,'fretboard-container':120});
});
