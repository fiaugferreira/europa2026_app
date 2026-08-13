import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, ExternalLink } from 'lucide-react';
import { places } from '../data/trip';
import { googleMaps } from '../lib/format';
const icon=L.divIcon({className:'map-dot',html:'<span></span>',iconSize:[18,18],iconAnchor:[9,9]});
export default function MapView(){
 const pts=places.filter(p=>p.verified&&p.lat&&p.lng);
 const route=['torvehallerne','jordaan','frankfurtHbf','cathedral','europapark','colmar','eguisheim','novotel','maienfeld','oldtown','zrh'].map(id=>places.find(p=>p.id===id)).filter(Boolean) as typeof places;
 return <div className="map-wrap">
  <MapContainer center={[50.4,8.1]} zoom={5} scrollWheelZoom className="map">
   <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
   <Polyline positions={route.map(p=>[p.lat!,p.lng!])} pathOptions={{weight:3,opacity:.65}} />
   {pts.map(p=><Marker key={p.id} position={[p.lat!,p.lng!]} icon={icon}><Popup><b>{p.name}</b><br/>{p.address||p.city}<br/><a href={googleMaps(p.name,p.address,p.lat,p.lng)} target="_blank">Abrir no Google Maps</a></Popup></Marker>)}
  </MapContainer>
  <div className="map-legend"><MapPin size={16}/><span>{pts.length} pontos com coordenadas verificadas. Locais sem GPS fixo abrem por busca nominal no Google Maps.</span><ExternalLink size={14}/></div>
 </div>
}
