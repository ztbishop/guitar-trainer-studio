import {createHash} from 'node:crypto';

// Original synthetic bytes; receiver tests inject the native score loader.
export function explanationLesson({local=false,repeatCorrection=false}={}) {
  const score='original synthetic lesson score';
  const ref=(visit)=>({visit,scoreMeasure:visit,occurrence:1,originalVisit:visit});
  const visit=(index,startSeconds,endSeconds)=>({...ref(index),startSeconds,endSeconds,
    anchors:[{offset480:0,seconds:startSeconds},{offset480:480,seconds:endSeconds}]});
  return {format:'gts-lesson',version:4,title:'Synthetic explanation lesson',lessonUrl:'https://example.com/lessons/explanation',
    score:{fileName:'original.gpx',base64:btoa(score)},
    recording:local?{kind:'local-choice',id:'synthetic-recording'}:{url:'https://example.com/lesson.mp4',label:'Matching lesson recording',id:'synthetic-recording'},
    timingPlan:{format:'musical-visits-and-explanations',version:1,
      scoreSha256:createHash('sha256').update(score).digest('hex'),sourceSha256:'a'.repeat(64),timingSha256:'b'.repeat(64),
      recordingId:'synthetic-recording',originalPlaybackOrder:repeatCorrection?[1,2,1,2]:[1,2],
      musicalVisits:[visit(1,0,2),visit(2,5,7)],
      explanations:[{id:'explanation-1',label:'Discuss the phrase',startSeconds:2,endSeconds:5,boundary:{after:ref(1),before:ref(2)}}],
      repeatResolution:{kind:repeatCorrection?'source-visit-plan':'unchanged',omittedOriginalVisits:repeatCorrection?[3,4]:[]}}};
}
