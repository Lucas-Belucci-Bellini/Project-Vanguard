# Vanguard Field — Dataset Sync Status

> Atualizado em 2026-08-28. Não existe ainda um mecanismo de sincronização de datasets cartográficos em produção.

## Situação atual

O aplicativo possui duas capacidades diferentes: atualização confirmada do Service Worker/aplicativo e preparo local de tiles. O controle de atualização PWA consulta uma release oficial do software quando há rede; ele não consulta manifesto de mapa, não baixa pacote cartográfico e não altera dados locais do usuário. O Service Worker usa cache-first e mensagens limitadas para preparar/consultar/limpar tiles.

A camada de manifesto (`src/core/dataset-manifest.js`) fornece validação estrutural e classificação de frescor. A máquina pura em `src/core/dataset-transacao.js` formaliza lock por dataset, estados `CHECKING` a `COMPLETE`, staging, verificação de tamanho/checksum esperado, cancelamento e rollback. O adapter `src/core/dataset-storage.js` persiste apenas manifesto ativo e transação em envelopes próprios, com diagnóstico e falhas explícitas. O orquestrador `src/core/dataset-sync.js` é a única costura entre essas peças: ele aplica o gate de fontes na abertura da transação, grava cada passo antes do seguinte e reconcilia na partida uma transação interrompida. Essas peças não executam download e ainda não são um `DatasetUpdater` de produção.

| Capacidade | Estado | Limite factual |
|---|---|---|
| Verificar update do app | Implementado | trata software; exige rede e confirmação; não é update de mapa |
| Planejar/preparar tiles | Implementado | cache técnico de viewport limitado a 256 URLs |
| Manifesto de dataset | Implementado/testado | valida metadados e checksum esperado; não baixa nem calcula hash |
| Check de versão de dataset | Parcial, contrato puro | `estadoFrescorDataset()` classifica manifesto fornecido; não busca manifestos |
| Orquestração do ciclo de vida | Implementado/testado | `dataset-sync.js` costura manifesto, transação, storage e gate; não baixa, não calcula hash e não tem interface |
| Download de pacote | Não implementado | não há backend nem fonte autorizada; `avaliarCatalogoFontes()` não libera pacote |
| SHA-256 de pacote | Não implementado | manifesto registra o valor esperado; arquivo não é verificado |
| Staging/ativação atômica | Parcial, ordem de gravação definida | `dataset-sync.js` grava `ACTIVATING` antes de escrever o ativo e só apaga a transação depois; localStorage não oferece atomicidade física nem troca de arquivos |
| Resume/retry/cancel | Cancelamento puro implementado; resume/retry não | cancelamento só muda estado e marca limpeza temporária; download real ainda não existe |
| Rollback/recovery | Rollback + reconciliação de partida implementados | `recuperar()` classifica e resolve transação residual, interrompida, ilegível e ativação ambígua; a prova é lógica, não física em aparelho |
| Histórico de sync | Não implementado | `MOBILE_V2_EXECUTION_LOG.md` é log de engenharia, não histórico persistente de dataset |

## Contrato futuro, ainda não ativado

Quando houver fonte, licença, formato e infraestrutura aprovados, o fluxo deverá ser local-first: aprovar a fonte pelo gate de governança, verificar manifesto, comparar versão, checar armazenamento, baixar para staging, calcular checksum, validar schema/compatibilidade, ativar atomicamente e preservar o dataset anterior até a confirmação. Falha, corrupção ou falta de espaço devem manter o estado anterior utilizável.

O futuro sync não poderá enviar GPS, trilhas, waypoints, rotas ou dados de emergência ao servidor sem uma funcionalidade explícita, consentimento e política separada. O update de dados também não deve executar código arbitrário: dados de mapa e atualização de software são canais distintos.

## Bloqueios

Ainda faltam uma fonte autorizada aprovada pelo catálogo, registro de licenças/atribuições, formato de pacote, storage atômico apropriado, servidor/endpoint, limites de tamanho, estratégia full/delta, download real, checksum calculado de bytes, durabilidade física verificada em aparelho após power loss real, testes de corrupção/queda/energia em hardware e validação em PWA/Android/iOS. Até que esses itens existam, o sistema não deve exibir `DATASET VERIFIED`, `SYNC COMPLETE` ou `WORLD MAP OFFLINE READY`.


## 2026-08-28 — integridade criptográfica dos bytes do dataset

A fundação de sync foi estendida com `src/core/dataset-integridade.js`, usando Web Crypto SHA-256 sobre os bytes reais recebidos. O orquestrador ganhou `verificarBytes(bytes)`, que calcula o digest antes de chamar a verificação de tamanho/checksum e registra falha na transação quando os bytes não correspondem ao manifesto. Foram adicionados testes para Uint8Array, ArrayBuffer, DataView, checksum válido, divergente e ambiente sem Web Crypto.

Esta unidade **não baixa nem armazena** o pacote e não prova durabilidade física. Ela fecha somente a lacuna de cálculo real de checksum; download, endpoint, staging físico, quota, power-loss recovery e fonte cartográfica licenciada continuam pendentes.



## 2026-08-28 — storage físico de pacote iniciado

Foi criado `src/core/dataset-package-storage.js`, um adapter assíncrono sobre IndexedDB dedicado exclusivamente aos bytes do pacote de dataset. Ele separa o artefato físico do manifesto/transação e dos dados do usuário, oferece salvar/ler/remover/limpar e reporta indisponibilidade e quota. Testes de contrato cobrem ambientes sem IndexedDB, validação de entrada e diagnóstico.

**Limite:** esta unidade não é prova de atomicidade de disco, durabilidade contra power loss, quota física garantida nem teste em aparelho real. A integração final com o orquestrador deve ocorrer depois de validar o contrato físico no runtime alvo.
