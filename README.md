# Europa 2026 — aplicativo final

Aplicativo PWA estático pronto para um único deploy no GitHub Pages.

## Módulos consolidados

1. Estrutura PWA e funcionamento offline
2. Carteiras, despesas, saldos e responsável pelo gasto
3. Roteiro detalhado com busca e links de navegação
4. Reservas
5. Documentos privados salvos localmente no navegador
6. Checklist, emergência, anotações, backup e modo escuro

## Publicação

1. Crie um repositório público ou privado chamado `europa2026`.
2. Extraia o ZIP.
3. Envie **todo o conteúdo da pasta**, não a pasta em si, para a raiz da branch `main`.
4. Em **Settings → Pages**, escolha:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/(root)`
5. Salve.

Endereço:

`https://SEU-USUARIO.github.io/europa2026/`

## Instalação no celular

### iPhone
Abra no Safari → Compartilhar → Adicionar à Tela de Início.

### Android
Abra no Chrome → menu → Instalar app.

## Privacidade

Os certificados de seguro e outros documentos pessoais **não foram incluídos** no ZIP, pois um repositório público os exporia na internet.

O aplicativo possui uma área “Documentos” para anexá-los depois da publicação. Eles ficam armazenados apenas no navegador do aparelho por IndexedDB e não são enviados ao GitHub.

## Observações

- O modo offline passa a funcionar depois da primeira abertura com internet.
- Gastos, checklist, tema e anotações ficam salvos no aparelho.
- Use a função de backup antes de trocar de celular ou limpar o navegador.
