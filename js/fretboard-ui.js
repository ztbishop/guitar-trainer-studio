// fretboard-ui.js
// Owns: fretboard rendering and visual overlays
// Do NOT: put correctness rules here

export function initFretboard(containerEl) {
  if (!containerEl) return;
  containerEl.dataset.ready = 'true';
}

export function renderFretboard(state) {
  void state;
  // TODO: Render expected notes, played notes, and feedback overlays.
}
