// Original score bytes and folder metadata only; no renderer/trainer dependency.
export const LIBRARY_FORMAT='guitar-trainer-library';
import {validateProfile,validateSource,sourceMatches} from './media-sync.js';
export const SCORE_EXTENSIONS=/\.(gp|gp3|gp4|gp5|gpx|xml|musicxml|mxl|mid|midi)$/i;
const id=()=>crypto.randomUUID();
const name=value=>String(value || '').trim().slice(0,240);

export async function fingerprint(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
// Hash every byte in fixed-size blocks so a long video never needs to fit in RAM.
export async function recordingContentId(file) {
  const blockSize=4*1024*1024;
  const digests=new Uint8Array(32*Math.ceil(file.size/blockSize));
  for(let start=0;start<file.size;start+=blockSize){
    const bytes=await file.slice(start,start+blockSize).arrayBuffer();
    digests.set(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),32*(start/blockSize));
  }
  return fingerprint(digests);
}
export function encodeBytes(bytes) {
  let text='';for(let offset=0;offset<bytes.length;offset+=8192)text+=String.fromCharCode(...bytes.subarray(offset,offset+8192));
  return btoa(text);
}
export function decodeBytes(text) {
  if(typeof text!=='string' || !text.length || text.length%4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text))throw new Error('Invalid score data in backup.');
  return Uint8Array.from(atob(text),char=>char.charCodeAt(0));
}

export async function validateBackup(data) {
  if(data?.format!==LIBRARY_FORMAT || ![1,2,3,4].includes(data.version) || !Array.isArray(data.folders) || !Array.isArray(data.scores))throw new Error('Choose a supported Guitar Trainer library backup.');
  if(data.version>=2 && !Array.isArray(data.mediaProfiles))throw new Error('The backup is missing media sync profiles.');
  if(data.version<3 && data.mediaProfiles?.some(p=>Object.hasOwn(p??{},'timingPlan')))throw new Error('Explanation profiles need a version-3 library backup.');
  const mediaProfiles=(data.mediaProfiles || []).map(validateProfile);
  if(new Set(mediaProfiles.map(profile=>profile.id)).size!==mediaProfiles.length)throw new Error('Duplicate sync profile IDs.');
  const folderIds=new Set(),scoreIds=new Set();
  const folders=data.folders.map(folder=>{
    if(!folder || typeof folder.id!=='string' || !folder.id || folderIds.has(folder.id) || !name(folder.name))throw new Error('Invalid or duplicate backup folder.');
    folderIds.add(folder.id);return {id:folder.id,name:name(folder.name)};
  });
  const pdfs=new Map();
  if(data.version===4){
    if(!Array.isArray(data.pdfs))throw new Error('Missing PDF attachments.');
    for(const item of data.pdfs){
      const bytes=decodeBytes(item.data);
      if(await fingerprint(bytes)!==item.hash || pdfs.has(item.hash))throw new Error('Invalid PDF attachment fingerprint.');
      pdfs.set(item.hash,new Blob([bytes],{type:'application/pdf'}));
    }
  }
  const scores=[];
  for(const score of data.scores) {
    if(!score || typeof score.id!=='string' || !score.id || scoreIds.has(score.id) || !name(score.title) || !SCORE_EXTENSIONS.test(score.fileName || '') ||
      (score.folderId!=null && !folderIds.has(score.folderId)))throw new Error('Invalid score metadata in backup.');
    scoreIds.add(score.id);
    const bytes=decodeBytes(score.data);
    const saved={id:score.id,title:name(score.title),fileName:String(score.fileName),folderId:score.folderId || null,bytes,hash:await fingerprint(bytes)};
    if(data.version===4 && score.pdf){
      const {hash,fileName,boxes}=score.pdf;
      if(!pdfs.has(hash) || !name(fileName) || !boxes || typeof boxes!=='object' || Array.isArray(boxes))throw new Error('Invalid score PDF attachment.');
      for(const [number,b] of Object.entries(boxes)){
        if(!/^[1-9]\d*$/.test(number) || !b || !Number.isSafeInteger(b.page) || b.page<1 ||
          ![b.x,b.y,b.w,b.h].every(Number.isFinite) || b.x<0 || b.y<0 || b.w<=0 || b.h<=0 ||
          b.x+b.w>1.000001 || b.y+b.h>1.000001)throw new Error('Invalid PDF measure box.');
      }
      saved.pdf={hash,fileName,boxes};
      if(score.pdf.mapping!==undefined){
        const mapping=score.pdf.mapping;
        if(!Array.isArray(mapping) || !mapping.length || !mapping.every(n=>n===null || Number.isSafeInteger(n) && n>0))throw new Error('Invalid PDF repeat mapping.');
        saved.pdf.mapping=mapping;
      }
    }
    if(data.version===4 && score.recording){
      saved.recording=validateSource(score.recording);
      const selected=mediaProfiles.find(p=>p.id===score.recordingProfileId && p.scoreHash===saved.hash && sourceMatches(p.source,saved.recording));
      if(selected)saved.recordingProfileId=selected.id;
    }
    scores.push(saved);
  }
  return {folders,scores,mediaProfiles,pdfs};
}

