# 2026-08-28 — Retomada HTTP real

## Ponto de partida

O histórico anterior registrava downloader streaming, sessão de download, checkpoint persistente e planner de Range. O próximo gargalo era executar a retomada real sem aceitar bytes fora do offset persistido.

## Alteração publicada

`src/core/dataset-download-resume.js` foi ampliado com `retomarDataset()`.

Fluxo:

1. valida staging e checkpoint;
2. monta `Range: bytes=N-`;
3. usa `If-Range` com ETag ou Last-Modified quando disponível;
4. executa o fetch por dependência injetável;
5. exige HTTP 206;
6. valida `Content-Range` e total;
7. valida o tamanho do corpo recebido;
8. combina o prefixo do staging com o sufixo retomado;
9. só então devolve o pacote completo ao chamador.

Foi adicionada cobertura em `test/dataset-download-resume-real.test.js` para retomada bem-sucedida, rejeição de HTTP 200 e divergência entre staging e checkpoint.

## Commits

- `1c05a4506b320241efe1cb477179ad88542d30b5` — `feat(v2): executar retomada HTTP com checkpoint persistente`
- `e401efb16a453c99c604722e419e2fefb175e73b` — `test(v2): cobrir execução real da retomada HTTP`

## Verificação

Não executar nem declarar npm test/build/CI como aprovados sem execução real. Esta rodada apenas publicou código e testes.

## Limites

- Nenhum endpoint real foi escolhido.
- Nenhum dataset foi baixado.
- A função não grava storage nem ativa dataset.
- Não há ainda persistência incremental dos bytes do staging durante a retomada.
- Ainda falta integração completa da retomada com Package Storage e Dataset Sync.

## Próximo gargalo

Integrar `retomarDataset()` ao fluxo de staging físico, persistindo o resultado com segurança e mantendo rollback/recovery quando a retomada for interrompida.
