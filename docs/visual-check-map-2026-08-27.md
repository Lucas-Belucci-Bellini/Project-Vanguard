# Revisão visual do mapa — 2026-08-27

A prévia local Vite foi aberta na rota `#/mapa` pela porta 5176 depois que as portas 5173–5175 estavam ocupadas. A tela carregou com MapLibre, controles de navegação, base cartográfica, modo de uso e controles de trilha.

A base Topográfico exibiu mapa e nomes de lugares com atribuição `© OpenTopoMap · © OpenStreetMap | © Esri · HERE · Garmin · © OpenStreetMap contributors`. Ao selecionar Tático escuro, a base mudou para OSM com o filtro visual escuro local e permaneceu com nomes de lugares visíveis; a captura não mostrou o watermark `API KEY REQUIRED` do CARTO. O estado do aplicativo ainda mostrou `AGUARDANDO GPS`/`POSIÇÃO NÃO CONFIRMADA`, coerente com a prévia sem permissão ou sinal GPS real.

Ao trocar para Satélite, o primeiro frame mostrou somente o fundo com rótulos enquanto os tiles ainda carregavam. Após aguardar, a imagem de satélite apareceu normalmente e os nomes/limites continuaram sobrepostos. A atribuição exibida foi `© Google | © Esri · HERE · Garmin · © OpenStreetMap contributors`.

Esta evidência visual confirma apenas carregamento da interface e do provedor no ambiente de prévia. Não confirma GPS interno, modo avião, retenção de Cache Storage, aparelho móvel, rota oficial do Caminhos dos Anjos ou precisão física.
