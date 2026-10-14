# ADR-0045 — paridade web/mobile: onde a cadeia quebra, e onde ela não quebrava

- **Status:** Aceita
- **Data:** 2026-09-02
- **Escopo:** `public/sw.js`, `src/core/service-worker.js`, `src/core/versao.js`, `src/core/configuracao.js`, `index.html`, `vite.config.js`, `scripts/verificar-paridade.mjs`, `scripts/verificar-webview.mjs`, diagnóstico

## Contexto

Relato: *"as páginas novas aparecem no site, mas não aparecem ou não funcionam
no aplicativo Android"* — tratado como `P0 — WEB/MOBILE PARITY BUG`.

A hipótese natural é que a cadeia `src → build → dist → cap sync → android →
APK` esteja perdendo conteúdo em algum ponto. **Ela não estava.** O APK
publicado da 1.4.1 foi baixado e aberto: contém os 44 chunks, incluindo
`navegacao`, `escuta` e `noturno`, e contém as correções da própria 1.4.1
(`"Informe latitude e longitude do waypoint"`, `TELA LEGADA`). Servido numa
origem `http://localhost` — a que a WebView usa — o bundle do APK renderiza as
**12 abas**, com todas as rotas abrindo.

Ou seja: **uma instalação limpa da 1.4.1 já tinha paridade.** O problema estava
antes e depois disso.

## O que estava realmente acontecendo

### A causa do sintoma relatado: o APK novo não instala por cima do antigo

Os certificados de assinatura foram extraídos dos APKs publicados (parser do
APK Signing Block validado contra o valor que o `apksigner` do CI registrou
para a 1.4.1):

| release | certificado (SHA-256) |
|---|---|
| 1.1.0 | `38f995fc66976839fefd3116275fdee5b66381202ebe5cc3ac43cd08febc197e` |
| 1.4.1 | `d0100bfddf7c3e8594ef8816c9ae379b8b2eb68935711b198d533e88663ca100` |

São **certificados diferentes** — a chave fixa entrou na 1.3.2 (ADR-0042).
O Android recusa uma atualização que troca de certificado, e a instalação
falha. O aparelho continua rodando a versão antiga.

E o bundle da 1.1.0, medido, mostra exatamente **9 abas**: `inicio`, `mapa`,
`bussola`, `socorro`, `doar`, `contexto`, `sobrevivencia`, `sobre`,
`diagnostico` — **sem** Navegação, Escuta e Noturno. É o sintoma relatado,
letra por letra.

**O caminho é desinstalar antes de instalar a 1.3.2 ou posterior.** A 1.3.2 já
avisava disso; o que faltava era o aplicativo conseguir dizer que versão ele é.

### Os defeitos reais encontrados no caminho

**1. O service worker nunca registrou dentro do aplicativo.** O registro estava
no `index.html` sob `location.protocol === 'https:'`, e a WebView do Capacitor
com `useLegacyBridge: true` serve em **`http://localhost`**. Consequência
medida: o preparo de mapa offline conversa com o service worker e espera
`navigator.serviceWorker.ready`, que **nunca resolve sem registro** — o botão
"Preparar área offline" travava para sempre, sem erro e sem aviso, em todas as
versões publicadas.

**2. O cache do service worker nunca era invalidado.** O nome era a constante
escrita à mão `vanguard-field-shell-v9` — idêntica em 1.1.0 e em 1.4.1, quatro
releases depois. Somado a um `fetch` **cache-first para tudo, inclusive o
`index.html`**, isso é a receita de um aplicativo preso numa versão anterior
para sempre: o `index.html` cacheado aponta para chunks de nomes antigos, que
também estão no cache. O botão de atualizar não conseguiria consertar, porque o
nome do cache não mudava nem depois do `skipWaiting`.

Este defeito não chegou a causar o sintoma **no aplicativo** — justamente
porque o service worker nunca registrava lá. Mas ele valia no site, e passaria
a valer no aplicativo assim que o defeito 1 fosse corrigido. Corrigir um sem o
outro teria transformado uma correção em regressão.

**3. A versão do aplicativo estava congelada em `'1.3.1'`.** Não era só um
número errado numa tela: `atualizacao.js` usa esse valor como "a versão
instalada" para comparar com a última release. O app rodando 1.4.1 se achava
1.3.1, anunciava atualização para uma versão que ele já era, e nunca poderia
dizer que estava em dia.

