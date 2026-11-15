import test from 'node:test';
import assert from 'node:assert/strict';
import {readPracticePreferences,savePracticePreferences,PRACTICE_PREFERENCES_KEY,FEEDBACK_PREFERENCE_KEYS} from '../js/practice-preferences.js';
import {syncPracticeMenuSummary} from '../js/practice-menu.js';

const storage = initial => {
  const entries = new Map(initial === undefined ? [] : [[PRACTICE_PREFERENCES_KEY, initial]]);
  return {getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value)};
};

test('first-use preferences enable all feedback, Realtime and One at a time; unavailable storage remains usable', () => {
  const expected = {mode:'realtime', feedback:Object.fromEntries(FEEDBACK_PREFERENCE_KEYS.map(key=>[key,true])), waitChord:{mode:'collect',windowMs:200},extraStringTolerance:'internal',heldNoteTolerance:'two',filterHexSpikes:true,filterScoreRange:false,allowWrittenBendRanges:true};
  for (const store of [storage(), storage('{invalid'), {getItem(){throw Error('denied');}}]) assert.deepEqual(readPracticePreferences(store),expected);
  assert.doesNotThrow(()=>savePracticePreferences({mode:'wait',ui:expected.feedback,waitChord:expected.waitChord},{setItem(){throw Error('quota');}}));
});

test('saved true/false choices, Wait and Together timing survive a fresh read without session data', () => {
  const store=storage();
  const state={mode:'wait',ui:{showNotationFeedback:false,showTabCircles:true,showTabMistakes:false,inferPolyMistakes:true,zoomPercent:150},waitChord:{mode:'together',windowMs:275},trainer:{results:'private session'}};
  savePracticePreferences(state,store);
  assert.deepEqual(readPracticePreferences(store),{mode:state.mode,feedback:Object.fromEntries(FEEDBACK_PREFERENCE_KEYS.map(key=>[key,state.ui[key]])),waitChord:state.waitChord,extraStringTolerance:'internal',heldNoteTolerance:'two',filterHexSpikes:true,filterScoreRange:false,allowWrittenBendRanges:true});
  const raw=JSON.parse(store.getItem(PRACTICE_PREFERENCES_KEY));
  assert.deepEqual(Object.keys(raw).sort(),['allowWrittenBendRanges','extraStringTolerance','feedback','filterHexSpikes','filterScoreRange','heldNoteTolerance','mode','waitChord']);
  assert.equal(raw.feedback.zoomPercent,undefined);
  state.ui.inferPolyMistakes=false;state.waitChord.mode='collect';state.mode='realtime';savePracticePreferences(state,store);
  assert.equal(readPracticePreferences(store).feedback.inferPolyMistakes,false);
  assert.equal(readPracticePreferences(store).waitChord.mode,'collect');
  assert.equal(readPracticePreferences(store).mode,'realtime');
});

test('invalid stored fields fall back individually while valid choices survive', () => {
  const loaded=readPracticePreferences(storage(JSON.stringify({mode:'follow',feedback:{showNotationFeedback:false,showTabCircles:'false',showTabMistakes:0,inferPolyMistakes:null},waitChord:{mode:'together',windowMs:1001}})));
  assert.deepEqual(loaded,{mode:'realtime',feedback:{showNotationFeedback:false,showTabCircles:true,showTabMistakes:true,inferPolyMistakes:true},waitChord:{mode:'together',windowMs:200},extraStringTolerance:'internal',heldNoteTolerance:'two',filterHexSpikes:true,filterScoreRange:false,allowWrittenBendRanges:true});
  for(const windowMs of ['275',null,-1])assert.equal(readPracticePreferences(storage(JSON.stringify({waitChord:{mode:'bad',windowMs}}))).waitChord.windowMs,200);
});

test('new tolerance defaults preserve earlier saved strict choices and independent feedback/filter choices', () => {
  const store=storage(JSON.stringify({heldNoteTolerance:'one',extraStringTolerance:'off',filterHexSpikes:false,filterScoreRange:true,
    feedback:{showNotationFeedback:false,showTabCircles:false,showTabMistakes:false,inferPolyMistakes:false}}));
  const saved=readPracticePreferences(store);
  assert.equal(saved.heldNoteTolerance,'one');assert.equal(saved.extraStringTolerance,'off');
  assert.equal(saved.filterHexSpikes,false);assert.equal(saved.filterScoreRange,true);
  assert.ok(FEEDBACK_PREFERENCE_KEYS.every(key=>saved.feedback[key]===false));
  savePracticePreferences({...saved,ui:saved.feedback},store);
  assert.deepEqual(readPracticePreferences(store),saved);
  assert.equal(readPracticePreferences(storage(JSON.stringify({allowMutedStringNoise:false}))).extraStringTolerance,'off','legacy disabled setting remains disabled');
  assert.equal(readPracticePreferences(storage(JSON.stringify({mode:'wait'}))).heldNoteTolerance,'two','missing fields receive new defaults');
});

test('written bend preference defaults on for earlier saves and preserves an explicit saved off',()=>{
  for(const value of [undefined,null,'false',0]) {
    assert.equal(readPracticePreferences(storage(JSON.stringify({allowWrittenBendRanges:value}))).allowWrittenBendRanges,true);
  }
  const store=storage(JSON.stringify({mode:'wait',heldNoteTolerance:'one',filterHexSpikes:false,allowWrittenBendRanges:false}));
  const saved=readPracticePreferences(store);
  assert.equal(saved.allowWrittenBendRanges,false);
  savePracticePreferences({...saved,ui:saved.feedback},store);
  assert.deepEqual(readPracticePreferences(store),saved);
  savePracticePreferences({...saved,ui:saved.feedback,allowWrittenBendRanges:true},store);
  assert.equal(readPracticePreferences(store).allowWrittenBendRanges,true);
  assert.equal(readPracticePreferences(store).heldNoteTolerance,'one');
  assert.equal(readPracticePreferences(store).filterHexSpikes,false);
});

test('tolerance summary counts written bends in both input modes without counting unavailable options',()=>{
  const summary={textContent:''},doc={getElementById:()=>summary};
  const state={...readPracticePreferences(storage()),inputMode:'single-channel',midi:{activeInputId:'',ignoreBriefErrors:false}};
  syncPracticeMenuSummary(state,doc);
  assert.equal(summary.textContent,'Held notes: Two · 1 option enabled · Hex options unavailable');
  state.inputMode='hex-6ch';syncPracticeMenuSummary(state,doc);
  assert.equal(summary.textContent,'Held notes: Two · 3 options enabled');
  state.allowWrittenBendRanges=false;syncPracticeMenuSummary(state,doc);
  assert.equal(summary.textContent,'Held notes: Two · 2 options enabled');
  state.inputMode='single-channel';state.midi.ignoreBriefErrors=true;syncPracticeMenuSummary(state,doc);
  assert.equal(summary.textContent,'Held notes: Two · 0 options enabled · Hex options unavailable');
  state.midi.activeInputId='guitar';state.allowWrittenBendRanges=true;state.filterScoreRange=true;syncPracticeMenuSummary(state,doc);
  assert.equal(summary.textContent,'Held notes: Two · 3 options enabled · Hex options unavailable');
});
