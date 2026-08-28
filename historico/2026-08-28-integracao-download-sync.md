# 2026-08-28 — Integração do download com o sync

## Ponto de partida

O histórico anterior registrava `dataset-download.js` e `dataset-download-session.js` como adapters separados. O `dataset-sync.js` já possuía `avancar`, `armazenarBytes` e `ativar`.

## Trabalho publicado

- Criado `src/core/dataset-download-pipeline.js`.
- Criado `test/dataset-download-pipeline.test.js`.
- O pipeline executa, em ordem: sessão de download → entrada em `VERIFYING` → armazenamento/verificação dos bytes → ativação.
- Se o download, a transição ou o armazenamento falharem, a ativação não é chamada.
- Execuções concorrentes são recusadas.
- Dependências são injetáveis para testes sem IndexedDB ou rede real.

## Commits

- `a08a879d4558d26f5c330873a8afe04b620a50ae` — `feat(v2): integrar sessao de download ao sync`
- `75dabb66d9ce70c2950e97f22331e83ffc1c260b` — `test(v2): cobrir pipeline de download do dataset`

## Verificações

Os testes foram adicionados ao repositório, mas esta rodada não executou `npm test`, `npm run build` ou CI. Portanto não declarar esses comandos como aprovados sem execução real.

## Limites mantidos

- Nenhuma URL de produção foi escolhida.
- Nenhum dataset foi baixado.
- Nenhuma fonte foi aprovada para redistribuição offline.
- Não foi implementada ainda retomada HTTP por Range.
- Não foi declarada durabilidade física ou power-loss recovery.

## Próximo gargalo

Adicionar estado persistido de download/retomada sem corromper o pacote em `STAGING`, preferencialmente com suporte a `AbortSignal` e Range quando o servidor fornecer `Accept-Ranges`, mantendo ativação bloqueada até o pacote completo passar pelo checksum.
