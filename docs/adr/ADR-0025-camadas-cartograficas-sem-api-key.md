# ADR-0025 — camadas cartográficas públicas e rótulos offline

- **Status:** Aceita
- **Data:** 2026-08-27
- **Escopo:** MapLibre, bases raster, nomes/limites e cache offline

## Contexto

As capturas de tela mostraram duas falhas observáveis. A base escura exibia o watermark `API KEY REQUIRED` do CARTO. As bases de satélite/topografia mostravam a imagem, mas não mantinham uma camada de nomes/cidades consistente. A implementação do `mapaPage` também iniciava o MapLibre somente com a base selecionada, apesar de o catálogo conter um overlay de rótulos.

O usuário também relatou que o caminho e as cidades do Caminhos dos Anjos haviam desaparecido. A auditoria confirmou que a aplicação atual desenhava apenas a trilha local gravada; não existia no repositório um GPX/KML oficial da rota para ser exibido como traçado. A associação publica uma lista de cidades e a legislação confirma o percurso geral, mas isso não autoriza inventar uma linha aproximada entre centros urbanos.

## Decisão

A base `dark` deixa de usar CARTO e passa a usar tiles públicos do OpenStreetMap com tratamento visual escuro local no MapLibre. O overlay `labels` deixa de usar CARTO e passa a usar `World_Boundaries_and_Places` do ArcGIS, com atribuição declarada. A aplicação adiciona esse overlay ao estilo inicial sobre qualquer base e inclui seus tiles no preparo offline, junto com a base selecionada, sob o mesmo limite local de 256 URLs.

O cache de tiles é versionado de `v2` para `v3`, fazendo o Service Worker descartar o cache antigo na ativação e evitando reaproveitar tiles CARTO com watermark. A allowlist do Service Worker inclui `tile.openstreetmap.org` e mantém `server.arcgisonline.com`; os hosts CARTO sem uso são removidos.

A lista de cidades e as leis do Caminhos dos Anjos ficam documentadas separadamente em `docs/ROTAS-CAMINHOS-DOS-ANJOS.md`. Uma futura camada de cidades poderá mostrar referências com fonte e data, mas um caminho navegável só será incluído a partir de GPX/KML oficial ou de dados explicitamente autorizados. Cidades de referência não são uma rota.

## Consequências

O modo escuro deixa de depender do endpoint que gerava `API KEY REQUIRED`. Bases de imagem e relevo podem receber nomes/limites, e o preparo offline passa a guardar a camada de contexto junto da base. O resultado ainda depende da disponibilidade, licença, cobertura, quota, rede durante o preparo e retenção do cache pelo sistema operacional.

A suíte determinística cobre as quatro bases, a ausência de `cartodb`/`api_key`, o overlay ArcGIS, a composição do estilo e a política OSM/Service Worker. O total local chega a 170 testes.

O ponto GPS deslocado dentro de prédio não é resolvido por essa decisão. GPS/GNSS interno pode ter erro elevado por bloqueio e reflexões; precisão, idade e frescor devem permanecer visíveis. Filtragem ou seleção de fixos será uma unidade posterior, com critérios testáveis, para não esconder erro real nem inventar precisão.

## Não escopo

Este ADR não cria uma rota oficial do Caminhos dos Anjos, não transforma a lista de cidades em navegação turn-by-turn, não adiciona geocodificação automática, não promete mapas completos offline, não altera permissões GPS e não implementa tracking em background. Também não altera a wiki virtual de Arma 3 ou seus módulos legados.

## Fontes cartográficas e de rota

- OpenStreetMap tiles: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- ArcGIS World Boundaries and Places: `https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`
- Fontes da rota e legislação: [`docs/ROTAS-CAMINHOS-DOS-ANJOS.md`](../ROTAS-CAMINHOS-DOS-ANJOS.md)
