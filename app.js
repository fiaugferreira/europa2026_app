const D = window.TRIP_DATA;
const LS = {
  expenses:'europa2026.expenses.v1',
  checks:'europa2026.checks.v1',
  notes:'europa2026.notes.v1',
  theme:'europa2026.theme.v1'
};
let state = {
  view:'home',
  expenses:JSON.parse(localStorage.getItem(LS.expenses)||'[]'),
  checks:JSON.parse(localStorage.getItem(LS.checks)||'{}'),
  notes:localStorage.getItem(LS.notes)||'',
  theme:localStorage.getItem(LS.theme)||'light'
};
document.documentElement.dataset.theme = state.theme;

const main = document.getElementById('main');
const expenseDialog = document.getElementById('expenseDialog');
const expenseForm = document.getElementById('expenseForm');
const documentDialog = document.getElementById('documentDialog');
const documentForm = document.getElementById('documentForm');

function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function money(v,c){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:c,maximumFractionDigits:2}).format(v||0)}
function fmtDate(d,opts={day:'2-digit',month:'short'}){return new Intl.DateTimeFormat('pt-BR',opts).format(new Date(d+'T12:00:00'))}
function todayISO(){return new Date().toISOString().slice(0,10)}
function daysToTrip(){return Math.ceil((new Date(D.trip.start+'T12:00:00')-new Date())/86400000)}
function save(){
  localStorage.setItem(LS.expenses,JSON.stringify(state.expenses));
  localStorage.setItem(LS.checks,JSON.stringify(state.checks));
  localStorage.setItem(LS.notes,state.notes);
  localStorage.setItem(LS.theme,state.theme);
}
function toast(msg){
  let t=document.querySelector('.toast'); if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}
  t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)
}
function nextItem(){
  const now=new Date();
  for(const day of D.itinerary){
    for(const item of day.items){
      const dt=new Date(day.date+'T'+(item.time||'23:59')+':00');
      if(dt>=now)return {...item,date:day.date,city:day.city};
    }
  }
  return null;
}
function walletBalances(){
  const out={};
  D.wallets.forEach(w=>out[w.id]={...w,balance:w.initial});
  state.expenses.forEach(e=>{if(out[e.walletId])out[e.walletId].balance-=Number(e.amount||0)});
  return out;
}
function totalByCurrency(){
  const out={};state.expenses.forEach(e=>out[e.currency]=(out[e.currency]||0)+Number(e.amount||0));return out;
}
function renderHome(){
  const next=nextItem(), d=daysToTrip(), checks=Object.values(state.checks).filter(Boolean).length;
  const progress=Math.round((checks/D.checklist.length)*100)||0;
  const balances=walletBalances();
  main.innerHTML=`
    <section class="hero">
      <div class="eyebrow">17 SET → 02 OUT</div>
      <h2>${d>0?d+' dias':'Viagem em andamento'}</h2>
      <p>Copenhague, Amsterdã, Alemanha, Alsácia e Suíça.</p>
      <div class="countdown">${d>0?'✈️':'🌍'}</div>
    </section>

    <div class="section-title"><h2>Resumo</h2></div>
    <section class="grid">
      <div class="card"><div class="muted">Viajantes</div><div class="stat">4</div></div>
      <div class="card"><div class="muted">Dias</div><div class="stat">16</div></div>
      <div class="card"><div class="muted">Checklist</div><div class="stat">${progress}%</div></div>
      <div class="card"><div class="muted">Gastos lançados</div><div class="stat">${state.expenses.length}</div></div>
    </section>

    <div class="section-title"><h2>Próximo compromisso</h2></div>
    <section class="card">
      ${next?`<div class="chip">${fmtDate(next.date,{weekday:'short',day:'2-digit',month:'short'})}</div>
      <h3 style="margin-top:12px">${esc(next.title)}</h3>
      <div class="muted">${esc(next.city)}${next.time?' · '+next.time:''}</div>
      <div class="actions"><a class="button primary" href="${next.maps}" target="_blank" rel="noopener">Abrir no mapa</a></div>`:'<div class="muted">Nenhum compromisso futuro encontrado.</div>'}
    </section>

    <div class="section-title"><h2>Carteiras</h2><button class="ghost" data-view-link="expenses">Ver gastos</button></div>
    <section class="grid">
      ${Object.values(balances).map(w=>`<div class="card"><div class="muted">${esc(w.name)}</div><div class="stat money">${money(w.balance,w.currency)}</div><div class="muted">Inicial: ${money(w.initial,w.currency)}</div></div>`).join('')}
    </section>

    <div class="section-title"><h2>Checklist</h2></div>
    <section class="card">
      <div class="progress"><span style="width:${progress}%"></span></div>
      <p class="muted">${checks} de ${D.checklist.length} itens concluídos.</p>
      <button class="secondary" data-more="checklist">Abrir checklist</button>
    </section>
  `;
}
function renderItinerary(){
  main.innerHTML=`<input id="searchItinerary" class="search" placeholder="Buscar cidade, hotel ou atividade">
    <div id="itineraryList">${itineraryHTML('')}</div>`;
  document.getElementById('searchItinerary').addEventListener('input',e=>{
    document.getElementById('itineraryList').innerHTML=itineraryHTML(e.target.value);
  })
}
function itineraryHTML(q){
  q=q.toLowerCase().trim();
  return D.itinerary.map(day=>{
    const items=day.items.filter(i=>!q||[day.city,day.country,i.title,i.place,i.note].join(' ').toLowerCase().includes(q));
    if(!items.length)return '';
    return `<section class="date-group">
      <div class="date-head">${fmtDate(day.date,{weekday:'long',day:'2-digit',month:'long'})} · ${esc(day.city)}</div>
      <div class="list">${items.map(i=>`<article class="card row">
        <div class="time">${esc(i.time||'—')}</div>
        <div class="row-main"><div class="row-title">${esc(i.title)}</div><div class="muted">${esc(i.place||'')}</div><p class="muted">${esc(i.note||'')}</p>
        <div class="actions"><a class="button secondary" href="${i.maps}" target="_blank" rel="noopener">Mapa</a></div></div>
      </article>`).join('')}</div>
    </section>`
  }).join('')
}
function renderExpenses(){
  const totals=totalByCurrency(), balances=walletBalances();
  main.innerHTML=`
    <div class="section-title"><h2>Gastos</h2><button id="newExpense" class="primary">＋ Novo gasto</button></div>
    <section class="grid">
      ${Object.entries(totals).length?Object.entries(totals).map(([c,v])=>`<div class="card"><div class="muted">${c}</div><div class="stat">${money(v,c)}</div></div>`).join(''):'<div class="card"><div class="muted">Nenhum gasto lançado.</div></div>'}
    </section>
    <div class="section-title"><h2>Saldos</h2></div>
    <section class="list">${Object.values(balances).map(w=>`<div class="card row"><div class="row-main"><div class="row-title">${esc(w.name)}</div><div class="muted">Inicial ${money(w.initial,w.currency)}</div></div><div class="stat money ${w.balance<0?'negative':'positive'}">${money(w.balance,w.currency)}</div></div>`).join('')}</section>
    <div class="section-title"><h2>Lançamentos</h2></div>
    <section class="list">
      ${state.expenses.length?state.expenses.slice().reverse().map(e=>`<article class="card row">
        <div class="row-main"><div class="row-title">${esc(e.description)}</div><div class="muted">${fmtDate(e.date)} · ${esc(e.category)} · ${e.payer==='mae'?'Mãe':e.payer==='shared'?'Compartilhado':'Filipe'}</div><div class="muted">${esc(e.note||'')}</div></div>
        <div><div class="stat money">${money(e.amount,e.currency)}</div><button class="ghost delete-expense" data-id="${e.id}">Excluir</button></div>
      </article>`).join(''):'<div class="card muted">Use “Novo gasto” para começar.</div>'}
    </section>
    <div class="section-title"><h2>Responsabilidade da mãe</h2></div>
    <section class="card">
      <p>Percentual de referência: <strong>${D.trip.motherSharePercent}%</strong>.</p>
      <div class="muted">Os gastos marcados como “Mãe” contam integralmente. Os marcados como “Compartilhado” podem ser usados na conferência do rateio.</div>
    </section>`;
  document.getElementById('newExpense').onclick=openExpense;
  document.querySelectorAll('.delete-expense').forEach(b=>b.onclick=()=>{state.expenses=state.expenses.filter(x=>x.id!==b.dataset.id);save();renderExpenses();toast('Gasto excluído')})
}
function openExpense(){
  const sel=document.getElementById('walletSelect');
  sel.innerHTML=D.wallets.map(w=>`<option value="${w.id}">${esc(w.name)} (${w.currency})</option>`).join('');
  expenseForm.date.value=todayISO();
  expenseDialog.showModal();
}
expenseForm.addEventListener('submit',e=>{
  e.preventDefault(); const fd=new FormData(expenseForm);
  state.expenses.push({
    id:crypto.randomUUID(),description:fd.get('description'),amount:Number(fd.get('amount')),currency:fd.get('currency'),
    walletId:fd.get('walletId'),payer:fd.get('payer'),date:fd.get('date'),category:fd.get('category'),note:fd.get('note')
  });
  save();expenseDialog.close();expenseForm.reset();renderExpenses();toast('Gasto salvo');
});
function renderReservations(){
  main.innerHTML=`<div class="section-title"><h2>Reservas</h2></div><section class="list">
    ${D.reservations.map(r=>`<article class="card">
      <div class="row"><div class="row-main"><div class="row-title">${esc(r.title)}</div><div class="muted">${fmtDate(r.date,{day:'2-digit',month:'long'})} · ${esc(r.city)}</div></div>
      <span class="chip">${r.status==='confirmed'?'Confirmado':'Planejado'}</span></div>
      <p class="muted">${esc(r.note)}</p>${r.amount?`<div class="stat money">${money(r.amount,r.currency)}</div>`:''}
    </article>`).join('')}
  </section>`;
}
function renderMore(section='menu'){
  if(section==='checklist')return renderChecklist();
  if(section==='documents')return renderDocuments();
  if(section==='emergency')return renderEmergency();
  if(section==='backup')return renderBackup();
  main.innerHTML=`
    <div class="section-title"><h2>Mais</h2></div>
    <section class="list">
      <button class="card row secondary" data-more="checklist"><div class="row-main"><div class="row-title">Checklist</div><div class="muted">Preparação da viagem</div></div>›</button>
      <button class="card row secondary" data-more="documents"><div class="row-main"><div class="row-title">Documentos</div><div class="muted">Arquivos privados salvos no aparelho</div></div>›</button>
      <button class="card row secondary" data-more="emergency"><div class="row-main"><div class="row-title">Emergência</div><div class="muted">Telefones e cobertura do seguro</div></div>›</button>
      <button class="card row secondary" data-more="backup"><div class="row-main"><div class="row-title">Backup e restauração</div><div class="muted">Exportar dados do aplicativo</div></div>›</button>
    </section>
    <div class="section-title"><h2>Anotações</h2></div>
    <section class="card"><textarea id="notes" rows="8" placeholder="Anotações gerais da viagem">${esc(state.notes)}</textarea><div class="actions"><button id="saveNotes" class="primary">Salvar</button></div></section>`;
  document.getElementById('saveNotes').onclick=()=>{state.notes=document.getElementById('notes').value;save();toast('Anotações salvas')};
}
function renderChecklist(){
  const done=Object.values(state.checks).filter(Boolean).length, progress=Math.round(done/D.checklist.length*100)||0;
  main.innerHTML=`<button class="ghost" data-view-link="more">← Voltar</button>
    <div class="section-title"><h2>Checklist</h2><span class="chip">${progress}%</span></div>
    <section class="card"><div class="progress"><span style="width:${progress}%"></span></div>
    ${D.checklist.map((x,i)=>`<label class="check"><input type="checkbox" data-check="${i}" ${state.checks[i]?'checked':''}><span>${esc(x)}</span></label>`).join('')}</section>`;
  document.querySelectorAll('[data-check]').forEach(c=>c.onchange=()=>{state.checks[c.dataset.check]=c.checked;save();renderChecklist()})
}
const DB_NAME='europa2026.docs.v1', STORE='files';
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function putDoc(id,obj){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(obj,id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function getDoc(id){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function deleteDoc(id){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function renderDocuments(){
  const records={}; for(const d of D.documents)records[d.id]=await getDoc(d.id);
  main.innerHTML=`<button class="ghost" data-view-link="more">← Voltar</button>
    <div class="section-title"><h2>Documentos</h2></div>
    <div class="card muted">Por segurança, documentos pessoais não são incluídos no pacote do GitHub. Você pode adicioná-los aqui; eles ficam somente neste navegador.</div>
    <section class="list" style="margin-top:12px">${D.documents.map(d=>`<article class="card doc-card">
      <div class="doc-icon">PDF</div><div class="row-main"><div class="row-title">${esc(d.name)}</div><div class="muted">${records[d.id]?esc(records[d.id].name):esc(d.note)}</div>
      <div class="actions"><button class="secondary add-doc" data-id="${d.id}">${records[d.id]?'Substituir':'Adicionar'}</button>
      ${records[d.id]?`<button class="primary open-doc" data-id="${d.id}">Abrir</button><button class="danger del-doc" data-id="${d.id}">Remover</button>`:''}</div></div>
    </article>`).join('')}</section>`;
  document.querySelectorAll('.add-doc').forEach(b=>b.onclick=()=>{documentForm.docId.value=b.dataset.id;documentDialog.showModal()});
  document.querySelectorAll('.open-doc').forEach(b=>b.onclick=async()=>{const r=await getDoc(b.dataset.id);const url=URL.createObjectURL(r.blob);window.open(url,'_blank');setTimeout(()=>URL.revokeObjectURL(url),60000)});
  document.querySelectorAll('.del-doc').forEach(b=>b.onclick=async()=>{await deleteDoc(b.dataset.id);renderDocuments();toast('Documento removido')});
}
documentForm.addEventListener('submit',async e=>{
  e.preventDefault(); const fd=new FormData(documentForm), file=fd.get('file'), id=fd.get('docId');
  await putDoc(id,{name:file.name,type:file.type,size:file.size,blob:file,updatedAt:Date.now()});
  documentDialog.close();documentForm.reset();renderDocuments();toast('Documento salvo no aparelho');
});
function renderEmergency(){
  main.innerHTML=`<button class="ghost" data-view-link="more">← Voltar</button>
    <div class="section-title"><h2>Emergência</h2></div>
    <section class="list">${D.emergency.map(e=>`<article class="card"><div class="row"><div class="row-main"><div class="row-title">${esc(e.label)}</div><div class="muted">${esc(e.note)}</div></div>
    ${e.phone?`<a class="button primary" href="tel:${e.phone}">Ligar ${e.phone}</a>`:''}</div></article>`).join('')}</section>`;
}
function renderBackup(){
  main.innerHTML=`<button class="ghost" data-view-link="more">← Voltar</button>
    <div class="section-title"><h2>Backup</h2></div>
    <section class="card"><p>Exporte gastos, checklist, tema e anotações em um arquivo JSON.</p>
    <div class="actions"><button id="exportBtn" class="primary">Exportar backup</button><label class="button secondary" style="margin:0">Importar backup<input id="importFile" type="file" accept="application/json" hidden></label></div>
    <p class="muted">Os PDFs armazenados no aparelho não entram no backup JSON.</p></section>`;
  document.getElementById('exportBtn').onclick=()=>{
    const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),state},null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='europa2026-backup.json';a.click();URL.revokeObjectURL(a.href);
  };
  document.getElementById('importFile').onchange=async e=>{
    try{const obj=JSON.parse(await e.target.files[0].text());if(!obj.state)throw new Error();state={...state,...obj.state,view:'home'};save();render();toast('Backup restaurado')}
    catch{alert('Arquivo de backup inválido.')}
  }
}
function render(){
  document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));
  if(state.view==='home')renderHome();
  if(state.view==='itinerary')renderItinerary();
  if(state.view==='expenses')renderExpenses();
  if(state.view==='reservations')renderReservations();
  if(state.view==='more')renderMore();
}
document.querySelectorAll('.bottom-nav button').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;render();scrollTo(0,0)});
document.addEventListener('click',e=>{
  const v=e.target.closest('[data-view-link]'); if(v){state.view=v.dataset.viewLink;render();scrollTo(0,0)}
  const m=e.target.closest('[data-more]'); if(m){state.view='more';renderMore(m.dataset.more);scrollTo(0,0)}
});
document.getElementById('themeBtn').onclick=()=>{state.theme=state.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=state.theme;save()};
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;document.getElementById('installBtn').hidden=false});
document.getElementById('installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice}else alert('No iPhone: Safari → Compartilhar → Adicionar à Tela de Início.')};
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
render();
