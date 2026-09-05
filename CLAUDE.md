# Project Vanguard — contexto pro agente

**Vanguard Field** é um aplicativo civil de navegação offline-first, em
**JavaScript puro + Vite 5**, com GPS/GNSS, MGRS, mapas, trilhas e proteção civil.
Sem TypeScript, sem framework. O repositório também preserva separadamente uma
wiki/ambiente de testes de **Arma 3** (do ecossistema Projeto Baluarte), que contém
módulos balísticos criados somente para simulação e testes dentro do videogame.
Esses módulos nunca foram destinados a ambientes, equipamentos, treinamento ou
operações reais e não fazem parte do fluxo do Vanguard Field.

## 🧭 Comece por aqui

- 👉 [`README.md`](README.md) — o que é e como rodar
- 👉 [`docs/MEGA-PLANO.md`](docs/MEGA-PLANO.md) — plano mestre: stack, arquitetura, roadmap em 4 fases (a Fase 1 está entregue)
- 👉 [`docs/ESCOPO-WIKI-ARMA3-E-MAPAS.md`](docs/ESCOPO-WIKI-ARMA3-E-MAPAS.md) — separação entre Vanguard Field, wiki Arma 3 e contingência cartográfica histórica
- 👉 [`docs/BALISTICA.md`](docs/BALISTICA.md) — a matemática e o contrato JSON
- 👉 [`docs/INTEGRACAO-BALUARTE.md`](docs/INTEGRACAO-BALUARTE.md) — como acopla no Baluarte
- 👉 [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) — **contrato visual**; todo design novo sai daqui
- 👉 [`.claude/skills/vanguard-field-release-ops/SKILL.md`](.claude/skills/vanguard-field-release-ops/SKILL.md) — fluxo reutilizável de testes, campo, atualização e release

## A regra mais importante deste repositório

**`src/engine/` tem zero dependências e zero DOM.** Nada de `window`, nada de
`document`, nada de pacote npm. É o que permite a mesma física rodar no
navegador, no Node, num Web Worker e numa função serverless — e é o que impede
duas implementações do cálculo de divergirem em silêncio.

Precisa de DOM ou de biblioteca? O lugar é `src/ui/` ou `src/pages/`.

## Mapa rápido

- `src/engine/` — motor (ver acima). `index.js` é o barril.
- `src/pages/` — uma tela por rota (`#/mapa`, `#/tiro`, `#/sobre`)
- `src/styles/` — 1 CSS por tela + tokens em `variables.css`
- `src/ui/helpers.js` — hyperscript `h()`, **API idêntica** à do Baluarte de propósito
- `src/core/estado.js` — estado persistido (`vanguard:` no localStorage)
- `src/core/foto-parada.js` + `foto-storage.js` — foto de parada amarrada à coordenada da captura (IndexedDB próprio; ver ADR-0037)
- `src/core/bussola-leitura.js` — os três nortes da bússola; a leitura crua só vira azimute verdadeiro com correção **medida** (Sol ou informada) ou **prevista** (WMM, opt-in e rotulada PREVISTA) — medida ganha sempre (ver ADR-0040 e ADR-0046)
- `src/engine/sol.js` — posição do Sol offline, usada pelo alerta de exposição e pela conferência da bússola
- `src/engine/wmm.js` + `src/data/wmm2025.js` — **declinação magnética pelo World
  Magnetic Model oficial**, offline: o terceiro caminho até o norte verdadeiro,
  para a noite e o dia nublado. Coeficientes **gerados** de `vendor/wmm/WMM.COF`
  por `scripts/gerar-wmm.mjs`, conferidos contra os 12 valores de teste
  publicados. É **previsão**, não medida: entra só quando não há correção medida
  e a leitura vira `PREVISTA`, nunca `CORRIGIDA` (ver ADR-0046)
