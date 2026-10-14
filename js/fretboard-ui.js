// Consumes display data; never decides correctness.
import {midiToNoteName} from './note-utils.js';
import {fretX,fretWireX,fretboardGeometry,fretInlayYs} from './fretboard-geometry.js';
let container=null,helpStatus=null,lastSignature='',lastLeftHanded=null;
const ns='http://www.w3.org/2000/svg';
function shape(tag,attrs,text) {
  const el=document.createElementNS(ns,tag);
  for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));
  if(text!==undefined)el.textContent=text;return el;
}
export function initFretboard(el,statusEl=null) {container=el;helpStatus=statusEl;lastSignature='';lastLeftHanded=null;}
export function renderFretboard(model) {
  if(!container)return;
  const signature=JSON.stringify(model);if(signature===lastSignature)return;lastSignature=signature;
  const previousScroll=container.querySelector?.('.fretboard-scroll')?.scrollLeft ?? 0;
  const orientationChanged=lastLeftHanded!==model.leftHanded;
  lastLeftHanded=model.leftHanded;
  container.replaceChildren();
  container.setAttribute('aria-label',model.supported?'Practice fretboard':model.message);
  if(helpStatus)helpStatus.textContent=(model.supported?`${model.stringCount} ${model.stringCount===1?'string':'strings'} · Frets relative to capo ${model.capo}. `:'')+model.message+
    (model.unmappedPitches?.length?` Outside displayed positions: ${model.unmappedPitches.map(midiToNoteName).join(', ')}.`:'');
  if(!model.supported){const hint=document.createElement('p');hint.className='field-help';hint.textContent=model.message;container.appendChild(hint);return;}
  const geometry=fretboardGeometry(model.maxFret,model.stringCount);
  const {width,height,firstY,stringGap,top,bottom}=geometry;
  const scroll=document.createElement('div');scroll.className='fretboard-scroll';
  scroll.setAttribute('tabindex','0');scroll.setAttribute('aria-label','Scrollable practice fretboard');
  const svg=shape('svg',{viewBox:`0 0 ${width} ${height}`,style:`min-width:${width}px`,role:'img','aria-label':`${model.stringCount}-string fretboard, frets 0 to ${model.maxFret} relative to capo ${model.capo}, ${model.leftHanded?'left':'right'}-handed. Blue targets, green correct, red missed or wrong, rings for played positions.`});
  const nut=fretWireX(0,model.maxFret,model.leftHanded),end=fretWireX(model.maxFret,model.maxFret,model.leftHanded);
  svg.appendChild(shape('rect',{x:Math.min(nut,end),y:top,width:Math.abs(end-nut),height:bottom-top,rx:4,class:'fretboard-neck'}));
  for(let fret=0;fret<=model.maxFret;fret++) {
    const x=fretX(fret,model.maxFret,model.leftHanded);
    const wire=fretWireX(fret,model.maxFret,model.leftHanded);
    svg.appendChild(shape('line',{x1:wire,y1:top,x2:wire,y2:bottom,class:fret===0?'fretboard-nut':'fretboard-fret','data-fret':fret}));
    svg.appendChild(shape('text',{x,y:14,'text-anchor':'middle',class:'fretboard-label'},String(fret)));
    const physicalFret=fret+model.capo;
    if(fret>0 && [3,5,7,9,0].includes(physicalFret%12)) {
      const ys=fretInlayYs(model.stringCount,physicalFret%12===0);
      for(const y of ys)svg.appendChild(shape('circle',{cx:x,cy:y,r:4,class:'fretboard-inlay','data-physical-fret':physicalFret}));
    }
  }
  for(let string=1;string<=model.stringCount;string++) {
    const y=firstY+(string-1)*stringGap;
    const min=Math.min(...model.openPitches),max=Math.max(...model.openPitches);
    const thickness=max===min?1.5:1+2.2*(max-model.openPitches[string-1])/(max-min);
    svg.appendChild(shape('line',{x1:model.leftHanded?60:70,y1:y,x2:model.leftHanded?width-70:width-60,y2:y,class:'fretboard-string','stroke-width':thickness,'data-string':string}));
    svg.appendChild(shape('text',{x:model.leftHanded?width-30:30,y:y+4,'text-anchor':'middle',class:'fretboard-label'},`${string} ${midiToNoteName(model.openPitches[string-1])}`));
  }
  for(const [kind,markers] of [['target',model.targets],['played',model.played]])for(const marker of markers) {
    const x=fretX(marker.fret,model.maxFret,model.leftHanded),y=firstY+(marker.string-1)*stringGap;
    const group=shape('g',{'data-state':marker.state,'data-string':marker.string,'data-fret':marker.fret,class:`fretboard-marker fretboard-marker-${kind}`});
    group.appendChild(shape('title',{},`${kind}: ${midiToNoteName(marker.midi)}, string ${marker.string}, fret ${marker.fret}, ${marker.state}`));
    group.appendChild(shape('circle',{cx:x,cy:y,r:kind==='played'?10:8}));
    if(kind==='target')group.appendChild(shape('text',{x,y:y+3.5,'text-anchor':'middle'},marker.state==='correct'?'✓':marker.state==='missed'?'×':marker.state==='completed-with-errors'?'!':midiToNoteName(marker.midi).replace(/-?\d+$/,'')));
    svg.appendChild(group);
  }
  scroll.appendChild(svg);container.appendChild(scroll);
  scroll.scrollLeft=orientationChanged?(model.leftHanded?width:0):previousScroll;
}
