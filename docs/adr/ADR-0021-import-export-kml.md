# ADR-0021 — Importação e exportação KML local

- **Status:** Aceita
- **Data:** 2026-08-27
- **Escopo:** Mobile V2 / importação-exportação / dados locais

## Contexto

O Vanguard Field já possuía contratos locais para JSON e GPX, mas o prompt Mobile V2 também prevê KML quando suportado. A inclusão precisava manter a política offline-first, sem servidor, sem execução de XML e sem declarar interoperabilidade com todo o ecossistema KML.

## Decisão

Adicionar `exportarRegistroKml()` e `importarRegistroKml()` em `src/core/registro-offline.js`. O contrato suporta:

| Elemento KML | Representação no Vanguard |
|---|---|
| `Point` | waypoint ou destino local |
| `LineString` | trilha local |
| `coordinates` | `longitude,latitude[,altitude]` |
| `name` | nome limitado pelo normalizador existente |

O Mapa oferece `EXPORTAR KML`, usa o adaptador de compartilhamento explícito e aceita arquivos `.kml` na importação. A extensão e o MIME type são usados apenas para escolher o parser; os dados ainda são validados pelo contrato local.

## Segurança e limites

O parser trata o conteúdo como texto e extrai somente `Placemark`, `Point`, `LineString`, `name` e `coordinates`. Não usa `DOMParser` para executar conteúdo, não abre links, não importa NetworkLink, GroundOverlay, estilos, tours, scripts ou dados externos, e ignora elementos não suportados. Coordenadas inválidas, arquivos acima de 2 MB e registros sem pontos são rejeitados.

A exportação não envia nada automaticamente. O compartilhamento depende de ação explícita e seus estados não confirmam entrega. A importação substitui os dados atuais somente depois de confirmação da pessoa, e a rota importada começa parada.

## Evidência

`test/registro-offline.test.js` cobre KML 2.2 exportado, XML escapado, Point, LineString, altitude, normalização, raiz ausente, pontos ausentes e coordenadas inválidas. A suíte chegou a 159 testes; build, sync Capacitor e APK debug passaram. Interoperabilidade física em Android/iOS, Files e Share Sheet continua pendente.
