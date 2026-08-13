# Europa 2026 — Central Operacional v2

Rebuild completo do aplicativo da viagem, pensado como PWA mobile-first e offline-first.

## O que mudou

- **Novo lançamento de gasto**: modal refeito com fechamento por botão, toque fora e tecla ESC; o scroll da página sempre é restaurado ao fechar.
- **Cofre de documentos**: ao carregar um arquivo, o usuário escolhe o **nome visível no app antes de salvar**. O nome original é preservado apenas como referência.
- **Privacidade**: documentos reais são armazenados no **IndexedDB do próprio navegador**, não no repositório GitHub. Não suba passaportes, seguros ou PDFs pessoais para repositório público.
- **Roteiro visual**: cards com imagens carregadas da Wikipedia quando disponíveis, fallback visual quando offline.
- **Mapa operacional**: pins com coordenadas verificadas em OpenStreetMap e botão individual para abrir cada lugar no Google Maps.
- **Caixa único**: posição atual e compra planejada separadas visualmente. Base atual: €1.200 em espécie + US$2.800 Nomad; compra planejada: +€1.200 +US$1.000.
- **Ops**: checklist, lembrete da vinícola de Fläsch e telefones de assistência por país.
- **PWA**: service worker simples, manifest e layout otimizado para iPhone.

## Dados importantes incorporados

- Noma 19/09 às 17h, shared table; wine pairing pendente considerado em **3.000 DKK**.
- Restaurant Barr 20/09 às **12h30**.
- La Banchina 20/09, sauna 07h–10h30, 450 DKK.
- Amsterdã 24/09: Jordaan, passar em frente à Casa de Anne Frank, De Kinderboekwinkel e almoço no Davie's Amsterdam.
- Lembrete em 28/09 para contatar a vinícola em Fläsch; degustação 30/09, CHF 25 por pessoa para Rafaella e Maria Esther.
- Europa-Park em 28/09/2026, pedido 11416339, com estacionamento reservado.
- Hotel final atualizado para **Novotel Zurich City West**.
- Lindt Home of Chocolate em 01/10 às 10h.
- Devolução do carro em Zurique em 02/10 às 12h.

## Instalação local

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

## Deploy

Pode ser publicado em Vercel, Netlify, Cloudflare Pages ou GitHub Pages. Para GitHub Pages, ajuste `base` no Vite se o projeto ficar em um subdiretório.

## Fonte da base

O rebuild foi consolidado a partir da planilha auditada `Base_Desenvolvimento_Europa_2026_Auditada_Caixa_Unico(1).xlsx`, dos PDFs de seguro/Europa-Park já fornecidos e das alterações de roteiro confirmadas posteriormente na conversa.

### Geolocalização

O app só cria pins quando há latitude/longitude cadastrada como verificada. Locais cujo ponto exato não foi fixado na base abrem no Google Maps por busca de nome/endereço, evitando inventar coordenadas.

