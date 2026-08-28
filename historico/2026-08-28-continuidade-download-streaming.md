# 2026-08-28 — Continuidade: adapter de download

## Ponto de partida

A V2 já possuía manifesto, transação, storage isolado, governança de fontes, integridade SHA-256, Package Storage IndexedDB, integração Sync ↔ Package Storage e estados físicos `STAGING`/`ACTIVE`.

## Trabalho publicado

- Criado `src/core/dataset-download.js`.
- Criado `test/dataset-download.test.js`.
- O adapter consome `ReadableStream`, reporta progresso, aceita `AbortSignal`, aplica `maxBytes`, valida `content-length` quando presente e só devolve os bytes após o stream terminar.
- Erros possuem códigos explícitos para HTTP, stream indisponível, cancelamento, limite excedido, falha de leitura e download incompleto.
- O adapter não autoriza URLs, não escolhe fontes, não grava storage e não ativa datasets. Essas responsabilidades continuam nas camadas próprias.

## Commits

- `0376a50` — `feat(v2): criar adapter de download em streaming`
- `ee839a7` — `test(v2): cobrir adapter de download em streaming`

## Verificações previstas

Os testes foram adicionados ao comando existente `npm test`. Esta rodada via integração GitHub não executa o ambiente local; portanto não registrar sucesso de `npm test` sem uma execução real do CI/local.

## Limites mantidos

- Nenhum endpoint real foi escolhido.
- Nenhum dataset cartográfico foi baixado.
- Nenhuma fonte foi promovida para `APPROVED`.
- Nenhuma URL foi autorizada automaticamente.
- Não há promessa de retomada HTTP por range nesta etapa.
- Não há mudança na separação entre dados do usuário, cache técnico e dataset offline.

## Próximo gargalo

Integrar o adapter de download ao orquestrador de dataset sem permitir ativação de pacote incompleto e, depois, implementar cancelamento/retomada com estado persistido e recuperação segura.
