import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, WalletCards, FolderLock, MapPinned, CircleCheckBig, Plus, Plane, Car, Utensils, MapPin, ExternalLink, FileUp, Download, Trash2, Phone, AlertTriangle, Sparkles, ChevronRight, BadgeDollarSign, Route, X, Search } from 'lucide-react';
import Dialog from './components/Dialog';
import PlaceImage from './components/PlaceImage';
import MapView from './components/MapView';
import { days, insurancePhones, places, seedChecklist, seedDocuments, trip, wallets, type Currency } from './data/trip';
import { brDate, googleMaps, money } from './lib/format';
import { deleteFile, getFile, load, putFile, save } from './lib/storage';

type Tab='home'|'route'|'map'|'money'|'vault'|'more';
type Expense={id:string;date:string;city:string;description:string;category:string;currency:Currency;amount:number;wallet:string;note?:string};
type Doc={id:string;name:string;type:string;traveler:string;original?:string;stored?:boolean;createdAt?:string};

const cityBudgetUSD:Record<string,number>={
 'Copenhague':1845,'Amsterdã':987,'Frankfurt':313,'Estrasburgo':777,'Colmar':389,'Zurique':1186,'Zurique / Graubünden':333,'São Paulo':0
};
function usePersisted<T>(key:string,initial:T){const [v,setV]=useState<T>(()=>load(key,initial));useEffect(()=>save(key,v),[key,v]);return [v,setV] as const}

export default function App(){
 const [tab,setTab]=useState<Tab>('home');
 const [expenses,setExpenses]=usePersisted<Expense[]>('europa-expenses',[]);
 const [check,setCheck]=usePersisted<Record<string,boolean>>('europa-checklist',{});
 const [docs,setDocs]=usePersisted<Doc[]>('europa-docs',seedDocuments);
 const [expenseOpen,setExpenseOpen]=useState(false);
 const [docOpen,setDocOpen]=useState(false);
 const [routeFilter,setRouteFilter]=useState('');
 const todayIso=new Date().toISOString().slice(0,10);
 const tripDay=days.find(d=>d.date===todayIso) || days[0];
 const daysUntil=Math.ceil((new Date(trip.start+'T12:00:00').getTime()-Date.now())/86400000);
 const totalBudget=Object.values(cityBudgetUSD).reduce((a,b)=>a+b,0);
 const spentUSD=expenses.reduce((s,e)=>s+toUSD(e.amount,e.currency),0);
 const checklistPct=Math.round(Object.values(check).filter(Boolean).length/seedChecklist.length*100)||0;
 const nextUnpaid=days.flatMap(d=>d.activities).find(a=>a.status==='confirmado'&&a.paid==='nao');

 const visibleDays=useMemo(()=>days.filter(d=>!routeFilter||(`${d.city} ${d.country} ${d.title} ${d.activities.map(a=>a.title).join(' ')}`).toLowerCase().includes(routeFilter.toLowerCase())),[routeFilter]);

 return <div className="app-shell">
  <div className="ambient a1"/><div className="ambient a2"/>
  <header className="topbar">
    <div><span className="eyebrow">CENTRAL OPERACIONAL</span><h1>Europa <i>2026</i></h1></div>
    <button className="quick-add" onClick={()=>setExpenseOpen(true)}><Plus size={18}/><span>Gasto</span></button>
  </header>

  <main>
   {tab==='home'&&<Home daysUntil={daysUntil} day={tripDay} spent={spentUSD} budget={totalBudget} checklistPct={checklistPct} nextUnpaid={nextUnpaid} setTab={setTab}/>} 
   {tab==='route'&&<RouteView filter={routeFilter} setFilter={setRouteFilter} visibleDays={visibleDays}/>} 
   {tab==='map'&&<section className="page"><PageTitle kicker="GEOGRAFIA" title="Mapa da viagem" subtitle="Pins verificados + acesso direto ao Google Maps."/><MapView/><PlaceDirectory/></section>}
   {tab==='money'&&<MoneyView expenses={expenses} setExpenses={setExpenses} openAdd={()=>setExpenseOpen(true)} budget={totalBudget}/>} 
   {tab==='vault'&&<Vault docs={docs} setDocs={setDocs} openAdd={()=>setDocOpen(true)}/>} 
   {tab==='more'&&<More check={check} setCheck={setCheck}/>} 
  </main>

  <nav className="bottom-nav">
   <Nav active={tab==='home'} icon={<Sparkles/>} label="Hoje" onClick={()=>setTab('home')}/>
   <Nav active={tab==='route'} icon={<CalendarDays/>} label="Roteiro" onClick={()=>setTab('route')}/>
   <Nav active={tab==='map'} icon={<MapPinned/>} label="Mapa" onClick={()=>setTab('map')}/>
   <Nav active={tab==='money'} icon={<WalletCards/>} label="Caixa" onClick={()=>setTab('money')}/>
   <Nav active={tab==='vault'} icon={<FolderLock/>} label="Cofre" onClick={()=>setTab('vault')}/>
   <Nav active={tab==='more'} icon={<CircleCheckBig/>} label="Ops" onClick={()=>setTab('more')}/>
  </nav>

  <ExpenseDialog open={expenseOpen} onClose={()=>setExpenseOpen(false)} onAdd={e=>setExpenses([e,...expenses])}/>
  <DocumentDialog open={docOpen} onClose={()=>setDocOpen(false)} onAdd={d=>setDocs([d,...docs])}/>
 </div>
}

