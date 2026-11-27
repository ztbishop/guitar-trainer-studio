import {beatInset, rasterBeatAnchors, rasterBeatInset, readBeatGlyphs} from './pdf-beat-anchors.js';
import {detectStaves, readPdfRaster} from './pdf-measure-detection.js';

// Page geometry and hit targets stay mounted. Only nearby pages need raster images.
export function readingPages(scroll, root, onJump, onPage, onError, companion=false) {
  let pages = [], width = 0, observer, active, cue, range, scrollFrame = 0;
  const targets = new Map();
  const paintedMarks = new Map();
  let activeMark, activeSegment;

  function setBeatInset(el, box, p) {
    const inset = p.beatGlyphs ? beatInset(box,p.beatGlyphs) : rasterBeatInset(box,p.rasterAnchors ?? []);
    if (inset) el.style.setProperty('--pdf-beat-inset', 100 * inset + '%');
  }
  function scanBeatGlyphs(p) {
    if (!companion || p.beatScan || !p.beatBoxes.size || root.classList.contains('marking')) return;
    p.beatScan = readBeatGlyphs(p.pdf, p.base).then(async glyphs => {
      p.beatGlyphs = glyphs;
      if(glyphs===null && p.beatBoxes.size) {
        p.rasterAnchors=await readPdfRaster(p.pdf,(pixels,width,height)=>
          rasterBeatAnchors(pixels,width,height,detectStaves(pixels,width,height),[...p.beatBoxes.values()]));
      }
      for (const [el, box] of p.beatBoxes) setBeatInset(el, box, p);
    }).catch(() => { p.beatGlyphs = []; });
  }
  function release(p) {
    p.task?.cancel();
    p.task = null;
    if (p.canvas) {
      p.canvas.remove();
      p.canvas.width = p.canvas.height = 0;
      p.canvas = null;
    }
  }
  function clear() {
    observer?.disconnect();
    cancelAnimationFrame(scrollFrame);
    pages.forEach(release);
    pages = [];
    targets.clear();
    paintedMarks.clear();
    activeMark = activeSegment = null;
    width = 0;
    root.replaceChildren();
  }
  function draw(p) {
    release(p);
    if (!width || !p.near || root.hidden) return;
    scanBeatGlyphs(p);
    const canvas = document.createElement('canvas');
    const scale = Math.min(devicePixelRatio || 1, 2, Math.sqrt(8000000 / (width ** 2 * p.base.height / p.base.width)));
    const viewport = p.pdf.getViewport({scale:width * scale / p.base.width});
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    p.node.prepend(canvas);
    p.canvas = canvas;
    const task = p.pdf.render({canvas, viewport});
    p.task = task;
    task.promise.catch(error => { if (p.task === task) onError('Could not draw PDF page '+p.number+'. '+error.message); });
  }
  function load(docPages) {
    clear();
    pages = docPages.map((pdf, i) => {
      const node = document.createElement('section'), layer = document.createElement('div');
      const base = pdf.getViewport({scale:1}), number = i + 1;
      node.className = 'pdf-reading-page';
      node.dataset.page = number;
      node.setAttribute('aria-label', 'Page '+number);
      node.style.aspectRatio = base.width+' / '+base.height;
      layer.className = 'pdf-boxes';
      node.append(layer);
      root.append(node);
      return {node, layer, pdf, number, base, beatBoxes:new Map()};
    });
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const p = pages[Number(entry.target.dataset.page)-1];
        if (p?.node !== entry.target) continue;
        p.near = entry.isIntersecting;
        draw(p);
      }
    }, {root:scroll, rootMargin:'100% 0px'});
    pages.forEach(p => observer.observe(p.node));
  }
  function resize(w) {
    if (width === w) return;
    width = w;
    root.style.width = w+'px';
    pages.filter(p => p.near).forEach(draw);
  }
  function populate(boxes, makeBox, label) {
    pages.forEach(p => {
      p.layer.replaceChildren();
      p.beatBoxes.clear();

    });
    paintedMarks.clear();
    activeMark = activeSegment = null;
    targets.clear();
    active = cue = range = undefined;
    for (const [key, box] of Object.entries(boxes)) {
      const number = Number(key), p = pages[box?.page-1];
      if (!p) continue;
      const el = makeBox(box, false, true);
      el.dataset.measure = key;
      el.setAttribute('aria-label', 'Go to measure '+label(number));
      el.onclick = () => onJump(number);
      p.layer.append(el);
      targets.set(number, el);
      if (companion) {
        p.beatBoxes.set(el, box);
        setBeatInset(el, box, p);
      }
    }
    pages.filter(p=>p.near).forEach(scanBeatGlyphs);
  }
  function follow(el) {
    if (!el) return;
    const frame = scroll.getBoundingClientRect(), rect = el.getBoundingClientRect();
    const headroom = companion ? Math.min(80, Math.max(32, scroll.clientWidth * .06), scroll.clientHeight * .18) : 12;
    if (rect.top < frame.top + (companion ? headroom : 0) || rect.bottom > frame.bottom)
      scroll.scrollTop += rect.top - frame.top - headroom;
    if (rect.left < frame.left || rect.right > frame.right) scroll.scrollLeft += rect.left-frame.left-8;
    onPage(Number(el.closest('[data-page]').dataset.page));
  }
  function revealMeasure(number) {
    follow(targets.get(number));
  }
  function update(number, nextCue, loop, reveal) {
    targets.get(active)?.classList.remove('current');
    targets.get(cue)?.classList.remove('tap-cue');
    targets.get(number)?.classList.add('current');
    targets.get(nextCue)?.classList.add('tap-cue');
    if (range !== loop) {
      for (const [n, el] of targets) el.classList.toggle('outside-loop', !!loop && !loop.has(n));
    }
    active = number; cue = nextCue; range = loop;
    if (reveal) revealMeasure(number ?? nextCue);
  }
  scroll.addEventListener('scroll', () => {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      if (root.hidden || !scroll.clientHeight) return;
      const top = scroll.getBoundingClientRect().top + Math.min(80, scroll.clientHeight/3);
      const first = pages.find(p => p.node.getBoundingClientRect().bottom > top);
      if (first) onPage(first.number);
    });
  }, {passive:true});
  function jump(number) {
    const p = pages[number-1];
    if (p) scroll.scrollTop += p.node.getBoundingClientRect().top-scroll.getBoundingClientRect().top;
  }
  function placeEditor(number, sheet) {
    pages[number-1]?.node.append(sheet);
  }
  function paintBeat(box, segment, live=false) {
    const mark = document.createElement('span');
    mark.className = 'pdf-beat-mark ' + segment.color + (live ? ' live' : '');
    mark.setAttribute('aria-hidden', 'true');
    mark.style.left = 'calc(' + (100 * segment.start) + '% + var(--pdf-beat-inset, 0%) * ' + (1 - segment.start) + ')';
    mark.style.width = 'calc((100% - var(--pdf-beat-inset, 0%)) * ' + (segment.end - segment.start) + ')';
    box.append(mark);
    return mark;
  }
  function updateBeatGuide(results, segment) {
    for (const [number, marks] of paintedMarks) {
      if (results.has(number)) continue;
      for (const {el} of marks.values()) el.remove();
      paintedMarks.delete(number);
    }
    for (const [number, marks] of results) {
      const box = targets.get(number);
      if (!box) continue;
      if (!paintedMarks.has(number)) paintedMarks.set(number, new Map());
      const painted = paintedMarks.get(number);
      for (const [id, old] of painted) {
        if (marks.get(id) === old.mark) continue;
        old.el.remove();
        painted.delete(id);
      }
      for (const [id, mark] of marks) {
        if (!painted.has(id)) painted.set(id, {mark, el:paintBeat(box, mark)});
      }
    }
    if (segment && activeSegment && ['number','start','end','color'].every(key => segment[key] === activeSegment[key])) return;
    activeMark?.remove();
    const box = targets.get(segment?.number);
    activeMark = box ? paintBeat(box, segment, true) : null;
    activeSegment = segment;
  }
  return {clear, load, resize, populate, update, revealMeasure, jump, placeEditor, updateBeatGuide};
}
