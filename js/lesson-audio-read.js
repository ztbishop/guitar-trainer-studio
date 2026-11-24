// Only used after the direct recording request fails. An untimed lesson
// sender can supply the same recording to the analyzer for this document.
export function readLessonRecording(url,signal,limit) {
  signal.throwIfAborted();
  return new Promise((resolve,reject)=>{
    const {port1,port2}=new MessageChannel(), chunks=[];
    let size=0, expected=0, timer;
    function finish(error) {
      clearTimeout(timer);
      signal.removeEventListener('abort',cancel);
      port1.postMessage('close');
      port1.close();
      if(error)reject(error);
      else resolve(new Blob(chunks).arrayBuffer());
    }
    function cancel(){finish(signal.reason);}
    function timeout(ms,message){clearTimeout(timer);timer=setTimeout(()=>finish(Error(message)),ms);}
    signal.addEventListener('abort',cancel,{once:true});
    timeout(1200,'The recording link did not provide audio access. You can still place sync points manually, or load a readable recording for Auto-sync.');
    port1.onmessage=({data})=>{
      timeout(60000,'The online audio transfer timed out. Run Auto-sync again.');
      if(data?.type==='ready' && !expected && Number.isSafeInteger(data.size) && data.size>0 && data.size<=limit){
        expected=data.size;port1.postMessage('next');
      }else if(data?.type==='opening' && !expected){
        // The sender is reading the selected recording.
      }else if(data instanceof ArrayBuffer && expected && data.byteLength && size+data.byteLength<=expected){
        size+=data.byteLength;chunks.push(data);port1.postMessage('next');
      }else if(data?.type==='end' && size && size===expected)finish();
      else finish(Error('Could not receive the selected online recording. Check site access in the lesson sender and send again.'));
    };
    window.postMessage({type:'gts-read-selected-audio-v1',url},location.origin,[port2]);
  });
}