- `src/engine/visao-noturna.js` + `src/core/camera-noturna.js` — visão noturna (`#/noturno`): **intensificação de luz, não infravermelho**. Empilha quadros (α = 0,2 → 3× menos ruído), estica o histograma só até onde o ruído removido autoriza, e desmancha a pilha medindo a estrutura que ela perde. **Só vê** — não grava, não guarda e não transmite, e há teste estrutural cobrando isso (ver ADR-0044)
- `src/engine/rumo-filtro.js` — filtro circular da bússola: suaviza no vetor unitário (nunca em graus), 3,01× menos tremor parado, e acusa interferência magnética pela retidão da leitura (ver ADR-0044)
- `src/engine/fixo-medio.js` — média de fixos parado para a foto de parada; a melhora **anunciada** é menor que a medida, de propósito (ver ADR-0044)
- `src/engine/escuta.js` + `src/core/escuta-ambiente.js` — escuta de ambiente (`#/escuta`): mede energia por banda no microfone e avisa por vibração quando o grave sobe como sobe um veículo se aproximando, ou quando alguém grita. **Só recebe** — não grava, não guarda e não transmite, e há teste estrutural cobrando isso (ver ADR-0041)
- `src/engine/odometro.js` — distância COM desnível e peneira de ruído; `src/engine/passos.js` + `src/core/passos-sensor.js` contam passos pelo acelerômetro, para onde o GPS não enxerga (ver ADR-0043)
- `src/core/notificacao-jornada.js` — quanto se andou hoje, na tela bloqueada; notificação própria porque o plugin de fundo não deixa trocar o texto da dele
- `src/core/versao.js` + `src/core/service-worker.js` — identidade do build
  (versão, commit, `BUILD_ID`) injetada pelo Vite, e o registro do service
  worker que ela versiona. O grupo **BUILD / RUNTIME** de `#/diagnostico` mostra
  tudo isso na tela (ver ADR-0045)
- `src/core/falhas-tela.js` (+ `falhas-tela-app.js`) — registro das falhas de
  carregamento de tela, mostrado em **Diagnóstico → TELAS**. A classificação é
  o valor: `CHUNK_NAO_CARREGOU` manda investigar o **pacote**, `TELA_FALHOU`
  manda investigar a **página**, e o resto vira `DESCONHECIDO` em vez de
  palpite (ver `docs/MOBILE_WEB_PARITY.md`)
- `src/core/rotas.js` — **a tabela de rotas, fonte única**. Saiu do `main.js`
  quando o autoteste passou a precisar dela. `src/core/autoteste-rotas.js`
  carrega cada uma no aparelho (**Diagnóstico → TESTAR TODAS AS ROTAS**) e
  `src/core/relatorio-diagnostico.js` põe tudo em texto para o operador colar
  (**COPIAR RELATÓRIO**) — sem coordenada, trilha, foto nem contato
- `src/core/dados/` + `src/core/rastreamento.js` — **a V3 de navegação** (ver
  [`docs/v3/`](docs/v3/)). `catalogo.js` declara os 5 stores e as 25 chaves com
  a classe que decide tudo (CRITICO não volta nunca; CACHE se reconstrói);
  `inventario.js` **só lê** e bloqueia migração quando há chave desconhecida,
  ilegível ou leitura parcial; `track-store.js` é append-only **sem teto**, com
  a sessão gravada por checkpoint a cada 25 pontos; `migrar-trilha.js` **copia**
  a trilha v1 e deixa `vanguard:trilha` intacta, conferindo contagem e checksum.
  `rastreamento.js` tira o gravador da página: **página observa, não possui**.
- `src/core/updater/` — **o sistema de atualização** (`#/atualizacoes`).
  Semver da especificação, canais, consulta pela API, download com checksum e
  capacidade por plataforma. Ver [`docs/UPDATER.md`](docs/UPDATER.md)
- `src/engine/numero-seguro.js` — **use sempre**: `Number(null)` é 0, e `lon: null` virando longitude 0 já mordeu três vezes
- `test/` — `node --test`, testes determinísticos
- `.claude/skills/vanguard-field-release-ops/` — skill reutilizável para o Claude Code

## Regras do projeto

- **JS puro (ES2022)**. Sem TypeScript, sem framework. Vite só empacota.
- **Tokens primeiro.** Nenhum hex ou px solto em folha de página — sempre
  `variables.css`. Os nomes de token são os **mesmos do Baluarte** (`--color-cyan`
  = fósforo aqui, ouro lá): é isso que faz um componente atravessar os dois.
- **Por feature**: branch própria → commit → PR (draft) → merge com CI verde.
- **Testes ancorados em algo verificável.** Nada de conferir contra número
  digitado de memória — só constante geodésica publicada, integração numérica
  independente, ou propriedade estrutural (ida-e-volta, simetria, monotonicidade).
- **No legado da wiki de Arma 3, dado de jogo nunca é inventado.** Os valores
  mantidos ali são referências de simulação para o videogame e não constituem
  dados de armamento real, tabela de tiro ou orientação operacional. Não adaptar
  esses módulos para o mundo real; qualquer expansão permanece
  `LEGACY-RESTRICTED`.
