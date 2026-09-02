# `#/mapa` — Mapa de campo

**Estado:** `IMPLEMENTED`

## Objetivo
Ver onde se está, registrar por onde se andou e levar isso embora num arquivo.
É a tela central do aplicativo.

## Entrada
Toque no mapa (destino, waypoint), coordenada digitada (`LAT, LON`), arquivo
importado (JSON/GPX/KML), foto da câmera.

## Dados necessários
GPS do aparelho; tiles do provedor de mapa (rede ou cache); `TRILHA`,
`WAYPOINTS`, `DESTINO`, `ROTA_ATIVA` no `estado`; fotos de parada em IndexedDB
(`vanguard-fotos-parada`).

## Dependências
`core/map-engine.js` + `core/maplibre-adapter.js` (MapLibre vem por CDN, sob
demanda — não é dependência npm), `core/trilha.js`, `engine/odometro.js`,
`engine/fixo-medio.js`, `core/foto-parada.js`, `core/foto-storage.js`,
`core/registro-*.js`, `platform/camera.js`, `platform/compartilhamento.js`.

## Ações
Iniciar/pausar/encerrar rota · marcar waypoint · definir destino · trocar
basemap · centralizar · foto da parada (com a coordenada da captura) ·
exportar JSON/GPX/KML · importar registro · montar pacote da caminhada ·
apagar parada.

## Saídas
Trilha desenhada (trecho a pé e trecho de veículo em camadas separadas),
distância com desnível, arquivos de registro, pacote para o menu de
compartilhar do sistema.

## Estados
- **LOADING** — motor de mapa subindo, tiles chegando.
- **SUCCESS** — mapa desenhado com posição.
- **EMPTY** — sem trilha e sem waypoint.
- **ERROR** — falha da fonte de tiles, com aviso na tela e o mapa ainda
  utilizável para coordenada e trilha.
- **UNAVAILABLE** — sem GPS ou sem WebGL.

## Limitações
Tiles dependem do provedor: sem rede e sem cache, o fundo fica vazio — a
posição, a trilha e os waypoints continuam funcionando. A coordenada da foto
não é escrita em EXIF (ADR-0037).

## Testes
`test/trilha.test.js`, `test/odometro.test.js`, `test/foto-parada.test.js`,
`test/foto-storage.test.js`, `test/registro-*.test.js`, `test/mapa-offline.test.js`.
