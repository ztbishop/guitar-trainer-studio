// Tiny synthetic seekable VP8 fixture; no provider recording or musical content.
const element=(id,body)=>{const data=Buffer.from(body);let n=1;while(data.length>=2**(7*n)-1)n++;const size=Buffer.alloc(n);let x=BigInt(data.length)|(1n<<BigInt(7*n));for(let i=n-1;i>=0;i--){size[i]=Number(x&255n);x>>=8n;}return Buffer.concat([Buffer.from(id,'hex'),size,data]);};
const uint=(id,n)=>{const a=[];do{a.unshift(n&255);n=Math.floor(n/256);}while(n);return element(id,a);},str=(id,s)=>element(id,Buffer.from(s)),join=(id,a)=>element(id,Buffer.concat(a));
module.exports=async function video(page,seconds){
 const chunks=await page.evaluate(async seconds=>{const out=[],canvas=new OffscreenCanvas(32,32),ctx=canvas.getContext('2d'),encoder=new VideoEncoder({output:c=>{const b=new Uint8Array(c.byteLength);c.copyTo(b);out.push({time:c.timestamp,bytes:[...b]});},error:e=>{throw e;}});encoder.configure({codec:'vp8',width:32,height:32,bitrate:10000,framerate:1});for(let i=0;i<seconds;i++){ctx.fillStyle=i%2?'#5c8ea8':'#34505f';ctx.fillRect(0,0,32,32);const f=new VideoFrame(canvas,{timestamp:i*1000000,duration:1000000});encoder.encode(f,{keyFrame:true});f.close();if(i%20===0)await encoder.flush();}await encoder.flush();encoder.close();return out;},seconds);
 const duration=Buffer.alloc(8);duration.writeDoubleBE(seconds*1000);
 const header=join('1a45dfa3',[uint('4286',1),uint('42f7',1),uint('42f2',4),uint('42f3',8),str('4282','webm'),uint('4287',4),uint('4285',2)]);
 const info=join('1549a966',[uint('2ad7b1',1000000),element('4489',duration),str('4d80','Trainer fixture'),str('5741','Trainer fixture')]);
 const tracks=join('1654ae6b',[join('ae',[uint('d7',1),uint('73c5',1),uint('83',1),str('86','V_VP8'),uint('23e383',1000000000),join('e0',[uint('b0',32),uint('ba',32)])])]);
 const clusters=chunks.map(c=>join('1f43b675',[uint('e7',c.time/1000),element('a3',Buffer.concat([Buffer.from([0x81,0,0,0x80]),Buffer.from(c.bytes)]))]));
 return Buffer.concat([header,join('18538067',[info,tracks,...clusters])]);
};
