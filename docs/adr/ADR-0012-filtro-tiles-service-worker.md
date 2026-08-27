# ADR-0012 — Filtro de tiles no Service Worker

- **Status:** Aceita para V2; quota real e modo avião ainda pendentes
- **Data:** 2026-08-27
- **Escopo:** `public/sw.js`, fluxo `CACHE_TILES`

## Contexto

O planner local já remove templates duplicados, mas o Service Worker também recebe uma lista de URLs por mensagem. Essa fronteira deve permanecer defensiva: a mensagem pode conter URLs repetidas, esquemas inseguros, hosts não autorizados ou mais entradas que a cota local.

## Decisão

`allowedTileUrls()` agora converte apenas strings em URLs, exige HTTPS e hosts presentes na allowlist `TILE_HOSTS`, remove duplicatas pela URL normalizada e limita o resultado a 256 entradas. `prepareTiles()` só recebe essa lista filtrada. URLs inválidas, HTTP, hosts externos e entradas repetidas não são buscados nem gravados no Cache Storage.

A allowlist não é uma declaração de cobertura, qualidade, oficialidade ou disponibilidade dos provedores. O filtro não verifica resposta HTTP antes da preparação; falhas individuais continuam sendo contabilizadas como não salvas pelo fluxo existente.

## Consequências

Mesmo que uma mensagem seja construída fora do planner, o Service Worker não amplia silenciosamente a origem de tiles nem gasta a cota com duplicatas. A política é exercitada em Node com o script real do Service Worker. A função de produção continua em script clássico para preservar a compatibilidade do PWA.

O teste local não substitui validação em modo avião, Cache Storage real, quota do sistema, rede do provedor, troca de base ou cobertura da área da peregrinação.

## Evidência

- `npm test`: 133 testes aprovados.
- Testes do Service Worker cobrem host/esquema permitido, URL externa, duplicatas e truncamento em 256 URLs.
- `node --check public/sw.js`: aprovado.
