# `#/navegacao` — Leitura de posição e rumo

**Estado:** `IMPLEMENTED`

## Objetivo
Mostrar a posição atual em todos os formatos usados em campo e calcular
distância e rumo até um waypoint digitado.

## Entrada
Latitude e longitude do waypoint; uma coordenada MGRS para converter.

## Dados necessários
Fixo do GPS (acompanhamento contínuo, modo `trilha`).

## Dependências
`core/localizacao.js`, `core/navegacao-rumo.js`, `engine/mgrs.js`,
`engine/numero-seguro.js`.

## Ações
- **CALCULAR RUMO** — distância geodésica e azimute até o waypoint.
- **CONVERTER MGRS** — MGRS → latitude/longitude, local, sem rede.
- **ABRIR NO MAPA** — leva a `#/mapa`.

## Saídas
Latitude, longitude, MGRS, UTM, elevação, precisão; distância em linha reta e
rumo com o cardeal.

## Estados
- **LOADING** — antes do primeiro fixo (`POSIÇÃO ATUAL INDISPONÍVEL`).
- **SUCCESS** — valores vivos, atualizados a cada fixo.
- **EMPTY** — sem waypoint: pede latitude e longitude, e **não** calcula nada.
- **ERROR** — coordenada fora de faixa, com a faixa aceita na mensagem.
- **UNAVAILABLE** — elevação ausente aparece como
  `DADOS DE ELEVAÇÃO INDISPONÍVEIS`, nunca como zero.

## Limitações
O rumo é **geodésico em linha reta** — a direção para onde apontar, não o
caminho a percorrer. Rumo de bússola (com os três nortes) é `#/bussola`.

## Testes
`test/navegacao-rumo.test.js`, `test/coords.test.js`, `test/numero-seguro.test.js`;
fluxos 1–4 de `scripts/verificar-fluxos.mjs` (campo vazio, destino válido,
faixa inválida, conversor).
