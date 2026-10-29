// SPDX-License-Identifier: AGPL-3.0-or-later
// On-demand send owner. No browsing listeners, persisted lesson data or retries.
import {sendJob} from './send-job.js';
let sending=false;
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(sender.id!==chrome.runtime.id || sender.url!==chrome.runtime.getURL('popup.html'))return false;
  if(message?.type==='send-status') {
    chrome.storage.session.get('sendStatus').then(({sendStatus})=>reply(
      sendStatus?.pending && !sending?{ok:false,message:'The previous send was interrupted. Scan and send again.'}:sendStatus || null
    )).catch(()=>reply(null));return true;
  }
  if(message?.type!=='send-lesson')return false;
  if(sending){reply({ok:false,message:'A lesson is already being sent. Approve or decline its access request first.'});return false;}
  sending=true;
  // Start before storage awaits so permission request retains user activation.
  const operation=sendJob(message.job);
  const pending=chrome.storage.session.set({sendStatus:{pending:true,message:'Sending lesson. Complete the site-access prompt if shown.'}}).catch(()=>{});
  operation.catch(error=>({ok:false,message:error.name==='TypeError' || error.name==='TimeoutError'?
    'A resource could not be retrieved. Sign in, rescan and check the app address.':error.message || 'The send failed. Scan and try again.'}))
    .then(async result=>{
      await pending;
      // Only a status survives popup closure; resource URLs/bytes stay in memory.
      const savedMessage=/https?:\/\/|chrome-extension:\/\//i.test(result.message)?
        'The send failed. Check site access and the app address, then scan and try again.':result.message;
      await chrome.storage.session.set({sendStatus:{...result,message:savedMessage,pending:false}}).catch(()=>{});
      sending=false;
      try{reply(result);}catch{/* Popup closed; delivery does not depend on reply. */}
    });
  return true;
});
