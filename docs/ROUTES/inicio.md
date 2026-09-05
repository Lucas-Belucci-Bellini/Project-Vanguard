# `#/inicio` — Painel de partida

**Estado:** `IMPLEMENTED`

## Objetivo
Responder, numa tela, se o aparelho está pronto para sair andando: há posição,
há mapa offline, há trilha em curso, o app está instalado para funcionar sem rede.

## Entrada
Nenhuma digitada. A tela lê o estado que as outras telas gravaram.

## Dados necessários
`estado` (`vanguard:` no localStorage): `LOCAL`, `TRILHA`, `ROTA_ATIVA`,
`ROTA_PAUSADA`, `WAYPOINTS`, `MAPAS_OFFLINE`. Ambiente: registro do service
worker (`navigator.serviceWorker.controller`).

## Dependências
`core/estado.js`, `core/localizacao.js` (`solicitarPosicao`),
`core/prontidao-offline.js` (`avaliarProntidaoOffline`).

## Ações
- **Obter posição** — pede um fixo ao GPS e grava em `LOCAL`.
- **Atalhos de rota** — levam a `#/mapa`, `#/navegacao`, `#/bussola`, `#/socorro`.

## Saídas
Indicadores de prontidão e o resumo da trilha em curso. Nada sai do aparelho.

## Estados
- **LOADING** — enquanto o fixo é pedido.
- **SUCCESS** — indicadores com valor real.
- **EMPTY** — sem trilha e sem waypoint, dito com todas as letras.
- **ERROR** — GPS recusado ou falho, com o motivo do sistema.
- **UNAVAILABLE** — sem geolocalização no ambiente.

## Limitações
Os indicadores descrevem o **aparelho**, não o terreno. "Mapa offline pronto"
significa que há tiles guardados, não que eles cobrem o caminho.

## Testes
`test/prontidao-offline.test.js`, `test/estado.test.js`;
render e ausência de exceção em `scripts/verificar-rotas.mjs`.
