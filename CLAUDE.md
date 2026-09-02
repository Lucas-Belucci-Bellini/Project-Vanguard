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
- `src/core/bussola-leitura.js` — os três nortes da bússola; a leitura crua só vira azimute verdadeiro com correção medida (ver ADR-0040)
- `src/engine/sol.js` — posição do Sol offline, usada pelo alerta de exposição e pela conferência da bússola
- `src/engine/visao-noturna.js` + `src/core/camera-noturna.js` — visão noturna (`#/noturno`): **intensificação de luz, não infravermelho**. Empilha quadros (α = 0,2 → 3× menos ruído), estica o histograma só até onde o ruído removido autoriza, e desmancha a pilha medindo a estrutura que ela perde. **Só vê** — não grava, não guarda e não transmite, e há teste estrutural cobrando isso (ver ADR-0044)
- `src/engine/rumo-filtro.js` — filtro circular da bússola: suaviza no vetor unitário (nunca em graus), 3,01× menos tremor parado, e acusa interferência magnética pela retidão da leitura (ver ADR-0044)
- `src/engine/fixo-medio.js` — média de fixos parado para a foto de parada; a melhora **anunciada** é menor que a medida, de propósito (ver ADR-0044)
- `src/engine/escuta.js` + `src/core/escuta-ambiente.js` — escuta de ambiente (`#/escuta`): mede energia por banda no microfone e avisa por vibração quando o grave sobe como sobe um veículo se aproximando, ou quando alguém grita. **Só recebe** — não grava, não guarda e não transmite, e há teste estrutural cobrando isso (ver ADR-0041)
- `src/engine/odometro.js` — distância COM desnível e peneira de ruído; `src/engine/passos.js` + `src/core/passos-sensor.js` contam passos pelo acelerômetro, para onde o GPS não enxerga (ver ADR-0043)
- `src/core/notificacao-jornada.js` — quanto se andou hoje, na tela bloqueada; notificação própria porque o plugin de fundo não deixa trocar o texto da dele
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
