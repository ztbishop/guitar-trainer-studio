// Coalesce DOM work only. MIDI/grading callbacks must never be scheduled here.
export function frameTask(render,request=fn=>requestAnimationFrame(fn)) {
  let pending=false;
  return ()=>{
    if(pending)return;
    pending=true;
    request(()=>{pending=false;render();});
  };
}