function Home({daysUntil,day,spent,budget,checklistPct,nextUnpaid,setTab}:any){
 const place=day.activities.map((a:any)=>places.find(p=>p.id===a.placeId)).find(Boolean);
 return <section className="page home-page">
  <div className="hero-card">
   <div className="hero-copy"><span className="pill">{daysUntil>0?`${daysUntil} dias para embarcar`:'viagem em curso'}</span><h2>Uma viagem inteira<br/><em>na palma da mão.</em></h2><p>Roteiro, caixa, documentos, mapas e decisões críticas em um único lugar.</p></div>
   <div className="hero-photo"><PlaceImage title={day.heroWiki} label={day.city}/><div className="hero-date">17 SET <span>→</span> 02 OUT</div></div>
  </div>
  <div className="kpi-grid">
   <Kpi label="Caixa planejado" value={`${Math.max(0,budget-spent).toFixed(0)} USD`} sub={`${spent.toFixed(0)} USD lançados`} icon={<BadgeDollarSign/>}/>
   <Kpi label="Preparação" value={`${checklistPct}%`} sub="checklist concluído" icon={<CircleCheckBig/>}/>
   <Kpi label="Roteiro" value="16 dias" sub="5 países + Brasil" icon={<Route/>}/>
  </div>
  <div className="section-head"><div><span className="eyebrow">PRÓXIMO BLOCO</span><h3>{brDate(day.date)} • {day.city}</h3></div><button onClick={()=>setTab('route')}>Ver tudo <ChevronRight size={16}/></button></div>
  <div className="timeline-card">
   <div className="timeline-side"><div className="date-badge"><b>{day.date.slice(8)}</b><span>{new Date(day.date+'T12:00').toLocaleDateString('pt-BR',{month:'short'}).toUpperCase()}</span></div><div className="line"/></div>
   <div className="timeline-list">{day.activities.slice(0,4).map((a:any)=><ActivityRow key={a.id} a={a}/>)}</div>
  </div>
  <div className="ops-grid">
   <div className="ops-card warn"><div><span className="eyebrow">PENDÊNCIA FINANCEIRA</span><h3>{nextUnpaid?.title||'Sem pendências críticas'}</h3><p>{nextUnpaid?.amount?`${money(nextUnpaid.amount,nextUnpaid.currency)} • ${nextUnpaid.note||''}`:'Tudo sob controle.'}</p></div><AlertTriangle/></div>
   <div className="ops-card"><div><span className="eyebrow">CAIXA FINAL PLANEJADO</span><h3>€ 2.400 + US$ 3.800</h3><p>Considerando a compra planejada de €1.200 + US$1.000 para otimizar cashback.</p></div><WalletCards/></div>
  </div>
 </section>
}

