export type Currency = 'EUR'|'USD'|'DKK'|'CHF'|'BRL';
export type Place = {
  id:string; name:string; city:string; country:string; address?:string;
  lat?:number; lng?:number; verified?:boolean; source?:string; wikiTitle?:string; note?:string;
};
export type Activity = {
  id:string; date:string; time?:string; title:string; category:string; city:string;
  placeId?:string; status:'confirmado'|'planejado'|'lembrete'; paid?:'sim'|'nao'|'parcial';
  note?:string; amount?:number; currency?:Currency; people?:string;
};
export type Day = {date:string; city:string; country:string; title:string; hotel?:string; heroWiki?:string; activities:Activity[]};

export const trip = {
  start: '2026-09-17', end: '2026-10-02', adults: 3, children: 1,
  travelers: ['Filipe','Rafaella','Martín','Maria Esther'],
  rates: {EUR_USD:1.16, DKK_USD:6.75, CHF_USD:0.80},
  motherShare:0.28, motherTransportShare:1/3,
};

export const wallets = [
  {id:'eurcash', name:'Euro em espécie', currency:'EUR' as Currency, balance:1200, owner:'Caixa único', note:'€1.200 já em mãos'},
  {id:'usdnomad', name:'Nomad USD', currency:'USD' as Currency, balance:2800, owner:'Filipe', note:'US$2.800 já disponíveis'},
  {id:'eurplanned', name:'Compra planejada EUR', currency:'EUR' as Currency, balance:1200, owner:'Filipe', planned:true, note:'Compra planejada para otimizar cashback'},
  {id:'usdplanned', name:'Compra planejada USD', currency:'USD' as Currency, balance:1000, owner:'Filipe', planned:true, note:'Compra planejada para otimizar cashback'},
];

