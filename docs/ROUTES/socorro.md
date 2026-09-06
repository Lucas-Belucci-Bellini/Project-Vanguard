# `#/socorro` — Modo socorro

**Estado:** `IMPLEMENTED`

## Objetivo
Preparar um registro da própria posição para ser entregue por um canal que a
pessoa escolher — e deixar explícito que **o aplicativo não chama resgate**.

## Entrada
Nenhuma digitada.

## Dados necessários
Fixo de GPS de alta precisão (modo `emergencia`).

## Dependências
`core/localizacao.js`, `platform/compartilhamento.js`.

## Ações
- **ATUALIZAR GPS** — pede um fixo novo.
- **PREPARAR ALERTA LOCAL** — monta o texto com coordenada, MGRS e horário e
  entrega ao menu de compartilhar do sistema.

## Saídas
Um texto/pacote local. Nada é transmitido pelo app.

## Estados
- **LOADING** — `LOCALIZAÇÃO PENDENTE` enquanto não há fixo.
- **SUCCESS** — posição pronta para compartilhar.
- **EMPTY** — sem fixo, com instrução para ligar o GPS.
- **ERROR** — GPS recusado, com o motivo.
- **UNAVAILABLE** — `TRANSMISSÃO EXTERNA NÃO CONFIGURADA`: não há serviço de
  emergência conectado, e a tela diz isso.

## Limitações
Preparar ≠ transmitir. A entrega depende de um canal externo (rede, rádio,
mensageiro por satélite) que o aplicativo não fornece e não simula.

## Testes
`test/compartilhamento.test.js`, `test/localizacao.test.js`.
