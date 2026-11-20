import {createHash} from 'node:crypto';

// Unit receivers use synthetic original bytes; native browser checks supply GP.
export function intervalLesson({local=false,scoreBytes=Buffer.from('original synthetic interval score')}={}) {
  const bytes=Buffer.from(scoreBytes),refs=[2,4,5,6].map((originalVisit,index)=>({visit:index+1,scoreMeasure:originalVisit,occurrence:1,originalVisit}));
  const music=(index,startSeconds,endSeconds)=>({...refs[index],startSeconds,endSeconds,
    anchors:[{offset480:0,seconds:startSeconds},{offset480:480,seconds:endSeconds}]});
  const interval=(id,kind,label,startSeconds,endSeconds,after,before)=>({id,kind,label,startSeconds,endSeconds,
    boundary:{after:after===null?null:refs[after],before:before===null?null:refs[before]}});
  return {format:'gts-lesson',version:4,title:'Synthetic matched intervals',lessonUrl:'https://example.com/lessons/intervals',
    score:{fileName:'interval-original.gp',base64:bytes.toString('base64')},
    recording:local?{kind:'local-choice',id:'interval-recording'}:{url:'https://example.com/interval.wav',label:'Matched recording',id:'interval-recording'},
    timingPlan:{format:'musical-visits-and-intervals',version:1,
      scoreSha256:createHash('sha256').update(bytes).digest('hex'),sourceSha256:'a'.repeat(64),timingSha256:'b'.repeat(64),recordingId:'interval-recording',
      originalPlaybackOrder:[1,2,3,4,5,6,7],musicalVisits:[music(0,1,3),music(1,6,8),music(2,8,10),music(3,11,13)],
      intervals:[interval('leading-blank','unmatched-source-rest','Opening blank',0,1,null,0),
        interval('interior-blank','unmatched-source-rest','First blank',3,4,0,1),
        interval('first-explanation','explanation','Discuss the phrase',4,5,0,1),
        interval('consecutive-blank','unmatched-source-rest','Second blank',5,6,0,1),
        interval('last-explanation','explanation','Prepare the ending',10,11,2,3),
        interval('trailing-blank','unmatched-source-rest','Closing blank',13,14,3,null)],
      repeatResolution:{kind:'unchanged',omittedOriginalVisits:[]},
      scoreOmissions:[1,3,7].map(originalVisit=>({originalVisit,scoreMeasure:originalVisit,occurrence:1,reason:'unmatched-full-rest'}))}};
}
