# Project Vanguard — contexto pro agente

GPS topográfico tático + computador de tiro (estética Arma 3), em
**JavaScript puro + Vite 5**. Sem TypeScript, sem framework. Parte do
ecossistema **Projeto Baluarte** — repo irmão, mesmas regras.

## 🧭 Comece por aqui

- 👉 [`README.md`](README.md) — o que é e como rodar
- 👉 [`docs/MEGA-PLANO.md`](docs/MEGA-PLANO.md) — plano mestre: stack, arquitetura, roadmap em 4 fases (a Fase 1 está entregue)
- 👉 [`docs/BALISTICA.md`](docs/BALISTICA.md) — a matemática e o contrato JSON
- 👉 [`docs/INTEGRACAO-BALUARTE.md`](docs/INTEGRACAO-BALUARTE.md) — como acopla no Baluarte
- 👉 [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) — **contrato visual**; todo design novo sai daqui

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
- `test/` — `node --test`, 54 testes

## Regras do projeto

- **JS puro (ES2022)**. Sem TypeScript, sem framework. Vite só empacota.
- **Tokens primeiro.** Nenhum hex ou px solto em folha de página — sempre
  `variables.css`. Os nomes de token são os **mesmos do Baluarte** (`--color-cyan`
  = fósforo aqui, ouro lá): é isso que faz um componente atravessar os dois.
- **Por feature**: branch própria → commit → PR (draft) → merge com CI verde.
- **Testes ancorados em algo verificável.** Nada de conferir contra número
  digitado de memória — só constante geodésica publicada, integração numérica
  independente, ou propriedade estrutural (ida-e-volta, simetria, monotonicidade).
- **Dado de armamento nunca é inventado.** Guarda-se (v₀, alcance publicado) e
  **deriva-se** o arrasto com `calibrarArrasto()`. Há teste rejeitando pares
  fisicamente impossíveis.
- **Nunca reimplementar a física em outra linguagem.** Se um cliente não-JS
  precisar calcular, expor o motor num host Node — uma implementação, dois hosts.

## Armadilhas já pagas (não repita)

- **`.mapa__canvas` é posicionado por FLEX, não `position:absolute`.** O
  `maplibre-gl.css` é importado em runtime e traz `.maplibregl-map{position:relative}`,
  que ganha a cascata e colapsa o contêiner para largura zero.
- **Camada de texto do mapa é canvas 2D**, não `symbol` layer — esta exigiria um
  endpoint de `glyphs` (dependência de rede + fonte alheia).
- **Mil NATO (6400) ≠ MRAD (6283).** O motor guarda radiano e converte só na borda.
- **Azimute de GRADE, não verdadeiro**, para tiro.
- **Peça e alvo em fusos UTM diferentes**: `gridVector()` reprojeta no fuso da peça.
- **`ventoDirecaoDeg` é de ONDE o vento vem** (convenção METAR).

## Aviso que acompanha o produto

Ferramenta de treino e simulação. Dados de armamento são referência de modelo,
não tabela de tiro oficial. Os limites do modelo estão declarados na tela
`#/sobre` — mantenha-os lá e atualizados.
