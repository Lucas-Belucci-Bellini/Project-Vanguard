# Map Provider Adapter

## Objetivo

O Vanguard mantém o motor cartográfico atrás de um adapter. O domínio não deve depender diretamente de `maplibre-gl`.

## Fluxo

```text
MapProvider
    ↓
MapProviderRegistry
    ↓
MapLibreAdapter
    ↓
maplibre-gl
```

## Regras

- `MapProvider` descreve os dados e capacidades do provider.
- `MapProviderRegistry` resolve providers por ID.
- `MapLibreAdapter` é o único ponto desta camada que conhece `MapLibre.Map`.
- O adapter recebe a implementação do MapLibre por injeção, facilitando testes e futura substituição.
- A camada tática continua separada: trilhas, waypoints, destino e overlays não pertencem ao adapter.
- A troca futura para outro motor/provider deve exigir somente um novo adapter, sem reescrever o domínio tático.

## Estado atual

O adapter foi adicionado sem substituir o fluxo visual existente. A integração com a tela atual deve ser feita depois dos testes do contrato, evitando uma migração destrutiva.
