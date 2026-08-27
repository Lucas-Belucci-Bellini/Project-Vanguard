# Verificação manual do preview — 2026-08-27

## Escopo

A aplicação foi aberta no preview HTTPS temporário nas rotas `#/inicio` e `#/mapa`.

## Achados

| Rota | Resultado |
|---|---|
| `#/inicio` | Carregou com indicador ONLINE, tutorial de primeiro uso, atalhos de Mapa, Bússola, Socorro, Contexto, Sobrevivência e Apoiar projeto. |
| `#/mapa` | MapLibre carregou e renderizou a base topográfica/OpenStreetMap sobre a região de fallback do Rio de Janeiro. Os controles de base, modo de uso, preparação offline, limpeza do cache, destino, rota e vigília de tela ficaram visíveis. |
| GPS no sandbox | Sem fixo GPS, o estado ficou explicitamente como `GPS INDISPONÍVEL`; a aplicação não inventou posição. |
| Console | Nenhuma mensagem de console foi reportada durante a verificação. |

## Limite da verificação

O preview não substitui teste em aparelho Android/Xiaomi ou iPhone. Não foram executados, no sandbox, compartilhamento real, permissão GPS real, cache offline completo de tiles nem integração de hardware externo. A base cartográfica carregada prova apenas o caminho online no preview; o fluxo offline deve ser confirmado em Chrome DevTools e dispositivo real conforme o roteiro de release.