export const places: Place[] = [
  {id:'1hotel',name:'1 Hotel Copenhagen',city:'Copenhague',country:'Dinamarca',address:'Krystalgade 22, 1172 København K, Denmark',note:'Hotel base em Copenhague'},
  {id:'torvehallerne',name:'TorvehallerneKBH',city:'Copenhague',country:'Dinamarca',address:'Frederiksborggade 21, 1362 København K, Denmark',lat:55.6836,lng:12.5715,verified:true,source:'https://torvehallernekbh.dk/',wikiTitle:'Torvehallerne'},
  {id:'noma',name:'Noma',city:'Copenhague',country:'Dinamarca',address:'Refshalevej 96, 1432 København K, Denmark',lat:55.68292,lng:12.61048,verified:true,source:'https://guide.michelin.com/dk/en/capital-region/kobenhavn/restaurant/noma',wikiTitle:'Noma_(restaurant)'},
  {id:'labanchina',name:'La Banchina',city:'Copenhague',country:'Dinamarca',address:'Refshalevej 141, 1432 København K, Denmark',lat:55.6867,lng:12.6165,verified:true,source:'https://www.labanchina.dk/',wikiTitle:'Refshaleøen'},
  {id:'zoo',name:'Copenhagen Zoo',city:'Copenhague',country:'Dinamarca',address:'Roskildevej 32, 2000 Frederiksberg, Denmark',lat:55.6728,lng:12.5214,verified:true,source:'https://www.zoo.dk/en/about-us/contact-us',wikiTitle:'Copenhagen_Zoo'},
  {id:'tivoli',name:'Tivoli Gardens',city:'Copenhague',country:'Dinamarca',address:'Vesterbrogade 3, 1630 København V, Denmark',lat:55.6737,lng:12.5681,verified:true,source:'https://www.tivoli.dk/',wikiTitle:'Tivoli_Gardens'},
  {id:'barr',name:'Restaurant Barr',city:'Copenhague',country:'Dinamarca',address:'Strandgade 93, 1401 København K, Denmark',lat:55.6773,lng:12.5940,verified:true,source:'https://restaurantbarr.com/',wikiTitle:'Christianshavn'},
  {id:'dop',name:'DØP - Den Økologiske Pølsemand',city:'Copenhague',country:'Dinamarca',address:'Købmagergade 52A, 1150 København K, Denmark'},
  {id:'nhflower',name:'NH Collection Amsterdam Flower Market',city:'Amsterdã',country:'Países Baixos',address:'Vijzelstraat 4, 1017 HK Amsterdam, Netherlands',lat:52.3661,lng:4.8932,verified:true,wikiTitle:'Munttoren'},
  {id:'jordaan',name:'Jordaan',city:'Amsterdã',country:'Países Baixos',lat:52.3746,lng:4.8806,verified:true,wikiTitle:'Jordaan'},
  {id:'annefrank',name:'Casa de Anne Frank',city:'Amsterdã',country:'Países Baixos',address:'Westermarkt 20, 1016 GV Amsterdam, Netherlands',lat:52.3752,lng:4.8840,verified:true,source:'https://www.annefrank.org/',wikiTitle:'Anne_Frank_House',note:'Passar em frente; não assumir ingresso'},
  {id:'kinderboek',name:'De Kinderboekwinkel',city:'Amsterdã',country:'Países Baixos',address:'Rozengracht 34, 1016 NC Amsterdam, Netherlands'},
  {id:'davies',name:"Davie's Amsterdam",city:'Amsterdã',country:'Países Baixos',address:'Amsterdam, Netherlands',note:'Almoço incluído no roteiro de 24/09; abrir no Maps por nome'},
  {id:'heineken',name:'Heineken Experience',city:'Amsterdã',country:'Países Baixos',address:'Stadhouderskade 78, 1072 AE Amsterdam, Netherlands',lat:52.3579,lng:4.8918,verified:true,wikiTitle:'Heineken_Experience'},
  {id:'frankfurtHbf',name:'Frankfurt Hauptbahnhof',city:'Frankfurt',country:'Alemanha',address:'Am Hauptbahnhof, 60329 Frankfurt am Main, Germany',lat:50.1071,lng:8.6638,verified:true,wikiTitle:'Frankfurt_(Main)_Hauptbahnhof'},
  {id:'baden',name:'Baden-Baden',city:'Baden-Baden',country:'Alemanha',lat:48.7606,lng:8.2398,verified:true,wikiTitle:'Baden-Baden'},
  {id:'cathedral',name:'Cathédrale Notre-Dame de Strasbourg',city:'Estrasburgo',country:'França',address:'Pl. de la Cathédrale, 67000 Strasbourg, France',lat:48.5818,lng:7.7508,verified:true,wikiTitle:'Strasbourg_Cathedral'},
  {id:'petite',name:'La Petite France',city:'Estrasburgo',country:'França',lat:48.5790,lng:7.7390,verified:true,wikiTitle:'Petite_France,_Strasbourg'},
  {id:'vauban',name:'Barrage Vauban',city:'Estrasburgo',country:'França',lat:48.5792,lng:7.7371,verified:true,wikiTitle:'Barrage_Vauban'},
  {id:'europapark',name:'Europa-Park',city:'Rust',country:'Alemanha',address:'Europa-Park-Straße 2, 77977 Rust, Germany',lat:48.2660,lng:7.7220,verified:true,source:'https://www.europapark.de/',wikiTitle:'Europa-Park'},
  {id:'colmar',name:'Centro histórico de Colmar',city:'Colmar',country:'França',lat:48.0794,lng:7.3585,verified:true,wikiTitle:'Colmar'},
  {id:'eguisheim',name:'Eguisheim',city:'Eguisheim',country:'França',lat:48.0427,lng:7.3062,verified:true,wikiTitle:'Eguisheim'},
  {id:'riquewihr',name:'Riquewihr',city:'Riquewihr',country:'França',lat:48.1660,lng:7.2970,verified:true,wikiTitle:'Riquewihr'},
  {id:'novotel',name:'Novotel Zurich City West',city:'Zurique',country:'Suíça',address:'Schiffbaustrasse 13, 8005 Zürich, Switzerland',lat:47.3894,lng:8.5169,verified:true,source:'https://all.accor.com/',wikiTitle:'Zürich_West'},
  {id:'laderach',name:'House of Läderach',city:'Bilten',country:'Suíça',address:'Grabenstrasse 6, 8865 Bilten, Switzerland',lat:47.1485,lng:9.0194,verified:true,source:'https://houseofladerach.com/',wikiTitle:'Bilten'},
  {id:'maienfeld',name:'Maienfeld',city:'Maienfeld',country:'Suíça',lat:47.0044,lng:9.5319,verified:true,wikiTitle:'Maienfeld'},
  {id:'flasch',name:'Fläsch',city:'Fläsch',country:'Suíça',lat:47.0250,lng:9.5130,verified:true,wikiTitle:'Fläsch'},
  {id:'lindt',name:'Lindt Home of Chocolate',city:'Kilchberg',country:'Suíça',address:'Schokoladenplatz 1, 8802 Kilchberg, Switzerland',lat:47.3166,lng:8.5525,verified:true,source:'https://www.lindt-home-of-chocolate.com/',wikiTitle:'Lindt_&_Sprüngli'},
  {id:'oldtown',name:'Zürich Altstadt',city:'Zurique',country:'Suíça',lat:47.3717,lng:8.5423,verified:true,wikiTitle:'Altstadt_(Zürich)'},
  {id:'zrh',name:'Zurich Airport',city:'Zurique',country:'Suíça',lat:47.4581,lng:8.5555,verified:true,wikiTitle:'Zurich_Airport'}
];

