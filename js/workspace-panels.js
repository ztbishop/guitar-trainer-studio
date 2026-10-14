// View sizing only; score rendering, transport and grading remain with their owners.
const KEY='gts.workspacePanelSizes';
const PANELS={ 'media-editor':{min:180,max:520,initial:400}, 'fretboard-container':{min:120,max:400,initial:190} };
export function panelSizes(value={}) {
  return Object.fromEntries(Object.entries(PANELS).map(([id,rule])=>[id,Number.isFinite(value?.[id])?Math.max(rule.min,Math.min(rule.max,value[id])):rule.initial]));
}
export function fitPanelSizes(preferred,visible,available) {
  const wanted=panelSizes(preferred),minimum=visible.reduce((sum,id)=>sum+PANELS[id].min,0);
  const extra=visible.reduce((sum,id)=>sum+wanted[id]-PANELS[id].min,0);
  const scale=extra?Math.max(0,Math.min(1,(available-minimum)/extra)):0;
  return Object.fromEntries(visible.map(id=>[id,PANELS[id].min+(wanted[id]-PANELS[id].min)*scale]));
}
export function initWorkspacePanels() {
  const main=document.querySelector('.app-main');
  let preferred=panelSizes();
  try{preferred=panelSizes(JSON.parse(localStorage.getItem(KEY)));}catch{}
  const panels=Object.keys(PANELS).map(id=>document.getElementById(id));
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(preferred));}catch{}};
  function fit() {
    const visible=panels.filter(el=>!el.hidden && !el.classList.contains('hidden')).map(el=>el.id);
    const fitted=fitPanelSizes(preferred,visible,main.clientHeight-20-visible.length*10-220);
    for(const panel of panels) {
      if(fitted[panel.id]!==undefined)panel.style.height=fitted[panel.id]+'px';
      const handle=panel.querySelector('[data-resize-panel]'),rule=PANELS[panel.id];
      handle.setAttribute('aria-valuemin',String(rule.min));handle.setAttribute('aria-valuemax',String(rule.max));
      handle.setAttribute('aria-valuenow',String(Math.round(fitted[panel.id]??preferred[panel.id])));
    }
  }
  for(const panel of panels) {
    const handle=panel.querySelector('[data-resize-panel]'),id=panel.id;
    const set=value=>{preferred=panelSizes({...preferred,[id]:value});fit();};
    handle.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;
      event.preventDefault();handle.setPointerCapture(event.pointerId);
      const startY=event.clientY,startHeight=panel.getBoundingClientRect().height;
      const move=e=>set(startHeight+startY-e.clientY);
      const finish=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',finish);save();};
      handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);
    });
    handle.addEventListener('keydown',event=>{if(!['ArrowUp','ArrowDown','Home'].includes(event.key))return;event.preventDefault();set(event.key==='Home'?PANELS[id].initial:panel.getBoundingClientRect().height+(event.key==='ArrowUp'?10:-10));save();});
    handle.addEventListener('dblclick',()=>{set(PANELS[id].initial);save();});
  }
  document.addEventListener('reset-panel-sizes',()=>{preferred=panelSizes();save();fit();});
  new ResizeObserver(fit).observe(main);
  const observer=new MutationObserver(fit);
  panels.forEach(panel=>observer.observe(panel,{attributes:true,attributeFilter:['hidden','class']}));
  fit();
}
