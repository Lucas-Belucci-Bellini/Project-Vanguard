# Vanguard Field — Map Data Status

> Atualizado em 2026-08-28. O estado abaixo é factual e não equivale a cobertura cartográfica mundial offline.

## Mapa atualmente disponível

A aplicação usa MapLibre com um catálogo compartilhado em `src/data/camadas-mapa.js`. Existem quatro bases de renderização e overlays públicos configurados no código, sujeitos à cobertura, disponibilidade, termos, atribuição, rede e limites dos respectivos provedores. A base escura foi corrigida para não exibir o watermark `API KEY REQUIRED` do CARTO. O catálogo de governança em `src/data/fontes-dataset.js` agora registra o uso atual e bloqueia a aprovação automática de qualquer fonte para pacote offline.

O mapa offline atual é um preparo técnico de URLs raster do viewport. `src/core/mapa-offline.js` calcula uma janela limitada de zoom e no máximo 256 URLs; `public/sw.js` salva respostas permitidas no cache `vanguard-field-tiles-v3`. Isso não é um dataset mundial, não cria índice de cidades/estradas e não contém geometria oficial de rotas de peregrinação.

| Área | Estado atual | O que a evidência permite dizer |
|---|---|---|
| Bases/overlays MapLibre | Implementados no catálogo | podem ser selecionados para renderização quando o provedor responde |
| Preparo de tiles | Implementado e limitado | até 256 URLs planejadas/cacheadas para uma área; cobertura real depende do cache |
| Governança de fontes | Implementada como gate | `src/data/fontes-dataset.js` exige oito critérios e mantém fontes não confirmadas em `REVIEW_REQUIRED`/`UNKNOWN` | não é parecer jurídico nem autorização de pacote |
| Integridade de tiles | Não gerenciada por manifesto | o cache verifica resposta aceitável, mas não possui checksum por pacote |
| Dataset regional | Não implementado | não há pacotes versionados por continente/país/região |
| Busca local mundial | Não implementada | não há índice offline de cidades, estradas ou lugares |
| Roteamento offline | Não declarado | não existe motor e dataset local de roteamento |
| Detalhe local | Dependente da fonte/cache | não prometer zoom ou precisão além do que foi realmente preparado |

## Camadas e separação

A camada de dados de mapa deve ser independente do estilo MapLibre. A camada de usuário — trilhas, rotas, waypoints e destino — continua no estado local do aplicativo e não pode ser apagada por troca de base, limpeza de cache ou futura atualização de dataset.

O novo contrato de manifesto em `src/core/dataset-manifest.js` é somente uma fundação de validação. Ele ainda não ativa dados nem altera `mapa-offline.js` ou `public/sw.js`. Um pacote futuro deverá registrar região, versão, tamanho, checksum, formato, dependências, fonte, licença e compatibilidade com o aplicativo antes de ser usado.

## Fontes, licença e atribuição

As fontes de renderização permanecem separadas do gate de dataset. `src/data/fontes-dataset.js` cataloga Google Satellite, OpenTopoMap, OpenStreetMap, Esri World Imagery, ArcGIS Boundaries and Places, NASA GIBS, GEBCO WMS e Mapzen/AWS Terrain Tiles. Nenhuma é aprovada automaticamente para pacote: mesmo quando há uma licença ou política pública identificada, ainda devem ser confirmados redistribuição, uso offline, armazenamento, atualização e restrições do serviço escolhido.

A política oficial do servidor de tiles do OpenStreetMap proíbe bulk download, prefetch e uso offline do `tile.openstreetmap.org` [1]. A documentação do Google Maps Platform restringe prefetch, indexação, armazenamento, cache e uso offline conforme o acordo aplicável [2]. OpenTopoMap declara CC-BY-SA, atribuição e uso em aplicações, mas seu servidor não foi convertido em backend de distribuição offline [3]. GEBCO informa uso gratuito/domínio público e condições de uso, mas o WMS não é um pacote versionado aprovado [4]. NASA exige validar fonte específica e material de terceiros [5], enquanto o registro AWS aponta documentação de atribuição para Terrain Tiles [6]. Termos gerais da Esri não substituem termos de produto/serviço [7].

O código atual não autoriza scraping ou bulk-download dos servidores públicos do OpenStreetMap e não deve ser usado para construir distribuição offline em massa. Antes de empacotar qualquer base mundial, será necessário registrar fonte, licença, atribuição, método de atualização e permissão de uso offline para o pacote concreto.

## Próximas verificações

A evolução segura deve continuar por fonte licenciada e backend de storage aprovados. O catálogo atual prova somente governança negativa: sem todos os critérios, não há pacote autorizado. Somente depois devem ser avaliados pacotes regionais, índices locais, checksums calculados de arquivos, download, staging e ativação física. A aceitação “mapa mundial offline” continua bloqueada até existir dataset real, licença adequada e teste offline reproduzível.

## Referências

[1]: https://operations.osmfoundation.org/policies/tiles/ — OpenStreetMap Foundation, “Tile Usage Policy”.
[2]: https://developers.google.com/maps/documentation/tile/policies — Google for Developers, “Map Tiles API Policies”.
[3]: https://opentopomap.org/about — OpenTopoMap, “About / Verwendung”.
[4]: https://www.gebco.net/data-products/gridded-bathymetry-data/ — GEBCO, “Gridded Bathymetry Data”.
[5]: https://www.earthdata.nasa.gov/engage/open-data-services-software-policies/data-use-guidance — NASA Earthdata, “Data Use and Citation Guidance”.
[6]: https://registry.opendata.aws/terrain-tiles/ — Registry of Open Data on AWS, “Terrain Tiles”.
[7]: https://developers.arcgis.com/terms/ — Esri, “Terms of Use”.
