# `#/bussola` — Bússola de campo

**Estado:** `IMPLEMENTED`

## Objetivo
Dar uma agulha utilizável e **dizer quando ela não merece confiança** — o que
inclui recusar-se a mostrar azimute verdadeiro sem correção medida.

## Entrada
Declinação magnética conhecida (opcional); apontar o aparelho para o Sol
(calibração); rumo travado.

## Dados necessários
`deviceorientation` / `deviceorientationabsolute` do aparelho; posição (para o
Sol e para a convergência de meridianos); destino, quando houver.

## Dependências
`core/bussola-leitura.js`, `engine/rumo-filtro.js`, `engine/sol.js`,
`engine/mgrs.js`, `engine/angles.js`, `engine/numero-seguro.js`.

## Ações
- **Ativar sensor** — pede permissão de orientação (iOS exige gesto).
- **USAR ESTA DECLINAÇÃO** — aplica a correção informada.
- **Calibrar pelo Sol** — mede a correção contra o azimute solar.
- **Travar rumo** — guarda o rumo atual como referência.

## Saídas
Rumo do sensor, azimute verdadeiro e de grade (**só com correção**), cardeal,
rumo ao destino, desvio e lado, estabilidade da leitura.

## Estados
- **LOADING** — sensor pedido, primeira leitura não chegou.
- **SUCCESS** — agulha viva e estável.
- **EMPTY** — sem correção: verdadeiro e grade ficam `null`, com o motivo.
- **ERROR** — dispersão alta com o aparelho parado é anunciada como
  **interferência magnética**.
- **UNAVAILABLE** — sem sensor de orientação, dito na tela.

## Limitações
Não há modelo magnético embarcado: a declinação vem do operador ou do Sol.
Sol abaixo de 5° ou acima de 70° não serve para calibrar.

## Testes
`test/bussola-leitura.test.js`, `test/rumo-filtro.test.js`, `test/sol.test.js`;
fluxos 5–6 de `scripts/verificar-fluxos.mjs` (declinação vazia e válida).
