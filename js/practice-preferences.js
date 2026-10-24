// Small browser preferences only; no session results, transport or native API calls.
export const PRACTICE_PREFERENCES_KEY = 'gts.practicePreferences';
export const FEEDBACK_PREFERENCE_KEYS = ['showNotationFeedback', 'showTabCircles', 'showTabMistakes', 'inferPolyMistakes'];

export function readPracticePreferences(storage) {
  const defaults = {mode: 'realtime', feedback: Object.fromEntries(FEEDBACK_PREFERENCE_KEYS.map(key => [key, true])), waitChord: {mode: 'collect', windowMs: 200}, extraStringTolerance: 'internal', heldNoteTolerance:'two', filterHexSpikes:true, filterScoreRange:false};
  try {
    storage ??= globalThis.window?.localStorage;
    const saved = JSON.parse(storage?.getItem(PRACTICE_PREFERENCES_KEY) ?? 'null');
    if (['realtime', 'wait'].includes(saved?.mode)) defaults.mode = saved.mode;
    if(['off','internal','all'].includes(saved?.extraStringTolerance))defaults.extraStringTolerance=saved.extraStringTolerance;
    else if(typeof saved?.allowMutedStringNoise==='boolean')defaults.extraStringTolerance=saved.allowMutedStringNoise?'all':'off';
    if(['off','one','two','three'].includes(saved?.heldNoteTolerance))defaults.heldNoteTolerance=saved.heldNoteTolerance;
    else if(saved?.heldNoteTolerance==='multiple')defaults.heldNoteTolerance='two';
    if(typeof saved?.filterScoreRange==='boolean')defaults.filterScoreRange=saved.filterScoreRange;
    if(typeof saved?.filterHexSpikes==='boolean')defaults.filterHexSpikes=saved.filterHexSpikes;
    for (const key of FEEDBACK_PREFERENCE_KEYS) {
      if (typeof saved?.feedback?.[key] === 'boolean') defaults.feedback[key] = saved.feedback[key];
    }
    if (['collect', 'together'].includes(saved?.waitChord?.mode)) defaults.waitChord.mode = saved.waitChord.mode;
    const windowMs = saved?.waitChord?.windowMs;
    if (typeof windowMs === 'number' && Number.isFinite(windowMs) && windowMs >= 50 && windowMs <= 1000) defaults.waitChord.windowMs = windowMs;
  } catch { /* Missing, invalid or inaccessible storage uses first-use defaults. */ }
  return defaults;
}

export function savePracticePreferences(state, storage) {
  try {
    storage ??= globalThis.window?.localStorage;
    storage?.setItem(PRACTICE_PREFERENCES_KEY, JSON.stringify({
      mode: state.mode,
      feedback: Object.fromEntries(FEEDBACK_PREFERENCE_KEYS.map(key => [key, state.ui[key]])),
      waitChord: {...state.waitChord},
      extraStringTolerance: ['off','internal','all'].includes(state.extraStringTolerance)?state.extraStringTolerance:'internal',
      heldNoteTolerance:['off','one','two','three'].includes(state.heldNoteTolerance)?state.heldNoteTolerance:'two',
      filterHexSpikes: state.filterHexSpikes!==false,
      filterScoreRange: state.filterScoreRange===true,
    }));
  } catch { /* Preferences still apply to the current session if storage is unavailable. */ }
}
