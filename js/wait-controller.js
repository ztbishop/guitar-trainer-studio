// Gate progression using injected transport operations. No alphaTab/DOM dependency.
import {WaitSession} from './wait-session.js';

export class WaitController {
  constructor(transport,onChange=()=>{}) {
    this.transport=transport;this.onChange=onChange;this.events=[];this.endTick=0;
    this.active=false;this.phase='idle';this.index=-1;this.position=0;this.manualPaused=false;
  }
  configure(events,endTick,hex=false,loop=false) {
    this.stop();this.events=events;this.endTick=endTick;this.hex=hex;
    this.loop=loop;this.pass=1;this.lastPassResults=null;
    this.session=new WaitSession(events,{hex});this.index=-1;this.publish();
  }
  publish() {
    const currentEvent=this.events[this.index]??null;
    const record=this.session?.records[this.index];
    const hits=record?.slots.filter(s=>s.hit).length??0;
    let matchState='idle',status='Choose Wait Mode and press Play to begin';
    if(this.phase==='waiting' || this.phase==='seeking') {
      matchState=hits?'partial':'waiting';
      status=`Waiting • measure ${currentEvent?.measureNumber??'—'} • ${hits}/${record?.slots.length??0} required attacks`;
      if(this.session.lastFeedback?.type==='wrong' && this.session.lastFeedback.eventId===currentEvent?.id) {matchState='mismatch';status+=' • wrong note; try again';}
    }
    if(this.phase==='paused') status='Paused • press Play to resume Wait Mode';
    if(this.phase==='complete') {matchState='match';status='Wait practice complete';}
    const stats=this.session?.stats()??null;
    this.onChange({phase:this.phase,active:this.active,currentEvent,currentEventIndex:this.index,matchState,status,
      summary:stats?`${this.loop?`Pass ${this.pass} • `:''}Correct ${stats.correct} • Wrong ${stats.wrong} • Remaining ${stats.pending}`:'No targets loaded',
      results:stats,lastPassResults:this.lastPassResults,pass:this.pass,sessionStarted:this.active||this.phase==='complete',sessionCompleted:this.phase==='complete'});
  }
  toggle(tick=this.position) {
    if(!this.events.length) return false;
    if(!this.active) {this.start(tick);return true;}
    if(this.phase==='paused') {
      this.manualPaused=false;
      this.phase=this.pausedFrom==='seeking' ? (this.desiredTick===null?'waiting':'seeking') : this.pausedFrom;
      this.publish();return true;
    }
    this.manualPaused=true;this.pausedFrom=this.phase;this.phase='paused';this.transport.pause();this.publish();return true;
  }
  start(tick=0) {
    this.transport.acquire();this.active=true;this.manualPaused=false;this.position=tick;
    this.session=new WaitSession(this.events,{hex:this.hex});this.pass=1;this.lastPassResults=null;
    this.index=this.events.findIndex(e=>e.startTick>=tick-1);
    if(this.index<0) {this.index=0;this.position=0;tick=0;}
    this.session.skipBefore(this.index);
    this.gate(this.index);
  }
  gate(index) {
    this.index=index;this.phase='seeking';this.desiredTick=this.events[index].startTick;
    this.publish();this.transport.hold(this.desiredTick);
  }
  noteOn(note) {
    // Target identity is ready before the asynchronous native cursor seek.
    // Accept attacks during positioning; never depend on playback/duration.
    if(!this.active || !['waiting','seeking'].includes(this.phase) || note.type!=='note-on')return null;
    const result=this.session.noteOn(this.index,note);
    this.publish();
    if(result?.complete) {
      const next=this.index+1;
      if(next<this.events.length)this.gate(next);else this.complete();
    }
    return result;
  }
  positionChanged({currentTick,isSeek=false}) {
    if(!this.active)return;
    // Native finish rewinds to the old range start. Ignore it while awaiting our seek.
    if(this.desiredTick!==null && this.desiredTick!==undefined) {
      if(isSeek && Math.abs(currentTick-this.desiredTick)<=2) {
        this.position=this.desiredTick;this.desiredTick=null;
        this.phase=this.manualPaused?'paused':'waiting';this.pausedFrom='waiting';this.publish();
      }
      return;
    }
    if(isSeek && Math.abs(currentTick-this.position)>2) this.restartAt(currentTick);
  }
  restartAt(tick) {
    const paused=this.manualPaused;
    this.transport.pause();this.active=false;this.start(tick);
    if(paused) {this.manualPaused=true;this.pausedFrom=this.phase;this.phase='paused';this.transport.pause();this.publish();}
  }
  complete() {
    if(this.loop && this.events.length) {
      this.lastPassResults=this.session.stats();this.pass++;
      this.session=new WaitSession(this.events,{hex:this.hex});
      this.gate(0);return;
    }
    this.active=false;this.phase='complete';this.position=this.endTick;this.desiredTick=null;
    this.publish();this.transport.finish(this.endTick);
  }
  stop() {
    const wasActive=this.active||this.phase==='complete';
    this.active=false;this.phase='idle';this.index=-1;this.manualPaused=false;this.desiredTick=null;
    this.pass=1;this.lastPassResults=null;
    this.session=new WaitSession(this.events,{hex:this.hex});
    if(wasActive)this.transport.release();this.publish();
  }
}
