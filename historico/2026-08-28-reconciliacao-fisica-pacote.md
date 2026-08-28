# 2026-08-28 — Reconciliação física de pacote

## Ponto de partida

A retomada HTTP já conseguia validar `Range`/`Content-Range`, e a camada de persistência já anexava o sufixo ao `STAGING` e atualizava o checkpoint. O próximo gargalo era recuperar estados divergentes depois de interrupção.

## Entregue

Criado `src/core/dataset-package-recovery.js` para reconciliar `Package Storage` e `Checkpoint Storage` sem ativar dataset.

Regras:

- sem pacote e sem checkpoint: `CLEAN`;
- `ACTIVE` é preservado;
- `STAGING` + checkpoint com mesmo tamanho: `STAGING_RESUMABLE`;
- `STAGING` divergente do checkpoint: STAGING é descartado;
- `STAGING` sem checkpoint: STAGING é descartado;
- checkpoint sem pacote: preservado como diagnóstico até decisão explícita;
- estado físico desconhecido: falha explícita;
- remoção de checkpoint órfão é operação separada e explícita.

Também criado `test/dataset-package-recovery.test.js` com cobertura dos estados principais.

## Commits

- `56c0cb1` — `feat(v2): reconciliar pacote e checkpoint após interrupcao`
- `d07351f` — `test(v2): cobrir reconciliacao fisica de pacote`

## Verificação

Os testes foram adicionados, mas não foram executados nesta rodada. Não declarar CI, build ou `npm test` como aprovados sem evidência de execução.

## Próximo gargalo

Integrar a reconciliação ao ponto de boot/recuperação do dataset e, depois, tratar limpeza coordenada de checkpoint e transação. Só então avançar para testes de quota/power-loss e aparelho real.
