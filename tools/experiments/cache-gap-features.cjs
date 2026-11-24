// Generate only the chroma needed for interior gaps, one cached MP4 at a time.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const base = path.resolve(process.argv[2] || 'tests/.media-fixtures/bridge-baseline');
const dest = path.resolve(process.argv[3] || 'tests/.media-fixtures/gap-benchmark');
const sparse = process.argv.includes('--sparse');

async function extract({duration,register}) {
  const {recordingFeatures,SAMPLE_RATE} = await import('/js/audio-sync-match.js');
  const bytes = await (await fetch('/recording')).arrayBuffer();
  const audio = await new OfflineAudioContext(1,1,SAMPLE_RATE).decodeAudioData(bytes);
  if (Math.abs(audio.duration-duration)>0.35) throw Error('Decoded duration differs from baseline');
  let strongest, highest=-1;
  for (let i=0;i<audio.numberOfChannels;i++) {
    const channel=audio.getChannelData(i);
    let energy=0;
    for (let t=0;t<channel.length;t+=97) energy+=channel[t]**2;
    if (energy>highest) {highest=energy;strongest=channel;}
  }
  const features=recordingFeatures(strongest.subarray(0,Math.floor(duration*SAMPLE_RATE)),...register);
  const data=new Uint8Array(features.buffer);
  let text='';
  for(let i=0;i<data.length;i+=16384) text+=String.fromCharCode(...data.subarray(i,i+16384));
  return btoa(text);
}

async function main() {
  fs.mkdirSync(dest,{recursive:true});
  let media;
  const server=http.createServer((req,res)=>{
    const files={'/recording':[media,'video/mp4'],'/js/audio-sync-match.js':[path.resolve('js/audio-sync-match.js'),'text/javascript']};
    if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<title>Gap benchmark</title>');return;}
    const entry=files[req.url];
    if(!entry?.[0]){res.writeHead(404);res.end();return;}
    res.writeHead(200,{'Content-Type':entry[1],'Content-Length':fs.statSync(entry[0]).size,'Cache-Control':'no-store'});
    fs.createReadStream(entry[0]).on('error',error=>res.destroy(error)).pipe(res);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser=await chromium.launch({channel:process.env.GTS_BROWSER_CHANNEL||'chrome',headless:true});
    for(const file of fs.readdirSync(base).filter(f=>f.endsWith('.ready.json'))){
      const key=file.split('.')[0];
      const {choices,duration,matches,queries}=JSON.parse(fs.readFileSync(path.join(base,key+'-updated.json')));
      const first=choices.findIndex(c=>c>=0),last=choices.findLastIndex(c=>c>=0);
      if(sparse ? matches.some(row=>row.length) : first<0||!choices.slice(first,last).includes(-1))continue;
      const ranges=queries.bars.map(b=>b.register).filter(r=>Number.isFinite(r?.low));
      const band=[Math.min(...ranges.map(r=>r.low))-3,Math.max(...ranges.map(r=>r.high))+3];
      // Use the Fill 1 register (44–67 MIDI) for the swapped-score challenge.
      const jobs=(sparse ? [['-sparse',band],['-fill1',[44,67]]] : [['',[]]])
        .map(([suffix,register])=>({output:path.join(dest,key+suffix+'.f32'),register}))
        .filter(job=>!fs.existsSync(job.output));
      if(!jobs.length)continue;
      media=JSON.parse(fs.readFileSync(path.join(base,file))).media;
      const page=await browser.newPage();
      try {
        await page.goto('http://127.0.0.1:'+server.address().port);
        for(const {register,output} of jobs){
          const encoded=await page.evaluate(extract,{duration,register});
          fs.writeFileSync(output,Buffer.from(encoded,'base64'));
        }
      }finally{await page.close();}
    }
  }finally{await browser?.close();server.closeAllConnections();server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
