# Paridade Web → App

> Uma aplicação, três destinos. As páginas vivem em `src/pages/` e são
> distribuídas para Web, Android e iOS. **Não existe página só de mobile**, e a
> Fase 9 do pedido do operador proíbe criar uma — a correção é sempre na cadeia
> de distribuição.

```
SRC → Vite → dist → Capacitor → Android/iOS → WebView → MESMAS ROTAS → MESMAS PÁGINAS
```

## Matriz por rota — medida em 2026-09-02, versão 1.4.2

| Rota | Web | Android | iOS | Resultado |
| --- | :-: | :-: | :-: | --- |
| `#/inicio` | OK | OK | ⚠ | abre, navega e volta idêntica nos dois pacotes |
| `#/mapa` | OK | OK | ⚠ | idem; 27 controles ativos |
| `#/navegacao` | OK | OK | ⚠ | idem |
| `#/bussola` | OK | OK | ⚠ | idem |
| `#/socorro` | OK | OK | ⚠ | idem |
| `#/escuta` | OK | OK | ⚠ | idem |
| `#/noturno` | OK | OK | ⚠ | idem |
| `#/doar` | OK | OK | ⚠ | idem (rota `UNAVAILABLE` por contrato: sem serviço de pagamento) |
| `#/contexto` | OK | OK | ⚠ | idem |
| `#/sobrevivencia` | OK | OK | ⚠ | idem |
| `#/sobre` | OK | OK | ⚠ | idem |
| `#/diagnostico` | OK | OK | ⚠ | idem |
| `#/tiro` (legada) | OK | OK | ⚠ | fora do menu, marcada como legado na tela |

**Nenhuma rota falha em nenhum destino medido.** Nenhuma abre vazia, nenhuma
volta para outra rota, nenhuma registra erro de router, bundle, asset ou
WebView.

### O que cada coluna vale — e o que ela não vale

| Coluna | Como foi medida | O que prova |
| --- | --- | --- |
| **Web** | `npm run verificar:rotas` — Chromium a 320 e 390 px | a página renderiza no navegador |
| **Android** | `npm run verificar:webview` — os **bytes de `android/app/src/main/assets/public`** servidos em `http://localhost` com user agent Android, motor Chromium | o pacote que vai no APK funciona no motor que o Android usa |
| **iOS** ⚠ | os **bytes de `ios/App/App/public`** (SHA-256 idêntico ao `dist`), renderizados em **Chromium** | os bytes chegam certos e renderizam — **mas não em WKWebView** |

**O `⚠` do iOS é honesto e proposital.** Este ambiente não tem WebKit
(`/opt/pw-browsers` só traz Chromium) e não tem macOS/Xcode, então:

- ✅ provado: os 49 arquivos do `dist` chegam a `ios/App/App/public` com hash
  idêntico, e esses bytes renderizam as 13 rotas com as 12 abas.
- ❌ **não** provado: comportamento em **WKWebView**, o motor real do iOS.
  Nem a build do IPA, nem instalação em aparelho.

Marcar `OK` na coluna do iOS seria inventar evidência. Ele vira `OK` quando
alguém rodar `npm run verificar:webview` com WebKit numa máquina que o tenha,
ou abrir o app num aparelho.

---

## Causa raiz — o que realmente estava quebrado, e o que não estava

A investigação de 1.4.2 **derrubou a hipótese** de que a cadeia de build
estivesse quebrada. O APK publicado da 1.4.1 foi baixado e aberto: continha os
44 arquivos, com as páginas novas. A cadeia estava intacta.

**A causa do sintoma relatado foi o certificado de assinatura.** A chave fixa
entrou na 1.3.2 (ADR-0042); a 1.1.0 assina com `38f995fc…` e a 1.4.x com
`d0100bfd…`. O Android **recusa** substituir um app instalado por outro com
certificado diferente: a instalação falha em silêncio e o aparelho **continua
na versão antiga** — cujo bundle tem exatamente as abas que o operador via.

> Nenhum defeito de build produziu o sintoma. A atualização nunca chegou ao aparelho.

### Defeitos reais encontrados e corrigidos no caminho

| # | Defeito | Onde | Versão |
| --- | --- | --- | --- |
| 1 | Service worker **nunca registrou** dentro do app (gate `https:`, mas a WebView serve `http://localhost`) — o preparo de mapa offline travava para sempre, sem erro | `index.html` → `src/core/service-worker.js` | 1.4.2 |
| 2 | Nome do cache escrito à mão (`…-v9`) nunca invalidado + `fetch` cache-first no HTML = app preso numa versão anterior | `public/sw.js` | 1.4.2 |
| 3 | O `fetch` do service worker também passa pelo cache HTTP: o `index.html` antigo continuava chegando | `public/sw.js` | 1.4.2 |
| 4 | Versão do app congelada em `'1.3.1'`, usada como "versão instalada" pelo atualizador | `src/core/configuracao.js` | 1.4.2 |
| 5 | **`container.append(resultado.elemento)` fora do `try`**: página com `return` esquecido ou export com nome errado dava **tela branca sem aviso** (rejeição não tratada, porque `navegar` roda sem `await` no `hashchange`) | `src/core/navegacao.js` | 1.4.3 |
| 6 | Falha de tela era **pintada e esquecida** — sumia na navegação seguinte, não chegava ao diagnóstico | `src/main.js` → `src/core/falhas-tela.js` | 1.4.3 |
| 7 | `mobile:sync:ios` **não rodava guarda de paridade** — a cópia do iOS não era conferida por ninguém | `package.json` + `scripts/verificar-paridade.mjs` | 1.4.3 |

