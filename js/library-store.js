// Original score bytes and folder metadata only; no renderer/trainer dependency.
export const LIBRARY_FORMAT='guitar-trainer-library';
import {validateProfile} from './media-sync.js';
export const SCORE_EXTENSIONS=/\.(gp|gp3|gp4|gp5|gpx|xml|musicxml|mxl)$/i;
const id=()=>crypto.randomUUID();
const name=value=>String(value || '').trim().slice(0,240);

export async function fingerprint(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
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
  if(data?.format!==LIBRARY_FORMAT || ![1,2].includes(data.version) || !Array.isArray(data.folders) || !Array.isArray(data.scores))throw new Error('Choose a Guitar Trainer library backup (version 1 or 2).');
  if(data.version===2 && !Array.isArray(data.mediaProfiles))throw new Error('The backup is missing media sync profiles.');
  const mediaProfiles=(data.mediaProfiles || []).map(validateProfile);
  if(new Set(mediaProfiles.map(profile=>profile.id)).size!==mediaProfiles.length)throw new Error('Duplicate sync profile IDs.');
  const folderIds=new Set(),scoreIds=new Set();
  const folders=data.folders.map(folder=>{
    if(!folder || typeof folder.id!=='string' || !folder.id || folderIds.has(folder.id) || !name(folder.name))throw new Error('Invalid or duplicate backup folder.');
    folderIds.add(folder.id);return {id:folder.id,name:name(folder.name)};
  });
  const scores=[];
  for(const score of data.scores) {
    if(!score || typeof score.id!=='string' || !score.id || scoreIds.has(score.id) || !name(score.title) || !SCORE_EXTENSIONS.test(score.fileName || '') ||
      (score.folderId!=null && !folderIds.has(score.folderId)))throw new Error('Invalid score metadata in backup.');
    scoreIds.add(score.id);
    const bytes=decodeBytes(score.data);
    scores.push({id:score.id,title:name(score.title),fileName:String(score.fileName),folderId:score.folderId || null,bytes,hash:await fingerprint(bytes)});
  }
  return {folders,scores,mediaProfiles};
}

export class LibraryStore {
  constructor(factory=globalThis.indexedDB){this.factory=factory;this.dbPromise=null;}
  async open() {
    if(!this.factory)throw new Error('This browser cannot store a score library. Open File still works.');
    if(!this.dbPromise)this.dbPromise=new Promise((resolve,reject)=>{
      const request=this.factory.open('guitarTrainerLibrary',2);
      request.onupgradeneeded=()=>{for(const store of ['folders','scores','mediaProfiles'])if(!request.result.objectStoreNames.contains(store))request.result.createObjectStore(store,{keyPath:'id'});};
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
  async save({title,fileName,bytes,folderId=null}) {
    if(!bytes?.length || !SCORE_EXTENSIONS.test(fileName))throw new Error('Choose a supported, nonempty score file.');
    const hash=await fingerprint(bytes);
    return this.transaction(['scores','folders'],'readwrite',(stores,done)=>{
      const write=()=>{
        stores.scores.getAll().onsuccess=event=>{
          const duplicate=event.target.result.find(score=>score.hash===hash);
          if(duplicate){done({score:duplicate,duplicate:true});return;}
          const score={id:id(),title:name(title)||name(fileName),fileName:String(fileName),bytes:new Uint8Array(bytes),folderId,hash,createdAt:Date.now()};
          stores.scores.put(score);done({score,duplicate:false});
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
  deleteScore(scoreId){return this.transaction(['scores'],'readwrite',({scores})=>scores.delete(scoreId));}
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
  async backup() {
    const {folders,scores}=await this.list();
    const mediaProfiles=await this.listProfiles();
    return {format:LIBRARY_FORMAT,version:2,exportedAt:new Date().toISOString(),folders,mediaProfiles,
      scores:scores.map(({bytes,...score})=>({...score,data:encodeBytes(bytes)}))};
  }
  async merge(data) {
    // Validate every entry before starting the single atomic write transaction.
    const incoming=await validateBackup(data);
    return this.transaction(['scores','folders','mediaProfiles'],'readwrite',(stores,done)=>{
      const folderRequest=stores.folders.getAll(),scoreRequest=stores.scores.getAll(),profileRequest=stores.mediaProfiles.getAll();let folders,scores,profiles;
      const merge=()=>{
        if(!folders || !scores || !profiles)return;
        const folderMap=new Map(),hashes=new Set(scores.map(score=>score.hash));let added=0,skipped=0;
        for(const folder of incoming.folders) {
          let target=folders.find(item=>item.name.toLowerCase()===folder.name.toLowerCase());
          if(!target){target={id:id(),name:folder.name};folders.push(target);stores.folders.put(target);}
          folderMap.set(folder.id,target.id);
        }
        for(const score of incoming.scores) {
          if(hashes.has(score.hash)){skipped++;continue;}
          stores.scores.put({...score,id:id(),folderId:folderMap.get(score.folderId)||null,createdAt:Date.now()});
          hashes.add(score.hash);added++;
        }
        const profileKeys=new Set(profiles.map(profileSignature));let profilesAdded=0;
        for(const profile of incoming.mediaProfiles)if(!profileKeys.has(profileSignature(profile))) {
          stores.mediaProfiles.put({...profile,id:id()});profileKeys.add(profileSignature(profile));profilesAdded++;
        }
        done({added,skipped,profilesAdded});
      };
      folderRequest.onsuccess=event=>{folders=event.target.result;merge();};scoreRequest.onsuccess=event=>{scores=event.target.result;merge();};
      profileRequest.onsuccess=event=>{profiles=event.target.result;merge();};
    });
  }
}
function profileSignature({id:profileId,...profile}) {return JSON.stringify(profile);}
function throwTransactionError(store){store.transaction.abort();}
