// Optional bundled score intent only; alphaTab loading stays in the injected host.
export const DEMO_SCORES = Object.freeze({
  melody: {file:'first-notes.gp', title:'First notes'},
  chords: {file:'easy-chords.gp', title:'Easy chords'},
  picking: {file:'gentle-picking.gp', title:'Gentle picking'},
});

export function initDemoScores(loadFile) {
  const buttons = [...document.querySelectorAll('[data-demo-score]')];
  const status = document.getElementById('demo-score-status');
  let busy = false;
  for (const button of buttons) button.addEventListener('click', async () => {
    const demo = DEMO_SCORES[button.dataset.demoScore];
    if (busy || !demo) return;
    busy = true;
    buttons.forEach(item => { item.disabled = true; });
    status.textContent = `Opening ${demo.title}…`;
    try {
      const response = await fetch(new URL(`../assets/demos/${demo.file}`, import.meta.url));
      if (!response.ok) throw new Error('The demo file could not be read. Try downloading the app again.');
      const accepted = await loadFile(new File([await response.arrayBuffer()], demo.file));
      if (accepted === false) throw new Error('This demo could not be opened.');
      status.textContent = '';
    } catch (error) { status.textContent = error.message || 'The demo could not be opened.'; }
    finally { busy = false; buttons.forEach(item => { item.disabled = false; }); }
  });
}
