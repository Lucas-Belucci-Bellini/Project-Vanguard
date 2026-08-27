# ADR-0008 — Diagnóstico de performance local

- **Status:** Aceita para V2; profiling físico ainda pendente
- **Data:** 2026-08-27
- **Escopo:** Diagnóstico local de startup, carga do documento e memória JS opcional

## Contexto

A V2 exige baixo consumo e evolução baseada em medição, mas o ambiente de desenvolvimento não prova o comportamento do mapa, da bateria ou da suspensão em Android, Xiaomi/HyperOS e iOS. A página de Diagnóstico já era o ponto local para exibir estados de GPS, rede, cache, armazenamento, bateria e lifecycle.

A especificação W3C de Navigation Timing define `PerformanceNavigationTiming` e os campos `domContentLoadedEventEnd` e `loadEventEnd` como tempos relacionados à navegação do documento.[1] A propriedade `performance.memory`, por outro lado, é descrita pela MDN como não padronizada, legada/depreciada, disponível apenas em alguns navegadores Chromium e sujeita a estimativas incompletas.[2]

## Decisão

Adicionar `desempenhoResumo()` em `src/core/diagnostico.js`. A função lê, sem polling, a entrada de navegação disponível em `performance.getEntriesByType('navigation')`, usando os tempos de DOM pronto e de carga completa. Quando disponível, também mostra `usedJSHeapSize` e `jsHeapSizeLimit` formatados. A tela `#/diagnostico` apresenta essas métricas em um grupo `DESEMPENHO`, sempre identificando a fonte e mostrando `INDISPONÍVEL` quando a API não existe ou lança erro.

A leitura é estritamente local. Não há coleta, envio, persistência, worker, loop periódico ou mudança no perfil de GPS. As métricas são observações do ambiente atual e não uma promessa de performance, autonomia, memória total do aparelho, FPS do mapa ou funcionamento em background.

## Consequências

A equipe passa a ter uma evidência inicial repetível para startup/carga e, em alguns navegadores, uma indicação do heap JS. Isso permite comparar builds ou aparelhos sem adicionar uma dependência. A cobertura não fecha o item V2-021: FPS/render do MapLibre, custo de tiles, consumo de bateria, suspensão nativa, memória do sistema e operação de quatro dias continuam exigindo profiling físico e plano de campo.

## Referências

[1]: [W3C — Navigation Timing Level 2](https://www.w3.org/TR/navigation-timing-2/)
[2]: [MDN — Performance: memory property](https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory)
