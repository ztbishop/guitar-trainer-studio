// Test-only native GPIF access, following the saved mixed-tap loss probe.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict');
const bundle=path.join(__dirname,'../assets/vendor/alphatab/alphaTab.js');

function tapProbe(file=bundle){
  const code=fs.readFileSync(file,'utf8'),end=code.lastIndexOf('});');
  assert(end>0);
  // Use the receiver realm's Map constructor for the structured-clone test.
  const context=vm.createContext({console,process,TextEncoder,TextDecoder,Map});
  vm.runInContext(code.slice(0,end)+'exports.__tapProbe={GpxFileSystem,ByteBuffer,ZipReader,ZipWriter,ZipEntry,GpifWriter,NoteCloner,BeatCloner,XmlDocument,JsonConverter};'+code.slice(end),context);
  const at=context.alphaTab,p=at.__tapProbe;
  const xml=bytes=>{
    const input=p.ByteBuffer.fromBuffer(new Uint8Array(bytes));
    const entries=Buffer.from(bytes).subarray(0,2).toString()==='PK'
      ? new p.ZipReader(input,16*1024*1024).read() : (()=>{const gpx=new p.GpxFileSystem();gpx.load(input);return gpx.files;})();
    const entry=entries.find(e=>e.fileName.split('/').at(-1)==='score.gpif');assert(entry);
    return Buffer.from(entry.data).toString('utf8');
  };
  const pack=gpif=>{
    const out=p.ByteBuffer.empty(),zip=new p.ZipWriter(out);
    zip.writeEntry(new p.ZipEntry('VERSION',new TextEncoder().encode('7.0')));
    zip.writeEntry(new p.ZipEntry('Content/score.gpif',new TextEncoder().encode(gpif)));zip.end();
    return Buffer.from(out.toArray());
  };
  return {at,p,xml,pack,read:bytes=>at.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes),new at.Settings()),
    write:score=>new p.GpifWriter().writeXml(score),gp:score=>new at.exporter.Gp7Exporter().export(score,new at.Settings())};
}

// Independent of the score importer: follow GPIF refs to each written note.
function rawMarks(probe,xml){
  const doc=new probe.p.XmlDocument();doc.parse(xml);
  const root=doc.findChildElement('GPIF'),child=(node,name)=>node?.findChildElement(name);
  const ids=(node,name)=>(child(node,name)?.innerText||'').trim().split(/\s+/).filter(Boolean);
  const table=name=>new Map(Array.from(child(root,name+'s').childElements(),e=>[e.getAttribute('id'),e]));
  const [bars,voices,beats,notes]=['Bar','Voice','Beat','Note'].map(table);
  const marks=[];
  for(const [bi,b] of Array.from(child(root,'MasterBars').childElements()).entries()){
    ids(b,'Bars').forEach((bar,si)=>ids(bars.get(bar),'Voices').forEach((voice,vi)=>
      ids(voices.get(voice),'Beats').forEach((beat,ei)=>ids(beats.get(beat),'Notes').forEach((id,ni)=>{
        const props=new Map(Array.from(child(notes.get(id),'Properties')?.childElements()||[],p=>[p.getAttribute('name'),p]));
        if(props.has('Tapped') || props.has('LeftHandTapped'))marks.push([bi,si,vi,ei,ni,props.has('Tapped'),props.has('LeftHandTapped')]);
      }))));
  }
  return marks;
}

function writtenNotes(score){
  const staves=score.tracks.flatMap(t=>Array.from(t.staves)),result=[];
  for(let b=0;b<score.masterBars.length;b++)staves.forEach((s,si)=>s.bars[b]?.voices.forEach((v,vi)=>v.beats.forEach((e,ei)=>e.notes.forEach((n,ni)=>result.push({key:[b,si,vi,ei,ni],n})))));
  return result;
}
function modelMarks(score){return writtenNotes(score).flatMap(({key,n})=>n.isRightHandTapped||n.isLeftHandTapped ? [[...key,Boolean(n.isRightHandTapped),n.isLeftHandTapped]] : []);}

