# 2026-08-28 — Checkpoint persistente integrado à sessão

## Ponto de partida

O projeto já possuía adapter de download, sessão de download, planejador de retomada HTTP/Range e storage IndexedDB isolado para checkpoints.

## Alteração publicada

`src/core/dataset-download-session.js` passou a aceitar/inicializar `checkpointStorage` e, quando existe `datasetId`, persistir o progresso da sessão no storage de checkpoints. Também expõe `checkpoint(datasetId)` para recuperação do estado persistido.

O checkpoint guarda apenas metadata de progresso (`recebido`, `total`, `etag`, `lastModified` e versão). Os bytes continuam fora desse storage.

Quando o download termina com sucesso, o checkpoint é removido. Em cancelamento ou falha, o checkpoint permanece para permitir uma próxima camada de retomada.

## Commit

- `58d4d1545786b0a71408ee6f5913c1b919040670` — `feat(v2): integrar checkpoints persistentes à sessão de download`

## Limites

Esta rodada ainda não implementa a continuação HTTP efetiva dos bytes a partir do checkpoint. O planner de Range existente continua sendo responsável por validar a possibilidade de retomada. Não marcar testes/CI como aprovados sem execução real.

## Próximo gargalo

Criar a operação de retomada real: recuperar checkpoint, montar a requisição `Range`/`If-Range`, validar `206 Content-Range`, combinar os bytes com o staging existente e preservar segurança contra mismatch de ETag/Last-Modified.
