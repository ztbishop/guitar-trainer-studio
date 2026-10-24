// Display-only summary; saved choices and filter eligibility remain with their owners.
export function syncPracticeMenuSummary(state, doc = globalThis.document) {
  const summary = doc.getElementById('practice-tolerance-summary');
  if (!summary) return;
  const held = {off: 'Off', one: 'One', two: 'Two', three: 'Three'}[state.heldNoteTolerance] || 'Two';
  const hex = state.inputMode === 'hex-6ch';
  const count = Number(hex && state.extraStringTolerance !== 'off')
    + Number(hex && state.filterHexSpikes === true)
    + Number(state.filterScoreRange === true)
    + Number(state.midi.ignoreBriefErrors === true && Boolean(state.midi.activeInputId));
  const text = `Held notes: ${held} · ${count} ${count === 1 ? 'filter' : 'filters'} enabled${hex ? '' : ' · Hex options unavailable'}`;
  if (summary.textContent !== text) summary.textContent = text;
}
