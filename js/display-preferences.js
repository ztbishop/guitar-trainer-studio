// Browser viewing preferences; excludes score identities, results and transport state.
export const DISPLAY_PREFERENCES_KEY = 'gts.displayPreferences';
export const DISPLAY_BOOLEAN_KEYS = ['autoScroll', 'fullscreenOnPlay', 'showFretboard', 'leftHanded'];
export const CHORD_DIAGRAM_PLACEMENTS = ['score-default', 'above-chord', 'top-of-score', 'off'];
export const FRETBOARD_VIEWS = ['beat','next','bar'];
export const FRETBOARD_LABELS = ['notes','frets','fingers','none'];

// A score-specific fallback never replaces the saved viewing preference.
export function effectiveChordDiagramPlacement(state) {
  return state.scoreHasChordDiagrams === false ? 'score-default' : state.ui.chordDiagramPlacement;
}

export function readDisplayPreferences(storage) {
  const defaults = {viewMode: 'practice-only', ui: {zoomPercent: 100, autoScroll: true, fullscreenOnPlay: false, chordDiagramPlacement: 'score-default', showFretboard: true, leftHanded: false, fretboardView:'beat', fretboardLabels:'notes'}};
  try {
    storage ??= globalThis.window?.localStorage;
    const saved = JSON.parse(storage?.getItem(DISPLAY_PREFERENCES_KEY) ?? 'null');
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
      ui: Object.fromEntries(['zoomPercent', 'chordDiagramPlacement', ...DISPLAY_BOOLEAN_KEYS].map(key => [key, state.ui[key]]).concat([
        ['fretboardView',FRETBOARD_VIEWS.includes(state.ui.fretboardView)?state.ui.fretboardView:'beat'],
        ['fretboardLabels',FRETBOARD_LABELS.includes(state.ui.fretboardLabels)?state.ui.fretboardLabels:'notes'],
      ])),
    }));
  } catch { /* Viewing controls remain usable if persistence is unavailable. */ }
}
