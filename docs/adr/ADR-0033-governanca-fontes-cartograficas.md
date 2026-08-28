# ADR-0033 — governança de fontes cartográficas

- **Status:** Aceita
- **Data:** 2026-08-28
- **Escopo:** seleção de fontes para renderização e para futuros datasets offline

> Esta é uma análise técnica de prontidão de fontes, não parecer jurídico. Termos podem mudar e qualquer distribuição comercial deve ser revisada com profissional qualificado antes de publicação.

## Contexto

O catálogo atual de camadas usa endpoints de Google Satellite, OpenTopoMap, OpenStreetMap, Esri World Imagery, ArcGIS World Boundaries and Places, NASA GIBS, GEBCO WMS e Mapzen/AWS Terrain Tiles. A existência de um endpoint que renderiza no mapa não prova direito de copiar, armazenar, pré-buscar ou redistribuir um pacote offline.

A política oficial dos tiles padrão do OpenStreetMap proíbe bulk download, prefetch e uso offline do `tile.openstreetmap.org` [1]. A documentação de políticas do Google Maps Platform restringe prefetch, indexação, armazenamento, cache e uso offline conforme o acordo aplicável [2]. A página oficial do OpenTopoMap declara CC-BY-SA para a representação, pede atribuição específica e permite uso em web/app desde que o servidor não seja sobrecarregado, mas isso não é automaticamente autorização para o pacote do Vanguard [3].

Para NASA, a orientação oficial diferencia material NASA de material de terceiros e exige validar a fonte e as permissões específicas; ela também exige atribuição e proíbe sugerir endosso [4]. O registro de Open Data da AWS identifica Terrain Tiles como dataset público, mas aponta a documentação de atribuição como licença, portanto a redistribuição do endpoint ainda exige avaliação do conjunto, do formato e do direito aplicável [5]. A página oficial da GEBCO informa que a grade pode ser usada gratuitamente em domínio público, com condições de uso e atribuição; isso não transforma automaticamente o WMS atual em pacote versionado pronto para o produto [6].

Os termos gerais da Esri remetem a acordos e termos específicos de produto/serviço; por isso World Imagery e Boundaries and Places permanecem em revisão, não aprovados [7].

## Decisão

Criar `src/data/fontes-dataset.js` como catálogo imutável e `avaliarFonteDataset()` como gate puro. Cada registro precisa declarar URL HTTPS, política(s) oficial(is), forma de uso atual e oito critérios booleanos: licença, redistribuição, uso offline, uso comercial, atribuição, política de atualização, direitos de armazenamento e restrições do provedor.

Uma fonte somente é `APPROVED` quando todos os oito critérios são explicitamente `true`. Registro estruturalmente inválido é `UNKNOWN`; registro válido com qualquer critério não confirmado é `REVIEW_REQUIRED`. O catálogo atual não autoriza criação de pacote: o resultado agregado `podeCriarPacote` permanece `false`.

| Uso | Gate |
|---|---|
| Renderização online da camada existente | continua separada do gate de dataset; deve manter atribuição e respeitar o endpoint |
| Download/prefetch de tiles | bloqueado até política do provedor permitir explicitamente |
| Dataset regional/mundial redistribuído pelo Vanguard | bloqueado até licença, atribuição, armazenamento, atualização e restrições serem documentados para o pacote escolhido |
| OSM público de tiles | não usar como backend de distribuição offline, em conformidade com a política oficial [1] |
| Dados derivados de OSM ou outros provedores | escolher uma fonte/provedor ou infraestrutura própria com termos que permitam o uso pretendido |

A implementação não altera URLs, não faz scraping, não baixa tiles e não muda o cache técnico. A autorização de uma futura fonte será específica para dataset e versão, não uma inferência baseada no nome do provedor.

## Limites

O catálogo é uma barreira de governança, não uma licença. Os valores `false` e `REVIEW_REQUIRED` registram que a equipe não tem confirmação suficiente para redistribuição offline; não constituem conclusão jurídica sobre todos os usos possíveis. A análise também não substitui leitura do contrato aplicável, do serviço específico, de atribuição dinâmica, de taxas, de SLA ou de restrições territoriais.

Nenhum registro aprovado foi usado para criar pacote. Ainda faltam formato, pipeline, storage binário, checksum calculado, manifestos de pacote, download, sync e validação física. O mapa atual continua online/cache técnico e os dados de usuário continuam separados.

## Evidência

`test/fontes-dataset.test.js` verifica que o catálogo atual é válido mas não apto, que todos os critérios são necessários para aprovação, que registros incompletos viram `UNKNOWN`, que catálogos inválidos não liberam pacote e que a política permanece imutável.

## Referências

[1]: https://operations.osmfoundation.org/policies/tiles/ — OpenStreetMap Foundation, “Tile Usage Policy”.
[2]: https://developers.google.com/maps/documentation/tile/policies — Google for Developers, “Map Tiles API Policies”.
[3]: https://opentopomap.org/about — OpenTopoMap, “About / Verwendung”.
[4]: https://www.earthdata.nasa.gov/engage/open-data-services-software-policies/data-use-guidance — NASA Earthdata, “Data Use and Citation Guidance”.
[5]: https://registry.opendata.aws/terrain-tiles/ — Registry of Open Data on AWS, “Terrain Tiles”.
[6]: https://www.gebco.net/data-products/gridded-bathymetry-data/ — GEBCO, “Gridded Bathymetry Data”.
[7]: https://developers.arcgis.com/terms/ — Esri, “Terms of Use”.
