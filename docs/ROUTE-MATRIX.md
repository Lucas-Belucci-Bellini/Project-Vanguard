# Matriz de rotas

Uma rota só existe neste aplicativo se houver funcionalidade real atrás dela.
Esta tabela é a resposta curta; o contrato de cada uma está em
[`docs/ROUTES/`](ROUTES/), e a auditoria que produziu os estados está em
[`ROUTE-AUDIT.md`](ROUTE-AUDIT.md).

`test/rotas.test.js` falha se uma rota existir sem linha aqui, se esta tabela
citar rota que não existe, ou se faltar o contrato em `docs/ROUTES/`.

| Rota | Função | Estado | Dados | Dependências | Teste |
| --- | --- | --- | --- | --- | --- |
| `#/inicio` | Prontidão para sair andando | `IMPLEMENTED` | `estado` local (posição, trilha, waypoints, mapas), service worker | `prontidao-offline`, `localizacao` | `prontidao-offline.test.js` · varredura |
| `#/mapa` | Mapa, trilha, waypoints, foto de parada, exportação | `IMPLEMENTED` | GPS, tiles (rede/cache), IndexedDB de fotos, `estado` | `map-engine` + MapLibre (CDN), `trilha`, `odometro`, `foto-*` | `trilha` · `odometro` · `foto-*` · `registro-*` |
| `#/navegacao` | Posição em MGRS/UTM, rumo e distância a um waypoint | `IMPLEMENTED` | GPS contínuo | `navegacao-rumo`, `mgrs`, `numero-seguro` | `navegacao-rumo` · fluxos 1–4 |
| `#/bussola` | Três nortes, calibração pelo Sol, estabilidade | `IMPLEMENTED` | Sensor de orientação, posição | `bussola-leitura`, `rumo-filtro`, `sol` | `bussola-leitura` · `rumo-filtro` · fluxos 5–6 |
| `#/socorro` | Preparar registro de posição para um canal externo | `IMPLEMENTED` | GPS de alta precisão | `localizacao`, `compartilhamento` | `compartilhamento` · `localizacao` |
| `#/escuta` | Aviso tátil de veículo se aproximando ou chamado | `IMPLEMENTED` | Microfone cru | `engine/escuta`, `escuta-ambiente`, `alertas-tateis` | `escuta` (20) · `escuta-ambiente` (8) |
| `#/noturno` | Intensificação de luz, com captura georreferenciada | `IMPLEMENTED` | Câmera traseira, GPS na captura | `visao-noturna`, `camera-noturna`, `foto-*` | `visao-noturna` (21) · `camera-noturna` (12) |
| `#/contexto` | Modo de uso e zonas locais de risco | `IMPLEMENTED` | `estado` (`CONTEXTO`, `ZONAS`), arquivo importado | `core/contexto`, `equipamentos` | `contexto` · `equipamentos` |
| `#/sobrevivencia` | Sete guias offline com fonte e data | `IMPLEMENTED` | `data/sobrevivencia.js` (catálogo v1) | nenhuma | catálogo versionado · varredura |
| `#/sobre` | Identidade, versão real, limites e privacidade | `IMPLEMENTED` | `core/versao.js` (do `package.json`) | nenhuma | fluxo 9 |
| `#/diagnostico` | Estado observável do ambiente | `IMPLEMENTED` | Sondas do navegador e do service worker | `core/diagnostico`, `ciclo-vida` | `diagnostico` · `ciclo-vida` |
| `#/doar` | Como o projeto se sustenta | `UNAVAILABLE` | nenhum — não há serviço de pagamento ligado | nenhuma | fluxo 7 |
| `#/tiro` | Calculadora do ambiente de testes de Arma 3 | `LEGACY` | `data/arma3-terrenos.js` (gerado) | `ballistics`, `charges`, `fire-mission` | `ballistics` · `arma3-grid` · `rotas` |

## O que cada estado quer dizer

| Estado | Significado |
| --- | --- |
| `IMPLEMENTED` | Abre, tem dado real, os botões fazem o que dizem, tem estados de vazio e de erro, e tem teste. |
| `UNAVAILABLE` | A funcionalidade depende de algo que não existe hoje, e a tela **diz isso** em vez de simular. |
| `LEGACY` | Preservada por compatibilidade, fora do menu, marcada na própria tela, sem funcionalidade nova. |
| `CONTENT_REQUIRED` | Estrutura pronta, conteúdo ausente e declarado. *(nenhuma rota neste estado hoje)* |
| `PARTIAL` · `BROKEN` · `DEPRECATED` · `REMOVED` | *(nenhuma rota nestes estados hoje)* |