const a=(x:Activity)=>x;
export const days: Day[] = [
  {date:'2026-09-17',city:'São Paulo',country:'Brasil',title:'Embarque internacional',heroWiki:'São_Paulo/Guarulhos_International_Airport',activities:[
    a({id:'d1a1',date:'2026-09-17',time:'16:35',title:'Turkish Airlines • GRU → IST → CPH',category:'Voo',city:'São Paulo',status:'confirmado',paid:'sim',note:'Localizador VS4V2N • assentos Preferred'})]},
  {date:'2026-09-18',city:'Copenhague',country:'Dinamarca',title:'Chegada e instalação',hotel:'1 Hotel Copenhagen',heroWiki:'Copenhagen',activities:[
    a({id:'d2a1',date:'2026-09-18',time:'18:20',title:'Chegada a Copenhague',category:'Transporte',city:'Copenhague',status:'confirmado'}),
    a({id:'d2a2',date:'2026-09-18',title:'Check-in • 1 Hotel Copenhagen',category:'Hotel',city:'Copenhague',placeId:'1hotel',status:'confirmado'}),
    a({id:'d2a3',date:'2026-09-18',title:'Aamanns take-away',category:'Alimentação',city:'Copenhague',status:'planejado'})]},
  {date:'2026-09-19',city:'Copenhague',country:'Dinamarca',title:'Mercado + Noma',hotel:'1 Hotel Copenhagen',heroWiki:'Copenhagen',activities:[
    a({id:'d3a1',date:'2026-09-19',title:'Torvehallerne',category:'Passeio',city:'Copenhague',placeId:'torvehallerne',status:'planejado'}),
    a({id:'d3a2',date:'2026-09-19',title:'Konges Sløjd + UNIQLO',category:'Compras',city:'Copenhague',status:'planejado'}),
    a({id:'d3a3',date:'2026-09-19',time:'17:00',title:'Noma • shared table',category:'Restaurante',city:'Copenhague',placeId:'noma',status:'confirmado',paid:'parcial',amount:3000,currency:'DKK',people:'Filipe + Rafaella',note:'Menu já pago. Wine pairing de 3.000 DKK a pagar no dia. Táxi ida e volta.'})]},
  {date:'2026-09-20',city:'Copenhague',country:'Dinamarca',title:'Sauna + Barr + família',hotel:'1 Hotel Copenhagen',heroWiki:'Refshaleøen',activities:[
    a({id:'d4a1',date:'2026-09-20',time:'07:00',title:'La Banchina • sauna até 10h30',category:'Experiência',city:'Copenhague',placeId:'labanchina',status:'confirmado',paid:'nao',amount:450,currency:'DKK'}),
    a({id:'d4a2',date:'2026-09-20',time:'12:30',title:'Restaurant Barr • almoço',category:'Restaurante',city:'Copenhague',placeId:'barr',status:'confirmado',note:'Reserva confirmada para 20/09 às 12h30'}),
    a({id:'d4a3',date:'2026-09-20',title:'Zoo / Tivoli • bloco flexível conforme energia',category:'Família',city:'Copenhague',placeId:'zoo',status:'planejado',note:'Evitar apertar o ritmo após sauna e almoço. Tivoli segue como opção.'})]},
  {date:'2026-09-21',city:'Copenhague',country:'Dinamarca',title:'Copenhague flexível',hotel:'1 Hotel Copenhagen',heroWiki:'Copenhagen',activities:[
    a({id:'d5a1',date:'2026-09-21',title:'DØP • almoço rápido',category:'Alimentação',city:'Copenhague',placeId:'dop',status:'planejado'}),
    a({id:'d5a2',date:'2026-09-21',title:'Tivoli / Zoo • completar o que não coube no domingo',category:'Família',city:'Copenhague',placeId:'tivoli',status:'planejado'})]},
  {date:'2026-09-22',city:'Amsterdã',country:'Países Baixos',title:'Voo e chegada',hotel:'NH Collection Flower Market',heroWiki:'Amsterdam',activities:[
    a({id:'d6a1',date:'2026-09-22',time:'14:45',title:'KLM KL1272 • CPH → AMS',category:'Voo',city:'Copenhague',status:'confirmado'}),
    a({id:'d6a2',date:'2026-09-22',time:'16:05',title:'Chegada a Amsterdã',category:'Transporte',city:'Amsterdã',status:'confirmado'}),
    a({id:'d6a3',date:'2026-09-22',title:'Check-in • NH Collection Flower Market',category:'Hotel',city:'Amsterdã',placeId:'nhflower',status:'confirmado'}),
    a({id:'d6a4',date:'2026-09-22',title:'Buka Bakery',category:'Alimentação',city:'Amsterdã',status:'planejado'})]},
  {date:'2026-09-23',city:'Amsterdã',country:'Países Baixos',title:'Centro e chocolates',hotel:'NH Collection Flower Market',heroWiki:'Amsterdam',activities:[
    a({id:'d7a1',date:'2026-09-23',title:"Rudi's Original Stroopwafels",category:'Alimentação',city:'Amsterdã',status:'planejado'}),
    a({id:'d7a2',date:'2026-09-23',title:'Original Beans',category:'Compras',city:'Amsterdã',status:'planejado'}),
    a({id:'d7a3',date:'2026-09-23',title:"Tony's Chocolonely",category:'Compras',city:'Amsterdã',status:'planejado'}),
    a({id:'d7a4',date:'2026-09-23',title:'Heineken Experience • Rafaella + Maria Esther',category:'Experiência',city:'Amsterdã',placeId:'heineken',status:'planejado',note:'Filipe fica com Martín e faz programa a pé nas proximidades.'})]},
  {date:'2026-09-24',city:'Amsterdã',country:'Países Baixos',title:'Jordaan com Martín',hotel:'NH Collection Flower Market',heroWiki:'Jordaan',activities:[
    a({id:'d8a1',date:'2026-09-24',title:'Jordaan',category:'Passeio',city:'Amsterdã',placeId:'jordaan',status:'confirmado'}),
    a({id:'d8a2',date:'2026-09-24',title:'Passar em frente à Casa de Anne Frank',category:'Passeio',city:'Amsterdã',placeId:'annefrank',status:'confirmado'}),
    a({id:'d8a3',date:'2026-09-24',title:'De Kinderboekwinkel',category:'Família',city:'Amsterdã',placeId:'kinderboek',status:'confirmado'}),
    a({id:'d8a4',date:'2026-09-24',title:"Almoço • Davie's Amsterdam",category:'Alimentação',city:'Amsterdã',placeId:'davies',status:'confirmado'})]},
  {date:'2026-09-25',city:'Frankfurt',country:'Alemanha',title:'Trem para Frankfurt',hotel:'25hours / hotel próximo à estação',heroWiki:'Frankfurt',activities:[
    a({id:'d9a1',date:'2026-09-25',time:'16:33',title:'Trem Amsterdam Centraal → Frankfurt',category:'Trem',city:'Amsterdã',status:'confirmado',paid:'sim',amount:1953.25,currency:'BRL'}),
    a({id:'d9a2',date:'2026-09-25',time:'20:27',title:'Chegada prevista em Frankfurt',category:'Transporte',city:'Frankfurt',placeId:'frankfurtHbf',status:'confirmado'})]},
  {date:'2026-09-26',city:'Estrasburgo',country:'França',title:'Carro + Baden-Baden + Estrasburgo',hotel:'Hotel em Estrasburgo',heroWiki:'Strasbourg',activities:[
    a({id:'d10a1',date:'2026-09-26',time:'10:00',title:'Retirada do carro em Frankfurt',category:'Carro',city:'Frankfurt',status:'confirmado',note:'GLC / X3 / Q5 como referência de categoria'}),
    a({id:'d10a2',date:'2026-09-26',title:'Baden-Baden • parada e almoço',category:'Rota',city:'Baden-Baden',placeId:'baden',status:'planejado'}),
    a({id:'d10a3',date:'2026-09-26',title:'Catedral Notre-Dame',category:'Passeio',city:'Estrasburgo',placeId:'cathedral',status:'planejado'})]},
  {date:'2026-09-27',city:'Estrasburgo',country:'França',title:'Petite France',hotel:'Hotel em Estrasburgo',heroWiki:'Petite_France,_Strasbourg',activities:[
    a({id:'d11a1',date:'2026-09-27',title:'La Petite France',category:'Passeio',city:'Estrasburgo',placeId:'petite',status:'planejado'}),
    a({id:'d11a2',date:'2026-09-27',title:'Ponts Couverts + Barrage Vauban',category:'Passeio',city:'Estrasburgo',placeId:'vauban',status:'planejado'}),
    a({id:'d11a3',date:'2026-09-27',title:'Batorama',category:'Passeio',city:'Estrasburgo',status:'planejado'}),
    a({id:'d11a4',date:'2026-09-27',title:'La Corde à Linge',category:'Alimentação',city:'Estrasburgo',status:'planejado'})]},
  {date:'2026-09-28',city:'Colmar',country:'França',title:'Europa-Park + Colmar',hotel:'Ibis Styles Colmar Centre',heroWiki:'Europa-Park',activities:[
    a({id:'d12a1',date:'2026-09-28',title:'Europa-Park',category:'Parque',city:'Rust',placeId:'europapark',status:'confirmado',paid:'sim',note:'3 ingressos adultos + estacionamento reservado • pedido 11416339'}),
    a({id:'d12a2',date:'2026-09-28',title:'Centro histórico de Colmar',category:'Passeio',city:'Colmar',placeId:'colmar',status:'planejado'}),
    a({id:'d12a3',date:'2026-09-28',time:'18:00',title:'LEMBRETE • falar com a vinícola de Fläsch',category:'Lembrete',city:'Colmar',status:'lembrete',note:'Contato solicitado 2 dias antes da visita.'})]},
  {date:'2026-09-29',city:'Zurique',country:'Suíça',title:'Vilarejos da Alsácia + chegada',hotel:'Novotel Zurich City West',heroWiki:'Eguisheim',activities:[
    a({id:'d13a1',date:'2026-09-29',title:'Eguisheim',category:'Passeio',city:'Eguisheim',placeId:'eguisheim',status:'planejado'}),
    a({id:'d13a2',date:'2026-09-29',title:'Riquewihr',category:'Passeio',city:'Riquewihr',placeId:'riquewihr',status:'planejado'}),
    a({id:'d13a3',date:'2026-09-29',title:'Chegada ao Novotel Zurich City West',category:'Hotel',city:'Zurique',placeId:'novotel',status:'confirmado',note:'Meta: chegar até 18h.'})]},
  {date:'2026-09-30',city:'Zurique / Graubünden',country:'Suíça',title:'Läderach + Maienfeld + Fläsch',hotel:'Novotel Zurich City West',heroWiki:'Maienfeld',activities:[
    a({id:'d14a1',date:'2026-09-30',title:'House of Läderach',category:'Experiência',city:'Bilten',placeId:'laderach',status:'planejado'}),
    a({id:'d14a2',date:'2026-09-30',title:'Maienfeld',category:'Passeio',city:'Maienfeld',placeId:'maienfeld',status:'planejado'}),
    a({id:'d14a3',date:'2026-09-30',title:'Degustação em Fläsch',category:'Vinho',city:'Fläsch',placeId:'flasch',status:'confirmado',paid:'nao',amount:50,currency:'CHF',people:'Rafaella + Maria Esther',note:'CHF 25 por pessoa; somente 2 pessoas fazem a degustação.'})]},
  {date:'2026-10-01',city:'Zurique',country:'Suíça',title:'Lindt + Old Town',hotel:'Novotel Zurich City West',heroWiki:'Zürich',activities:[
    a({id:'d15a1',date:'2026-10-01',time:'10:00',title:'Lindt Home of Chocolate',category:'Experiência',city:'Kilchberg',placeId:'lindt',status:'confirmado',paid:'sim'}),
    a({id:'d15a2',date:'2026-10-01',title:'Old Town',category:'Passeio',city:'Zurique',placeId:'oldtown',status:'planejado'}),
    a({id:'d15a3',date:'2026-10-01',title:'Jantar no hotel ou Old Town, conforme energia',category:'Alimentação',city:'Zurique',status:'planejado'})]},
  {date:'2026-10-02',city:'Zurique',country:'Suíça',title:'Retorno ao Brasil',hotel:'Novotel Zurich City West',heroWiki:'Zurich_Airport',activities:[
    a({id:'d16a1',date:'2026-10-02',time:'12:00',title:'Devolução do carro',category:'Carro',city:'Zurique',status:'confirmado'}),
    a({id:'d16a2',date:'2026-10-02',title:'Almoço na sala VIP',category:'Alimentação',city:'Zurique',placeId:'zrh',status:'planejado'}),
    a({id:'d16a3',date:'2026-10-02',time:'13:40',title:'Voo de retorno',category:'Voo',city:'Zurique',placeId:'zrh',status:'confirmado'})]}
];

