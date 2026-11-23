import {printedMeasure} from './printed-measure.js';
import {createMissingMeasureForm,insertTimedMeasure} from './missing-measure.js';
import {copyDraftJson} from './draft-timing.js';
import {draftPieces,draftPosition,draftSeekTarget,draftAnchors,editDraftPiece,finite} from './draft-alignment.js';
const node=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
const svg=(tag,attrs={},text)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;return e;};
function intervalName(kind,label) {
  if (kind === 'unmatched-source-rest') return 'Ordinary rest';
  return label === 'Unscored recording gap' ? 'Unmapped audio' : 'Explanation';
}
export function createDraftTimeline({container,options,transport,highlight,change,error}) {
  const written = number => printedMeasure(options().notation,number);
  const label = p => p.kind === 'music'
    ? `M${written(p.value.scoreMeasure)} · pass ${p.value.occurrence??'?'} · visit ${p.value.originalVisit??'?'}`
    : `${intervalName(p.kind,p.value.label)} · ${p.value.label??p.value.id}`;
  let original,working,selected=null,target='startSeconds',current=0,playing=false,extent=1,zoom=1,drag=null,evidencePoints=[],seekDisplayTime=null;
  const controls=node('div');controls.className='media-actions';
  function button(parent,id,text,fn){const e=node('button',text);e.type='button';e.id=id;e.onclick=()=>{try{fn();}catch(err){error(err);}};parent.append(e);return e;}
  const play=button(controls,'media-draft-play','Play recording',()=>transport(playing?'pause':'play'));
  button(controls,'media-draft-zoom-out','−',()=>{zoom=Math.max(1,zoom/2);draw();centerPlayhead();});
  button(controls,'media-draft-zoom-in','+',()=>{zoom=Math.min(32,zoom*2);draw();centerPlayhead();});
  const clock=node('output');clock.id='media-draft-clock';controls.append(clock);
  const status=node('span');status.id='media-draft-position';status.setAttribute('role','status');controls.append(status);
  const seek=node('input');seek.type='range';seek.min=0;seek.step='any';seek.id='media-draft-seek';seek.setAttribute('aria-label','Seek draft recording');seek.oninput=()=>seekTo(Number(seek.value));
  const scroll=node('div');scroll.className='draft-timeline-scroll';
  const chart=svg('svg',{id:'media-draft-timeline',viewBox:'0 0 1000 150',preserveAspectRatio:'none',role:'group','aria-label':'Draft recording alignment. Music, intervals and supplied evidence.'});scroll.append(chart);
  const legend=node('small','Blue: candidate music · Purple: unscored interval · Gray: ordinary rest · Amber: unresolved · Dots: original timing evidence');
  const shelf=node('div');shelf.id='media-draft-unplaced';
  const selectedTools=node('div');selectedTools.className='draft-selected';
  const selection=node('select');selection.id='media-draft-section';selection.setAttribute('aria-label','Selected draft section');selection.onchange=()=>select(selection.value);
  const scope=node('select');scope.id='media-draft-scope';scope.setAttribute('aria-label','Edit scope');
  for(const [value,text] of [['point','Change one boundary / anchor'],['move','Move whole section']]){const o=node('option',text);o.value=value;scope.append(o);}
  scope.onchange=()=>{draw();fields();};
  const targetSelect=node('select');targetSelect.id='media-draft-target';targetSelect.setAttribute('aria-label','Boundary or anchor');targetSelect.onchange=()=>{target=targetSelect.value;fields();};
  const seconds=node('input');seconds.type='number';seconds.step='any';seconds.id='media-draft-seconds';seconds.placeholder='Unplaced';seconds.setAttribute('aria-label','Selected timestamp in seconds');
  const edit=()=>commitTime(Number(seconds.value));
  button(selectedTools,'media-draft-set','Set seconds',()=>{if(seconds.value==='')throw Error('Enter an observed time.');edit();});
  button(selectedTools,'media-draft-at-playhead','Place at playhead',()=>commitTime(current));
  const affected=node('p');affected.id='media-draft-affected';affected.setAttribute('role','status');
  seconds.oninput=()=>{try{if(seconds.value==='')return;affected.textContent=editDraftPiece(working,selected,scope.value==='move'?'move':target,Number(seconds.value),options().durationMs/1000).changes.join(' · ');}catch(e){affected.textContent=e.message;}};
  const map=node('select');map.id='media-draft-occurrence';map.setAttribute('aria-label','Score passage and repeat occurrence');
  map.onchange=()=>{if(!map.value)return;const p=piece();if(!p||p.kind!=='music')return;const next=copyDraftJson(working),v=next.candidatePlan.musicalVisits[p.index],n=options().timeline.measures[Number(map.value)-1];
    Object.assign(v,{originalVisit:Number(map.value),scoreMeasure:n.measureNumber,occurrence:n.occurrence});change(next);reveal();};
  selectedTools.prepend(selection,scope,targetSelect,seconds);selectedTools.append(map,affected);
  const add=node('details'),addTitle=node('summary','Add a passage or anchor');add.append(addTitle);
  const alternatives=node('details'),alternativeTitle=node('summary','Suggested passages from matching evidence'),alternativeList=node('div');alternatives.append(alternativeTitle,alternativeList);add.append(alternatives);
  button(add,'media-draft-add-passage','Add unmapped passage',()=>{const next=copyDraftJson(working);next.candidatePlan.musicalVisits.push({visit:next.candidatePlan.musicalVisits.length+1,originalVisit:null,scoreMeasure:null,occurrence:null,startSeconds:null,endSeconds:null,anchors:[]});selected=`music:${next.candidatePlan.musicalVisits.length-1}`;change(next);});
  const offset=node('input');offset.type='number';offset.min=0;offset.max=480;offset.placeholder='Position 0–480';offset.setAttribute('aria-label','New anchor score position (0–480)');add.append(offset);
  button(add,'media-draft-add-anchor','Add anchor at playhead',()=>{const p=piece(),o=Number(offset.value);if(!p||p.kind!=='music'||offset.value===''||!finite(o)||o<=0||o>=480)throw Error('Select music and enter an internal position between 0 and 480.');
    const next=copyDraftJson(working),v=next.candidatePlan.musicalVisits[p.index];if(v.anchors.some(a=>a.offset480===o))throw Error('That position already has an anchor.');
    v.anchors.push({offset480:o,seconds:current});v.anchors.sort((a,b)=>a.offset480-b.offset480);
    const index=v.anchors.findIndex(a=>a.offset480===o);change(editDraftPiece(next,selected,String(index),current,options().durationMs/1000).working);});

  let visitsByNumber=new Map();
  const missing=createMissingMeasureForm({
    measures:()=>options().timeline.measures,notation:()=>options().notation,playhead:()=>current,
    visit:number=>visitsByNumber.get(number),
    save(number,start,end){
      const plan=insertTimedMeasure(working.candidatePlan,options().timeline.measures,number,start,end,options().durationMs/1000);
      selected='music:'+plan.musicalVisits.findIndex(v=>v.originalVisit===number);
      change({...working,candidatePlan:plan});select(selected);
    }
  });
  container.append(controls,seek,missing.box,legend,scroll,shelf,selectedTools,add);
  function selectMeasure(number,fraction,clock,editing){
    if(!working)return false;
    const target=draftSeekTarget(working.candidatePlan,options().timeline,number,fraction,clock);
    if(target){
      selected='music:'+target.index;
      if(editing){fields();draw();}
      seekTo(target.time);
      return true;
    }
    return Boolean(editing && !missing.box.hidden && missing.choose(number));
  }
  function piece(){return working&&draftPieces(working.candidatePlan).find(p=>p.key===selected);}
  function centerPlayhead(){scroll.scrollLeft=Math.max(0,current/extent*chart.getBoundingClientRect().width-scroll.clientWidth/2);}
  function seekTo(time){seekDisplayTime=time;transport('seek',time);current=time;update(time,playing);centerPlayhead();}
  function reveal(){const p=piece();if(p?.kind==='music'){const n=options().timeline?.measures[p.value.originalVisit-1];if(n&&n.measureNumber===p.value.scoreMeasure&&n.occurrence===p.value.occurrence)highlight({kind:'music',scoreMeasure:n.measureNumber,occurrence:n.occurrence,originalVisit:p.value.originalVisit,fraction:0,tick:n.startTick},true);}}
  function select(key){selected=key;fields();draw();const p=piece(),time=finite(p?.value.startSeconds)?p.value.startSeconds:p?.value.anchors?.find(a=>finite(a.seconds))?.seconds;if(finite(time)&&time>=0&&time<=options().durationMs/1000)seekTo(time);reveal();}
  function commitTime(time){const result=editDraftPiece(working,selected,scope.value==='move'?'move':target,time,options().durationMs/1000);change(result.working);affected.textContent=result.changes.join(' · ');}
  function fields(){
    const p=piece();selection.replaceChildren();
    for(const v of draftPieces(working.candidatePlan)){const o=node('option',label(v));o.value=v.key;selection.append(o);}selection.value=selected??'';
    targetSelect.replaceChildren();
    for(const [value,text] of [['startSeconds','Start'],['endSeconds','End'],...(p?.value.anchors??[]).map((a,i)=>[String(i),`Anchor ${a.offset480}/480`])]){const o=node('option',text);o.value=value;targetSelect.append(o);}
    if(![...targetSelect.options].some(o=>o.value===target))target='startSeconds';targetSelect.value=target;targetSelect.disabled=scope.value==='move';
    const t=scope.value==='move'?'startSeconds':target;seconds.value=p?(p.value[t]??p.value.anchors?.[Number(t)]?.seconds??''):'';
    map.replaceChildren();const empty=node('option','Select score passage / occurrence…');empty.value='';map.append(empty);
    for(const [i,n] of (options().timeline?.measures??[]).entries()){const o=node('option',`Measure ${written(n.measureNumber)} · pass ${n.occurrence} · original visit ${i+1}`);o.value=String(i+1);map.append(o);}map.value=String(p?.value.originalVisit??'');map.hidden=p?.kind!=='music';
    affected.textContent=scope.value==='move'?'Changes this section’s known start, end and every internal anchor by the same amount. Unplaced endpoints stay unplaced.':'Changes only this timestamp. A start/end and its matching boundary anchor move together; other sections stay fixed.';
    for(const e of [scope,targetSelect,seconds,...selectedTools.querySelectorAll('button')])e.disabled=!p||(e===targetSelect&&scope.value==='move');
  }
  function renderAlternatives(){
    if(original.matchingEvidence?.method==='audio-passage-search-v2'){
      visitsByNumber=new Map(working.candidatePlan.musicalVisits.map(v=>[v.originalVisit,v]));
      missing.refresh();
    }else missing.box.hidden=true;
    alternativeList.replaceChildren();
    const suggestions=original.matchingEvidence?.visitAlternatives;
    alternatives.hidden=!Array.isArray(suggestions)||!suggestions.length;
    for(const suggestion of Array.isArray(suggestions)?suggestions:[]) {
      const row=node('p',`Source measure ${suggestion.sourceMeasure??'?'}: `);
      for(const id of Array.isArray(suggestion.originalVisits)?suggestion.originalVisits:[]) {
        const n=options().timeline?.measures[id-1];if(!n)continue;
        button(row,'',`M${written(n.measureNumber)}, pass ${n.occurrence} (visit ${id})`,()=>{
          const next=copyDraftJson(working),visits=next.candidatePlan.musicalVisits;
          selected=`music:${visits.length}`;
          visits.push({visit:visits.length+1,originalVisit:id,scoreMeasure:n.measureNumber,occurrence:n.occurrence,startSeconds:null,endSeconds:null,anchors:[]});change(next);reveal();
        });
      }
      alternativeList.append(row);
    }
    alternativeList.prepend(node('small','Choose explicitly, then place the observed times. Suggestions do not verify the full arrangement or allow sounding omissions.'));
  }
  function draw(){
    chart.style.width=`${zoom*100}%`;chart.replaceChildren();shelf.replaceChildren();
    const duration=options().durationMs/1000,pieces=draftPieces(working.candidatePlan);
    extent=Math.max(duration,...pieces.flatMap(p=>[p.value.startSeconds,p.value.endSeconds,...(p.value.anchors??[]).map(a=>a.seconds)]).filter(finite),...evidencePoints.map(a=>a[1]),1);
    chart.append(svg('rect',{x:0,y:20,width:1000,height:92,fill:'#fff0cf'}));
    for(let i=0;i<=10;i++)chart.append(svg('text',{x:i*98,y:14,'font-size':11},`${(extent*i/10).toFixed(1)}s`));
    if(extent>duration)chart.append(svg('rect',{x:duration/extent*1000,y:20,width:(extent-duration)/extent*1000,height:110,fill:'#f6b9b9'}));
    for(const p of pieces){
      const v=p.value,y=p.kind==='music'?27:69,known=finite(v.startSeconds)&&finite(v.endSeconds),start=finite(v.startSeconds)?v.startSeconds:v.endSeconds;
      const color=p.kind==='music'?'#9bc7ef':p.kind==='explanation'?'#ccb2eb':'#bec6cd';
      const partial=p.kind==='music'?draftAnchors(v):[],left=known?v.startSeconds:partial[0]?.seconds,right=known?v.endSeconds:partial.at(-1)?.seconds;
      if(finite(left)&&finite(right)&&right>left){const rect=svg('rect',{x:left/extent*1000,y,width:Math.max(1,(right-left)/extent*1000),height:32,fill:color,stroke:selected===p.key?'#122a44':'#657385','stroke-width':selected===p.key?3:1,'stroke-dasharray':known?'none':'4 3','data-piece':p.key,'data-target':scope.value==='move'?'move':'select'});rect.append(svg('title',{},label(p)+(known?'':' — partial known span')));chart.append(rect);}
      if(finite(start)&&(!known||(right-left)/extent*1000>24))chart.append(svg('text',{x:start/extent*1000+4,y:y+20,'font-size':11,'pointer-events':'none'},p.kind==='music'?`M${written(v.scoreMeasure)}${known?'':' ?'}`:intervalName(p.kind,v.label)));
      for(const [key,value] of [['startSeconds',v.startSeconds],['endSeconds',v.endSeconds],...(v.anchors??[]).map((a,i)=>[String(i),a.seconds])])if(finite(value)) {
        const x=value/extent*1000;const handle=svg('path',{d:`M ${x} ${y-5} l -5 -7 h 10 Z`,fill:known?'#174979':'#a06100',stroke:'#fff','data-piece':p.key,'data-target':key,tabindex:0,role:'button','aria-label':`${label(p)} ${key} ${value} seconds`});
        handle.append(svg('title',{},`${label(p)} · ${key}: ${value} s`));chart.append(handle);
      }
      if(!known)button(shelf,'',`${label(p)} — ${!finite(v.startSeconds)?'start unplaced ':''}${!finite(v.endSeconds)?'end unplaced':''}`,()=>select(p.key));
    }
    // Evidence dots carry no inferred musical correspondence and never become draggable anchors.
    for(const a of evidencePoints){const c=svg('circle',{cx:a[1]/extent*1000,cy:122,r:2,fill:a[1]>duration?'#b00020':'#966018'});c.append(svg('title',{},`Original timing ${JSON.stringify(a)}${a[1]>duration?' — beyond recording end':''}`));chart.append(c);}
    const endpoint=svg('line',{x1:duration/extent*1000,x2:duration/extent*1000,y1:20,y2:135,stroke:'#9b2020','stroke-dasharray':'3 3'});endpoint.append(svg('title',{},`Actual recording end: ${duration} s`));chart.append(endpoint);
    chart.append(svg('line',{id:'media-draft-playhead',x1:current/extent*1000,x2:current/extent*1000,y1:18,y2:135,stroke:'#e33131','stroke-width':2,'pointer-events':'none'}));
    if(!pieces.length)shelf.append(node('p','No correspondence selected. Add a passage, then choose its measure and repeat occurrence. Alternatives remain in Original evidence.'));
  }
  chart.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;const hit=event.target.closest('[data-piece]');
    const toTime=x=>(x-chart.getBoundingClientRect().left)/chart.getBoundingClientRect().width*extent;
    if(!hit){seekTo(Math.max(0,Math.min(options().durationMs/1000,toTime(event.clientX))));return;}
    selected=hit.dataset.piece;target=hit.dataset.target==='select'?'startSeconds':hit.dataset.target;fields();
    if(hit.dataset.target==='select'){select(selected);return;}
    if(scope.value==='move')target='move';
    const originalTime=target==='move'?piece().value.startSeconds:piece().value[target]??piece().value.anchors?.[Number(target)]?.seconds;
    drag={start:event.clientX,time:originalTime,target,result:null};transport('pause');chart.setPointerCapture(event.pointerId);event.preventDefault();
  });
  chart.addEventListener('pointermove',event=>{if(!drag)return;try{
    const time=drag.time+(event.clientX-drag.start)/chart.getBoundingClientRect().width*extent;
    drag.result=editDraftPiece(working,selected,drag.target,time,options().durationMs/1000);affected.textContent=drag.result.changes.join(' · ');seconds.value=String(time);
    // Ghost preview only; commit exactly once on release, so Undo reverses the entire drag.
    chart.querySelector('[data-ghost]')?.remove();chart.append(svg('line',{'data-ghost':'true',x1:time/extent*1000,x2:time/extent*1000,y1:20,y2:110,stroke:'#111','stroke-width':3}));
  }catch(e){drag.result=null;affected.textContent=e.message;}});
  chart.addEventListener('pointerup',()=>{if(!drag)return;const d=drag;drag=null;if(d.result){change(d.result.working);affected.textContent=d.result.changes.join(' · ');}else select(selected);});
  chart.addEventListener('pointercancel',()=>{drag=null;draw();fields();});
  chart.addEventListener('keydown',event=>{const hit=event.target.closest('[data-piece]');if(hit&&['Enter',' '].includes(event.key)){event.preventDefault();select(hit.dataset.piece);target=hit.dataset.target;fields();}});
  function update(time,isPlaying){
    current=time;playing=isPlaying;play.textContent=playing?'Pause recording':'Play recording';clock.textContent=`${time.toFixed(2)} / ${(options().durationMs/1000).toFixed(2)} s`;
    if(document.activeElement!==seek)seek.value=String(time);
    const x=current/extent*1000,h=chart.querySelector('#media-draft-playhead');h?.setAttribute('x1',x);h?.setAttribute('x2',x);
    if(!working)return;
    // A paused provider may quantize an explicit seek by a fraction of a
    // millisecond. Retain that selected display position only, never its clock
    // or timestamps; moving playback always uses the actual provider position.
    const displayTime=!playing&&finite(seekDisplayTime)&&Math.abs(time-seekDisplayTime)<0.001?seekDisplayTime:time;
    if(playing)seekDisplayTime=null;
    const pos=draftPosition(working.candidatePlan,options().timeline,displayTime);
    status.textContent=pos.kind==='music'?`Editing preview · M${written(pos.scoreMeasure)}, pass ${pos.occurrence}, visit ${pos.originalVisit}`:pos.kind==='explanation'?`${intervalName(pos.kind,pos.label)} — no score tracking`:pos.kind==='unmatched-source-rest'?'Ordinary rest — no score tracking':'Unresolved — no score tracking';
    highlight(pos,false);
    if(playing&&!drag){const px=current/extent*chart.getBoundingClientRect().width;if(px<scroll.scrollLeft||px>scroll.scrollLeft+scroll.clientWidth)centerPlayhead();}
  }
  return {selectMeasure,render(draft,next){original=draft;working=next;evidencePoints=[];try{const points=JSON.parse(original.originalTimingText.replace(/^\uFEFF/,''));if(Array.isArray(points))evidencePoints=points.filter(a=>Array.isArray(a)&&finite(a[1]));}catch{}seek.max=options().durationMs/1000;selected=draftPieces(working.candidatePlan).some(p=>p.key===selected)?selected:draftPieces(working.candidatePlan)[0]?.key??null;draw();fields();renderAlternatives();update(current,false);},update,clear(){working=null;selected=null;current=0;zoom=1;highlight(null);}};
}
