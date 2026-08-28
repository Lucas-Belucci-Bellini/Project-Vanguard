# 2026-08-28 — Recovery de dataset no boot

## Ponto de partida

A reconciliação física de pacote + checkpoint já existia, mas ainda não havia um orquestrador de boot. O próximo gargalo era conectar a transação persistida à reconciliação antes da aplicação continuar.

## Entrega

Criado `src/core/dataset-boot-recovery.js`.

A rotina lê a transação persistida para identificar o `datasetId` pendente, executa a reconciliação física e remove checkpoint órfão somente quando a reconciliação classifica o estado como `CHECKPOINT_ORPHAN`. Manifesto ativo não é usado para inventar uma retomada.

O orquestrador aceita funções de reconciliação/limpeza por injeção, permitindo testes determinísticos sem IndexedDB real.

## Testes

Fortalecido `test/dataset-boot-recovery.test.js` com cenários de ausência de transação, erro de leitura, encaminhamento para reconciliação, limpeza de órfão e falha sem limpeza.

Não declarar `npm test`, build ou CI como aprovados sem execução real.

## Limite desta rodada

O orquestrador ainda não foi chamado pelo `src/main.js`. A integração direta ao boot da UI deve ser feita depois de confirmar o contrato de inicialização e a política de bloqueio/falha do aplicativo. Portanto, `Recovery no boot` permanece em integração pendente.

## Próximo gargalo

Integrar o orquestrador ao ponto real de inicialização, sem atrasar a UI indefinidamente e sem esconder falhas de recuperação. Depois: rollback coordenado e limpeza de transação.
