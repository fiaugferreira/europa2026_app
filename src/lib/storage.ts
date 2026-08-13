export const load = <T,>(key:string, fallback:T):T => {
  try { const raw=localStorage.getItem(key); return raw?JSON.parse(raw):fallback; } catch { return fallback; }
};
export const save = (key:string, value:unknown) => localStorage.setItem(key, JSON.stringify(value));

const DB='europa-2026-vault'; const STORE='files';
function openDb():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB,1);
    req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
}
export async function putFile(id:string,file:File){ const db=await openDb(); return new Promise<void>((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(file,id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);}); }
export async function getFile(id:string):Promise<File|undefined>{ const db=await openDb(); return new Promise((res,rej)=>{const req=db.transaction(STORE).objectStore(STORE).get(id);req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error);}); }
export async function deleteFile(id:string){ const db=await openDb(); return new Promise<void>((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);}); }