export class LibraryStore {
  constructor(factory=globalThis.indexedDB){this.factory=factory;this.dbPromise=null;}
  async open() {
    if(!this.factory)throw new Error('This browser cannot store a score library. Open File still works.');
    if(!this.dbPromise)this.dbPromise=new Promise((resolve,reject)=>{
      const request=this.factory.open('guitarTrainerLibrary',4);
      request.onupgradeneeded=()=>{
        for(const store of ['folders','scores','mediaProfiles','pdfs','recordingFiles'])if(!request.result.objectStoreNames.contains(store))request.result.createObjectStore(store,{keyPath:'id'});
        const scores=request.transaction.objectStore('scores');
        if(!scores.indexNames.contains('pdfHash'))scores.createIndex('pdfHash','pdf.hash');
        if(!scores.indexNames.contains('scoreHash'))scores.createIndex('scoreHash','hash');
      };
      request.onerror=()=>{this.dbPromise=null;reject(request.error || new Error('Could not open the score library.'));};
      request.onblocked=()=>{this.dbPromise=null;reject(new Error('Close other Guitar Trainer tabs and retry.'));};
      request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();this.dbPromise=null;};resolve(db);};
    });
    return this.dbPromise;
  }
  async transaction(stores,mode,run) {
    const db=await this.open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(stores,mode);let result;
      tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(tx.error || new Error('Could not save library changes. Check browser storage space.'));
      try {run(Object.fromEntries(stores.map(key=>[key,tx.objectStore(key)])),value=>{result=value;});}
      catch(error){tx.abort();reject(error);}
    });
  }
  list() {
    return this.transaction(['folders','scores'],'readonly',(stores,done)=>{
      const result={folders:[],scores:[]};
      for(const key of ['folders','scores'])stores[key].getAll().onsuccess=event=>{result[key]=event.target.result;done(result);};
    });
  }
  listProfiles() {return this.transaction(['mediaProfiles'],'readonly',({mediaProfiles},done)=>{mediaProfiles.getAll().onsuccess=event=>done(event.target.result);});}
  saveProfile(profile) {const checked=validateProfile(profile);return this.transaction(['mediaProfiles'],'readwrite',({mediaProfiles})=>mediaProfiles.put(checked));}
  deleteProfile(profileId) {return this.transaction(['mediaProfiles'],'readwrite',({mediaProfiles})=>mediaProfiles.delete(profileId));}
  async mergeProfiles(profiles) {
    const checked=profiles.map(validateProfile);
    return this.transaction(['mediaProfiles'],'readwrite',({mediaProfiles},done)=>{
      mediaProfiles.getAll().onsuccess=event=>{
        const keys=new Set(event.target.result.map(profile=>profileSignature(profile)));let added=0;
        for(const profile of checked)if(!keys.has(profileSignature(profile))) {mediaProfiles.put({...profile,id:id()});keys.add(profileSignature(profile));added++;}
        done(added);
      };
    });
  }
  async save({title,fileName,bytes,folderId=null},attachments={}) {
    if(!bytes?.length || !SCORE_EXTENSIONS.test(fileName))throw new Error('Choose a supported, nonempty score file.');
    const hash=await fingerprint(bytes);
    const profiles=(attachments.profiles || []).map(validateProfile);
    if(profiles.some(p=>p.scoreHash!==hash || !sourceMatches(p.source,attachments.recording)))throw new Error('The recording or score changed. Save again.');
    return this.transaction(['scores','folders','pdfs','mediaProfiles','recordingFiles'],'readwrite',(stores,done)=>{
      const write=()=>{
        stores.scores.index('scoreHash').get(hash).onsuccess=event=>{
          const duplicate=event.target.result;
          const score=duplicate || {id:id(),title:name(title)||name(fileName),fileName:String(fileName),bytes:new Uint8Array(bytes),folderId,hash,createdAt:Date.now()};
          const previous=score.pdf?.hash;
          if(attachments.pdf){
            const {hash,file,boxes,mapping}=attachments.pdf;
            stores.pdfs.put({id:hash,blob:file});
            score.pdf={hash,fileName:file.name,boxes};
            if(mapping)score.pdf.mapping=mapping;
          }
          if(attachments.recording){
            for(const p of profiles)stores.mediaProfiles.put(p);
            if(attachments.file)stores.recordingFiles.put({id:score.id,file:attachments.file});
            else stores.recordingFiles.delete(score.id);
            const keepProfile=attachments.unreviewed && sourceMatches(score.recording,attachments.recording);
            score.recording=attachments.recording;
            score.recordingHandle=attachments.handle || null;
            score.recordingProfileId=attachments.profileId || (keepProfile && score.recordingProfileId) || '';
          }
          if(!duplicate || attachments.pdf || attachments.recording)stores.scores.put(score);
          if(previous && previous!==score.pdf.hash)releasePdf(stores,previous);
          done({score,duplicate:Boolean(duplicate)});
        };
      };
      if(folderId)stores.folders.get(folderId).onsuccess=event=>{if(!event.target.result)throwTransactionError(stores.scores,'The destination folder no longer exists.');else write();};
      else write();
    });
  }
  createFolder(value) {
    const trimmed=name(value);if(!trimmed)throw new Error('Enter a folder name.');
    return this.transaction(['folders'],'readwrite',({folders},done)=>{
      folders.getAll().onsuccess=event=>{
        const existing=event.target.result.find(folder=>folder.name.toLowerCase()===trimmed.toLowerCase());
        const folder=existing || {id:id(),name:trimmed};if(!existing)folders.put(folder);done(folder);
      };
    });
  }
  updateScore(scoreId,patch) {
    return this.transaction(['scores','folders'],'readwrite',(stores)=>{
      stores.scores.get(scoreId).onsuccess=event=>{
        const score=event.target.result;if(!score){throwTransactionError(stores.scores);return;}
        const update=()=>{stores.scores.put({...score,title:name(patch.title)||score.title,folderId:patch.folderId ?? null});};
        if(patch.folderId)stores.folders.get(patch.folderId).onsuccess=folder=>{if(folder.target.result)update();else throwTransactionError(stores.scores);};
        else update();
      };
    });
  }
  attachments(scoreId){
    return this.transaction(['scores','pdfs','recordingFiles'],'readonly',({scores,pdfs,recordingFiles},done)=>{
      scores.get(scoreId).onsuccess=event=>{
        const row=event.target.result;
        if(!row)return;
        const result={recording:row.recording,handle:row.recordingHandle,profileId:row.recordingProfileId};
        done(result);
        if(row.recording?.kind==='local' && !row.recordingHandle)
          recordingFiles.get(scoreId).onsuccess=e=>{result.file=e.target.result?.file;};
        if(row.pdf)pdfs.get(row.pdf.hash).onsuccess=e=>{result.pdf={...row.pdf,blob:e.target.result?.blob};};
      };
    });
  }
  updatePdfBoxes(scoreHash,pdfHash,boxes,mapping){
    return this.transaction(['scores'],'readwrite',({scores})=>{
      scores.index('scoreHash').get(scoreHash).onsuccess=event=>{
        const score=event.target.result;
        if(score?.pdf?.hash===pdfHash){
          score.pdf.boxes=boxes;
          if(mapping)score.pdf.mapping=mapping;else delete score.pdf.mapping;
          scores.put(score);
        }
      };
    });
  }
  updateRecordingLink(scoreId,previous,recording,handle,file,profileId){
    return this.transaction(['scores','mediaProfiles','recordingFiles'],'readwrite',({scores,mediaProfiles,recordingFiles})=>{
      scores.get(scoreId).onsuccess=e=>{
        const row=e.target.result;
        if(!row || !sourceMatches(previous,row.recording))return;
        scores.put({...row,recording,recordingHandle:handle,recordingProfileId:profileId});
        if(file && !handle)recordingFiles.put({id:scoreId,file});
        else recordingFiles.delete(scoreId);
        mediaProfiles.getAll().onsuccess=event=>{
          for(const profile of event.target.result)
            if(profile.scoreHash===row.hash && sourceMatches(profile.source,previous))mediaProfiles.put({...profile,source:recording});
        };
      };
    });
  }
  deleteScore(scoreId){return this.deleteScores([scoreId]);}
  deleteScores(ids) {
    return this.transaction(['scores','pdfs','recordingFiles'],'readwrite',stores=>{
      for(const scoreId of new Set(ids))stores.scores.get(scoreId).onsuccess=event=>{
        stores.scores.delete(scoreId);
        stores.recordingFiles.delete(scoreId);
        if(event.target.result?.pdf)releasePdf(stores,event.target.result.pdf.hash);
      };
    });
  }
  moveScores(ids,folderId=null) {
    const selected=new Set(ids);
    return this.transaction(['scores','folders'],'readwrite',({scores,folders})=>{
      const move=()=>{scores.getAll().onsuccess=event=>{
        for(const score of event.target.result)if(selected.has(score.id))scores.put({...score,folderId:folderId||null});
      };};
      if(folderId)folders.get(folderId).onsuccess=event=>{if(event.target.result)move();else throwTransactionError(scores);};
      else move();
    });
  }
  deleteFolders(ids) {
    const selected=new Set(ids);
    return this.transaction(['scores','folders'],'readwrite',({scores,folders})=>{
      scores.getAll().onsuccess=event=>{
        for(const score of event.target.result)if(selected.has(score.folderId))scores.put({...score,folderId:null});
        for(const folderId of selected)folders.delete(folderId);
      };
    });
  }
  deleteFolderAndScores(folderId) {return this.deleteFoldersAndScores([folderId]);}
  deleteFoldersAndScores(ids) {
    const selected=new Set(ids.filter(folderId=>typeof folderId==='string' && folderId && folderId!=='__all__'));
    return this.transaction(['scores','folders','pdfs','recordingFiles'],'readwrite',({scores,folders,pdfs,recordingFiles})=>{
      folders.getAll().onsuccess=event=>{
        const existing=new Set(event.target.result.filter(folder=>selected.has(folder.id)).map(folder=>folder.id));
        scores.getAll().onsuccess=event=>{
          for(const score of event.target.result)if(existing.has(score.folderId)){
            scores.delete(score.id);
            recordingFiles.delete(score.id);
            if(score.pdf)releasePdf({scores,pdfs},score.pdf.hash);
          }
          for(const folderId of existing)folders.delete(folderId);
        };
      };
    });
  }
  renameFolder(folderId,value) {
    if(!name(value))throw new Error('Enter a folder name.');
    return this.transaction(['folders'],'readwrite',({folders})=>{
      folders.get(folderId).onsuccess=event=>{if(event.target.result)folders.put({...event.target.result,name:name(value)});else throwTransactionError(folders);};
    });
  }
  // Removing a folder keeps its scores in Unfiled.
  deleteFolder(folderId) {
    return this.transaction(['scores','folders'],'readwrite',({scores,folders})=>{
      scores.getAll().onsuccess=event=>{for(const score of event.target.result)if(score.folderId===folderId)scores.put({...score,folderId:null});folders.delete(folderId);};
    });
  }
  async backup(folderId=undefined) {
    let {folders,scores}=await this.list();
    let mediaProfiles=await this.listProfiles();
    if(folderId!==undefined) {
      folders=folders.filter(folder=>folder.id===folderId);
      if(!folders.length)throw new Error('The folder no longer exists.');
      scores=scores.filter(score=>score.folderId===folderId);
      const hashes=new Set(scores.map(score=>score.hash));
      mediaProfiles=mediaProfiles.filter(profile=>hashes.has(profile.scoreHash));
    }
    const attachments=scores.some(s=>s.pdf || s.recording);
    const pdfs=[];
    for(const hash of new Set(scores.filter(s=>s.pdf).map(s=>s.pdf.hash))){
      const blob=await this.transaction(['pdfs'],'readonly',({pdfs},done)=>{pdfs.get(hash).onsuccess=e=>done(e.target.result?.blob);});
      if(!blob)throw new Error('A PDF attachment changed during backup. Please retry.');
      pdfs.push({hash,data:encodeBytes(new Uint8Array(await blob.arrayBuffer()))});
    }
    return {format:LIBRARY_FORMAT,version:attachments?4:mediaProfiles.some(p=>p.timingPlan)?3:2,exportedAt:new Date().toISOString(),folders,mediaProfiles,...(attachments?{pdfs}:{}),
      scores:scores.map(({bytes,recordingHandle,...score})=>({...score,data:encodeBytes(bytes)}))};
  }
  async merge(data) {
    // Validate every entry before starting the single atomic write transaction.
    const incoming=await validateBackup(data);
    return this.transaction(['scores','folders','mediaProfiles','pdfs'],'readwrite',(stores,done)=>{
      const folderRequest=stores.folders.getAll(),scoreRequest=stores.scores.getAll(),profileRequest=stores.mediaProfiles.getAll();let folders,scores,profiles;
      const merge=()=>{
        if(!folders || !scores || !profiles)return;
        const folderMap=new Map(),byHash=new Map(scores.map(score=>[score.hash,score]));let added=0,skipped=0;
        for(const folder of incoming.folders) {
          let target=folders.find(item=>item.name.toLowerCase()===folder.name.toLowerCase());
          if(!target){target={id:id(),name:folder.name};folders.push(target);stores.folders.put(target);}
          folderMap.set(folder.id,target.id);
        }
        const profileIds=new Map(),bySignature=new Map(profiles.map(p=>[profileSignature(p),p.id]));
        let profilesAdded=0;
        for(const profile of incoming.mediaProfiles){
          const signature=profileSignature(profile);
          if(!bySignature.has(signature)){
            const newId=id();stores.mediaProfiles.put({...profile,id:newId});
            bySignature.set(signature,newId);profilesAdded++;
          }
          profileIds.set(profile.id,bySignature.get(signature));
        }
        for(const score of incoming.scores) {
          const existing=byHash.get(score.hash);
          const addPdf=score.pdf && !existing?.pdf,addRecording=score.recording && !existing?.recording;
          if(existing && !addPdf && !addRecording){skipped++;continue;}
          const row=existing || {...score,id:id(),folderId:folderMap.get(score.folderId)||null,createdAt:Date.now()};
          if(addPdf){
            stores.pdfs.put({id:score.pdf.hash,blob:incoming.pdfs.get(score.pdf.hash)});
            row.pdf=score.pdf;
          }
          if(addRecording){row.recording=score.recording;row.recordingProfileId=profileIds.get(score.recordingProfileId)||'';}
          stores.scores.put(row);byHash.set(row.hash,row);
          if(existing)skipped++;else added++;
        }
        done({added,skipped,profilesAdded});
      };
      folderRequest.onsuccess=event=>{folders=event.target.result;merge();};scoreRequest.onsuccess=event=>{scores=event.target.result;merge();};
      profileRequest.onsuccess=event=>{profiles=event.target.result;merge();};
    });
  }
}
function releasePdf({scores,pdfs},hash){
  scores.index('pdfHash').count(hash).onsuccess=e=>{if(!e.target.result)pdfs.delete(hash);};
}
function profileSignature({id:profileId,...profile}) {return JSON.stringify(profile);}
function throwTransactionError(store){store.transaction.abort();}
