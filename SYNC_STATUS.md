# Vanguard Field — Dataset Sync Status

> Atualizado em 2026-08-28. Não existe ainda um mecanismo de sincronização de datasets cartográficos em produção.

## Situação atual

O aplicativo possui duas capacidades diferentes: atualização confirmada do Service Worker/aplicativo e preparo local de tiles. O controle de atualização PWA consulta uma release oficial do software quando há rede; ele não consulta manifesto de mapa, não baixa pacote cartográfico e não altera dados locais do usuário. O Service Worker usa cache-first e mensagens limitadas para preparar/consultar/limpar tiles.

A camada de manifesto criada nesta rodada (`src/core/dataset-manifest.js`) fornece validação estrutural e classificação de frescor. Ela não é um `DatasetUpdater`: não implementa `check`, `download`, `verify`, `stage`, `activate`, `rollback`, resume, retry, cancelamento de download ou eventos de sync.

| Capacidade | Estado | Limite factual |
|---|---|---|
| Verificar update do app | Implementado | trata software; exige rede e confirmação; não é update de mapa |
| Planejar/preparar tiles | Implementado | cache técnico de viewport limitado a 256 URLs |
| Manifesto de dataset | Implementado/testado | valida metadados e checksum esperado; não baixa nem calcula hash |
| Check de versão de dataset | Parcial, contrato puro | `estadoFrescorDataset()` classifica manifesto fornecido; não busca manifestos |
| Download de pacote | Não implementado | não há backend ou fonte autorizada definida |
| SHA-256 de pacote | Não implementado | manifesto registra o valor esperado; arquivo não é verificado |
| Staging/ativação atômica | Não implementado | não existe armazenamento gerenciado de datasets |
| Resume/retry/cancel | Não implementado | não criar retry infinito nem download surpresa |
| Rollback/recovery | Não implementado | não há versão anterior de dataset gerenciada |
| Histórico de sync | Não implementado | manter `MOBILE_V2_EXECUTION_LOG.md` para engenharia, não confundir com histórico de dataset |

## Contrato futuro, ainda não ativado

Quando houver fonte, licença, formato e infraestrutura aprovados, o fluxo deverá ser local-first: verificar manifesto, comparar versão, checar armazenamento, baixar para staging, calcular checksum, validar schema/compatibilidade, ativar atomicamente e preservar o dataset anterior até a confirmação. Falha, corrupção ou falta de espaço devem manter o estado anterior utilizável.

O futuro sync não poderá enviar GPS, trilhas, waypoints, rotas ou dados de emergência ao servidor sem uma funcionalidade explícita, consentimento e política separada. O update de dados também não deve executar código arbitrário: dados de mapa e atualização de software são canais distintos.

## Bloqueios

Ainda faltam uma fonte autorizada para redistribuição offline, registro de licenças/atribuições, formato de pacote, armazenamento específico, servidor/endpoint, limites de tamanho, estratégia full/delta, testes de corrupção/queda/energia e validação em PWA/Android/iOS. Até que esses itens existam, o sistema não deve exibir `DATASET VERIFIED`, `SYNC COMPLETE` ou `WORLD MAP OFFLINE READY`.