function RouteView({filter,setFilter,visibleDays}:{filter:string;setFilter:(x:string)=>void;visibleDays:typeof days}){
 return <section className="page"><PageTitle kicker="ROTEIRO MESTRE" title="16 dias, sem ruído" subtitle="Compromissos confirmados aparecem primeiro. Flexíveis ficam visualmente separados."/>
  <div className="search"><Search size={18}/><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Buscar cidade, restaurante, atração..."/>{filter&&<button onClick={()=>setFilter('')}><X size={16}/></button>}</div>
  <div className="route-stack">{visibleDays.map((d,i)=><DayCard key={d.date} day={d} index={i}/>)}</div>
 </section>
}
function DayCard({day,index}:{day:typeof days[number];index:number}){
 return <article className="day-card">
  <div className="day-visual"><PlaceImage title={day.heroWiki} label={day.city}/><div className="day-number">D{String(index+1).padStart(2,'0')}</div><div className="day-overlay"><span>{brDate(day.date)}</span><h3>{day.city}</h3><p>{day.title}</p></div></div>
  <div className="day-body">{day.hotel&&<div className="hotel-chip">◌ {day.hotel}</div>}{day.activities.map(a=><ActivityRow key={a.id} a={a}/>)}</div>
 </article>
}
function ActivityRow({a}:{a:any}){
 const p=places.find(x=>x.id===a.placeId); return <div className={`activity ${a.status}`}>
  <div className="activity-time">{a.time||'•'}</div><div className="activity-icon">{activityIcon(a.category)}</div>
  <div className="activity-main"><div className="activity-title"><b>{a.title}</b>{a.status==='confirmado'&&<span className="confirmed">confirmado</span>}{a.status==='lembrete'&&<span className="reminder">lembrete</span>}</div><p>{a.note||p?.address||a.category}</p>{a.amount&&<span className="amount-chip">{money(a.amount,a.currency)}</span>}</div>
  {p&&<a className="map-link" href={googleMaps(p.name,p.address,p.lat,p.lng)} target="_blank" rel="noreferrer" aria-label="Abrir mapa"><MapPin size={17}/></a>}
 </div>
}

function MoneyView({expenses,setExpenses,openAdd,budget}:{expenses:Expense[];setExpenses:(e:Expense[])=>void;openAdd:()=>void;budget:number}){
 const spent=expenses.reduce((s,e)=>s+toUSD(e.amount,e.currency),0);
 const actualEUR=1200, actualUSD=2800, plannedEUR=1200, plannedUSD=1000;
 return <section className="page"><PageTitle kicker="CAIXA ÚNICO" title="Dinheiro sem surpresa" subtitle="Saldo atual, compra planejada e gastos reais no mesmo painel."/>
  <div className="money-hero"><div><span className="eyebrow">POSIÇÃO APÓS COMPRAS PLANEJADAS</span><h2>€ {(actualEUR+plannedEUR).toLocaleString('pt-BR')} <small>+</small> US$ {(actualUSD+plannedUSD).toLocaleString('pt-BR')}</h2><p>Hoje: €1.200 em espécie + US$2.800 Nomad. Planejado: +€1.200 e +US$1.000.</p></div><WalletCards size={38}/></div>
  <div className="progress-card"><div className="progress-head"><span>Orçamento variável de referência</span><b>{spent.toFixed(0)} / {budget.toFixed(0)} USD</b></div><div className="progress"><i style={{width:`${Math.min(100,spent/budget*100)}%`}}/></div><small>Gastos lançados no aplicativo reduzem este saldo em tempo real.</small></div>
  <div className="wallet-grid">{wallets.map(w=><div className={`wallet-card ${w.planned?'planned':''}`} key={w.id}><span>{w.planned?'PLANEJADO':'DISPONÍVEL'}</span><h3>{money(w.balance,w.currency)}</h3><p>{w.name}</p><small>{w.note}</small></div>)}</div>
  <div className="section-head"><div><span className="eyebrow">LANÇAMENTOS</span><h3>Gastos da viagem</h3></div><button className="primary-mini" onClick={openAdd}><Plus size={16}/> Novo gasto</button></div>
  {expenses.length===0?<Empty icon={<WalletCards/>} title="Nenhum gasto lançado" text="O primeiro lançamento já atualiza o painel e fica salvo neste dispositivo."/>:<div className="expense-list">{expenses.map(e=><div className="expense-row" key={e.id}><div><b>{e.description}</b><span>{e.city} • {e.date.split('-').reverse().join('/')} • {e.category}</span></div><div className="expense-value"><b>{money(e.amount,e.currency)}</b><span>≈ US$ {toUSD(e.amount,e.currency).toFixed(0)}</span></div><button onClick={()=>setExpenses(expenses.filter(x=>x.id!==e.id))}><Trash2 size={16}/></button></div>)}</div>}
 </section>
}

