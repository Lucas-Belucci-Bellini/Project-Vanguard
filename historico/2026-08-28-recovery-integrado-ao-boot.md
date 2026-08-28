# 2026-08-28 — Recovery de dataset integrado ao boot

## Rodada

A reconciliação física de pacote, que já existia como camada isolada, foi conectada ao `boot()` real de `src/main.js`.

## Implementado

- `src/main.js` importa `recuperarDatasetNoBoot`.
- O boot executa a recuperação antes de registrar a navegação e carregar a tela inicial.
- Falhas de recovery não são silenciosas: são registradas no console e sinalizadas no status do shell.
- O recovery continua separado do store de dados do usuário.
- O manifesto ativo permanece protegido pela camada de recovery.

## Commit

- `a8fb5d04242c8989b65711630c8b2dbe44055e3f` — `feat(v2): integrar recovery de dataset ao boot`

## Verificações

Não foram executados `npm test`, build ou CI nesta rodada pelo conector. Portanto não declarar esses checks como aprovados.

## Versionamento / testes reais

A busca no repositório não encontrou referência a `0.7.0`, e a release pública atualmente registrada é `v1.0.0-rc.2`. Não criar artificialmente uma `0.7.0` apenas para iniciar testes físicos. Os testes reais devem ocorrer sobre uma build identificável do estado atual de desenvolvimento; uma versão/tag de teste só deve ser criada quando houver motivo de release e checklist correspondente.

## Próximo gargalo

1. Executar testes automatizados e CI desta integração.
2. Fechar rollback/limpeza coordenada de transação + checkpoint + STAGING.
3. Gerar uma build Android de teste reproduzível quando o ambiente permitir.
4. Fazer validação física de recovery, GPS, armazenamento e modo avião.
5. Só depois considerar uma tag/release de teste formal.
