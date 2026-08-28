# Histórico — substituição do basemap tático

## Motivo

O basemap CARTO exibiu `API KEY REQUIRED`, tornando-o inadequado como dependência obrigatória do mapa tático da V1.

## Decisão

Adicionar uma alternativa vetorial baseada em OpenFreeMap/OpenMapTiles com dados do OpenStreetMap. O OpenFreeMap oferece estilos vetoriais, não exige chave de API para a instância pública e permite self-hosting. A atribuição continua obrigatória.

## Implementação

Foi criado `src/data/mapa-tatico.js` com:

- `MAPA_TATICO_RESGATE`;
- estilo online Dark do OpenFreeMap;
- atribuição explícita;
- indicação de que não requer API key;
- indicação explícita de que ainda é ONLINE;
- função para o renderer obter o estilo sem acoplar o app ao provedor.

## Estratégia de longo prazo

O caminho para o offline é usar dados OpenStreetMap sob ODbL, processá-los em tiles vetoriais e hospedar o pacote/endpoint controlado pelo Vanguard. O pacote offline não deve ser tratado como autorizado apenas por usar OpenFreeMap público.

## V1

O objetivo imediato é testar o comportamento do app em campo com um mapa confiável e sem a dependência da chave CARTO. A parte de dataset offline continua separada e só será liberada depois de fechar processamento, atribuição, versão, checksum, storage e atualização.