- **Nunca reimplementar a física em outra linguagem.** Se um cliente não-JS
  precisar calcular, expor o motor num host Node — uma implementação, dois hosts.

## Armadilhas já pagas (não repita)

- **`.mapa__canvas` é posicionado por FLEX, não `position:absolute`.** O
  `maplibre-gl.css` é importado em runtime e traz `.maplibregl-map{position:relative}`,
  que ganha a cascata e colapsa o contêiner para largura zero.
- **Camada de texto do mapa é canvas 2D**, não `symbol` layer — esta exigiria um
  endpoint de `glyphs` (dependência de rede + fonte alheia).
- **Mil NATO (6400) ≠ MRAD (6283).** O motor guarda radiano e converte só na borda.
- **A grade do Arma 3 está INVERTIDA em relação ao MGRS.** Medido no config: em
  30 dos 31 mundos o `passoY` é negativo (Altis: `offsetY=30720`, `passoY=-100`),
  ou seja o rótulo de northing conta do **norte para o sul** — o oposto do
  `gridref.js`, que é MGRS local e está certo para o que ele descreve. Grade de
  carta do jogo passa por `arma3-grid.js`, que lê offset e **sinal** daquele
  mundo. Assumir convenção espelha o eixo N-S: em Altis, até 30 km de erro.
  O `ChernobylZone` conta para cima — não "conserte" o sinal achando que é dado
  quebrado, há teste cobrindo os dois casos.
- **`src/data/arma3-terrenos.js` é GERADO** por `scripts/arma3/gerar-base-terrenos.py`
  no Projeto Baluarte, que escreve nos dois repos. Editar à mão aqui é perder a
  edição no próximo dump — e fazer as duas bases divergirem em silêncio.
- **Azimute de GRADE, não verdadeiro**, para tiro.
- **Peça e alvo em fusos UTM diferentes**: `gridVector()` reprojeta no fuso da peça.
- **`ventoDirecaoDeg` é de ONDE o vento vem** (convenção METAR).
- **Distância de trilha NUNCA é `haversine` puro.** Ela é 2D: subir escada ou
  ladeira vira "parado", e isso já mordeu em campo. Use `engine/odometro.js`,
  que soma o desnível e peneira o tremor do GPS pela precisão do fixo. Somar em
  3D sem essa peneira é trocar um erro por outro — uma hora sentado vira
  quilômetros (ver ADR-0043).
- **`line-dasharray` não aceita expressão orientada a dado no MapLibre.** Um
  `['case', ...]` nele quebra o estilo em runtime. Trecho com traço diferente
  precisa de CAMADA própria com `filter`.
- **A chave de assinatura do APK é FIXA e versionada** (`android/keystore/`,
  ver ADR-0042). Sem `signingConfigs` o Gradle inventa uma chave nova em cada
  runner do CI e o Android recusa a atualização por conflito de assinatura — a
  build fica verde e o defeito só aparece no aparelho. Não remova esse bloco.
- **Ícone e splash são GERADOS** por `node android/logo/icone.mjs`. Editar PNG
  à mão se perde na próxima geração. O ícone adaptativo só garante o círculo
  central de 66 dp: passar disso é conteúdo cortado em alguns launchers.
- **A escuta compara com o piso do lugar, nunca com um limiar fixo em dB.** O
  mesmo aparelho lê níveis diferentes no bolso, na mão e no vento. O seguidor de
  piso **desce rápido e sobe devagar** de propósito: um piso simétrico subiria
  junto com o caminhão que se aproxima e apagaria o próprio alerta.
- **Nada de `MediaRecorder`, `RTCPeerConnection`, rede ou `destination` na
  escuta.** O grafo termina no `AnalyserNode`. `test/escuta-ambiente.test.js` lê
  o código e falha se alguma dessas aparecer — a decisão é do operador e está no
  código, não só no texto. **A visão noturna segue a mesma lista** (mais
  `captureStream` e `toDataURL`), cobrada por `test/camera-noturna.test.js`.
- **Média de rumo em graus quebra no norte.** A média de 359° e 1° é 180°, o sul
  exato. Rumo se filtra no vetor unitário `(cos, sen)` e só volta a ser ângulo no
  fim — é o que `rumo-filtro.js` faz, e há teste cobrando o cruzamento.
- **Velocidade de giro medida entre dois quadros é ruído, não giro.** A 16 Hz,
  3° de tremor viram 48°/s de "giro" que não existe; o filtro abre sozinho e
  devolve justo o tremor que tirou. Meça no sinal **já filtrado** e sobre uma
  base de tempo longa, com zona morta.
