// Recording bounds belong to one continuous take, including its written passes.
export function createPassageRange(measures, duration, playhead, selectedTake, refine) {
  const box = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = 'Refine a continuous passage';
  const help = document.createElement('p');
  help.className = 'field-help';
  help.textContent = 'Choose the measures played in one take. Pin the recording time of its first beat and the end of its last measure. Refine each side of a spoken break separately.';
  box.append(legend,help);
  function edge(title, initial, property) {
    const row = document.createElement('div'), bar = document.createElement('select');
    row.className = 'media-actions';
    for (const [i,m] of measures.entries()) bar.add(new Option(`Measure ${m.measureNumber} · pass ${m.occurrence}`,String(i)));
    bar.value = String(initial);
    const time = document.createElement('input');
    time.type = 'number'; time.min = '0'; time.max = String(duration); time.step = 'any';
    let pinned = false;
    function useSuggestion() {
      const suggestion = selectedTake(Number(bar.value));
      time.value = suggestion ? String(Number(suggestion[property].toFixed(4))) : '';
    }
    bar.onchange = () => {pinned = false; useSuggestion();};
    time.oninput = () => {pinned = true;};
    box.addEventListener('takeschanged',() => {if (!pinned) useSuggestion();});
    useSuggestion();
    const pin = document.createElement('button');
    pin.type = 'button'; pin.textContent = `Use playhead for ${title.toLowerCase()}`;
    pin.onclick = () => {pinned = true; time.value = String(Number(playhead().toFixed(4)));};
    const which = document.createElement('label'), seconds = document.createElement('label');
    which.append(title+' measure ',bar); seconds.append(title+' time (s) ',time);
    row.append(which,seconds,pin); box.append(row);
    return {bar,time};
  }
  const first = edge('Start',0,'start'), last = edge('End',Math.min(1,measures.length-1),'end');
  const run = document.createElement('button');
  run.type = 'button'; run.textContent = 'Refine points between pins';
  run.onclick = () => refine({first:Number(first.bar.value),last:Number(last.bar.value),
    start:first.time.valueAsNumber,end:last.time.valueAsNumber});
  box.append(run);
  return box;
}
