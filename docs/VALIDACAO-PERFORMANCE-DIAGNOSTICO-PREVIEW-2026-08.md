# Validação de performance local no Diagnóstico — 2026-08

## Ambiente

- URL: `http://localhost:5174/?fresh=20260827-performance#/diagnostico`
- Ambiente: preview Vite no Chromium/Linux do sandbox
- Escopo: somente leitura local e renderização da tela; nenhum dado foi enviado

## Resultado observado

A tela exibiu o grupo **DESEMPENHO** com três linhas:

| Métrica | Resultado observado |
|---|---|
| Startup DOM | `42 ms · NAVIGATION TIMING` |
| Carga completa | `63 ms` |
| Memória JS | `1.6 MiB usados · 2.02 GiB limite reportado` |

O status exibido foi `Diagnóstico local atualizado. Nenhum dado foi enviado para um servidor.`. A inspeção DOM confirmou três linhas no grupo `DESEMPENHO` e nenhum erro de renderização foi observado.

## Limites

Este preview prova apenas que a instrumentação renderiza e trata as APIs disponíveis no navegador. Os valores não representam Android, Xiaomi/HyperOS ou iOS e não medem FPS do MapLibre, bateria, memória total do sistema, suspensão nativa, GPS ou operação durante quatro dias. A propriedade de memória é opcional e pode ser imprecisa; o app mantém `INDISPONÍVEL` quando a API não existe. O profiling físico permanece pendente.
