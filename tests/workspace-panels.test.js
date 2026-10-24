import test from 'node:test';
import assert from 'node:assert/strict';
import {panelSizes,fitPanelSizes,fretboardPanelHeight,usesAutomaticFretboardHeight} from '../js/workspace-panels.js';
test('panel preferences reject malformed values and clamp restored sizes',()=>{
  assert.deepEqual(panelSizes(null),{'media-editor':400,'fretboard-container':190});
  assert.deepEqual(panelSizes({'media-editor':Infinity,'fretboard-container':900}),{'media-editor':400,'fretboard-container':400});
  assert.equal(panelSizes({'media-editor':280})['media-editor'],280);
});

test('automatic fretboard height is snug and manual heights remain selectable without overwriting saved sizes',()=>{
  const preferred=panelSizes({'fretboard-container':140});
  assert.equal(fretboardPanelHeight(170),188);
  assert.equal(fretboardPanelHeight(170,18,18),206);
  assert.equal(fretboardPanelHeight(314),332);
  assert.equal(fretboardPanelHeight(50),144,'local tools also need room');
  const minimums={'fretboard-container':214};
  assert.equal(fitPanelSizes(preferred,['fretboard-container'],500,minimums)['fretboard-container'],214);
  assert.equal(fitPanelSizes(preferred,['fretboard-container'],100,minimums)['fretboard-container'],214,'small screen cannot squeeze the neck below content height');
  assert.equal(preferred['fretboard-container'],140);
  assert.equal(fitPanelSizes(preferred,['fretboard-container'],500,{'fretboard-container':144})['fretboard-container'],144);
  assert.equal(fitPanelSizes({'fretboard-container':178},['fretboard-container'],500,{'fretboard-container':144})['fretboard-container'],178);
});

test('automatic/manual panel mode preserves legacy saved heights and explicit reset choice',()=>{
  assert.equal(usesAutomaticFretboardHeight(null),true);
  assert.equal(usesAutomaticFretboardHeight({'media-editor':300}),true);
  assert.equal(usesAutomaticFretboardHeight({'fretboard-container':180}),false);
  assert.equal(usesAutomaticFretboardHeight({'fretboard-container':180,fretboardAutoHeight:true}),true);
  assert.equal(usesAutomaticFretboardHeight({fretboardAutoHeight:false}),false);
});
test('small viewports fit panels without destroying the preferred sizes',()=>{
  const preferred=panelSizes(),visible=Object.keys(preferred),fitted=fitPanelSizes(preferred,visible,350);
  assert.equal(Object.values(fitted).reduce((a,b)=>a+b,0),350);
  assert.deepEqual(fitPanelSizes(preferred,visible,600),preferred);
  assert.deepEqual(fitPanelSizes(preferred,visible,100),{'media-editor':180,'fretboard-container':120});
});
