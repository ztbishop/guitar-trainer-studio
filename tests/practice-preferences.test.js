import test from 'node:test';
import assert from 'node:assert/strict';
import {readPracticePreferences,savePracticePreferences,PRACTICE_PREFERENCES_KEY,FEEDBACK_PREFERENCE_KEYS} from '../js/practice-preferences.js';

const storage = initial => {
  const entries = new Map(initial === undefined ? [] : [[PRACTICE_PREFERENCES_KEY, initial]]);
  return {getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value)};
};

test('first-use preferences enable all feedback, Realtime and One at a time; unavailable storage remains usable', () => {
  const expected = {mode:'realtime', feedback:Object.fromEntries(FEEDBACK_PREFERENCE_KEYS.map(key=>[key,true])), waitChord:{mode:'collect',windowMs:200},extraStringTolerance:'internal',heldNoteTolerance:'two',filterHexSpikes:true,filterScoreRange:false};
  for (const store of [storage(), storage('{invalid'), {getItem(){throw Error('denied');}}]) assert.deepEqual(readPracticePreferences(store),expected);
  assert.doesNotThrow(()=>savePracticePreferences({mode:'wait',ui:expected.feedback,waitChord:expected.waitChord},{setItem(){throw Error('quota');}}));
});

test('saved true/false choices, Wait and Together timing survive a fresh read without session data', () => {
  const store=storage();
  const state={mode:'wait',ui:{showNotationFeedback:false,showTabCircles:true,showTabMistakes:false,inferPolyMistakes:true,zoomPercent:150},waitChord:{mode:'together',windowMs:275},trainer:{results:'private session'}};
  savePracticePreferences(state,store);
  assert.deepEqual(readPracticePreferences(store),{mode:state.mode,feedback:Object.fromEntries(FEEDBACK_PREFERENCE_KEYS.map(key=>[key,state.ui[key]])),waitChord:state.waitChord,extraStringTolerance:'internal',heldNoteTolerance:'two',filterHexSpikes:true,filterScoreRange:false});
  const raw=JSON.parse(store.getItem(PRACTICE_PREFERENCES_KEY));
  assert.deepEqual(Object.keys(raw).sort(),['extraStringTolerance','feedback','filterHexSpikes','filterScoreRange','heldNoteTolerance','mode','waitChord']);
  assert.equal(raw.feedback.zoomPercent,undefined);
  state.ui.inferPolyMistakes=false;state.waitChord.mode='collect';state.mode='realtime';savePracticePreferences(state,store);
  assert.equal(readPracticePreferences(store).feedback.inferPolyMistakes,false);
  assert.equal(readPracticePreferences(store).waitChord.mode,'collect');
  assert.equal(readPracticePreferences(store).mode,'realtime');
});

test('invalid stored fields fall back individually while valid choices survive', () => {
  const loaded=readPracticePreferences(storage(JSON.stringify({mode:'follow',feedback:{showNotationFeedback:false,showTabCircles:'false',showTabMistakes:0,inferPolyMistakes:null},waitChord:{mode:'together',windowMs:1001}})));
  assert.deepEqual(loaded,{mode:'realtime',feedback:{showNotationFeedback:false,showTabCircles:true,showTabMistakes:true,inferPolyMistakes:true},waitChord:{mode:'together',windowMs:200},extraStringTolerance:'internal',heldNoteTolerance:'two',filterHexSpikes:true,filterScoreRange:false});
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