- **`accuracy` do GPS é raio de 95%, não desvio padrão** (é 2,45·σ). Confundir os
  dois estraga o detector de parado nos dois sentidos: ruído normal vira
  "deslocamento" e destrói a média, ou a pessoa anda sem ninguém perceber.
- **Nunca anuncie precisão melhor que a medida.** A média de fixos calcula
  σ/√N, mas erro de GNSS é correlacionado no tempo: o teto anunciado é 2,5×
  enquanto o medido em laboratório é 2,73×. Há teste comparando anunciado com
  erro real.
- **Detectar movimento de câmera pela diferença média entre quadros falha no
  escuro.** Em cena de pouco contraste, varrer a 12 px/quadro produz diferença
  MENOR que o ruído do sensor. Meça o estrago (a estrutura que o acumulado
  perde), não o movimento — e meça numa escala grossa, onde o ruído já foi
  diluído pela média.
- **`Number('')` é 0, e 0 passa em `isFinite` e em qualquer faixa de
  coordenada.** Campo de formulário vazio virou coordenada (0, 0) na tela de
  navegação — distância e rumo para um destino que ninguém informou — e virou
  "declinação medida de 0°" na bússola. Use `numeroFinito`/`coordenadaValida` de
  `engine/numero-seguro.js` em **toda** leitura de `input.value`, nunca
  `Number()` cru.
- **Filtro de exibição não pode alimentar o armazenamento.** A tela de contexto
  carregava `zonasAtivas(...)` e regravava a lista filtrada: uma zona que
  vencia era apagada em definitivo, sem aviso, e a tela ainda dizia "nenhuma
  zona cadastrada". Filtre onde a decisão acontece, guarde tudo.
- **A barra de abas fixa tem ~86 px e come o fim de qualquer página.** Todo
  contêiner que rola precisa de `padding-bottom: calc(86px + env(safe-area-inset-bottom))`
  — **inclusive dentro das media queries**, onde um `padding: 16px` shorthand
  apagava a folga exatamente na largura de celular. Dois botões já ficaram
  inalcançáveis assim. `scripts/verificar-fluxos.mjs` e a medição de rodapé
  cobrem isso.
- **A WebView do Capacitor serve em `http://localhost`, não em `https:`.** O
  registro do service worker exigia `location.protocol === 'https:'` e por isso
  **nunca aconteceu dentro do aplicativo** — em nenhuma versão publicada. Com
  isso o preparo de mapa offline, que espera `navigator.serviceWorker.ready`,
  **travava para sempre sem erro**: `ready` não resolve quando não há registro.
  Use `isSecureContext`, que a especificação define como verdadeiro para
  `localhost`, e pergunte por `getRegistration()` antes de esperar por `ready`.
- **Nome de cache escrito à mão nunca é invalidado.** `vanguard-field-shell-v9`
  atravessou quatro releases idêntico. Com `fetch` cache-first no `index.html`,
  isso prende o app numa versão anterior para sempre — o HTML cacheado aponta
  para chunks antigos, também cacheados, e o botão de atualizar não alcança.
  O nome do cache vem do identificador de build (`/sw.js?v=<build>`), e **HTML
  nunca é cache-first**: só arquivo com hash no nome pode ser.
- **O `fetch` do service worker também passa pelo cache HTTP.** Rede primeiro
  não basta para o documento de entrada: use `cache: 'no-store'` nele, ou o
  `index.html` antigo continua chegando com o novo já no disco (medido).
- **Versão de app escrita à mão vira mentira operacional.** `CONFIGURACAO_APLICATIVO.versao`
  ficou congelada em `'1.3.1'` por quatro releases, e `atualizacao.js` usa esse
  valor como "versão instalada": o app anunciava atualização para uma versão que
  ele já era. A versão vem do `package.json` pelo build, sempre.
- **APK novo NÃO instala por cima de APK com certificado diferente.** A chave
  fixa entrou na 1.3.2; 1.1.0 assina com `38f995fc…` e 1.4.x com `d0100bfd…`.
  O Android recusa a atualização, ela falha, e o aparelho segue na versão
  antiga — que é como "o site tem páginas que o app não tem" acontece sem
  nenhum defeito de build. Diagnóstico → BUILD / RUNTIME responde isso na hora.
