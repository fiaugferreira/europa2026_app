import type { Currency } from '../data/trip';
export const brDate=(iso:string)=>new Intl.DateTimeFormat('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'}).format(new Date(iso+'T12:00:00'));
export const money=(n:number,c:Currency)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:c,maximumFractionDigits:c==='BRL'?2:0}).format(n);
export const googleMaps=(name:string,address?:string,lat?:number,lng?:number)=>{
 const q=lat&&lng?`${lat},${lng}`:[name,address].filter(Boolean).join(', ');
 return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
};
export const wikiThumb=async(title?:string)=>{
 if(!title) return undefined;
 try{const r=await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);if(!r.ok)return;const j=await r.json();return j.thumbnail?.source as string|undefined;}catch{return;}
};