**4. Não havia como perguntar ao aparelho que bundle ele estava rodando.**
Descobrir isso exigiu baixar o APK publicado e comparar chunks.

## Decisão

### O registro do service worker vale em qualquer contexto seguro

`isSecureContext` no lugar de `protocol === 'https:'`. A especificação define
`localhost` como contexto seguro — que é exatamente onde o aplicativo roda. O
registro saiu do `index.html` e virou `src/core/service-worker.js`, para poder
usar o identificador de build injetado no bundle.

### O cache do shell é versionado pelo build; o de tiles não

O service worker é registrado em `/sw.js?v=<build>`, e o nome do cache vem daí.
Build novo é service worker novo, cache novo, e o `activate` apaga os caches de
builds anteriores **pelo prefixo**.

O cache de **tiles** fica fora desse prefixo, de propósito. O shell é
descartável: sumiu, baixa de novo. Os tiles são o mapa que a pessoa preparou
antes de sair, possivelmente a única cópia que ela tem do terreno. Apagá-los a
cada atualização seria destruir trabalho dela num momento em que ela pode não
ter rede para refazer.

### HTML nunca vem do cache antes da rede

Só arquivo com hash no nome (`/assets/index-AbC123.js`) pode ser cache-first —
o nome muda quando o conteúdo muda, então esse cache é seguro por construção.
O documento de entrada vai à rede **com `cache: 'no-store'`**, porque o `fetch`
do service worker também passa pelo cache HTTP do navegador, e foi por ele que
o `index.html` antigo continuou chegando mesmo com o novo no disco (medido).

### Identidade de build no bundle e na tela

`vite.config.js` injeta `__APP_VERSION__`, `__BUILD_COMMIT__` e `__BUILD_ID__`.
`#/diagnostico` ganhou o grupo **BUILD / RUNTIME**: versão, bundle, commit,
execução (aplicativo ou navegador), origem, contexto seguro, service worker e
WebView. Descobrir se o aparelho está com um APK velho vira leitura de tela.

Nada disso é segredo: o SHA é público e a versão está na release.

### Guardas que falham no CI, não no aparelho

- `npm run verificar:paridade` — compara `dist/` com
  `android/app/src/main/assets/public/` por **conteúdo** (SHA-256), exige que
  todo arquivo do dist chegue idêntico, lista os arquivos que o Capacitor
  injeta, e confere que a versão do `package.json` está dentro do bundle
  empacotado. Roda dentro de `mobile:sync:android`, então o workflow o executa
  antes de qualquer Gradle. Testado: falha com código 1 quando um arquivo é
  adulterado.
- `npm run verificar:webview` — serve **os assets do APK** em
  `http://localhost`, com user agent de Android, e abre as 13 rotas com ida e
  volta, classificando erros em `ROUTER_ERROR`, `BUNDLE_ERROR`, `ASSET_ERROR`,
  `WEBVIEW_ERROR`, `NATIVE_BRIDGE_ERROR` e `FEATURE_ERROR`.

## Consequências

- O aplicativo passa a ter service worker: ganha shell offline e o preparo de
  mapa offline deixa de travar.
- Onde não há registro, a tela **diz** que o preparo está indisponível em vez
  de girar para sempre.
- Uma versão nova nunca mais pode ficar presa atrás de um cache antigo.
- `npm test` continua não sendo evidência de interface: agora há três scripts
  para os três ambientes (web, fluxos, WebView).

## O que continua verdade e não foi mascarado

- **Instalar 1.3.2 ou posterior por cima de 1.1.0/1.2.0 exige desinstalar.**
  Nenhuma mudança de software desfaz uma troca de certificado — é o Android
  protegendo o aparelho, e está certo.
- Este trabalho **não** foi validado num aparelho físico. A WebView do sistema,
  as permissões e os plugins nativos só existem lá. O que foi validado é a
  cadeia até os bytes empacotados e o comportamento deles na origem da WebView.

## Alternativas descartadas

- **Criar uma versão da página para Android.** Duas implementações divergem em
  silêncio; é a arquitetura que este repositório existe para não ter.
- **Desligar o service worker.** Resolveria a staleness e mataria o mapa
  offline, que é a razão de o aplicativo existir.
- **`skipWaiting()` sempre.** Trocaria o bundle debaixo de uma tela aberta, no
  meio de uma caminhada. A atualização continua confirmada pelo operador.
