# Vanguard Field — Map Data Status

> Atualizado em 2026-08-28. O estado abaixo é factual e não equivale a cobertura cartográfica mundial offline.

## Mapa atualmente disponível

A aplicação usa MapLibre com um catálogo compartilhado em `src/data/camadas-mapa.js`. Existem quatro bases de renderização e overlays públicos configurados no código, sujeitos à cobertura, disponibilidade, termos, atribuição, rede e limites dos respectivos provedores. A base escura foi corrigida para não exibir o watermark `API KEY REQUIRED` do CARTO.

O mapa offline atual é um preparo técnico de URLs raster do viewport. `src/core/mapa-offline.js` calcula uma janela limitada de zoom e no máximo 256 URLs; `public/sw.js` salva respostas permitidas no cache `vanguard-field-tiles-v3`. Isso não é um dataset mundial, não cria índice de cidades/estradas e não contém geometria oficial de rotas de peregrinação.

| Área | Estado atual | O que a evidência permite dizer |
|---|---|---|
| Bases/overlays MapLibre | Implementados no catálogo | podem ser selecionados para renderização quando o provedor responde |
| Preparo de tiles | Implementado e limitado | até 256 URLs planejadas/cacheadas para uma área; cobertura real depende do cache |
| Integridade de tiles | Não gerenciada por manifesto | o cache verifica resposta aceitável, mas não possui checksum por pacote |
| Dataset regional | Não implementado | não há pacotes versionados por continente/país/região |
| Busca local mundial | Não implementada | não há índice offline de cidades, estradas ou lugares |
| Roteamento offline | Não declarado | não existe motor e dataset local de roteamento |
| Detalhe local | Dependente da fonte/cache | não prometer zoom ou precisão além do que foi realmente preparado |

## Camadas e separação

A camada de dados de mapa deve ser independente do estilo MapLibre. A camada de usuário — trilhas, rotas, waypoints e destino — continua no estado local do aplicativo e não pode ser apagada por troca de base, limpeza de cache ou futura atualização de dataset.

O novo contrato de manifesto em `src/core/dataset-manifest.js` é somente uma fundação de validação. Ele ainda não ativa dados nem altera `mapa-offline.js` ou `public/sw.js`. Um pacote futuro deverá registrar região, versão, tamanho, checksum, formato, dependências, fonte, licença e compatibilidade com o aplicativo antes de ser usado.

## Fontes, licença e atribuição

As fontes de renderização permanecem sujeitas a análise específica de licença e redistribuição. O código atual não autoriza scraping ou bulk-download dos servidores públicos do OpenStreetMap e não deve ser usado para construir distribuição offline em massa. Antes de empacotar qualquer base mundial, será necessário registrar fonte, licença, atribuição, método de atualização e permissão de uso offline.

## Próximas verificações

A evolução segura deve começar por um registro de fontes/licenças e por uma decisão de armazenamento de metadados. Somente depois devem ser avaliados pacotes regionais, índices locais, checksums calculados de arquivos, staging e ativação atômica. A aceitação “mapa mundial offline” continua bloqueada até existir dataset real e teste offline reproduzível.