function ExpenseDialog({open,onClose,onAdd}:{open:boolean;onClose:()=>void;onAdd:(x:Expense)=>void}){
 const [form,setForm]=useState({date:new Date().toISOString().slice(0,10),city:'',description:'',category:'Alimentação',currency:'EUR' as Currency,amount:'',wallet:'eurcash',note:''});
 function submit(e:React.FormEvent){e.preventDefault();if(!form.description||!form.amount)return;onAdd({id:crypto.randomUUID(),...form,amount:Number(form.amount)});setForm({...form,description:'',amount:'',note:''});onClose();}
 return <Dialog open={open} onClose={onClose} title="Incluir gasto"><form onSubmit={submit} className="form-grid">
  <label>Data<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
  <label>Cidade<input value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Ex.: Copenhague"/></label>
  <label className="full">Descrição<input autoFocus value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Ex.: jantar no Tivoli"/></label>
  <label>Categoria<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option>Alimentação</option><option>Transporte</option><option>Atração</option><option>Compras</option><option>Hotel</option><option>Outros</option></select></label>
  <label>Moeda<select value={form.currency} onChange={e=>setForm({...form,currency:e.target.value as Currency})}><option>EUR</option><option>USD</option><option>DKK</option><option>CHF</option><option>BRL</option></select></label>
  <label>Valor<input inputMode="decimal" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value.replace(',','.')})} placeholder="0,00"/></label>
  <label>Carteira<select value={form.wallet} onChange={e=>setForm({...form,wallet:e.target.value})}><option value="eurcash">Euro físico</option><option value="usdnomad">Nomad USD</option></select></label>
  <label className="full">Observação<textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})} rows={3}/></label>
  <div className="form-actions full"><button type="button" className="ghost" onClick={onClose}>Cancelar</button><button className="primary">Salvar gasto</button></div>
 </form></Dialog>
}

function Vault({docs,setDocs,openAdd}:{docs:Doc[];setDocs:(d:Doc[])=>void;openAdd:()=>void}){
 async function openDoc(d:Doc){if(!d.stored)return;const f=await getFile(d.id);if(!f)return;const u=URL.createObjectURL(f);window.open(u,'_blank');setTimeout(()=>URL.revokeObjectURL(u),60000)}
 async function remove(d:Doc){if(d.stored)await deleteFile(d.id);setDocs(docs.filter(x=>x.id!==d.id))}
 return <section className="page"><PageTitle kicker="COFRE LOCAL" title="Documentos, do seu jeito" subtitle="Você escolhe o nome visível antes de salvar. O nome original fica apenas como referência."/>
  <div className="privacy-note"><FolderLock/><div><b>Privado por padrão</b><span>Arquivos enviados aqui ficam no IndexedDB deste navegador. Não inclua PDFs sensíveis no repositório GitHub.</span></div></div>
  <button className="upload-hero" onClick={openAdd}><FileUp size={28}/><div><b>Adicionar documento</b><span>Nomeie, categorize e associe ao viajante antes da carga.</span></div><Plus/></button>
  <div className="doc-list">{docs.map(d=><div className="doc-row" key={d.id}><div className="doc-icon">PDF</div><div className="doc-copy"><b>{d.name}</b><span>{d.type} • {d.traveler}</span>{d.original&&<small>arquivo original: {d.original}</small>}</div><div className="doc-actions">{d.stored&&<button onClick={()=>openDoc(d)} title="Abrir"><ExternalLink size={17}/></button>}{d.stored&&<button onClick={async()=>{const f=await getFile(d.id);if(!f)return;const u=URL.createObjectURL(f);const a=document.createElement('a');a.href=u;a.download=f.name;a.click();URL.revokeObjectURL(u)}} title="Baixar"><Download size={17}/></button>}<button onClick={()=>remove(d)} title="Excluir"><Trash2 size={17}/></button></div></div>)}</div>
 </section>
}
function DocumentDialog({open,onClose,onAdd}:{open:boolean;onClose:()=>void;onAdd:(d:Doc)=>void}){
 const [file,setFile]=useState<File>(); const [name,setName]=useState(''); const [type,setType]=useState('Reserva'); const [traveler,setTraveler]=useState('Família'); const [busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();if(!file||!name)return;setBusy(true);const id=crypto.randomUUID();await putFile(id,file);onAdd({id,name,type,traveler,original:file.name,stored:true,createdAt:new Date().toISOString()});setBusy(false);setFile(undefined);setName('');onClose();}
 return <Dialog open={open} onClose={onClose} title="Adicionar documento"><form onSubmit={submit} className="form-grid">
  <label className="full upload-field"><span>1. Escolha o arquivo</span><input type="file" accept="application/pdf,image/*" onChange={e=>{const f=e.target.files?.[0];setFile(f);if(f&&!name)setName(f.name.replace(/\.[^.]+$/,''))}}/>{file&&<small>{file.name} • {(file.size/1024/1024).toFixed(1)} MB</small>}</label>
  <label className="full"><span>2. Nome que aparecerá no app</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Seguro viagem • Filipe"/><small>Este nome é independente do nome original do arquivo.</small></label>
  <label>Tipo<select value={type} onChange={e=>setType(e.target.value)}><option>Reserva</option><option>Seguro viagem</option><option>Elegibilidade</option><option>Ingresso</option><option>Passaporte</option><option>Receita</option><option>Outros</option></select></label>
  <label>Viajante<select value={traveler} onChange={e=>setTraveler(e.target.value)}><option>Família</option>{trip.travelers.map(x=><option key={x}>{x}</option>)}</select></label>
  <div className="form-actions full"><button type="button" className="ghost" onClick={onClose}>Cancelar</button><button className="primary" disabled={!file||!name||busy}>{busy?'Salvando...':'Salvar no cofre'}</button></div>
 </form></Dialog>
}

