# 2026-08-28 — Retomada persistente integrada

## Ponto de partida

O histórico anterior indicava integrar `retomarDataset()`, `anexarPacoteStaging()` e o checkpoint persistente antes de avançar para rollback/recovery físico.

## Entrega

Foi criado `src/core/dataset-download-resume-persistence.js`.

A nova costura valida que o checkpoint pertence ao dataset, que existe pacote físico em `STAGING` e que seu tamanho coincide com o checkpoint. Depois executa a retomada HTTP existente, extrai apenas o sufixo novo, persiste esse sufixo via `anexarPacoteStaging()` e somente então grava o novo checkpoint.

A ordem é deliberadamente:

1. ler STAGING;
2. validar STAGING x checkpoint;
3. solicitar e validar Range;
4. persistir a continuação no STAGING;
5. atualizar o checkpoint;
6. reportar progresso.

`ACTIVE` não recebe bytes incrementais.

## Verificações

Não foram declarados testes, build ou CI como aprovados nesta rodada. O arquivo de teste planejado não foi publicado devido a falha da operação de criação pelo conector.

## Limites

Ainda não existe atomicidade física de disco, power-loss recovery ou garantia de quota real. A retomada também não deve ser usada para fontes não aprovadas pelo catálogo de governança.

## Próximo gargalo

Criar rollback/recovery físico consistente entre pacote STAGING, checkpoint e transação do dataset, com testes antes de qualquer declaração de conclusão.
