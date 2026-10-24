// View sizing only; score rendering, transport and grading remain with their owners.
const KEY='gts.workspacePanelSizes';
const PANELS={ 'media-editor':{min:180,max:520,initial:400}, 'fretboard-container':{min:120,max:400,initial:190} };
export function panelSizes(value={}) {
  return Object.fromEntries(Object.entries(PANELS).map(([id,rule])=>[id,Number.isFinite(value?.[id])?Math.max(rule.min,Math.min(rule.max,value[id])):rule.initial]));
}
export function fretboardPanelHeight(neckHeight,frameHeight=18,scrollbarHeight=0) {
  return Number.isFinite(neckHeight)?Math.min(400,Math.max(144,Math.ceil(neckHeight+frameHeight+scrollbarHeight))):120;
}
export function usesAutomaticFretboardHeight(saved) {
  return typeof saved?.fretboardAutoHeight==='boolean'?saved.fretboardAutoHeight:!Number.isFinite(saved?.['fretboard-container']);
}
export function fitPanelSizes(preferred,visible,available,minimums={}) {
  const floor=id=>Number.isFinite(minimums[id])?Math.max(PANELS[id].min,Math.min(PANELS[id].max,minimums[id])):PANELS[id].min;
  const wanted=panelSizes(preferred);
  for(const id of visible)wanted[id]=Math.max(wanted[id],floor(id));
  const minimum=visible.reduce((sum,id)=>sum+floor(id),0);
  const extra=visible.reduce((sum,id)=>sum+wanted[id]-floor(id),0);
  const scale=extra?Math.max(0,Math.min(1,(available-minimum)/extra)):0;
  return Object.fromEntries(visible.map(id=>[id,floor(id)+(wanted[id]-floor(id))*scale]));
}
export function initWorkspacePanels() {
  const main=document.querySelector('.app-main');
  let preferred=panelSizes(),automaticFretboard=true;
  try{const saved=JSON.parse(localStorage.getItem(KEY));preferred=panelSizes(saved);automaticFretboard=usesAutomaticFretboardHeight(saved);}catch{}
  const panels=Object.keys(PANELS).map(id=>document.getElementById(id));
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({...preferred,fretboardAutoHeight:automaticFretboard}));}catch{}};
  function minimums() {
    const panel=document.getElementById('fretboard-container'),svg=panel.querySelector('svg');
    if(!svg)return {};
    const css=getComputedStyle(panel);
    const frame=['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth'].reduce((sum,key)=>sum+(parseFloat(css[key])||0),0);
    const scroll=panel.querySelector('.fretboard-scroll');
    const horizontal=Number(svg.getAttribute('data-natural-width')??svg.getAttribute('width'))>(scroll?.clientWidth??0)+1;
    const scrollbar=horizontal?Math.max(18,(scroll?.offsetHeight??0)-(scroll?.clientHeight??0)):0;
    return {'fretboard-container':automaticFretboard?fretboardPanelHeight(Number(svg.getAttribute('data-natural-height')??svg.getAttribute('height')),frame,scrollbar):144};
  }
  function fit() {
    const visible=panels.filter(el=>!el.hidden && !el.classList.contains('hidden')).map(el=>el.id);
    const limits=minimums();
    const wanted=automaticFretboard && limits['fretboard-container']?{...preferred,'fretboard-container':limits['fretboard-container']}:preferred;
    const fitted=fitPanelSizes(wanted,visible,main.clientHeight-20-visible.length*10-220,limits);
    for(const panel of panels) {
      if(fitted[panel.id]!==undefined)panel.style.height=fitted[panel.id]+'px';
      const handle=panel.querySelector('[data-resize-panel]'),rule=PANELS[panel.id];
      handle.setAttribute('aria-valuemin',String(limits[panel.id]??rule.min));handle.setAttribute('aria-valuemax',String(rule.max));
      handle.setAttribute('aria-valuenow',String(Math.round(fitted[panel.id]??preferred[panel.id])));
    }
  }
  for(const panel of panels) {
    const handle=panel.querySelector('[data-resize-panel]'),id=panel.id;
    const set=(value,automatic=false)=>{if(id==='fretboard-container')automaticFretboard=automatic;preferred=panelSizes({...preferred,[id]:value});fit();};
    handle.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;
      event.preventDefault();handle.setPointerCapture(event.pointerId);
      const startY=event.clientY,startHeight=panel.getBoundingClientRect().height;
      const move=e=>set(startHeight+startY-e.clientY);
      const finish=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',finish);save();};
      handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);
    });
    handle.addEventListener('keydown',event=>{if(!['ArrowUp','ArrowDown','Home'].includes(event.key))return;event.preventDefault();set(event.key==='Home'?PANELS[id].initial:panel.getBoundingClientRect().height+(event.key==='ArrowUp'?10:-10),event.key==='Home');save();});
    handle.addEventListener('dblclick',()=>{set(PANELS[id].initial,true);save();});
  }
  document.addEventListener('reset-panel-sizes',()=>{preferred=panelSizes();automaticFretboard=true;save();fit();});
  new ResizeObserver(fit).observe(main);
  const observer=new MutationObserver(fit);
  panels.forEach(panel=>observer.observe(panel,{attributes:true,attributeFilter:['hidden','class']}));
  observer.observe(document.getElementById('fretboard-content'),{childList:true,subtree:true});
  fit();
}
