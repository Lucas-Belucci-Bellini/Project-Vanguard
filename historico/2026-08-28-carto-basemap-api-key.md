# Histórico — CARTO Basemap API Key

## Problema

O mapa exibiu a marca d'água `API KEY REQUIRED` do CARTO. A causa é a exigência atual de uma chave própria para os basemaps do CARTO.

## Decisão

O Vanguard não recebe uma chave real no Git. A aplicação passa a aceitar `VITE_CARTO_API_KEY` via configuração do ambiente de build.

## Implementação

- `src/config/cartografia.js` centraliza a leitura da chave e a montagem dos tiles CARTO Voyager.
- `src/data/camadas-mapa.js` registra `CARTO Voyager` como fonte de base online.
- `.env.example` documenta a variável sem conter segredo.
- A chave não é hardcoded nem publicada nos commits.

## Estado

A correção de código está pronta, mas a chave própria do projeto ainda precisa ser fornecida no ambiente de build para remover a marca d'água. A obtenção e os termos de uso devem seguir o serviço oficial do CARTO.

## V1

Isto é uma dependência de mapa online. Não transforma CARTO em dataset offline nem autoriza download/bulk caching de tiles.
