# Vanguard Field — Dataset Sync Status

> Atualizado em 2026-08-28. Não existe ainda um mecanismo de sincronização de datasets cartográficos em produção.

## Situação atual

O aplicativo possui duas capacidades diferentes: atualização confirmada do Service Worker/aplicativo e preparo local de tiles. O controle de atualização PWA consulta uma release oficial do software quando há rede; ele não consulta manifesto de mapa, não baixa pacote cartográfico e não altera dados locais do usuário. O Service Worker usa cache-first e mensagens limitadas para preparar/consultar/limpar tiles.

A camada de manifesto (`src/core/dataset-manifest.js`) fornece validação estrutural e classificação de frescor. A máquina pura em `src/core/dataset-transacao.js` formaliza lock por dataset, estados `CHECKING` a `COMPLETE`, staging, verificação de tamanho/checksum esperado, cancelamento e rollback. O adapter `src/core/dataset-storage.js` persiste apenas manifesto ativo e transação em envelopes próprios, com diagnóstico e falhas explícitas. Essas peças não executam download e ainda não são um `DatasetUpdater` de produção.

| Capacidade | Estado | Limite factual |
|---|---|---|
| Verificar update do app | Implementado | trata software; exige rede e confirmação; não é update de mapa |
| Planejar/preparar tiles | Implementado | cache técnico de viewport limitado a 256 URLs |
| Manifesto de dataset | Implementado/testado | valida metadados e checksum esperado; não baixa nem calcula hash |
| Check de versão de dataset | Parcial, contrato puro | `estadoFrescorDataset()` classifica manifesto fornecido; não busca manifestos |
| Download de pacote | Não implementado | não há backend ou fonte autorizada definida |
| SHA-256 de pacote | Não implementado | manifesto registra o valor esperado; arquivo não é verificado |
| Staging/ativação atômica | Parcial, máquina + storage isolado | `dataset-transacao.js` preserva o ativo até `COMPLETE`; `dataset-storage.js` guarda metadados/transação em namespace próprio | localStorage não oferece atomicidade física, nem troca de arquivos, power-loss ou recovery |
| Resume/retry/cancel | Cancelamento puro implementado; resume/retry não | cancelamento só muda estado e marca limpeza temporária; download real ainda não existe |
| Rollback/recovery | Rollback puro + persistência resumida; recovery não | preserva o snapshot ativo e salva transação em envelope próprio; power loss/startup recovery ainda não existem |
| Histórico de sync | Não implementado | `MOBILE_V2_EXECUTION_LOG.md` é log de engenharia, não histórico persistente de dataset |

## Contrato futuro, ainda não ativado

Quando houver fonte, licença, formato e infraestrutura aprovados, o fluxo deverá ser local-first: verificar manifesto, comparar versão, checar armazenamento, baixar para staging, calcular checksum, validar schema/compatibilidade, ativar atomicamente e preservar o dataset anterior até a confirmação. Falha, corrupção ou falta de espaço devem manter o estado anterior utilizável.

O futuro sync não poderá enviar GPS, trilhas, waypoints, rotas ou dados de emergência ao servidor sem uma funcionalidade explícita, consentimento e política separada. O update de dados também não deve executar código arbitrário: dados de mapa e atualização de software são canais distintos.

## Bloqueios

Ainda faltam uma fonte autorizada para redistribuição offline, registro de licenças/atribuições, formato de pacote, storage atômico apropriado, servidor/endpoint, limites de tamanho, estratégia full/delta, download real, checksum calculado de bytes, recovery após power loss/startup, testes de corrupção/queda/energia e validação em PWA/Android/iOS. Até que esses itens existam, o sistema não deve exibir `DATASET VERIFIED`, `SYNC COMPLETE` ou `WORLD MAP OFFLINE READY`.
