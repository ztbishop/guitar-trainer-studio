// Reconcile source XML before native import: notation owns rhythms, ties and
// visibility; tab supplies fingering. No renderer, MIDI or grading calls.
const children=(node,name)=>[...node.children].filter(child=>child.localName===name);
const child=(node,name)=>children(node,name)[0];
const value=(node,name,fallback=0)=>Number(child(node,name)?.textContent ?? fallback);
const tones={C:0,D:2,E:4,F:5,G:7,A:9,B:11};

export function describeMusicXmlPart(part) {
  let divisions=1,transpose=0;
  return children(part,'measure').flatMap((measure,bar)=>{
    let cursor=0,lastStart=0,voice='1';const notes=[];
    for(const node of measure.children) {
      if(node.localName==='attributes') {
        divisions=value(node,'divisions',divisions);
        const trans=child(node,'transpose');
        if(trans)transpose=value(trans,'chromatic')+12*value(trans,'octave-change');
      } else if(node.localName==='backup')cursor-=value(node,'duration')/divisions;
      else if(node.localName==='forward')cursor+=value(node,'duration')/divisions;
      else if(node.localName==='note') {
        if(child(node,'grace'))throw new Error('Pairing cannot safely reconcile grace notes in this score.');
        const chord=Boolean(child(node,'chord')),start=chord?lastStart:cursor;
        voice=child(node,'voice')?.textContent || (chord?voice:'1');
        if(!chord){lastStart=start;cursor+=value(node,'duration')/divisions;}
        const pitch=child(node,'pitch');
        if(pitch)notes.push({node,bar,start,voice,pitch:12*(value(pitch,'octave')+1)+tones[child(pitch,'step')?.textContent]+value(pitch,'alter')+transpose,
          stop:[...node.querySelectorAll('tie, tied')].some(t=>t.getAttribute('type')==='stop'),
          begin:[...node.querySelectorAll('tie, tied')].some(t=>t.getAttribute('type')==='start')});
      }
    }
    return notes;
  });
}

export function rebuildPairedMusicXml(document,pairs) {
  const copy=document.cloneNode(true),parts=children(copy.documentElement,'part');
  // Resolve original indices before any native tracks are removed/reindexed.
  for(const {notation,tab} of pairs) {
    const source=parts[notation.index],target=parts[tab.index];
    const replacement=source.cloneNode(true);replacement.setAttribute('id',target.getAttribute('id'));
    const sourceNotes=describeMusicXmlPart(replacement),tabNotes=describeMusicXmlPart(target);
    if(sourceNotes.length!==tabNotes.length)throw new Error('The paired parts have different note counts.');
    const available=new Map();
    for(const note of tabNotes) {
      const key=`${note.bar}:${note.start}:${note.pitch}`;
      const bucket=available.get(key)||[];bucket.push(note);available.set(key,bucket);
    }
    const held=new Map();let tieNumber=1;
    for(const note of sourceNotes) {
      const bucket=available.get(`${note.bar}:${note.start}:${note.pitch}`);
      if(bucket?.length>1)throw new Error(`Ambiguous same-pitch fingering in measure ${note.bar+1}.`);
      const match=bucket?.shift();
      if(!match)throw new Error(`The parts cannot be safely paired in measure ${note.bar+1}.`);
      const technical=match.node.querySelector('notations > technical');
      if(!technical || !child(technical,'string') || !child(technical,'fret'))throw new Error(`Missing fingering in measure ${note.bar+1}.`);
      const tieKey=`${note.voice}:${note.pitch}`;
      const chain=note.stop?held.get(tieKey):{fingering:technical,number:String(tieNumber++)};
      if(!chain)throw new Error(`Unresolved sustained note in measure ${note.bar+1}.`);
      if(note.begin)held.set(tieKey,chain);else held.delete(tieKey);
      // Pitched instrument references trigger alphaTab's percussion articulation
      // path. The part header still supplies the guitar playback instrument.
      for(const instrument of children(note.node,'instrument'))instrument.remove();
      let notations=child(note.node,'notations');
      if(!notations){notations=copy.createElement('notations');note.node.append(notations);}
      for(const existing of children(notations,'technical'))existing.remove();
      notations.append(chain.fingering.cloneNode(true));
      // Explicit tie IDs avoid the native importer's pitch lookup comparing an
      // already transposed origin with a not-yet-transposed destination.
      for(const tied of children(notations,'tied'))tied.remove();
      for(const type of [...(note.stop?['stop']:[]),...(note.begin?['start']:[])]){
        const tied=copy.createElement('tied');tied.setAttribute('type',type);tied.setAttribute('number',chain.number);notations.append(tied);
      }
    }
    // Retain the tab's tuning and clef; all musical timing/visibility stays with
    // the notation source, including separate voices in the ending measures.
    for(const attributes of replacement.querySelectorAll('attributes')) {
      for(const details of children(attributes,'staff-details'))details.remove();
      for(const clef of children(attributes,'clef'))clef.remove();
    }
    const firstAttributes=replacement.querySelector('measure > attributes');
    const tabAttributes=target.querySelector('measure > attributes');
    if(!firstAttributes || !tabAttributes)throw new Error('Missing guitar staff attributes.');
    for(const node of tabAttributes.children)if(['clef','staff-details'].includes(node.localName))firstAttributes.append(node.cloneNode(true));
    target.replaceWith(replacement);
  }
  return copy;
}
