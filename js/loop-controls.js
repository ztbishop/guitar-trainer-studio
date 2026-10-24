// Loop presentation only. Values follow playback order, including repeats.
import {AppState} from './app-state.js';
import {resolvePracticeRange,measureOccurrenceLabel} from './practice-range.js';

export function initLoopControls(onLoopChange=()=>{}) {
  const get=id=>document.getElementById(id);
  const enabled=get('practice-loop-enabled'),countIn=get('loop-count-in');
  const start=get('practice-loop-start'),end=get('practice-loop-end');
  const notice=get('loop-enabled-notice');
  let noticeTimer=null;
  const ready=()=>Boolean(AppState.playerReady && !AppState.media.editing && !AppState.media.returning && AppState.playbackTimeline?.measures.length);
  let lastTimeline;
  function hideNotice() {
    if(noticeTimer!==null)clearTimeout(noticeTimer);
    noticeTimer=null;
    notice?.classList?.remove('is-visible');
    if(notice)notice.textContent='';
  }
  function selectByDrag(selection) {
    if(!ready())return;
    const wasEnabled=AppState.practiceLoop.enabled;
    apply({...AppState.practiceLoop,...selection,enabled:true});
    if(wasEnabled || !notice)return;
    hideNotice();
    notice.textContent=`Loop enabled: measures ${selection.startIndex+1}–${selection.endIndex+1}`;
    notice.classList.add('is-visible');
    noticeTimer=setTimeout(()=>{
      notice.classList.remove('is-visible');
      noticeTimer=setTimeout(()=>{notice.textContent='';noticeTimer=null;},200);
    },3000);
  }
  function apply(next) {
    if(!ready())return;
    hideNotice();
    next.range=next.enabled ? resolvePracticeRange(AppState.playbackTimeline,next.startIndex,next.endIndex) : null;
    onLoopChange(next);sync();
  }
  function change(which,value) {
    if(!ready())return;
    const number=Number(value),max=AppState.playbackTimeline.measures.length;
    if(String(value).trim()==='' || !Number.isInteger(number) || number<1 || number>max) {
      sync(true);get('loop-controls-status').textContent=`Enter a whole measure from 1 to ${max}.`;return;
    }
    const next={...AppState.practiceLoop,[which]:number-1};
    if(next.startIndex>next.endIndex)next[which==='startIndex'?'endIndex':'startIndex']=number-1;
    if(next.startIndex!==AppState.practiceLoop.startIndex || next.endIndex!==AppState.practiceLoop.endIndex)apply(next);
    else sync(true);
  }
  for(const [control,which,prefix] of [[start,'startIndex','loop-start'],[end,'endIndex','loop-end']]) {
    let edited=false;
    const commit=()=>{edited=false;change(which,control.value);};
    control?.addEventListener('input',()=>{edited=true;});
    control?.addEventListener('change',commit);
    control?.addEventListener('blur',()=>{if(edited)commit();});
    const step=direction=>{
      if(!ready())return;
      change(which,Math.max(1,Math.min(AppState.playbackTimeline.measures.length,AppState.practiceLoop[which]+1+direction)));
    };
    control?.addEventListener('keydown',event=>{
      if(event.key==='Enter'){event.preventDefault();commit();}
      if(event.key==='ArrowUp' || event.key==='ArrowDown'){event.preventDefault();step(event.key==='ArrowUp'?1:-1);}
    });
    get(`${prefix}-down`)?.addEventListener('click',()=>step(-1));
    get(`${prefix}-up`)?.addEventListener('click',()=>step(1));
    const slider=get(`${prefix}-slider`);
    slider?.addEventListener('input',()=>change(which,slider.value));
  }
  enabled?.addEventListener('change',()=>apply({...AppState.practiceLoop,enabled:enabled.checked}));
  countIn?.addEventListener('change',()=>{
    if(ready() && AppState.practiceLoop.enabled)apply({...AppState.practiceLoop,countIn:countIn.checked});
  });
  function sync(force=false) {
    const timeline=AppState.playbackTimeline;
    if(timeline!==lastTimeline) {
      lastTimeline=timeline;
      if(timeline?.measures.length && !AppState.practiceLoop.enabled)AppState.practiceLoop.endIndex=timeline.measures.length-1;
    }
    const available=ready(),loop=AppState.practiceLoop,max=timeline?.measures.length||1;
    for(const id of ['btn-looper','more-loop-shortcut']) {
      const button=get(id);
      button?.classList?.toggle('is-loop-enabled',loop.enabled);
      button?.setAttribute?.('aria-description',loop.enabled?'Loop enabled':'Loop off');
      if(button)button.title=loop.enabled ? `Loop enabled • measures ${loop.startIndex+1}–${loop.endIndex+1}` : 'Loop off';
    }
    get('btn-more')?.classList?.toggle('has-enabled-loop',loop.enabled);
    get('btn-more')?.setAttribute?.('aria-description',loop.enabled?'Loop enabled':'');
    if(!available || !loop.enabled)hideNotice();
    for(const [control,value] of [[start,loop.startIndex+1],[end,loop.endIndex+1],[get('loop-start-slider'),loop.startIndex+1],[get('loop-end-slider'),loop.endIndex+1]]) {
      if(!control)continue;
      control.max=String(max);control.disabled=!available;
      if(force || document.activeElement!==control)control.value=String(value);
    }
    for(const prefix of ['loop-start','loop-end'])for(const direction of ['down','up']) {
      const control=get(`${prefix}-${direction}`);if(control)control.disabled=!available;
    }
    if(enabled){enabled.disabled=!available;enabled.checked=loop.enabled;}
    if(countIn){countIn.disabled=!available || !loop.enabled;countIn.checked=Boolean(loop.countIn);}
    get('loop-count-in-label')?.classList?.toggle('menu-unavailable',!available || !loop.enabled);
    const repeated=timeline?.measures.some(measure=>measure.occurrence>1);
    get('loop-controls-status').textContent=AppState.media.editing ? 'Loops are paused while editing sync. Choose Finish editing in Media Sync to restore your loop.' : AppState.media.returning ? 'Restoring the player…' : !available ? 'Load a score to choose a section.' : repeated
      ? `${measureOccurrenceLabel(timeline.measures[loop.startIndex])} through ${measureOccurrenceLabel(timeline.measures[loop.endIndex])}. Numbers follow playback order, including repeats.` : '';
  }
  return {sync,selectByDrag};
}