- **`npm test` não diz que a interface funciona.** Ele cobre motor e contrato.
  Renderização de rota é `npm run verificar:rotas`; botão que faz o que promete
  é `npm run verificar:fluxos`; **e nenhum dos dois prova que funciona no
  aplicativo** — isso é `npm run verificar:webview`, que serve os assets do APK
  em `http://localhost`. Os três precisam de Playwright + Chromium, que **não**
  são dependências do repositório (o postinstall baixaria navegador em todo
  `npm ci`). A guarda `npm run verificar:paridade` compara `dist/` com os
  assets do **Android e do iOS** por SHA-256 e roda dentro dos `mobile:sync:*`.
- **Montar a tela fora do `try` é branco silencioso.** No `navegacao.js`, o
  `container.append(resultado.elemento)` estava solto: página com `return`
  esquecido, ou export com nome trocado, lançava TypeError que ninguém pegava —
  e como `navegar` roda sem `await` no `hashchange`, virava rejeição não
  tratada. Tela em branco, **sem** o aviso de erro, que é exatamente o que "não
  funciona no aplicativo" parece. Confira o contrato (`resultado.elemento`) e
  monte dentro do `try`.
- **Erro que só é pintado é erro perdido.** O aviso de falha some na navegação
  seguinte e nunca chega a quem precisa. Registre em `falhas-tela.js` antes de
  mostrar: rota, build e causa classificada é o que separa "não abre" de "o
  chunk da rota X não chegou ao pacote".
- **Assets de plataforma são GERADOS e ignorados pelo git** (`ios/.gitignore:4`,
  `android/.gitignore:96`). Clone limpo nasce sem eles e isso **não** é defeito
  — `cap sync` preenche. O que era defeito: `mobile:sync:ios` não rodava guarda
  nenhuma, então a cópia do iOS não era conferida por ninguém. Hoje
  `verificar:paridade` cobre as duas plataformas.
- **Lista de rotas copiada para um teste envelhece em silêncio.**
  `test/rotas-empacotadas.test.js` lê o `ROTAS` do próprio `src/core/rotas.js` e
  cobra três coisas: a página existe, ela exporta o que a rota consome, e o
  build produz o chunk dela. Sem isso, "adicionei a página e esqueci metade da
  cadeia" só aparece no aparelho.
- **`var(--token-que-nao-existe)` é descartado em SILÊNCIO.** Sem fallback, a
  declaração inteira vira inválida e some — sem erro, sem aviso. Foi assim que
  `--color-ambar` (que nunca existiu; o real é `--color-warning`) deixou o
  rótulo ATENÇÃO do diagnóstico com a cor do texto normal. O repositório tinha
  **34 referências órfãs em 10 folhas**, com `--color-ambar` e `--color-amber`
  convivendo. `test/tokens-definidos.test.js` cobra isso e tranca o teto.
- **Nenhum teste desta máquina alcança a WebView do aparelho do operador.**
  `verificar:webview` roda os bytes do APK, mas num Chromium desta máquina e
  sem o runtime do Capacitor. Para o ramo NATIVO e para o aparelho real, quem
  responde é o autoteste dentro do app (**Diagnóstico → TESTAR TODAS AS
  ROTAS**) e o relatório copiável.
- **A tag deste projeto é `mobile-v1.4.4`, não `v1.4.4`.** O comparador antigo
  fazia `replace(/^v/i,'')` e depois `split('-')`: a base virava `"mobile"`,
  a versão era classificada como inválida, e `releaseMaisNova` devolvia `false`
  para TODA release real. O app nunca detectou atualização nenhuma. Extraia a
  versão de dentro da tag (`updater/semver.js`), nunca assuma onde ela começa.
- **Capacidade de plataforma se DECLARA, não se finge.** O Android não instala
  APK aqui: falta `REQUEST_INSTALL_PACKAGES`, falta `FileProvider` e plugin, e
  a pipeline publica debug/não assinado. `updater/plataformas.js` reporta isso
  e a interface mostra — oferecer um botão que falharia no aparelho é pior que
  não oferecer.
- **Coeficiente de modelo científico não se digita, e teste não guarda cópia
  dos valores de referência.** O WMM são 90 linhas de quatro números: um dígito
  trocado não quebra nada visível, só move o norte magnético alguns graus no
  lugar errado do planeta. O arquivo oficial mora em `vendor/wmm/` com SHA-256,
  `scripts/gerar-wmm.mjs` é a única ponte, e `test/wmm.test.js` **lê** o
  `WMM2025_TEST_VALUES.txt` oficial em vez de trazer os números para dentro —
  copiar 12 linhas de 19 números para o teste é o jeito de ele passar a
  concordar com o erro. Atenção ao `-0`: `String(-0)` é `"0"`, e sem cuidado o
  gerado deixa de ser transcrição fiel.
