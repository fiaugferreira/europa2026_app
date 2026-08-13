import { useEffect, useState } from 'react';
import { wikiThumb } from '../lib/format';
export default function PlaceImage({title,label}:{title?:string;label:string}){
 const [src,setSrc]=useState<string>();
 useEffect(()=>{let alive=true;wikiThumb(title).then(x=>alive&&setSrc(x));return()=>{alive=false}},[title]);
 return <div className="place-image">{src?<img src={src} alt={label} loading="lazy"/>:<div className="image-fallback"><span>✦</span><b>{label}</b></div>}</div>
}
