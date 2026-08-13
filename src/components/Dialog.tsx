import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
export default function Dialog({open,onClose,title,children}:{open:boolean;onClose:()=>void;title:string;children:ReactNode}){
 useEffect(()=>{
   if(!open) return;
   const prev=document.body.style.overflow; document.body.style.overflow='hidden';
   const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()}; window.addEventListener('keydown',key);
   return()=>{document.body.style.overflow=prev;window.removeEventListener('keydown',key)};
 },[open,onClose]);
 if(!open)return null;
 return <div className="dialog-backdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}}>
   <section className="dialog" role="dialog" aria-modal="true" aria-label={title}>
     <header><div><span className="eyebrow">Europa 2026</span><h2>{title}</h2></div><button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={20}/></button></header>
     <div className="dialog-body">{children}</div>
   </section>
 </div>
}
