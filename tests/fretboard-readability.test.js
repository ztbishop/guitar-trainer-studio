import test from 'node:test';
import assert from 'node:assert/strict';
import {fretboardGeometry,fretWireX,fretX,fretNumberVisible} from '../js/fretboard-geometry.js';

test('horizontal compression retains height, readable cells and mirrored round-marker positions',()=>{
  for(const maxFret of [24,36])for(const count of [1,4,6,7,12]) {
    const full=fretboardGeometry(maxFret,count,1600);
    for(const viewport of [320,780,1000,1600]) {
      const geometry=fretboardGeometry(maxFret,count,viewport);
      assert.equal(geometry.height,full.height);assert.equal(geometry.stringGap,24);
      assert(geometry.width>=160+26*maxFret);
      for(let fret=1;fret<=maxFret;fret++) {
        const a=fretWireX(fret-1,maxFret,false,geometry.width),b=fretWireX(fret,maxFret,false,geometry.width);
        assert(b-a>=24,'target circles and held rings have their own readable cell');
        const x=fretX(fret,maxFret,false,geometry.width);
        assert(x>a && x<b);assert(Math.abs(x+fretX(fret,maxFret,true,geometry.width)-geometry.width)<1e-8);
      }
    }
  }
});

test('compact fret labels omit 1, keep 0 and landmarks, and always retain current target/end frets',()=>{
  const compact=Array.from({length:25},(_,fret)=>fret).filter(fret=>fretNumberVisible(fret,24,800));
  assert.deepEqual(compact,[0,3,5,7,9,12,15,17,19,21,24]);
  assert(fretNumberVisible(1,24,800,[1]));assert(fretNumberVisible(36,36,1100));
  assert(!fretNumberVisible(2,24,800));
  for(let fret=0;fret<=24;fret++)assert(fretNumberVisible(fret,24,1400));
});
