# V3 — navegação, GPS, extração e preservação de dados

A regra que governa tudo aqui: **migrar, nunca destruir.**

## Índice

| documento | assunto |
|---|---|
| [DATA_MIGRATION_POLICY](DATA_MIGRATION_POLICY.md) | a regra, as classes de dado, o que bloqueia uma migração |
| [TRACK_STORAGE_SPECIFICATION](TRACK_STORAGE_SPECIFICATION.md) | onde a trilha mora, e por que append-only |
| [LOCATION_QUALITY_SPECIFICATION](LOCATION_QUALITY_SPECIFICATION.md) | as seis classes de ponto; classificar não é filtrar |
| [DISTANCE_ENGINE_SPECIFICATION](DISTANCE_ENGINE_SPECIFICATION.md) | as três medidas, e o vão que deixou de ser somado |
| [BACKGROUND_TRACKING_ARCHITECTURE](BACKGROUND_TRACKING_ARCHITECTURE.md) | página observa, não possui |
| [DATA_EXTRACTION_CONTRACT](DATA_EXTRACTION_CONTRACT.md) | por que a trilha não saía do aparelho |
| [GPS_V3_RECOVERY_PLAN](GPS_V3_RECOVERY_PLAN.md) | o que se sobrevive, e o que ainda não |
| [NAVIGATION_TEST_STRATEGY](NAVIGATION_TEST_STRATEGY.md) | verdade construída, não verdade medida pelo próprio motor |
| [ROUTE_ENGINE_SPECIFICATION](ROUTE_ENGINE_SPECIFICATION.md) | ⚠️ **decisão pendente** — não existe motor de rota |

## Os defeitos que originaram tudo isto (medidos na 1.6.0)

| defeito | medida |
|---|---|
| `.slice(-12000)` descartava os pontos mais antigos **em silêncio** | ≈24 km de caminhada |
| exportação **recusava** acima de 4 000 pontos | 4 000 → 0,89 MB · 4 001 → erro |
| vão de sinal somado como caminhada | 599 m onde 200 foram observados |
| gravador dentro da página do mapa | trocar de tela encerrava o rastreamento |
| versão do iOS congelada | 1.3.1 por seis releases |

## Estado

| item | estado |
|---|:---:|
| inventário e catálogo de dados | ✅ |
| backup: a trilha sai do aparelho | ✅ |
| migração v1→v2 com contagem e checksum | ✅ |
| Track Store append-only + IndexedDB | ✅ |
| motor de distância com vão | ✅ |
| qualidade de posição | ✅ |
| serviço de rastreamento fora das páginas | ✅ |
| **ligar `src/pages/mapa.js` no serviço** | ⬜ |
| trilhas de referência e benchmark | ✅ |
| **motor de rota** | ⬜ decisão pendente |
| map matching | ⬜ depende do motor de rota |

Enquanto `src/pages/mapa.js` não estiver ligado ao serviço, **o comportamento
em produção continua o da 1.6.0**. Isso está escrito aqui para não ser
confundido com trabalho concluído.
