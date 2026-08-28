# 2026-08-28 — Checkpoint persistente

## Ponto de partida

O planejador HTTP por `Range` já existia, mas fetch real e persistência do checkpoint ainda estavam pendentes.

## Trabalho publicado

- Criado `src/core/dataset-download-checkpoint-storage.js`.
- Criado `test/dataset-download-checkpoint-storage.test.js`.
- O storage usa IndexedDB separado do Package Storage.
- O checkpoint guarda somente metadados da retomada (`datasetId`, versão, bytes recebidos, total e validadores HTTP), não os bytes do dataset.
- Há operações `salvar`, `ler`, `remover` e `limpar`.
- Falhas de indisponibilidade e quota são reportadas explicitamente.

## Commits

- `a70aa1ab58ab81b06c4a8d2f80a820036436382c` — `feat(v2): persistir checkpoints de download`
- `ae2d8827baded3a65b6d7eae48e4fced9d151547` — `test(v2): cobrir storage de checkpoints`

## Limites

O checkpoint ainda não está integrado à sessão/pipeline de download. Portanto, ainda não existe retomada de rede automática. O storage não prova durabilidade contra power-loss nem quota real de dispositivo.

## Verificação

Os testes foram adicionados, mas não declarar `npm test`, build ou CI como aprovados sem execução real.

## Próximo gargalo

Integrar o checkpoint persistente à sessão de download e ao planejador `Range`, com atualização segura do offset e limpeza do checkpoint somente após conclusão e validação final do pacote.
