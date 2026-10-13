// Exercises the actual bootstrap/DOM wiring in a separate frame, not a mock host.
const preview=document.getElementById('preview'),output=document.getElementById('ui-results');
async function until(check) {const deadline=performance.now()+12000;while(!check()){if(performance.now()>deadline)throw new Error('UI action timed out.');await new Promise(resolve=>setTimeout(resolve,25));}}
document.getElementById('ui-run').addEventListener('click',async()=>{
  const button=document.getElementById('ui-run');button.disabled=true;output.textContent='Running…';
  const lines=[],previous=localStorage.getItem('gts.mediaLayout');
  const check=(condition,label)=>{if(!condition)throw new Error(label);lines.push('PASS '+label);output.textContent=lines.join('\n');};
  try {
    await until(()=>preview.contentDocument?.readyState==='complete' && preview.contentDocument.getElementById('media-status'));
    const doc=preview.contentDocument,view=preview.contentWindow,get=id=>doc.getElementById(id);
    await until(()=>get('score-file-input') && get('media-status'));
    const choose=async(input,path,name)=>{const response=await fetch(path);if(!response.ok)throw new Error('Generate media fixtures first.');const transfer=new view.DataTransfer();transfer.items.add(new view.File([await response.arrayBuffer()],name,{lastModified:1}));input.files=transfer.files;input.dispatchEvent(new view.Event('change',{bubbles:true}));};
    await choose(get('score-file-input'),'./.media-fixtures/media-demo.musicxml','media-demo.musicxml');
    await until(()=>!get('play-pause-button').disabled && get('media-measure').options.length===4);
    check(true,'Normal score picker builds practice and media measure options');
    await choose(get('media-file'),'./.media-fixtures/media-demo.wav','UI-fixture.wav');await until(()=>!get('media-listen').disabled);
    check(get('media-point-list').children.length===2,'Local audio loads with start/end alignment');
    get('media-show-editor').checked=true;get('media-show-editor').dispatchEvent(new view.Event('change'));
    get('media-measure').value='1';get('media-point-time').value='2';get('media-add-point').click();
    await until(()=>!get('media-undo').disabled);check(get('media-point-list').children.length===3,'Add point reaches the injected native-sync intent');
    get('media-undo').click();await until(()=>get('media-point-list').children.length===2);check(true,'Undo restores the previous alignment');
    get('media-redo').click();await until(()=>get('media-point-list').children.length===3);check(true,'Redo restores the added point');
    get('media-point-list').children[1].click();get('media-point-time').value='2.2';get('media-update-point').click();
    await until(()=>get('media-point-list').children[1].textContent.includes('0:02.2'));check(true,'Selected point updates from precise timestamp fields');
    get('media-point-list').children[1].click();get('media-remove-point').click();await until(()=>get('media-point-list').children.length===2);check(true,'Remove keeps the two endpoint markers');
    get('media-point-list').children[0].click();get('media-remove-point').click();await until(()=>get('media-status').textContent.includes('at least a start and end'));check(get('media-point-list').children.length===2,'Removing the final endpoint is rejected without changing alignment');
    for(const layout of ['above','below','left','right']) {get('media-layout').value=layout;get('media-layout').dispatchEvent(new view.Event('change'));check(get('media-workspace').dataset.layout===layout,`Placement ${layout} applies to the actual score/media grid`);}
    get('media-listen').click();await until(()=>doc.body.classList.contains('media-preview') && !get('media-listen').disabled);
    check(get('practice-popup').inert && get('toolbar-score-value').textContent==='Listen','Listening is labeled and practice controls stay isolated');
    get('media-practice').click();await until(()=>!doc.body.classList.contains('media-preview') && !get('play-pause-button').disabled && get('media-status').textContent.includes('Practice restored'));
    check(!get('practice-popup').inert && get('toolbar-score-value').textContent==='—','Return re-enables ordinary practice without producing grades');
    get('media-source-kind').value='url';get('media-source-kind').dispatchEvent(new view.Event('change'));get('media-url').value='javascript:alert(1)';get('media-load-link').click();await until(()=>get('media-status').textContent.includes('http(s)'));
    check(get('media-point-list').children.length===2,'Unsupported URL is rejected and current recording remains available');
    output.textContent=lines.join('\n')+`\n${lines.length} UI checks passed.`;
  }catch(error){output.textContent=lines.join('\n')+'\nFAIL '+error.message;}
  finally {if(previous===null)localStorage.removeItem('gts.mediaLayout');else localStorage.setItem('gts.mediaLayout',previous);button.disabled=false;}
});
