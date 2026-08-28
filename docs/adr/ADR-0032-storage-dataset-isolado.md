# ADR-0032 — storage isolado para dataset e transação

- **Status:** Aceita
- **Data:** 2026-08-28
- **Escopo:** persistência local da fundação do Global Offline Data Engine

## Contexto

O Vanguard Field já possui um store oficial em `src/core/estado.js` para dados do usuário, com prefixo `vanguard:`, envelopes de estado e chaves de trilha, waypoints, rotas e configurações. A máquina de transação de dataset em `src/core/dataset-transacao.js` era pura, mas não havia uma fronteira de persistência para metadados de mapa e recuperação de uma transação futura.

Misturar o dataset gerenciado com as chaves de usuário poderia permitir que uma limpeza ou migração cartográfica afetasse trilhas, waypoints, rotas, configurações ou preparação de emergência. Também não seria correto usar o Cache Storage do Service Worker como se fosse um banco de dados de manifestos: ele continua sendo cache técnico de shell/tiles.

## Decisão

Criar `src/core/dataset-storage.js` como um adapter pequeno e injetável para a futura persistência de datasets. A implementação atual usa uma interface compatível com `localStorage`, mas mantém namespace e envelopes próprios:

| Chave | Tipo | Conteúdo |
|---|---|---|
| `vanguard:maps:dataset:active` | `active` | manifesto ativo validado |
| `vanguard:maps:dataset:transaction` | `transaction` | estado resumido de transação validado |

Cada valor é salvo com `schema: vanguard-dataset-storage`, `version: 1`, `type` e `value`. Manifestos ativos passam novamente por `normalizarManifestoDataset()` na leitura e na escrita. Transações precisam possuir `datasetId` e um estado de `ESTADOS_SYNC_DATASET`. Envelopes ausentes, incompatíveis, malformados ou corrompidos produzem erro explícito; não são tratados como dados vazios válidos.

O adapter expõe `lerAtivo`, `salvarAtivo`, `lerTransacao`, `salvarTransacao`, `limparTransacao` e `diagnostico`. O backend é injetado para permitir testes determinísticos e futura substituição por um storage mais apropriado, sem criar um segundo store oficial. Quando o backend não existe, todas as operações retornam `STORAGE_UNAVAILABLE` e informam `disponivel: false`.

## Invariantes

O adapter não escreve nas chaves do store oficial do usuário, não limpa o ativo ao remover a transação temporária e não incorpora dados cartográficos. A validação do manifesto continua sendo a autoridade para formato, checksum esperado, origem, licença e compatibilidade. O adapter não calcula SHA-256 de arquivos, não faz download, não executa código e não torna o cache de tiles um dataset gerenciado.

A escrita em `localStorage` ainda não é uma transação atômica de disco. A ativação real deverá ser implementada somente quando o backend escolhido oferecer estratégia segura para staging, troca de referências, power loss, recovery e rollback. O adapter atual é uma fronteira de persistência e diagnóstico, não uma prova de durabilidade física ou de cobertura offline.

## Evidência

`test/dataset-storage.test.js` verifica leitura/escrita normalizada, rejeição de manifesto inválido, detecção de envelope corrompido, isolamento de uma chave de trilha, limpeza apenas da transação, rejeição de estado inválido, diagnóstico sem backend e falha de quota/escrita.

A existência deste adapter não autoriza nenhum dataset mundial. Ainda são necessários fonte e licença de redistribuição, formato de pacote, limites de armazenamento, checksum calculado sobre bytes, staging atômico no backend, recovery, índice local e validação PWA/Android/iOS.
