import {fingerprint} from './library-store.js';
import {printedMeasure} from './printed-measure.js';
import {midiToNoteName} from './note-utils.js';
import {outsideRecordingScore} from './media-score-range.js';
import {practiceTimingPlan} from './media-practice.js';
import {editPageBoxes, availableVisit, replacePageBoxes} from './pdf-box-review.js';
import {barlineHandle} from './pdf-barline-controls.js';
import {mountPdfEditor} from './pdf-editor-layout.js';
import {readingPages} from './pdf-reading-pages.js';

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
export function initPdfCompanion(state, closeMenu, seek, recording=null) {
  const byId = id => document.getElementById('pdf-' + id);
  mountPdfEditor(byId('view'));
  const view = byId('view'), sheet = byId('sheet'), scroll = byId('scroll'), overlay = byId('boxes');
  const file = byId('file'), attach = byId('attach'), attachStatus = byId('attach-status');
  const pageSelect = byId('page'), measure = byId('measure'), mark = byId('map'), target = byId('target');
  const native = document.getElementById('alphatab-wrapper');
  let pdf, documentTask, key, boxes = {}, page = 1, editing = false, visible = false, generation = 0;
  let drag, current, trainerState;
  let proposals=null, scanVersion=0, loopRange=null, loopMeasures=null, noteVisit=null, tapCue=null;
  const find=byId('find'), action=byId('action'), note=byId('note'), replace=byId('replace');
  const pagesRoot=byId('pages');
  const reader=readingPages(scroll,pagesRoot,jumpToMeasure,number=>{
    if(number===page || !visible || view.hidden)return;
    if(editing){
      if(!proposals && !drag && !find.disabled && !sheet.querySelector(':active'))goPage(number,false);
    } else {page=number;pageSelect.value=String(number);}
  },message);
  function extendNumbers(last) {
    while(measure.length<last) {
      const number=String(measure.length+1);
      measure.add(new Option(number,number));
    }
  }

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
    if(recording) {
      extendNumbers(Math.max(0,...Object.keys(boxes).map(Number))+1);
      recording.boxesChanged(boxes);
    }
    try { if (!key) throw Error(); localStorage.setItem(key, JSON.stringify(boxes)); }
    catch { message('Boxes are available for this session. This browser could not save them.'); }
  }
  function boxElement(box, active, interactive=false) {
    const el = document.createElement(interactive?'button':'div');
    if(interactive) el.type='button';
    el.className = active ? 'pdf-box current' : 'pdf-box';
    for (const [style, field] of [['left','x'],['top','y'],['width','w'],['height','h']]) el.style[style] = (box[field] * 100) + '%';
    return el;
  }
  function paintBoxes(reveal = false) {
    if (!editing) {
      if (visible && !view.hidden) {
        renderPage();
        reader.update(current,tapCue,loopMeasures,reveal && state.ui.autoScroll);
      }
      return;
    }
    overlay.replaceChildren();
    const selected = Number(measure.value);
    const entries = proposals ? proposals.map((box,i)=>[Number(measure.options[measure.selectedIndex+i]?.value),box]) : Object.entries(boxes);
    let previous=null;
    for (const [i,[number, box]] of entries.entries()) {
      if (box?.page !== page) continue;
      const active = Number(number) === selected;
      const el = boxElement(box, active);
      const label=Number.isFinite(Number(number)) ? printedMeasure(state.score, Number(number)) : '—';
      el.textContent = label;
      overlay.append(el);
      if((!proposals || action.value==='draw') && previous && (proposals || Number(number)===Number(previous.number)+1)) {
        const left=previous;
        const handle=barlineHandle(sheet,left.box,box,left.el,el,'Move barline before measure '+label,(a,b)=>{
          if(proposals) {proposals[i-1]=a;proposals[i]=b;}
          else {boxes[left.number]=a;boxes[number]=b;saveBoxes();}
          // Refresh the limits of the handles on either side of this pair.
          const refocus=document.activeElement===handle;
          paintBoxes();
          if(refocus)overlay.querySelector('[data-boundary="'+i+'"]')?.focus({preventScroll:true});
        });
        if(handle){handle.dataset.boundary=i;overlay.append(handle);}
      }
      previous={number,box,el};
    }
    byId('remove').disabled = !boxes[measure.value];
  }
  function jumpToMeasure(number) {
    if(recording){recording.seek(number);return;}
    const visit=availableVisit(state.playbackTimeline.measures,number,state.tickPosition,loopRange,practiceTimingPlan(state));
    if(!visit) { message(loopMeasures && !loopMeasures.has(number)?'This measure is outside the loop.':'This measure has no timing in the active recording.');return; }
    message('');
    if(!seek(visit.startTick)) {message('Playback could not move to this measure.');return;}
    noteVisit=visit;
    note.replaceChildren(new Option('Measure start',String(visit.startTick)));
    const events=state.expectedEvents.filter(e=>e.startTick>=visit.startTick && e.startTick<visit.endTick);
    for(const [i,event] of events.entries()) note.add(new Option('Note '+(i+1)+' · '+expectedPdfNotes(event),String(event.startTick)));
    byId('position').hidden=!events.length;
  }
  note.onchange=()=>{if(noteVisit)seek(Number(note.value));};
  function reviewControls() {
    byId('review').hidden=!proposals;
    find.hidden=!!proposals;
    byId('remove').hidden=!!proposals;
    byId('number-label').textContent=proposals?'First measure':'Measure';
    byId('use').disabled=!proposals?.length || proposals.length>measure.options.length-measure.selectedIndex;
  }
  function endReview() {
    scanVersion++; proposals=null; find.disabled=false;replace.checked=false;
    reviewControls();
  }
  function describeReview() {
    if(recording)extendNumbers(measure.selectedIndex+proposals.length+1);
    reviewControls();
    const overflow=proposals.length-(measure.options.length-measure.selectedIndex);
    const collision=replace.checked && proposals.some((_,i)=>{
      const existing=boxes[measure.options[measure.selectedIndex+i]?.value];
      return existing && existing.page!==page;
    });
    if(collision)byId('use').disabled=true;
    const instructions={draw:'Drag a blue divider to adjust two neighboring boxes. Drag in blank space to add a box or inside a box to redraw it.',
      split:'Click the missing barline inside a box.',join:'Click the first of two boxes on the same line.',remove:'Click the extra box.'};
    const warning=overflow>0?'The numbering goes past the end of the score. Check the first measure and extra boxes. ':
      collision?'A measure in this range belongs to another page. Check the first measure or correct that page first. ':'';
    message(proposals.length+' boxes on this page. '+warning+instructions[action.value]);
    paintBoxes();
  }
  find.onclick=async()=>{
    const version=++scanVersion;
    find.disabled=true;message('Finding measure boxes on this page…');
    try {
      const [{detectPdfPage},pdfPage]=await Promise.all([import('./pdf-measure-detection.js'),pdf.getPage(page)]);
      if(version!==scanVersion)return;
      const result=await detectPdfPage(pdfPage,page);
      if(version!==scanVersion)return;
      const mapped=Object.keys(boxes).filter(n=>boxes[n].page===page);
      byId('replace-label').hidden=!mapped.length;
      if(mapped.length) measure.value=String(Math.min(...mapped.map(Number)));
      proposals=result;action.value='draw';describeReview();
    } catch(error) {if(version===scanVersion)message('Could not detect boxes. You can draw them on this page. '+error.message);}
    finally {if(version===scanVersion)find.disabled=false;}
  };
  byId('cancel').onclick=()=>{endReview();message('Page suggestions discarded.');paintBoxes();};
  action.onchange=replace.onchange=describeReview;
  byId('use').onclick=()=>{
    if(!proposals || byId('use').disabled)return;
    const count=proposals.length, first=measure.selectedIndex;
    const replacing=replace.checked;
    let added=0;
    const numbers=proposals.map((_,i)=>measure.options[first+i].value);
    if(replacing) {
      const next=replacePageBoxes(boxes,page,numbers,proposals);
      if(!next)return;
      boxes=next;
    } else proposals.forEach((box,i)=>{
      if(!boxes[numbers[i]]) {boxes[numbers[i]]=box;added++;}
    });
    endReview();
    measure.selectedIndex=Math.min(measure.options.length-1,first+count);
    const summary=replacing?count+' boxes replaced on page '+page+'. ':added+' new boxes saved on page '+page+'. '+(added<count?'Existing mappings were kept. ':'');
    message(summary+'Select another page or choose Done marking.');
    saveBoxes();paintBoxes();sync();
  };
  function cancelDrag() {
    drag = null;
    overlay.querySelector('.drawing')?.remove();
  }
  function renderPage() {
    if (pdf && !view.hidden && scroll.clientWidth)
      reader.resize(Math.max(1, Math.round(scroll.clientWidth * state.ui.zoomPercent / 100)));
  }
  function goPage(number, scrollToPage=true) {
    if(page!==number) {
      endReview();cancelDrag();message('');
      noteVisit=null;byId('position').hidden=true;
      if(editing) {
        const mapped=Object.entries(boxes);
        const onPage=mapped.filter(([,b])=>b.page===number).map(([n])=>Number(n));
        const before=mapped.filter(([,b])=>b.page<number).map(([n])=>Number(n));
        const first=onPage.length?Math.min(...onPage):before.length?Math.max(...before)+1:null;
        if(first!==null && Array.from(measure.options).some(o=>Number(o.value)===first))measure.value=String(first);
      }
    }
    page = number;
    pageSelect.value = String(page);
    if(editing) {reader.placeEditor(page,sheet);paintBoxes();}
    if(scrollToPage)reader.jump(page);
  }
  function setEditing(value) {
    editing = value;
    endReview();noteVisit=null;byId('position').hidden=true;
    cancelDrag();
    mark.textContent = editing ? 'Done marking' : 'Mark measures';
    mark.setAttribute('aria-pressed', String(editing));
    byId('edit').hidden = !editing;
    sheet.hidden=!editing;
    pagesRoot.classList.toggle('marking',editing);
    if(editing) {
      reader.placeEditor(page,sheet);
    } else {
      overlay.replaceChildren();
      reader.populate(boxes,boxElement,n=>printedMeasure(state.score,n));
    }
    sheet.classList.toggle('mapping', editing);
    message(editing ? 'Find boxes on this page, drag a blue divider between measures, or choose a measure and redraw its box.' : '');
    paintBoxes();
  }
  function sync(trainer = trainerState) {
    trainerState = trainer;
    if(recording) {
      if(!pdf || !visible)return;
      const number=recording.current(), range=recording.loop();
      const cue=number===null ? recording.selectedMeasure() : null;
      if(current!==number || loopRange!==range || tapCue!==cue) {
        current=number;tapCue=cue;loopRange=range;loopMeasures=range?.measures;
        paintBoxes(true);
      }
      renderPage();return;
    }
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
    const returnButton=byId('return');
    if(returnButton.hidden===canShow)returnButton.hidden=!canShow;
    if (!shown) return;
    const event = trainer?.currentEvent;
    const waiting = state.mode === 'wait';
    const tick = waiting && event ? event.startTick : state.tickPosition;
    const outside = outsideRecordingScore(state);
    const number = outside ? null : writtenMeasureAt(state.playbackTimeline?.measures, tick);
    const notes = !outside && event?.measureNumber === number ? expectedPdfNotes(event, trainer.noteStates, waiting) : '';
    const label = !number ? '' : 'Measure ' + printedMeasure(state.score, number) + (!boxes[number] ? ' · Unmarked' : '') + (notes ? ' · Play ' + notes : '');
    if (target.textContent !== label) target.textContent = label;
    const range=state.practiceLoop?.enabled ? state.practiceLoop.range : null;
    const changedRange=range!==loopRange;
    if(changedRange) {
      loopRange=range;
      loopMeasures=range?new Set(state.playbackTimeline.measures.filter(v=>v.startTick<range.endTick && v.endTick>range.startTick).map(v=>v.measureNumber)):null;
    }
    if(noteVisit && (number!==noteVisit.measureNumber || state.isPlaying)) {noteVisit=null;byId('position').hidden=true;}
    if (current !== number || changedRange) {
      current = number;
      paintBoxes(true);
    }
    renderPage();
  }
  function reset() {
    generation++;
    reader.clear();
    documentTask?.destroy(); documentTask = null;
    pdf = null; key = null; boxes = {}; visible = false; current = null;loopRange=null;loopMeasures=null;
    file.value = '';
    setEditing(false); updateAttachStatus(''); sync(null);
  }
  async function open(selected) {
    const score = state.currentScoreFile, version = ++generation;
    let task;
    try {
      updateAttachStatus('Opening PDF…');
      const [lib, bytes] = await Promise.all([import('../assets/vendor/pdfjs/build/pdf.min.mjs'), selected.arrayBuffer()]);
      if (version !== generation) return;
      const hash = (recording || score?.hash) && await fingerprint(bytes);
      lib.GlobalWorkerOptions.workerSrc = new URL('build/pdf.worker.min.mjs', assets).href;
      task = lib.getDocument({data:new Uint8Array(bytes), wasmUrl:new URL('wasm/', assets).href, cMapUrl:new URL('cmaps/', assets).href,
        cMapPacked:true, standardFontDataUrl:new URL('standard_fonts/', assets).href, iccUrl:new URL('iccs/', assets).href, isEvalSupported:false});
      const loaded = await task.promise;
      if (version !== generation || score !== state.currentScoreFile) { await task.destroy(); return; }
      const storageKey=recording?'gts.pdf.recording.boxes.v1.'+hash:hash && 'gts.pdf.v1.'+score.hash+'.'+hash;
      let mapping={};
      try {mapping=JSON.parse(localStorage.getItem(storageKey)) || {};} catch { /* Session-only. */ }
      const missedPages=[];
      if(recording?.autoFind() && !Object.keys(mapping).length) {
        const {detectPdfPage}=await import('./pdf-measure-detection.js');
        let number=1;
        for(let i=1;i<=loaded.numPages;i++) {
          if(version!==generation){await task.destroy();return;}
          updateAttachStatus('Finding measure boxes on page '+i+' of '+loaded.numPages+'…');
          let found=[];
          try {found=await detectPdfPage(await loaded.getPage(i),i);} catch { /* Page can still be marked by hand. */ }
          if(!found.length)missedPages.push(i);
          for(const box of found)mapping[number++]=box;
        }
        if(version!==generation){await task.destroy();return;}
      }
      const pages=await Promise.all(Array.from({length:loaded.numPages},(_,i)=>loaded.getPage(i+1)));
      if(version!==generation){await task.destroy();return;}
      documentTask?.destroy(); documentTask = task;
      reader.load(pages);
      pdf = loaded; page = 1; current = undefined;
      key=storageKey;boxes=mapping;
      pageSelect.replaceChildren();
      for (let i = 1; i <= pdf.numPages; i++) pageSelect.add(new Option(String(i), String(i)));
      measure.replaceChildren();
      if(recording) {
        view.hidden=false;byId('native').hidden=true;
        recording.opened(hash,selected.name,boxes);
        saveBoxes();
      } else for (const number of new Set(state.playbackTimeline.measures.map(m => m.measureNumber))) {
        measure.add(new Option(printedMeasure(state.score, number), String(number)));
      }
      visible = true; updateAttachStatus(''); closeMenu();
      setEditing(!Object.keys(boxes).length); sync();
      if(recording && Object.keys(boxes).length)message(Object.keys(boxes).length+' measure boxes across '+loaded.numPages+' pages. Choose Mark measures to review them.');
      if(missedPages.length)message('Check pages '+missedPages.join(', ')+'. No boxes found there. Use Mark measures to check numbering and draw any missing boxes.');
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
  function startBox(event) {
    if (!editing || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    const start=point(event);
    const hit=proposals?.findIndex(b=>start.x>=b.x && start.x<=b.x+b.w && start.y>=b.y && start.y<=b.y+b.h) ?? -1;
    drag = {id:event.pointerId, start, hit};
    sheet.setPointerCapture(event.pointerId);
  }
  sheet.onpointerdown=startBox;
  pagesRoot.addEventListener('pointerdown',event=>{
    if(!editing || sheet.contains(event.target) || event.button!==0 || !event.isPrimary)return;
    const number=Number(event.target.closest('[data-page]')?.dataset.page);
    if(!number || number===page || proposals || drag || find.disabled)return;
    goPage(number,false);
    startBox(event);
  });
  sheet.onpointermove = event => {
    if (drag?.id !== event.pointerId || (proposals && action.value!=='draw')) return;
    overlay.querySelector('.drawing')?.remove();
    const box = measureBox(page, drag.start, point(event));
    if (box) { const el = boxElement(box, true); el.classList.add('drawing'); overlay.append(el); }
  };
  sheet.onpointerup = event => {
    if (drag?.id !== event.pointerId) return;
    const end=point(event), box = measureBox(page, drag.start, end);
    const hit=drag.hit;
    cancelDrag();
    if(proposals) {
      proposals=editPageBoxes(proposals,hit,action.value,end.x,box);
      describeReview();return;
    }
    if (!box) return;
    boxes[measure.value] = box;
    saveBoxes();
    measure.selectedIndex = Math.min(measure.selectedIndex + 1, measure.options.length - 1);
    paintBoxes(); sync();
  };
  sheet.onlostpointercapture = sheet.onpointercancel = cancelDrag;
  measure.onchange = () => { if(proposals){describeReview();return;}
    const selected=measure.value;
    if (boxes[selected]) goPage(boxes[selected].page);
    measure.value=selected;paintBoxes();
  };
  pageSelect.onchange = () => goPage(Number(pageSelect.value));
  byId('remove').onclick = () => { delete boxes[measure.value]; saveBoxes(); paintBoxes(); sync(); };
  mark.onclick = () => { setEditing(!editing); current = undefined; sync(); };
  byId('native').onclick = () => { visible = false; sync(); };
  if(!recording)byId('return').onclick=byId('show').onclick = () => { closeMenu(); visible = true; current = undefined; sync(); };
  attach.onclick = () => file.click();
  file.onchange = () => { const selected = file.files[0]; file.value = ''; if (selected) open(selected); };
  new ResizeObserver(renderPage).observe(scroll);
  return {sync, reset,open};
}
