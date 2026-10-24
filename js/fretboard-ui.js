// Consumes display data; never decides correctness.
import {midiToNoteName} from './note-utils.js';
import {fretboardLabel} from './fretboard-context.js';
import {fretX,fretWireX,fretboardGeometry,fretInlayYs,fretNumberVisible,fretboardFit} from './fretboard-geometry.js';
let container=null,helpStatus=null,lastSignature='',lastLeftHanded=null,lastModel=null,resizeObserver=null,lastAvailableWidth=0,lastRenderedWidth=0;
const ns='http://www.w3.org/2000/svg';
function shape(tag,attrs,text) {
  const el=document.createElementNS(ns,tag);
  for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));
  if(text!==undefined)el.textContent=text;return el;
}
export function initFretboard(el,statusEl=null) {
  resizeObserver?.disconnect();container=el;helpStatus=statusEl;lastSignature='';lastLeftHanded=null;lastModel=null;lastAvailableWidth=0;lastRenderedWidth=0;
  if(container && typeof ResizeObserver==='function') {
    resizeObserver=new ResizeObserver(()=>{if(lastModel && container.clientWidth>0)renderFretboard(lastModel);});
    resizeObserver.observe(container);
  }
}
export function renderFretboard(model) {
  if(!container)return;
  lastModel=model;
  const padding=typeof getComputedStyle==='function'?getComputedStyle(container):null;
  const availableWidth=(container.clientWidth-(parseFloat(padding?.paddingLeft)||0)-(parseFloat(padding?.paddingRight)||0)) || 1200;
  const availableHeight=(container.clientHeight-(parseFloat(padding?.paddingTop)||0)-(parseFloat(padding?.paddingBottom)||0)) || 0;
  const signature=JSON.stringify([model,availableWidth,availableHeight]);if(signature===lastSignature)return;lastSignature=signature;
  const previousViewport=container.querySelector?.('.fretboard-scroll');
  const previousScroll=previousViewport?.scrollLeft ?? 0;
  const previousRight=Math.max(0,(previousViewport?.scrollWidth??0)-lastAvailableWidth-previousScroll);
  const resized=lastAvailableWidth!==availableWidth;
  lastAvailableWidth=availableWidth;
  const orientationChanged=lastLeftHanded!==model.leftHanded;
  lastLeftHanded=model.leftHanded;
  container.replaceChildren();
  container.setAttribute('aria-label',model.supported?'Practice fretboard':model.message);
  if(helpStatus)helpStatus.textContent=(model.supported?`${model.stringCount} ${model.stringCount===1?'string':'strings'} · Frets relative to capo ${model.capo}. `:'')+model.message+
    (model.unmappedPitches?.length?` Outside displayed positions: ${model.unmappedPitches.map(midiToNoteName).join(', ')}.`:'');
  if(!model.supported){const hint=document.createElement('p');hint.className='field-help';hint.textContent=model.message;container.appendChild(hint);return;}
  const natural=fretboardGeometry(model.maxFret,model.stringCount,availableWidth);
  const fit=fretboardFit(natural.width,natural.height,availableWidth,container.closest?.('.fretboard-panel')?availableHeight:0);
  const geometry=fretboardGeometry(model.maxFret,model.stringCount,fit.width);
  const {width,height,firstY,stringGap,top,bottom}=geometry;
  const scroll=document.createElement('div');scroll.className='fretboard-scroll';
  scroll.setAttribute('tabindex','0');scroll.setAttribute('aria-label','Scrollable practice fretboard');
  const renderedWidth=width*fit.scale,renderedHeight=height*fit.scale;
  const svg=shape('svg',{viewBox:`0 0 ${width} ${height}`,width:renderedWidth,height:renderedHeight,'data-natural-width':natural.width,'data-natural-height':natural.height,'data-scale':fit.scale,style:`width:${renderedWidth}px;height:${renderedHeight}px`,role:'img','aria-label':`${model.stringCount}-string fretboard, frets 0 to ${model.maxFret} relative to capo ${model.capo}, ${model.leftHanded?'left':'right'}-handed. Blue current targets, gold upcoming, faint past, green accepted pitch, red missed or wrong, rings for played positions. Labels: ${model.labelMode??'notes'}.`});
  const wireX=fret=>fretWireX(fret,model.maxFret,model.leftHanded,width);
  const noteX=fret=>fretX(fret,model.maxFret,model.leftHanded,width);
  const nut=wireX(0),end=wireX(model.maxFret);
  svg.appendChild(shape('rect',{x:Math.min(nut,end),y:top,width:Math.abs(end-nut),height:bottom-top,rx:4,class:'fretboard-neck'}));
  for(let fret=0;fret<=model.maxFret;fret++) {
    const x=noteX(fret);
    const wire=wireX(fret);
    svg.appendChild(shape('line',{x1:wire,y1:top,x2:wire,y2:bottom,class:fret===0?'fretboard-nut':'fretboard-fret','data-fret':fret}));
    if(fretNumberVisible(fret,model.maxFret,renderedWidth,model.targets.map(note=>note.fret)))
      svg.appendChild(shape('text',{x,y:14,'text-anchor':'middle',class:'fretboard-label','data-fret-label':fret},String(fret)));
    const physicalFret=fret+model.capo;
    if(fret>0 && [3,5,7,9,0].includes(physicalFret%12)) {
      const ys=fretInlayYs(model.stringCount,physicalFret%12===0);
      for(const y of ys)svg.appendChild(shape('circle',{cx:x,cy:y,r:4,class:'fretboard-inlay','data-physical-fret':physicalFret}));
    }
  }
  if(model.capo>0) {
    const x=model.leftHanded?width-30:30;
    const badge=shape('g',{class:'fretboard-capo','aria-label':`Capo ${model.capo}; frets relative to capo`});
    badge.appendChild(shape('rect',{x:x-29,y:0,width:58,height:19,rx:5}));
    badge.appendChild(shape('text',{x,y:13,'text-anchor':'middle'},`Capo ${model.capo}`));
    svg.appendChild(badge);
  }
  for(let string=1;string<=model.stringCount;string++) {
    const y=firstY+(string-1)*stringGap;
    const min=Math.min(...model.openPitches),max=Math.max(...model.openPitches);
    const thickness=max===min?1.5:1+2.2*(max-model.openPitches[string-1])/(max-min);
    svg.appendChild(shape('line',{x1:model.leftHanded?60:70,y1:y,x2:model.leftHanded?width-70:width-60,y2:y,class:'fretboard-string','stroke-width':thickness,'data-string':string}));
    svg.appendChild(shape('text',{x:model.leftHanded?width-30:30,y:y+4,'text-anchor':'middle',class:'fretboard-label'},`${string} ${midiToNoteName(model.openPitches[string-1])}`));
  }
  for(const [kind,markers] of [['context',model.context??[]],['target',model.targets],['played',model.played]])for(const marker of markers) {
    const x=noteX(marker.fret),y=firstY+(marker.string-1)*stringGap;
    const group=shape('g',{'data-state':marker.state,'data-string':marker.string,'data-fret':marker.fret,class:`fretboard-marker fretboard-marker-${kind}`});
    group.appendChild(shape('title',{},`${kind}: ${midiToNoteName(marker.midi)}, string ${marker.string}, fret ${marker.fret}, ${marker.state}`));
    group.appendChild(shape('circle',{cx:x,cy:y,r:kind==='played'?12:10}));
    if(kind!=='played') {
      const label=fretboardLabel(marker,model.labelMode)??midiToNoteName(marker.midi).replace(/-?\d+$/,'');
      if(label)group.appendChild(shape('text',{x,y:y+4,'text-anchor':'middle'},label));
      const accent=marker.state==='correct'?'✓':['missed','wrong','completed-with-errors'].includes(marker.state)?'!':'';
      if(accent)group.appendChild(shape('text',{x:x+10,y:y-8,'text-anchor':'middle',class:'fretboard-feedback-accent'},accent));
    }
    svg.appendChild(group);
  }
  scroll.appendChild(svg);container.appendChild(scroll);
  scroll.scrollLeft=orientationChanged?(model.leftHanded?renderedWidth:0):(resized || lastRenderedWidth!==renderedWidth) && model.leftHanded?Math.max(0,renderedWidth-availableWidth-previousRight):previousScroll;
  lastRenderedWidth=renderedWidth;
}
