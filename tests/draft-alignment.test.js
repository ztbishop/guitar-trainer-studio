import test from 'node:test';
import assert from 'node:assert/strict';
import {draftPosition,editDraftPiece} from '../js/draft-alignment.js';
const timeline={measures:[{measureNumber:1,occurrence:1,startTick:0,endTick:3840},{measureNumber:1,occurrence:2,startTick:3840,endTick:7680}]};
const visit={visit:1,scoreMeasure:1,occurrence:2,originalVisit:2,startSeconds:10,endSeconds:null,anchors:[{offset480:0,seconds:10},{offset480:240,seconds:12}]};
const working=()=>({candidatePlan:{musicalVisits:[structuredClone(visit)],intervals:[]},unresolved:[]});
test('partial candidate tracks only explicit anchor spans, with native repeat identity; no extrapolation across unknown tail',()=>{
 const plan=working().candidatePlan;
 assert.equal(draftPosition(plan,timeline,11).tick,4800);assert.equal(draftPosition(plan,timeline,11).occurrence,2);
 assert.equal(draftPosition(plan,timeline,13).kind,'unresolved');assert.equal(draftPosition(plan,timeline,9).kind,'unresolved');
 plan.musicalVisits.push({...visit,occurrence:1,originalVisit:1});assert.equal(draftPosition(plan,timeline,11).kind,'unresolved');
});
test('whole section moves only its exact known timestamps; unknown stays null; boundary explicitly creates its paired anchor',()=>{
 const w=working(),m=editDraftPiece(w,'music:0','move',11,20);assert.equal(w.candidatePlan.musicalVisits[0].startSeconds,10);
 assert.deepEqual(m.working.candidatePlan.musicalVisits[0].anchors,[{offset480:0,seconds:11},{offset480:240,seconds:13}]);assert.equal(m.working.candidatePlan.musicalVisits[0].endSeconds,null);
 const placed=editDraftPiece(w,'music:0','endSeconds',15.123456789,20).working.candidatePlan.musicalVisits[0];assert.equal(placed.anchors.at(-1).seconds,15.123456789);assert.equal(placed.anchors[1].seconds,12);
 assert.throws(()=>editDraftPiece(w,'music:0','1',9,20),/order/);assert.throws(()=>editDraftPiece(w,'music:0','move',21,20),/outside/);
});
test('no crossing and no scoring projection in explanation/rest or conflicting correspondence',()=>{
 const w=working();w.candidatePlan.intervals=[{kind:'unmatched-source-rest',startSeconds:8,endSeconds:10}];assert.throws(()=>editDraftPiece(w,'music:0','move',9,20),/cross/);
 assert.equal(draftPosition(w.candidatePlan,timeline,9).kind,'unmatched-source-rest');w.candidatePlan.intervals[0].kind='explanation';assert.equal(draftPosition(w.candidatePlan,timeline,9).kind,'explanation');
 w.candidatePlan.musicalVisits[0].originalVisit=null;assert.equal(draftPosition(w.candidatePlan,timeline,11).kind,'unresolved');
 w.candidatePlan.intervals.push({kind:'explanation',startSeconds:14,endSeconds:16});
 assert.throws(()=>editDraftPiece(w,'music:0','endSeconds',15,20),/cross/);
 assert.throws(()=>editDraftPiece(w,'music:0','move',14,20),/cross/);
});
test('malformed intervals stay retained and cannot become editable invented intervals',()=>{
 const w=working();w.candidatePlan.intervals=[null];
 assert.equal(draftPosition(w.candidatePlan,timeline,9).kind,'unresolved');
 assert.throws(()=>editDraftPiece(w,'interval:0','startSeconds',1,20),/no structure/);
 assert.deepEqual(w.candidatePlan.intervals,[null]);
});
