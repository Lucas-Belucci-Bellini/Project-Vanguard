# 2026-08-28 — Integração do staging físico com retomada

## Ponto de partida

O histórico registrava retomada HTTP real com `Range`, `If-Range` e validação de `Content-Range`, mas ainda sem persistir a continuação diretamente no Package Storage. O storage físico mantinha o pacote em `STAGING`/`ACTIVE` e não possuía uma operação específica para anexar bytes retomados.

## Alteração publicada

`src/core/dataset-package-storage.js` recebeu `anexarPacoteStaging(datasetId, sufixo, metadata)`.

A operação:

- exige `datasetId` válido;
- exige bytes válidos;
- exige que o pacote exista;
- exige estado `STAGING`;
- cria uma nova cópia do conteúdo combinado;
- preserva `ACTIVE` contra anexação acidental;
- atualiza tamanho, metadata e timestamp;
- mantém os dados do usuário fora deste store.

Foi criada cobertura em `test/dataset-package-storage-resume.test.js` para anexação bem-sucedida e bloqueio quando o pacote já está `ACTIVE`.

## Commits

- `ac2c1c764c91a3d9c694baae4e527fa8dbe98c63` — `feat(v2): suportar anexacao segura de staging para retomada`
- `22eb94e67607fe4e6130ea8df8558e5d86138590` — `test(v2): cobrir anexacao de staging para retomada`

## Verificação

Não declarar `npm test`, build ou CI como aprovados sem execução real.

## Limites

- A operação ainda recebe o sufixo já obtido pelo downloader; ela não faz fetch de rede.
- Não há atomicidade de disco/power-loss garantida.
- Não há retomada automática em segundo plano.
- Não há dataset cartográfico concreto nem autorização de redistribuição.

## Próximo gargalo

Integrar `retomarDataset()` com `anexarPacoteStaging()` e o checkpoint, atualizando o checkpoint somente após persistir os bytes e removendo-o apenas quando o pacote completo for validado. Depois disso, fechar rollback/recovery físico.
