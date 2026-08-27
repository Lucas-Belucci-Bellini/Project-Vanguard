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

## Aviso que acompanha o produto

Os módulos balísticos legados são ferramentas de teste e simulação **do videogame
Arma 3**. Seus dados são referências de modelo dentro desse ambiente virtual,
não tabela de tiro oficial, manual ou orientação para ambientes reais. Eles estão
fora do fluxo do Vanguard Field e não devem ser usados, adaptados ou interpretados
para armas, equipamentos, treinamento ou operações reais.
