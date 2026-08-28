# Map Provider Adapter

## Objetivo

O Vanguard mantém o motor cartográfico atrás de um adapter. O domínio não deve depender diretamente de `maplibre-gl`.

## Fluxo

```text
Tela do mapa
    ↓
Map Engine
    ↓
MapProviderRuntime
    ↓
MapLibreAdapter
    ↓
maplibre-gl
```

O `MapProviderRegistry` continua disponível para seleção e registro de providers, enquanto `map-engine.js` fornece a composição de alto nível usada pela aplicação.

## Responsabilidades

- `MapProvider`: contrato dos dados e capacidades do provider.
- `MapProviderRegistry`: catálogo de providers registrados.
- `MapProviderRuntime`: valida e conecta provider ao adapter.
- `MapLibreAdapter`: único ponto desta camada que conhece `MapLibre.Map`.
- `map-engine.js`: composição de alto nível para a aplicação, incluindo carregamento assíncrono do motor.
- A camada tática continua separada: trilhas, waypoints, destino e overlays não pertencem ao adapter.

## Migração

O engine pode ser adotado pela página atual de forma incremental. A página fornece o container e as opções de visualização, sem precisar conhecer a implementação do adapter.

A implementação atual ainda não remove o fluxo legado. A substituição deve ocorrer depois da validação visual e dos testes de integração.
