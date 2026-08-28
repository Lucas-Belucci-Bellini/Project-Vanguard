# ADR-0035 — orquestração do ciclo de vida do dataset offline

- **Status:** Aceita
- **Data:** 2026-08-28
- **Escopo:** costura entre manifesto, transação, storage e governança de fontes

## Contexto

As quatro peças da fundação do dataset offline existiam isoladas e testadas, mas nenhuma delas se conhecia:

| Módulo | Papel | ADR |
|---|---|---|
| `src/core/dataset-manifest.js` | contrato do manifesto | ADR-0030 |
| `src/core/dataset-transacao.js` | máquina de estados pura | ADR-0031 |
| `src/core/dataset-storage.js` | persistência isolada | ADR-0032 |
| `src/data/fontes-dataset.js` | gate de licença | ADR-0033 |

A máquina de transação era pura e não sabia gravar; o storage sabia gravar e não conhecia a máquina; o gate de fontes não era consultado por ninguém. Sem uma costura, cada chamador futuro escolheria sua própria ordem de gravação — e a ordem é justamente o que decide se uma interrupção no meio de uma atualização é recuperável ou destrutiva.

O cenário que motiva a decisão não é hipotético: o aplicativo é usado em caminhada longa, com bateria limitada e sistema livre para encerrar o processo. Uma atualização de dataset interrompida precisa deixar o aparelho com um dataset íntegro — o novo ou o anterior —, nunca com nenhum dos dois.

## Decisão

Criar `src/core/dataset-sync.js` com `criarSincronizacaoDataset({ storage, fontes, relogio })` como o único ponto que combina os quatro módulos. O orquestrador não baixa nada, não calcula checksum sobre bytes, não fala com a rede e não conhece DOM: ele recebe resultados de quem faz isso e garante que cada passo esteja gravado antes do próximo.

### Ordem de gravação da ativação

A garantia adicionada é de **ordem**, não de durabilidade física. A ativação acontece em quatro gravações:

1. transação gravada como `ACTIVATING`;
2. manifesto ativo escrito;
3. transação gravada como `COMPLETE`;
4. registro da transação removido.

O manifesto ativo só é escrito depois de (1) estar gravado, e o registro da transação só é apagado depois de (2) ter sucesso. É isso que torna uma queda entre (2) e (3) reconciliável em vez de ambígua.

### Reconciliação de partida

`recuperar()` classifica a transação encontrada no armazenamento e a resolve:

| Estado encontrado | Classificação | Ação |
|---|---|---|
| ausente | `CLEAN` | nada |
| `COMPLETE`/`CANCELLED`/`ROLLED_BACK` | `RESIDUAL` | remover registro |
| `FAILED` | `ROLLBACK_APPLIED` | rollback e remover |
| `ACTIVATING` com ativo igual ao novo | `ACTIVATION_CONFIRMED` | concluir e remover |
| `ACTIVATING` com ativo diferente | `ACTIVATION_REVERTED` | falhar, reverter e remover |
| qualquer estado intermediário | `INTERRUPTED` | falhar, reverter e remover |
| envelope ilegível | `UNREADABLE` | reportar e remover |

O caso `ACTIVATING` é o único ambíguo, e é decidido comparando `datasetId`, `version` e `checksum` do manifesto ativo gravado com o manifesto novo da transação. Se batem, a escrita de (2) chegou a acontecer e a ativação é concluída; se não batem, a ativação não valeu e o dataset anterior permanece.

**Download interrompido nunca é retomado.** Bytes parciais não verificados não têm garantia de integridade, e o checksum do manifesto cobre o pacote completo, não um prefixo dele. Uma transação interrompida antes da verificação é falhada e revertida; a atualização recomeça do início.

### Gate de fonte na entrada

A governança de ADR-0033 é aplicada em `iniciar()`, não na ativação: uma transação cujo pacote não venha de fonte `APPROVED` **nunca chega a existir**. A origem precisa ser declarada explicitamente por `sourceId` — não há origem padrão, e um manifesto não se auto-autoriza pelo campo textual `source`.

Com o catálogo atual, isso significa que `iniciar()` recusa todas as oito fontes registradas. Isso é o comportamento correto e está coberto por teste.

## Invariantes

O orquestrador lê o estado do armazenamento a cada operação, sem cache em memória, para que não exista divergência entre o que está gravado e o que o aplicativo acredita estar gravado. Falhas de leitura e escrita são propagadas com o código do storage; nenhuma é convertida em "não há nada". Uma gravação que falha impede o avanço do estado.

O módulo não toca em trilhas, waypoints, rotas, configurações ou dados de emergência: essas chaves pertencem a `src/core/estado.js` e o namespace do dataset é separado por ADR-0032.

Nenhuma interface de usuário foi criada. Enquanto nenhuma fonte estiver aprovada, um botão de download seria uma promessa sem lastro. A costura existe e está testada; a decisão de expô-la depende de haver um pacote real para oferecer.

## Evidência

`test/dataset-sync.test.js` cobre dezessete casos, incluindo os quatro pontos de interrupção da ativação, verificação reprovada por checksum e por tamanho, recusa do catálogo real, exigência de origem declarada, catálogo misto onde uma única fonte apta já habilita o início, falha de escrita do manifesto ativo com preservação do anterior, transação concorrente, resíduo terminal, envelope ilegível e ausência de armazenamento.

Os testes de interrupção não simulam exceções: eles reconstroem no armazenamento o estado exato que uma queda deixaria e reabrem o orquestrador sobre o mesmo backend, que é o que o aplicativo faz ao ser reaberto.

## Limites

Esta unidade não cria dataset, não aprova fonte, não baixa pacote, não calcula SHA-256 sobre bytes e não prova durabilidade de disco, quota real ou power loss em aparelho. Continuam pendentes: fonte licenciada para redistribuição, formato e pipeline de pacote, endpoint, cálculo de checksum sobre bytes reais, backend com escrita atômica, e validação física em Android e iOS.
