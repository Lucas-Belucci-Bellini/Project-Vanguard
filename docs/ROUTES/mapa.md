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

- **BAIXAR REGIÃO** — pacote de tiles num raio ao redor da posição (5 a 30 km),
  em zoom 11–15. O tamanho estimado aparece **antes** de baixar, e a região é
  recusada com um raio menor sugerido quando não cabe. Baixa em lotes de 64
  com pausa: o provedor de tiles não permite download em massa.

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
**Não existe mapa-múndi offline.** O planeta em zoom 14 são 268 435 456 tiles
— contagem exata, é a definição da pirâmide — o que a 41,5 kB por tile
(medido) dá cerca de 10 TB. Mesmo supondo 1 kB por tile de oceano, passaria de
250 GB. Não é limite deste aplicativo; é a ordem de grandeza. O que existe é o
corredor por onde se vai passar, e a tela mostra a conta (`core/mapa-regiao.js`).

O mesmo raio custa mais longe do equador: a caixa alarga com o cosseno da
latitude, e 30 km custam 8 088 tiles em São Paulo contra 26 628 a 60° N. Por
isso o tamanho é calculado para o lugar onde a pessoa está, e a lista de raios
não finge garantia.

Tiles dependem do provedor: sem rede e sem cache, o fundo fica vazio — a
posição, a trilha e os waypoints continuam funcionando. A coordenada da foto
não é escrita em EXIF (ADR-0037).

## Testes
`test/trilha.test.js`, `test/odometro.test.js`, `test/foto-parada.test.js`,
`test/foto-storage.test.js`, `test/registro-*.test.js`, `test/mapa-offline.test.js`.
