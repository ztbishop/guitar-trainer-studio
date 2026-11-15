// Pure written-curve normalization. Native bend/whammy values are half semitones;
// offsets run from 0 to 60 within a beat. No input or correctness decisions here.
const MAX_OFFSET=60;

function readCurve(points) {
  if(points==null || Array.isArray(points) && points.length===0)return {valid:true,points:null};
  if(!Array.isArray(points))return {valid:false};
  const result=[];
  for(const point of points) {
    if(!Number.isFinite(point?.offset) || point.offset<0 || point.offset>MAX_OFFSET ||
        !Number.isFinite(point?.value))return {valid:false};
    const previous=result.at(-1);
    if(previous && (point.offset<previous.offset || point.offset===previous.offset && point.value!==previous.value))return {valid:false};
    if(!previous || point.offset!==previous.offset)result.push({offset:point.offset,value:point.value});
  }
  return {valid:true,points:result};
}

function valueAt(points,offset,held) {
  if(!points)return held;
  if(offset<=points[0].offset)return points[0].value;
  for(let i=1;i<points.length;i++) {
    const left=points[i-1],right=points[i];
    if(offset<=right.offset)return left.value+(right.value-left.value)*(offset-left.offset)/(right.offset-left.offset);
  }
  return points.at(-1).value;
}

// Missing curves on a contiguous tie retain their component's last value. A new
// attack supplies no previous segment, so a written repeat cannot inherit it.
export function writtenBendSegment(midi,bendPoints,whammyPoints,previous=null) {
  const bend=readCurve(bendPoints),whammy=readCurve(whammyPoints);
  if(!Number.isFinite(midi) || !bend.valid || !whammy.valid)return {valid:false};
  const bendHeld=previous?.valid?previous.bendEnd:0,whammyHeld=previous?.valid?previous.whammyEnd:0;
  const written=Boolean(bend.points || whammy.points || previous?.valid && previous.written);
  const state={valid:true,written,bendEnd:valueAt(bend.points,MAX_OFFSET,bendHeld),
    whammyEnd:valueAt(whammy.points,MAX_OFFSET,whammyHeld)};
  if(!written)return state;
  // Sum the simultaneous curves at their joint breakpoints. Adding independent
  // minima/maxima would admit pitches that opposing curves never reach.
  const offsets=new Set([0,MAX_OFFSET,...(bend.points??[]).map(p=>p.offset),...(whammy.points??[]).map(p=>p.offset)]);
  let min=midi,max=midi;
  for(const offset of offsets) {
    const pitch=midi+(valueAt(bend.points,offset,bendHeld)+valueAt(whammy.points,offset,whammyHeld))/2;
    if(!Number.isFinite(pitch))return {valid:false};
    min=Math.min(min,pitch);max=Math.max(max,pitch);
  }
  return {...state,bendRange:{min,max}};
}