**Não é defeito:** `ios/App/App/public` e `android/…/assets/public` nascerem
vazios num clone limpo. Os dois são **gerados** e ignorados pelo git
(`ios/.gitignore:4`, `android/.gitignore:96`); `cap sync` os preenche.

---

## Como diagnosticar uma página nova que "não funciona no app"

### 1. O aparelho está rodando o build que você acha?

**Diagnóstico → BUILD / RUNTIME:**

| Campo | O que responde |
| --- | --- |
| Versão do app | a versão rodando. Compare com a release. |
| Bundle web | `versao+commit.AAAAMMDDHHMM` — identifica o build exato |
| Commit | o SHA que gerou este bundle |
| Execução | `APLICATIVO · android` ou `NAVEGADOR · web` |
| Origem | `http://localhost` no app; o domínio no site |
| Contexto seguro | se não, não há service worker nem cache offline |
| Service worker | registrado, controlando, ou ausente |

**Versão menor que a da release ⇒ o APK instalado é antigo.** Causa mais comum:
conflito de certificado (veja acima). Desinstale e instale de novo.

### 2. A tela falhou? O aparelho guarda a evidência.

**Diagnóstico → TELAS** lista as falhas de carregamento registradas, com rota,
causa classificada e build:

| Classificação | Significado | Onde investigar |
| --- | --- | --- |
| `MÓDULO NÃO CHEGOU` (`CHUNK_NAO_CARREGOU`) | o `import()` dinâmico não trouxe o arquivo | **pacote**: chunk ausente ou origem que não serve — é o sintoma de paridade quebrada |
| `TELA_FALHOU` | o módulo carregou e executou, mas lançou | **página**: defeito dela, ou API que a plataforma não tem |
| `DESCONHECIDO` | não deu para separar | não chutar; olhar o console |

A distinção é o ponto: um manda investigar o empacotamento, o outro a página.
Trocá-los manda o diagnóstico para o lado oposto do defeito.

---

## Como gerar um pacote corretamente

```bash
npm test                       # motor, contratos e a cadeia rota→módulo→chunk
npm run mobile:sync:android    # build + cap sync + guarda de paridade (SHA-256)
npm run mobile:sync:ios        # o mesmo, para iOS — a guarda agora roda aqui também
npm run verificar:webview      # as rotas nos bytes que vão para o pacote
```

A guarda de paridade roda **dentro** dos `mobile:sync:*`, então o workflow de
release a executa antes de qualquer Gradle: assets divergentes do `dist` param
o build no CI, não no bolso de quem está em campo.

### Instalação limpa (Fase 11)

Testar por cima de uma instalação antiga deixa cache e assets antigos como
variável. O caminho que elimina isso:

```
build novo → sync novo → APK novo → DESINSTALAR a versão antiga → instalar → testar
```

Depois de instalar, **confira Diagnóstico → BUILD / RUNTIME** antes de concluir
qualquer coisa sobre uma página: sem isso você pode estar testando o build
anterior e não saber.

---

## Testes que trancam esta cadeia

| Teste | O que quebra se alguém errar |
| --- | --- |
| `test/rotas-empacotadas.test.js` | rota sem página, página sem o export que a rota consome, ou página sem chunk no build |
| `test/navegacao.test.js` | tela que não devolve `elemento` voltando a dar branco silencioso |
| `test/falhas-tela.test.js` | classificação de falha errada — confundir "módulo não chegou" com "a tela quebrou" |
| `test/sw-policy.test.js` | cache não versionado pelo build, ou HTML servido cache-first |
| `scripts/verificar-paridade.mjs` | qualquer arquivo do `dist` que não chegue idêntico ao Android **ou ao iOS** |

Os três primeiros rodam em `npm test`. A verificação de chunk se auto-pula sem
`dist/`, para o `npm test` continuar valendo num clone limpo — e o CI, que
builda, sempre a recebe.

## Limitações conhecidas

- **iOS não foi testado em WKWebView nem em aparelho.** Veja o `⚠` na matriz.
- **Nenhum teste aqui substitui o aparelho físico.** WebView do sistema,
  permissões concedidas, plugins nativos e o comportamento de instalação só
  existem lá.
- `npm run verificar:rotas`, `:fluxos` e `:webview` precisam de Playwright +
  Chromium, que **não** são dependências do repositório: o postinstall baixaria
  um navegador em todo `npm ci`.
