# Map Provider Adapter

## Objetivo

O Vanguard mantém o motor cartográfico atrás de um adapter. O domínio não deve depender diretamente de `maplibre-gl`.

## Fluxo

```text
MapProvider
    ↓
MapProviderRegistry
    ↓
MapProviderRuntime
    ↓
MapLibreAdapter
    ↓
maplibre-gl
```

## Responsabilidades

- `MapProvider` descreve os dados e capacidades do provider.
- `MapProviderRegistry` resolve providers por ID.
- `MapProviderRuntime` valida o provider e conecta sua configuração ao adapter.
- `MapLibreAdapter` é o ponto desta camada que conhece `MapLibre.Map`.
- O adapter recebe a implementação do MapLibre por injeção, facilitando testes e futura substituição.
- A camada tática continua separada: trilhas, waypoints, destino e overlays não pertencem ao adapter.
- A troca futura para outro motor/provider deve exigir somente um novo adapter, sem reescrever o domínio tático.

## Estado atual

O runtime bridge foi adicionado sem substituir o fluxo visual existente. A integração com a tela atual deve ser feita em uma etapa separada, depois dos testes do contrato, evitando uma migração destrutiva.
