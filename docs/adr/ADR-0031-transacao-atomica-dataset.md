# ADR-0031 — transação atômica de dataset offline

- **Status:** Aceita
- **Data:** 2026-08-28
- **Escopo:** máquina de estados do futuro sync de datasets

## Contexto

O manifesto versionado de dataset já possui validação estrutural em `src/core/dataset-manifest.js`, mas ainda não existia uma regra executável para impedir concorrência, manter uma versão ativa durante uma falha ou ativar um pacote novo somente depois da verificação completa.

Também não há, neste momento, um pacote cartográfico real, um backend autorizado, armazenamento gerenciado ou permissão de redistribuição offline. Portanto, a unidade precisa ser determinística e independente de rede, arquivo, Service Worker e plataforma nativa.

## Decisão

Criar `src/core/dataset-transacao.js` com uma máquina pura para o ciclo de atualização:

```text
IDLE → CHECKING → AVAILABLE → DOWNLOADING → VERIFYING
                                             ↓
                                          STAGING
                                             ↓
                                        ACTIVATING
                                             ↓
                                         COMPLETE
```

As falhas podem ocorrer antes da ativação e levam a `FAILED`; depois disso, `ROLLED_BACK` preserva a versão ativa anterior. O cancelamento antes de `ACTIVATING` leva a `CANCELLED` e permite remover apenas temporários.

| Invariante | Aplicação |
|---|---|
| Uma atualização do mesmo dataset por vez | uma transação não terminal, inclusive `IDLE`, reserva o dataset |
| Versão ativa não muda durante download/verificação | `ativo` permanece no snapshot anterior até `COMPLETE` |
| Pacote precisa ser verificado antes do staging | tamanho total e checksum devem coincidir com o manifesto |
| Staging não é ativo | `STAGING` contém o pacote verificado, mas `ativo` ainda é anterior |
| Ativação é explícita | `ACTIVATING` só começa com `solicitarAtivacaoDataset()` |
| Falha não apaga o ativo | `FAILED` e `ROLLED_BACK` conservam `transacao.ativo` |
| Estado terminal não volta a executar | `COMPLETE`, `ROLLED_BACK` e `CANCELLED` rejeitam novas transições |

A máquina recebe dados e resultados de I/O por injeção de argumentos, mas não executa I/O. A implementação futura de storage deverá persistir o estado de transação e realizar a troca de referências de forma adequada ao backend escolhido; não deve escrever diretamente por cima do dataset ativo.

## Limites

A verificação atual compara o tamanho agregado declarado pelas regiões e o checksum textual esperado. Ela ainda não calcula SHA-256 de bytes, não grava staging em disco, não sobrevive a power loss, não recupera transações no startup e não implementa download, retry, resume ou histórico persistente. Esses itens não são simulados.

O Service Worker continua responsável pelo cache técnico de shell/tiles, e `src/core/estado.js` continua sendo o store oficial dos dados do usuário. A transação futura não pode remover trilhas, waypoints, rotas, configurações ou preparação de emergência.

## Evidência

`test/dataset-transacao.test.js` cobre lock concorrente, caminho de sucesso, verificação de tamanho/checksum, cancelamento, rollback, tentativa de ativar sem staging, transições inválidas, versão igual e `datasetId` divergente. A suíte prova as invariantes da máquina pura; não prova um dataset mundial, licença de fonte, armazenamento físico ou update real em PWA/Android/iOS.
