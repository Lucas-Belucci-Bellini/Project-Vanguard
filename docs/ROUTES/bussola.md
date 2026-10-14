# `#/bussola` — Bússola de campo

**Estado:** `IMPLEMENTED`

## Objetivo
Dar uma agulha utilizável e **dizer quando ela não merece confiança** — o que
inclui recusar-se a mostrar azimute verdadeiro sem correção, e distinguir na
tela uma correção **medida** de uma **prevista** por modelo.

## Entrada
Declinação magnética conhecida (opcional); apontar o aparelho para o Sol
(calibração); ligar o modelo magnético (opcional); rumo travado.

## Dados necessários
`deviceorientation` / `deviceorientationabsolute` do aparelho; posição (para o
Sol, para a convergência de meridianos e para o modelo magnético); destino,
quando houver. Os coeficientes do WMM são embarcados — nenhuma rede.

## Dependências
`core/bussola-leitura.js`, `engine/rumo-filtro.js`, `engine/sol.js`,
`engine/wmm.js` (+ `data/wmm2025.js`), `engine/mgrs.js`, `engine/angles.js`,
`engine/numero-seguro.js`.

## Ações
- **Ativar sensor** — pede permissão de orientação (iOS exige gesto).
- **USAR ESTA DECLINAÇÃO** — aplica a correção informada.
- **Calibrar pelo Sol** — mede a correção contra o azimute solar.
- **USAR A DECLINAÇÃO DO MODELO** — liga o WMM como correção **prevista**.
  Fica desabilitado quando há correção medida, dizendo por quê.
- **Travar rumo** — guarda o rumo atual como referência.

## Saídas
Rumo do sensor, azimute verdadeiro e de grade (**só com correção**), a fonte
da correção (Sol · informada · modelo), cardeal, rumo ao destino, desvio e
lado, estabilidade da leitura, e a declinação do lugar segundo o modelo — que
aparece mesmo com o modelo desligado, porque serve para conferir uma calibração
suspeita.

## Estados
- **LOADING** — sensor pedido, primeira leitura não chegou.
- **SUCCESS** — agulha viva e estável.
- **EMPTY** — sem correção: verdadeiro e grade ficam `null`, com o motivo.
- **PREVISTO** — corrigido pelo modelo: a tela escreve PREVISTO, nunca
  CORRIGIDO, e o aviso declara a hipótese (o aparelho entrega norte magnético).
- **ERROR** — dispersão alta com o aparelho parado é anunciada como
  **interferência magnética**.
- **UNAVAILABLE** — sem sensor de orientação, dito na tela.

## Limitações
O modelo prevê o campo da **Terra**: ele não vê o ímã da capa, a lataria do
carro nem o erro de fábrica do magnetômetro deste aparelho. Por isso a correção
medida (Sol ou informada) ganha sempre, e o modelo é opt-in.

O WMM2025 vale de **2025,0 a 2030,0**; fora disso o motor recusa em vez de
extrapolar, e o Diagnóstico avisa quando falta menos de um ano.

Sol abaixo de 5° ou acima de 70° não serve para calibrar.

## Testes
`test/bussola-leitura.test.js`, `test/rumo-filtro.test.js`, `test/sol.test.js`,
`test/wmm.test.js` (12 pontos oficiais do WMM nos 19 campos); fluxos 5–8 de
`scripts/verificar-fluxos.mjs` (declinação vazia, válida, modelo previsto, e
medida ganhando de prevista).
