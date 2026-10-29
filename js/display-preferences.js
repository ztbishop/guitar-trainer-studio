// Browser viewing preferences; excludes score identities, results and transport state.
import {normalizeAppearance} from './appearance.js';
export const DISPLAY_PREFERENCES_KEY = 'gts.displayPreferences';
export const DISPLAY_BOOLEAN_KEYS = ['autoScroll', 'fullscreenOnPlay', 'showFretboard', 'leftHanded', 'showAlternatePositions'];
export const CHORD_DIAGRAM_PLACEMENTS = ['score-default', 'above-chord', 'top-of-score', 'off'];
export const FRETBOARD_VIEWS = ['beat','next','bar'];
export const FRETBOARD_LABELS = ['notes','frets','fingers','none'];
export const SCORE_DISPLAYS = ['score-default','both','tab','notation'];
export const TAB_RHYTHMS = ['automatic','show','hide'];

// A score-specific fallback never replaces the saved viewing preference.
export function effectiveChordDiagramPlacement(state) {
  return state.scoreHasChordDiagrams === false ? 'score-default' : state.ui.chordDiagramPlacement;
}

export function readDisplayPreferences(storage) {
  const defaults = {viewMode: 'practice-only', ui: {appearance:'light',zoomPercent: 100, autoScroll: true, fullscreenOnPlay: false, chordDiagramPlacement: 'score-default', scoreDisplay:'score-default',tabRhythm:'automatic',showFretboard: true, leftHanded: false, fretboardView:'bar', fretboardLabels:'notes',showAlternatePositions:false}};
  try {
    storage ??= globalThis.window?.localStorage;
    const saved = JSON.parse(storage?.getItem(DISPLAY_PREFERENCES_KEY) ?? 'null');
    defaults.ui.appearance=normalizeAppearance(saved?.ui?.appearance);
    if(SCORE_DISPLAYS.includes(saved?.ui?.scoreDisplay))defaults.ui.scoreDisplay=saved.ui.scoreDisplay;
    if(TAB_RHYTHMS.includes(saved?.ui?.tabRhythm))defaults.ui.tabRhythm=saved.ui.tabRhythm;
    if(FRETBOARD_VIEWS.includes(saved?.ui?.fretboardView))defaults.ui.fretboardView=saved.ui.fretboardView;
    if(FRETBOARD_LABELS.includes(saved?.ui?.fretboardLabels))defaults.ui.fretboardLabels=saved.ui.fretboardLabels;
    if (['practice-only', 'all-tracks'].includes(saved?.viewMode)) defaults.viewMode = saved.viewMode;
    for (const key of DISPLAY_BOOLEAN_KEYS) {
      if (typeof saved?.ui?.[key] === 'boolean') defaults.ui[key] = saved.ui[key];
    }
    if (CHORD_DIAGRAM_PLACEMENTS.includes(saved?.ui?.chordDiagramPlacement)) defaults.ui.chordDiagramPlacement = saved.ui.chordDiagramPlacement;
    const zoom = saved?.ui?.zoomPercent;
    if (typeof zoom === 'number' && Number.isFinite(zoom) && zoom >= 50 && zoom <= 200) defaults.ui.zoomPercent = zoom;
  } catch { /* Missing, invalid or inaccessible storage uses first-use defaults. */ }
  return defaults;
}

export function saveDisplayPreferences(state, storage) {
  try {
    storage ??= globalThis.window?.localStorage;
    storage?.setItem(DISPLAY_PREFERENCES_KEY, JSON.stringify({
      viewMode: state.viewMode,
      ui: Object.fromEntries(['zoomPercent', 'chordDiagramPlacement', ...DISPLAY_BOOLEAN_KEYS].map(key => [key, key==='showAlternatePositions'?state.ui[key]===true:state.ui[key]]).concat([
        ['appearance',normalizeAppearance(state.ui.appearance)],
        ['scoreDisplay',SCORE_DISPLAYS.includes(state.ui.scoreDisplay)?state.ui.scoreDisplay:'score-default'],
        ['tabRhythm',TAB_RHYTHMS.includes(state.ui.tabRhythm)?state.ui.tabRhythm:'automatic'],
        ['fretboardView',FRETBOARD_VIEWS.includes(state.ui.fretboardView)?state.ui.fretboardView:'bar'],
        ['fretboardLabels',FRETBOARD_LABELS.includes(state.ui.fretboardLabels)?state.ui.fretboardLabels:'notes'],
      ])),
    }));
  } catch { /* Viewing controls remain usable if persistence is unavailable. */ }
}
