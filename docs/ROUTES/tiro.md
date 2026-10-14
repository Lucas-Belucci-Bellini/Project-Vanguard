# `#/tiro` — Cálculo legado (Arma 3)

**Estado:** `LEGACY`

## Objetivo
Preservar a calculadora do ambiente de testes de **Arma 3**, do ecossistema
Projeto Baluarte. Está fora do fluxo do Vanguard Field.

## Entrada
Sistema, modo, posições em MGRS ou grade de terreno do jogo, vento, declinação.

## Dados necessários
`src/data/arma3-terrenos.js` (**gerado**, não editar à mão),
`engine/ballistics.js`, `engine/charges.js`, `engine/fire-mission.js`.

## Dependências
Somente motor puro. Sem rede, sem sensor.

## Ações
Calcular solução de tiro simulada e trocar entre MGRS do mundo real e a grade
de um terreno do jogo.

## Saídas
Elevação, tempo de voo e correções — **referências de modelo dentro do
videogame**.

## Estados
- **LEGACY** — funciona, fica fora do menu e só é alcançada por link direto.
- A tela renderiza um aviso próprio, visível, dizendo o que ela é.

## Limitações
**Os valores não são tabela de tiro, manual, nem orientação para equipamento,
treinamento ou operação real.** A rota não recebe funcionalidade nova e não
deve ser ampliada (`LEGACY-RESTRICTED`). A grade do Arma 3 é invertida em
relação ao MGRS — ver a armadilha registrada em `CLAUDE.md`.

## Testes
`test/ballistics.test.js`, `test/arma3-grid.test.js`;
`test/rotas.test.js` cobra que a rota está marcada como legada, fora do menu, e
que o aviso está na tela.
