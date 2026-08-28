# ADR-0028 — cleanup da centralização manual

- **Status:** Aceita
- **Data:** 2026-08-28
- **Escopo:** lifecycle da página do mapa, centralização manual e callbacks assíncronos

## Contexto

O botão **Centrar** solicitava um novo fixo manual e agendava diretamente um `setTimeout` de 21 segundos para reativar o botão. A página do mapa pode ser desmontada quando a navegação muda de rota; nesse caso, o timer permanecia associado à execução anterior e callbacks de posição/erro ainda poderiam tentar atualizar a tela ou a instância MapLibre removida.

O problema é de integração e cleanup, não de precisão GPS. A posição continua dependente do aparelho, do ambiente, da permissão e do receptor; nenhuma leitura é corrigida ou tratada como precisa por este ADR.

## Decisão

Foi criado `src/core/centralizacao-manual.js`, um controlador puro que:

- mantém os estados `LIVRE`, `BUSCANDO` e `ENCERRADA`;
- bloqueia uma nova solicitação enquanto a janela manual está ativa;
- recebe `setTimeout`/`clearTimeout` injetáveis e conserva a janela visual de 21 segundos;
- cancela o timer no cleanup;
- ignora callbacks de posição e erro depois de `cancelar()` ou `desmontar()`;
- impede nova solicitação depois de `desmontar()`.

`src/pages/mapa.js` passou a usar esse controlador para o botão **Centrar**, guarda a desmontagem antes de parar o GPS e evita que o listener de `release` do Wake Lock atualize uma tela removida. O controlador não cria watcher, não adiciona permissão e não altera os perfis `cidade`, `trilha` ou `manual` do GPS.

## Evidência e limites

`test/centralizacao-manual.test.js` cobre reentrada, duração configurada, callbacks durante a busca, finalização, cancelamento, cleanup e callbacks tardios. Os testes são determinísticos e não provam comportamento físico de GPS, MapLibre, Wake Lock, tela bloqueada ou aparelho real.

A validação física continua em `MOBILE_V2_TEST_MATRIX.md`, especialmente T-005A e T-007. A V2 permanece `IN PROGRESS`/`BLOCKED` nos gates de hardware, offline físico, bateria, signing e distribuição.
