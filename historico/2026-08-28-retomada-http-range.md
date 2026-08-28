# 2026-08-28 — Retomada HTTP por Range

## Ponto de partida

O histórico anterior registrava o pipeline `download → sync` e apontava como próximo gargalo adicionar estado de retomada sem permitir pacote incompleto em `STAGING`. A retomada ainda não existia no código.

## Trabalho publicado

- Criado `src/core/dataset-download-resume.js`.
- Criado `test/dataset-download-resume.test.js`.
- O módulo cria checkpoints versionados com `datasetId`, bytes recebidos, total e validadores HTTP (`ETag`/`Last-Modified`).
- Calcula `Range: bytes=N-` e `If-Range` quando há validador.
- Exige resposta `206 Partial Content` para uma retomada.
- Valida `Content-Range`, offset inicial e total conhecido.
- Uma resposta com offset divergente ou sem Range válido é recusada.

## Commits

- `c83623a9ed98aca38e40683a902354ada991656f` — `feat(v2): adicionar planejamento seguro de retomada HTTP`
- `1426d8994db0d8ca2088e86a4d5ebb7f34e84cb6` — `test(v2): cobrir retomada HTTP por Range`

## Limites

Esta rodada NÃO implementa o fetch de rede nem persistência do checkpoint. O módulo é deliberadamente um planejador/validador para ser integrado ao downloader posteriormente. Nenhum endpoint ou fonte cartográfica foi escolhido e nenhum dataset foi baixado.

## Verificação

Os testes foram adicionados, mas não registrar `npm test`, build ou CI como aprovados sem execução real.

## Próximo gargalo

Integrar checkpoint persistente ao download session/pipeline e definir como juntar bytes retomados sem corromper `STAGING`. A ativação deve continuar bloqueada até checksum e tamanho finais serem validados.
