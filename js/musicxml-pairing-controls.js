// Explicit import choice; Escape and the initially focused button keep parts separate.
let cancelPending=null;
export function cancelNotationTabChoice(){cancelPending?.();}
export function chooseNotationTabPair(pair) {
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');
    dialog.setAttribute('aria-label','Combine notation and tab?');
    dialog.style.cssText='max-width:32rem;padding:1.5rem;border-radius:12px;';
    const title=document.createElement('h2');title.textContent='Combine notation and tab?';
    const text=document.createElement('p');text.textContent=`Two grouped “${pair.tab.name}” parts appear to describe the same performance. Combine them into one practice track, using the notation part’s rhythms, visible notes, ties and chord symbols with fingering from the tab? Sustained notes keep their original tied fingering.`;
    const details=document.createElement('p');details.textContent=pair.differences.length ? `The initial import differs in measures ${pair.differences.join(', ')}. Combining checks the original XML to reconcile these differences safely; otherwise the parts stay separate.` : 'Combining checks the original XML before reconciling the parts.';
    const note=document.createElement('p');note.textContent='Your original file stays unchanged. You will be asked again each time you open this XML.';
    const keep=document.createElement('button');keep.textContent='Keep separate';keep.autofocus=true;
    const combine=document.createElement('button');combine.textContent='Combine parts';combine.style.marginLeft='1rem';
    const finish=value=>{cancelPending=null;dialog.close();dialog.remove();resolve(value);};
    cancelPending=()=>finish(false);
    keep.onclick=()=>finish(false);combine.onclick=()=>finish(true);
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});
    dialog.append(title,text,details,note,keep,combine);document.body.append(dialog);dialog.showModal();keep.focus();
  });
}