function performance(at,score){
  const midi=new at.midi.MidiFile(),gen=new at.midi.MidiFileGenerator(score,new at.Settings(),new at.midi.AlphaSynthMidiFileHandler(midi));gen.generate();
  return JSON.parse(JSON.stringify({order:Array.from(gen.tickLookup.masterBars,b=>[b.masterBar.index+1,b.start,b.end]),
    events:Array.from(midi.tracks,t=>t.events)}));
}
function connections(score){
  const rows=writtenNotes(score),ids=new Map(rows.map(({key,n})=>[n,key]));
  return JSON.parse(JSON.stringify(rows.map(({key,n})=>[key,n.realValue,n.string,n.fret,n.beat.playbackStart,n.beat.playbackDuration,n.dynamics,
    n.isTieOrigin,n.isTieDestination,n.isHammerPullOrigin,n.isHammerPullDestination,n.slideInType,n.slideOutType,
    ...['tieOrigin','tieDestination','hammerPullOrigin','hammerPullDestination','slideOrigin','slideTarget','effectSlurOrigin','effectSlurDestination','slurOrigin','slurDestination'].map(k=>ids.get(n[k])??null)])));
}

// Same layout as Lesson Bridge's synthetic loss witnesses: chord at the last
// beat before an inner barline, independent partner attack, and a two-bar repeat.
function witness(probe,{kind='plain',scope='mixed',boundary='safe',dual=false,unison=false,source=null}={}){
  const at=probe.at,settings=new at.Settings(),parser=new at.importer.AlphaTexImporter();
  const chord=unison?'(0.1 5.2)':scope==='pair'?'(0.1 3.2 2.3)':'(3.1 0.2)';
  const bar=chord+'.4 '+chord+' '+chord+' '+chord;
  const start=boundary==='entry'?1:0,end=boundary==='exit'?0:1;
  parser.initFromString(String.raw`\title "Right-hand tap witness" \tempo 120 . `+
    Array.from({length:3},(_,i)=>(i===start?'\\ro ':'')+(i===end?'\\rc 2 ':'')+bar).join(' | '),settings);
  const score=parser.readScore(),bars=score.tracks[0].staves[0].bars;
  const beat=bars[0].voices[0].beats[3],after=bars[1].voices[0].beats[0];
  if(scope==='single')beat.notes.splice(1);
  const origin=beat.notes[0],dest=after.notes[0];
  if(source){
    // Use the saved witness's actual positions/technique masks without running
    // its converter. Its string index is zero-based from the high string.
    for(const [bi,b] of source.bars.entries())for(const [ei,e] of b.tracks[0].voices[0].entries())for(const [ni,n] of e.notes.entries()){
      const target=bars[bi].voices[0].beats[ei].notes[ni];target.string=6-n.string;target.fret=n.fret;
      target.isLeftHandTapped=Boolean(n.lefttap);
    }
  }
  if(kind==='tie'){origin.tieDestination=dest;dest.tieOrigin=origin;dest.isTieDestination=true;}
  if(kind==='hammer'||kind==='pull'){
    origin.isHammerPullOrigin=true;origin.hammerPullDestination=dest;dest.hammerPullOrigin=origin;dest.fret=kind==='hammer'?5:1;
  }
  if(kind==='shift'||kind==='legato'){origin.slideOutType=at.model.SlideOutType[kind==='shift'?'Shift':'Legato'];dest.fret=5;}
  if(dual){origin.isLeftHandTapped=true;beat.notes[1].isLeftHandTapped=true;}
  if(scope==='legacy')beat.tap=true;
  const plain=probe.write(score);
  const selected=scope==='all'?beat.notes:scope==='pair'?beat.notes.slice(0,2):scope==='none'||scope==='legacy'?[]:source?beat.notes.filter((_,i)=>source.bars[0].tracks[0].voices[0][3].notes[i].tap):[origin];
  const selectedIds=new Set(selected.map(n=>String(n.id)));
  // Inject only the exact selected flags into valid raw GPIF (not via the
  // writer under test), matching the reference loss-control construction.
  const mixed=plain.replace(/<Note id="([^"]+)">[\s\S]*?<\/Note>/g,(node,id)=>selectedIds.has(id)?node.replace('</Properties>','<Property name="Tapped"><Enable/></Property></Properties>'):node);
  return {bytes:probe.pack(mixed),control:probe.pack(plain),xml:mixed,score};
}

function savedInputs(root){
  if(!root)return [];
  const base=path.join(root,'dist','mixed-tap-2026-11-06');
  const inv=JSON.parse(fs.readFileSync(path.join(base,'inventory.json'),'utf8'));
  const evidence=JSON.parse(fs.readFileSync(path.join(base,'original-note-evidence.json'),'utf8'));
  return inv.rows.map(row=>({id:row.id,file:path.join(root,'dist','modern-fingerstyle-2026-11-06',row.nativeScore),
    extracted:path.join(base,`${row.id}-original.gpif`),evidence:evidence.results.find(r=>r.id===row.id).events}));
}

module.exports={tapProbe,rawMarks,modelMarks,writtenNotes,performance,connections,witness,savedInputs};