export const seedChecklist = [
  {id:'c1',label:'Passaportes dos 4 viajantes',category:'Documentos',priority:'alta'},
  {id:'c2',label:'Seguros viagem e certificados Mastercard',category:'Documentos',priority:'alta'},
  {id:'c3',label:'Reservas de hotéis, voos e trem',category:'Reservas',priority:'alta'},
  {id:'c4',label:'CNH, PID e contrato da locadora',category:'Carro',priority:'alta'},
  {id:'c5',label:'Cartão Nomad + cartões principais',category:'Financeiro',priority:'media'},
  {id:'c6',label:'Medicamentos e receitas',category:'Documentos',priority:'alta'},
  {id:'c7',label:'Carregadores e adaptadores',category:'Bagagem',priority:'media'},
  {id:'c8',label:'Comprar €1.200 + US$1.000 para otimizar cashback',category:'Financeiro',priority:'alta'},
  {id:'c9',label:'Falar com vinícola de Fläsch em 28/09',category:'Reserva',priority:'alta'}
];

export const seedDocuments = [
  {id:'doc1',name:'Seguro viagem • Maria Esther',type:'Seguro viagem',traveler:'Maria Esther',original:'travel_insurance_Ferreira Leão_09931289805.pdf'},
  {id:'doc2',name:'Seguro viagem • Filipe',type:'Seguro viagem',traveler:'Filipe',original:'travel_insurance_Ferreira_33677189802.pdf'},
  {id:'doc3',name:'Seguro viagem • Rafaella',type:'Seguro viagem',traveler:'Rafaella',original:'travel_insurance_Nunes Ferreira_GI025091.pdf'},
  {id:'doc4',name:'Seguro viagem • Martín',type:'Seguro viagem',traveler:'Martín',original:'travel_insurance_Nunes Ferreira_GN947948.pdf'},
  {id:'doc5',name:'Certificado Mastercard • Maria Esther',type:'Elegibilidade',traveler:'Maria Esther',original:'certificado_de_elegibilidade_09931289805(1).pdf'},
  {id:'doc6',name:'Certificado Mastercard • Filipe',type:'Elegibilidade',traveler:'Filipe',original:'certificado_de_elegibilidade_33677189802.pdf'},
  {id:'doc7',name:'Certificado Mastercard • Rafaella',type:'Elegibilidade',traveler:'Rafaella',original:'certificado_de_elegibilidade_GI025091.pdf'},
  {id:'doc8',name:'Certificado Mastercard • Martín',type:'Elegibilidade',traveler:'Martín',original:'certificado_de_elegibilidade_GN947948.pdf'},
  {id:'doc9',name:'Europa-Park • ingressos + estacionamento',type:'Ingresso',traveler:'Família',original:'ihre-tickets-11416339.pdf'}
];

export const insurancePhones = [
  ['Dinamarca','8001-6098'],['Alemanha','0800-819-1040'],['França','0-800-90-1387'],['Países Baixos','0800-022-5821'],['Suíça','0800-89-7092'],['Outros países','+1 636 722 7111'],['Brasil / sinistro','0800-891-3294']
];
