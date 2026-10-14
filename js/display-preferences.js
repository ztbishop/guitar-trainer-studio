// Browser viewing preferences; excludes score identities, results and transport state.
export const DISPLAY_PREFERENCES_KEY = 'gts.displayPreferences';
export const DISPLAY_BOOLEAN_KEYS = ['autoScroll', 'fullscreenOnPlay', 'showFretboard', 'leftHanded'];
export const CHORD_DIAGRAM_PLACEMENTS = ['score-default', 'above-chord', 'top-of-score', 'off'];

export function readDisplayPreferences(storage) {
  const defaults = {viewMode: 'practice-only', ui: {zoomPercent: 100, autoScroll: true, fullscreenOnPlay: false, chordDiagramPlacement: 'score-default', showFretboard: true, leftHanded: false}};
  try {
    storage ??= globalThis.window?.localStorage;
    const saved = JSON.parse(storage?.getItem(DISPLAY_PREFERENCES_KEY) ?? 'null');
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
      ui: Object.fromEntries(['zoomPercent', 'chordDiagramPlacement', ...DISPLAY_BOOLEAN_KEYS].map(key => [key, state.ui[key]])),
    }));
  } catch { /* Viewing controls remain usable if persistence is unavailable. */ }
}
