import {fingerprint} from './library-store.js';
import {printedMeasure} from './printed-measure.js';
import {midiToNoteName} from './note-utils.js';
import {outsideRecordingScore} from './media-score-range.js';

export function writtenMeasureAt(measures, tick) {
  let low = 0, high = measures?.length ?? 0;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (measures[mid].endTick <= tick) low = mid + 1;
    else high = mid;
  }
  const bar = measures?.[low];
  return bar && tick >= bar.startTick ? bar.measureNumber : null;
}

export function measureBox(page, a, b) {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  const w = Math.abs(a.x - b.x), h = Math.abs(a.y - b.y);
  return w >= 0.005 && h >= 0.005 ? {page, x, y, w, h} : null;
}

export function expectedPdfNotes(event, states, waiting) {
  if (!event) return '';
  if (event.isPercussive) return 'Muted strum';
  const pitches = waiting && event.notes?.length
    ? event.notes.filter(n => states?.[n.id] !== 'correct' && event.pitches.includes(n.midi)).map(n => n.midi)
    : event.pitches;
  return [...new Set(pitches)].map(midiToNoteName).join(' + ');
}

const assets = new URL('../assets/vendor/pdfjs/', import.meta.url);
export function initPdfCompanion(state, closeMenu) {
  const byId = id => document.getElementById('pdf-' + id);
  const view = byId('view'), sheet = byId('sheet'), scroll = byId('scroll'), overlay = byId('boxes');
  const file = byId('file'), attach = byId('attach'), attachStatus = byId('attach-status');
  const pageSelect = byId('page'), measure = byId('measure'), mark = byId('map'), target = byId('target');
  const native = document.getElementById('alphatab-wrapper');
  let pdf, documentTask, key, boxes = {}, page = 1, editing = false, visible = false, generation = 0;
  let renderVersion = 0, renderTask, drawnWidth = 0, drawnPage = 0, drag, current, trainerState;

  function message(text) {
    const status = byId('status');
    status.textContent = text;
    status.hidden = !text;
  }
  function updateAttachStatus(text) {
    attachStatus.textContent = text;
    attachStatus.hidden = !text;
  }
  function saveBoxes() {
    try { if (!key) throw Error(); localStorage.setItem(key, JSON.stringify(boxes)); }
    catch { message('Boxes are available for this session. This browser could not save them.'); }
  }
  function boxElement(box, active) {
    const el = document.createElement('div');
    el.className = active ? 'pdf-box current' : 'pdf-box';
    for (const [style, field] of [['left','x'],['top','y'],['width','w'],['height','h']]) el.style[style] = (box[field] * 100) + '%';
    return el;
  }
  function paintBoxes(reveal = false) {
    overlay.replaceChildren();
    const selected = editing ? Number(measure.value) : current;
    const entries = editing ? Object.entries(boxes) : [[selected, boxes[selected]]];
    for (const [number, box] of entries) {
      if (box?.page !== page) continue;
      const active = Number(number) === selected;
      const el = boxElement(box, active);
      if (editing) el.textContent = printedMeasure(state.score, Number(number));
      overlay.append(el);
      if (active && reveal && state.ui.autoScroll && !editing) {
        const frame = scroll.getBoundingClientRect(), rect = el.getBoundingClientRect();
        if (rect.top < frame.top || rect.bottom > frame.bottom) scroll.scrollTop += rect.top - frame.top - 12;
        if (rect.left < frame.left || rect.right > frame.right) scroll.scrollLeft += rect.left - frame.left - 8;
      }
    }
    byId('remove').disabled = !boxes[measure.value];
  }
  function cancelDrag() {
    drag = null;
    overlay.querySelector('.drawing')?.remove();
  }
  async function renderPage() {
    if (!pdf || view.hidden || !scroll.clientWidth) return;
    const width = Math.max(1, Math.round(scroll.clientWidth * state.ui.zoomPercent / 100));
    if (page === drawnPage && width === drawnWidth) return;
    cancelDrag();
    const version = ++renderVersion;
    drawnPage = page; drawnWidth = width;
    renderTask?.cancel();
    sheet.style.visibility = 'hidden';
    try {
      const pdfPage = await pdf.getPage(page);
      if (version !== renderVersion) return;
      const base = pdfPage.getViewport({scale:1});
      const ratio = Math.min(devicePixelRatio || 1, 2, Math.sqrt(8000000 / (width * width * base.height / base.width)));
      const viewport = pdfPage.getViewport({scale:width * ratio / base.width});
      const canvas = byId('canvas');
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      sheet.style.width = width + 'px';
      renderTask = pdfPage.render({canvas, viewport});
      await renderTask.promise;
      if (version !== renderVersion) return;
      sheet.style.visibility = '';
      paintBoxes(true);
    } catch (error) {
      if (version === renderVersion) message('Could not render this PDF page. ' + error.message);
    }
  }
  function goPage(number) {
    page = number;
    pageSelect.value = String(page);
    scroll.scrollTo(0, 0);
    renderPage();
  }
  function setEditing(value) {
    editing = value;
    cancelDrag();
    mark.textContent = editing ? 'Done marking' : 'Mark measures';
    mark.setAttribute('aria-pressed', String(editing));
    byId('edit').hidden = !editing;
    sheet.classList.toggle('mapping', editing);
    message(editing ? 'Choose the companion measure, then drag a box around it on the page. The selector advances after each box.' : '');
    paintBoxes();
  }
  function sync(trainer = trainerState) {
    trainerState = trainer;
    const canAttach = Boolean(state.currentScoreFile && state.playbackTimeline?.measures.length);
    if (attach.disabled === canAttach) attach.disabled = !canAttach;
    const shown = visible && !!pdf && !state.media.editing;
    if (view.hidden === shown) {
      view.hidden = !shown;
      native.inert = shown;
      native.classList.toggle('pdf-covered', shown);
    }
    const showButton = byId('show');
    const canShow = Boolean(pdf && !shown && !state.media.editing);
    if (showButton.hidden === canShow) showButton.hidden = !canShow;
    if (!shown) return;
    const event = trainer?.currentEvent;
    const waiting = state.mode === 'wait';
    const tick = waiting && event ? event.startTick : state.tickPosition;
    const outside = outsideRecordingScore(state);
    const number = outside ? null : writtenMeasureAt(state.playbackTimeline?.measures, tick);
    const notes = !outside && event?.measureNumber === number ? expectedPdfNotes(event, trainer.noteStates, waiting) : '';
    const label = !number ? '' : 'Measure ' + printedMeasure(state.score, number) + (!boxes[number] ? ' · Unmarked' : '') + (notes ? ' · Play ' + notes : '');
    if (target.textContent !== label) target.textContent = label;
    if (current !== number) {
      current = number;
      if (!editing && boxes[number] && state.ui.autoScroll && boxes[number].page !== page) goPage(boxes[number].page);
      paintBoxes(true);
    }
    renderPage();
  }
  function reset() {
    generation++; renderVersion++;
    renderTask?.cancel(); documentTask?.destroy(); documentTask = null;
    pdf = null; key = null; boxes = {}; visible = false; drawnPage = 0; current = null;
    file.value = '';
    setEditing(false); updateAttachStatus(''); sync(null);
    const canvas = byId('canvas');
    canvas.width = canvas.height = 1;
  }
  async function open(selected) {
    const score = state.currentScoreFile, version = ++generation;
    let task;
    try {
      updateAttachStatus('Opening PDF…');
      const [lib, bytes] = await Promise.all([import('../assets/vendor/pdfjs/build/pdf.min.mjs'), selected.arrayBuffer()]);
      if (version !== generation) return;
      const hash = score.hash && await fingerprint(bytes);
      lib.GlobalWorkerOptions.workerSrc = new URL('build/pdf.worker.min.mjs', assets).href;
      task = lib.getDocument({data:bytes, wasmUrl:new URL('wasm/', assets).href, cMapUrl:new URL('cmaps/', assets).href,
        cMapPacked:true, standardFontDataUrl:new URL('standard_fonts/', assets).href, iccUrl:new URL('iccs/', assets).href, isEvalSupported:false});
      const loaded = await task.promise;
      if (version !== generation || score !== state.currentScoreFile) { await task.destroy(); return; }
      renderVersion++; renderTask?.cancel(); documentTask?.destroy(); documentTask = task;
      pdf = loaded; page = 1; drawnPage = 0; current = undefined;
      key = hash && 'gts.pdf.v1.' + score.hash + '.' + hash;
      boxes = {};
      try { boxes = JSON.parse(localStorage.getItem(key)) || {}; } catch { /* Session-only mapping. */ }
      pageSelect.replaceChildren();
      for (let i = 1; i <= pdf.numPages; i++) pageSelect.add(new Option(String(i), String(i)));
      measure.replaceChildren();
      for (const number of new Set(state.playbackTimeline.measures.map(m => m.measureNumber))) {
        measure.add(new Option(printedMeasure(state.score, number), String(number)));
      }
      visible = true; updateAttachStatus(''); closeMenu();
      setEditing(!Object.keys(boxes).length); sync();
    } catch (error) {
      await task?.destroy();
      if (version === generation) updateAttachStatus('Could not open this PDF. ' + error.message);
    }
  }
  function point(event) {
    const rect = sheet.getBoundingClientRect();
    const clamp = n => Math.max(0, Math.min(1, n));
    return {x:clamp((event.clientX - rect.left) / rect.width), y:clamp((event.clientY - rect.top) / rect.height)};
  }
  sheet.onpointerdown = event => {
    if (!editing || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    drag = {id:event.pointerId, start:point(event)};
    sheet.setPointerCapture(event.pointerId);
  };
  sheet.onpointermove = event => {
    if (drag?.id !== event.pointerId) return;
    overlay.querySelector('.drawing')?.remove();
    const box = measureBox(page, drag.start, point(event));
    if (box) { const el = boxElement(box, true); el.classList.add('drawing'); overlay.append(el); }
  };
  sheet.onpointerup = event => {
    if (drag?.id !== event.pointerId) return;
    const box = measureBox(page, drag.start, point(event));
    cancelDrag();
    if (!box) return;
    boxes[measure.value] = box;
    saveBoxes();
    measure.selectedIndex = Math.min(measure.selectedIndex + 1, measure.options.length - 1);
    paintBoxes(); sync();
  };
  sheet.onlostpointercapture = sheet.onpointercancel = cancelDrag;
  measure.onchange = () => { if (boxes[measure.value]) goPage(boxes[measure.value].page); paintBoxes(); };
  pageSelect.onchange = () => goPage(Number(pageSelect.value));
  byId('remove').onclick = () => { delete boxes[measure.value]; saveBoxes(); paintBoxes(); sync(); };
  mark.onclick = () => { setEditing(!editing); current = undefined; sync(); };
  byId('native').onclick = () => { visible = false; sync(); };
  byId('show').onclick = () => { closeMenu(); visible = true; current = undefined; sync(); };
  attach.onclick = () => file.click();
  file.onchange = () => { const selected = file.files[0]; file.value = ''; if (selected) open(selected); };
  new ResizeObserver(renderPage).observe(scroll);
  return {sync, reset};
}