function More({check,setCheck}:{check:Record<string,boolean>;setCheck:(x:Record<string,boolean>)=>void}){
 return <section className="page"><PageTitle kicker="OPERAÇÕES" title="O que não pode falhar" subtitle="Checklist, alertas e contatos de emergência no mesmo lugar."/>
  <div className="ops-card critical"><div><span className="eyebrow">LEMBRETE CRÍTICO</span><h3>28/09 • contatar vinícola em Fläsch</h3><p>A vinícola pediu contato dois dias antes. Degustação em 30/09: CHF 25 por pessoa, Rafaella + Maria Esther.</p></div><AlertTriangle/></div>
  <div className="section-head"><div><span className="eyebrow">CHECKLIST</span><h3>Pré-embarque</h3></div><span>{Object.values(check).filter(Boolean).length}/{seedChecklist.length}</span></div>
  <div className="check-list">{seedChecklist.map(c=><label key={c.id} className={check[c.id]?'done':''}><input type="checkbox" checked={!!check[c.id]} onChange={e=>setCheck({...check,[c.id]:e.target.checked})}/><span className="fake-check">✓</span><div><b>{c.label}</b><small>{c.category} • prioridade {c.priority}</small></div></label>)}</div>
  <div className="section-head"><div><span className="eyebrow">EMERGÊNCIA</span><h3>Assistência Mastercard / AIG</h3></div><Phone size={18}/></div>
  <div className="phone-grid">{insurancePhones.map(([country,phone])=><a key={country} href={`tel:${phone.replace(/[^+\d]/g,'')}`}><span>{country}</span><b>{phone}</b></a>)}</div>
  <div className="source-note">Os números foram importados dos certificados/seguros da base. Confirme as condições do benefício antes do embarque.</div>
 </section>
}

function PlaceDirectory(){return <div className="place-directory">{places.map(p=><a key={p.id} href={googleMaps(p.name,p.address,p.lat,p.lng)} target="_blank" rel="noreferrer"><div><b>{p.name}</b><span>{p.city} • {p.address||'Busca nominal no Maps'}</span></div><div className="verified">{p.verified?'GPS ✓':'BUSCA'} <ExternalLink size={13}/></div></a>)}</div>}
function PageTitle({kicker,title,subtitle}:{kicker:string;title:string;subtitle:string}){return <div className="page-title"><span className="eyebrow">{kicker}</span><h2>{title}</h2><p>{subtitle}</p></div>}
function Kpi({label,value,sub,icon}:{label:string;value:string;sub:string;icon:any}){return <div className="kpi"><div className="kpi-icon">{icon}</div><span>{label}</span><b>{value}</b><small>{sub}</small></div>}
function Nav({active,icon,label,onClick}:{active:boolean;icon:any;label:string;onClick:()=>void}){return <button className={active?'active':''} onClick={onClick}>{icon}<span>{label}</span></button>}
function Empty({icon,title,text}:{icon:any;title:string;text:string}){return <div className="empty"><div>{icon}</div><b>{title}</b><span>{text}</span></div>}
function activityIcon(category:string){if(/Voo/.test(category))return <Plane size={16}/>;if(/Carro|Transporte|Rota/.test(category))return <Car size={16}/>;if(/Aliment|Restaurante|Vinho/.test(category))return <Utensils size={16}/>;return <MapPin size={16}/>}
function toUSD(v:number,c:Currency){if(c==='USD')return v;if(c==='EUR')return v*trip.rates.EUR_USD;if(c==='DKK')return v/trip.rates.DKK_USD;if(c==='CHF')return v/trip.rates.CHF_USD;if(c==='BRL')return v/5.5;return v}
