# `#/diagnostico` — Estado observável

**Estado:** `IMPLEMENTED`

## Objetivo
Mostrar o que o aparelho realmente informa — e marcar como **INDISPONÍVEL** o
que ele não informa, em vez de fingir um `OK`.

## Entrada
Nenhuma. Um botão recarrega as sondas.

## Dados necessários
Ambiente: plataforma, `navigator.onLine`, service worker, quota de
armazenamento, tiles em cache (via `MessageChannel` com o SW), fonte de GPS,
ciclo de vida do app, marcas de desempenho da Navigation Timing.

## Dependências
`core/diagnostico.js`, `core/ciclo-vida.js`, `core/localizacao.js`,
`core/atualizacao.js`.

## Ações
- **RECARREGAR** — refaz as sondas.

## Saídas
Lista agrupada, cada item com valor e um de três estados.

## Estados
- **OK** — a sonda respondeu e o valor é bom.
- **ATENÇÃO** — a sonda respondeu e o valor merece olhar.
- **INDISPONÍVEL** — o ambiente não expõe o recurso. **Não é falha e não é
  alerta**: tratar desconhecido como problema treina quem lê a ignorar os
  alertas de verdade.

## Limitações
A quota de armazenamento é uma estimativa do navegador. A contagem de tiles
depende do service worker responder dentro de 1,2 s; passando disso o valor é
`INDISPONÍVEL · tempo esgotado`, não zero.

## Testes
`test/diagnostico.test.js`, `test/ciclo-vida.test.js`, `test/atualizacao.test.js`.