- **Previsão de modelo não é medida, e o nome tem de dizer isso.** O WMM prevê o
  campo da TERRA — não vê o ímã da capa, a lataria do carro nem o erro do
  magnetômetro deste aparelho. Correção do Sol mede a declinação do lugar **e** o
  erro do aparelho; a do modelo supõe a segunda metade. Por isso `PREVISTA` ≠
  `CORRIGIDA`, o modelo é opt-in, e medida ganha sempre.
- **Polo GEOGRÁFICO não é polo MAGNÉTICO.** No polo Sul geográfico a inclinação
  do campo fica perto de −72°, não vertical. Teste de polo cobra **continuidade
  e finitude** (o termo leste divide por cos da latitude geocêntrica), nunca um
  valor "óbvio" de dip.
- **A versão do app mora em QUATRO lugares e só um é fonte.** `package.json`,
  `android/app/build.gradle` (`versionName` + `versionCode`) e as duas
  configurações do Xcode. O iOS ficou em **1.3.1 por seis releases** porque
  ninguém cobrava. `test/versao-plataformas.test.js` cobra — inclusive que o
  `versionCode` suba, já que o Android recusa instalar um código menor ou igual
  ao instalado e a build fica verde do mesmo jeito.
- **A trilha era um array em `localStorage` com `.slice(-12000)`.** Três
  defeitos num só: descartava os pontos mais ANTIGOS em silêncio a partir de
  ≈24 km de caminhada; reescrevia o array inteiro a cada fixo (1,53 MB de
  `JSON.stringify` por ponto, contra ~5 MB de cota); e uma escrita interrompida
  perdia a gravação, não o último ponto. Hoje é IndexedDB append-only
  (`src/core/dados/track-store.js`). **Ponto vai ao disco na hora; contador vai
  por checkpoint** — medido, regravar a sessão a cada fixo custava 1,182 ms/ponto
  contra 0,600 com checkpoint, e morrer entre checkpoints não perde ponto porque
  `recuperar()` reconcilia pelos pontos gravados.
- **Limite de validação na saída prende o dado do operador.** O mesmo
  `LIMITE_TRILHA` valia para importar e exportar: 4 001 pontos eram gravados e
  **não conseguiam sair do aparelho** em nenhum formato. Entrada de fora precisa
  de teto; saída do que já é do operador, não. E o teto de importação tem de
  cobrir o que a exportação produz, senão o backup não volta.
- **Vão de sinal somado vira distância inventada.** 100 m + 3 min sem sinal +
  400 m adiante + 100 m dava **599 m** no odômetro. A reta entre dois fixos
  separados por um buraco é palpite. Meça o observado e **declare** o não
  observado ao lado (`src/engine/distancia.js`).
- **Gravador dentro da página morre com a página.** O `desmontar()` do
  `mapa.js` derrubava watcher e background: trocar de `#/mapa` para `#/bussola`
  encerrava o rastreamento sem aviso. Serviço de rastreamento fica FORA das
  páginas; deixar de observar nunca para nada.
- **Teste de referência que tira a verdade do próprio motor não prova nada.**
  Ele registra o defeito do dia e passa a concordar com ele. Em
  `test/dados/trilhas-douradas.js` a distância verdadeira vem da GEOMETRIA que
  gerou a trilha, calculada antes de existir ruído.
- **Número agregado esconde de onde veio.** O benchmark dá 6,39× de redução de
  erro — e 7 das 8 trilhas medem exatamente igual à 1.6.0, com uma só
  respondendo por 100% do ganho. O relatório imprime essa ressalva sozinho, de
  propósito.
- **Item de flex que cresce precisa de `min-width: 0`.** O padrão é
  `min-width: auto`: ele se recusa a encolher abaixo do próprio conteúdo e
  empurra o resto para fora da tela. Mordeu no cabeçalho (1.2.0) e de novo na
  legenda da tela noturna. Há lint em `test/viewport-travado.test.js`.

## Aviso que acompanha o produto

Os módulos balísticos legados são ferramentas de teste e simulação **do videogame
Arma 3**. Seus dados são referências de modelo dentro desse ambiente virtual,
não tabela de tiro oficial, manual ou orientação para ambientes reais. Eles estão
fora do fluxo do Vanguard Field e não devem ser usados, adaptados ou interpretados
para armas, equipamentos, treinamento ou operações reais.
