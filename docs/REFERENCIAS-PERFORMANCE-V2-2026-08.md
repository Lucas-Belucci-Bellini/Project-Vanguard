# Referências de performance local — V2

## Navigation Timing

A especificação [Navigation Timing Level 2](https://www.w3.org/TR/navigation-timing-2/) define a interface `PerformanceNavigationTiming` e inclui os atributos `domContentLoadedEventEnd` e `loadEventEnd`. O Vanguard Field lê esses valores localmente para informar o tempo observado da navegação do documento; não envia os valores para servidor nem os usa como garantia de desempenho em um aparelho diferente.

## Memória JavaScript

A referência [Performance: memory property — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory) descreve `performance.memory` como uma propriedade não padronizada, legada/depreciada e disponível apenas em alguns navegadores baseados em Chromium. A própria documentação alerta que a estimativa pode divergir da memória real, especialmente com heaps compartilhados, workers e iframes. Por isso, o app trata `usedJSHeapSize` e `jsHeapSizeLimit` como métricas opcionais, exibe `INDISPONÍVEL` quando ausentes e nunca transforma a leitura em promessa de consumo ou autonomia.

A instrumentação permanece local e diagnóstica. Ela não mede FPS do mapa, consumo de bateria, suspensão nativa, memória total do sistema nem comportamento de quatro dias; esses itens continuam exigindo profiling em dispositivos reais.
