# `#/escuta` — Escuta de ambiente

**Estado:** `IMPLEMENTED`

## Objetivo
Avisar por vibração quando o grave sobe como sobe um veículo se aproximando,
ou quando alguém grita. **Só recebe.**

## Entrada
Sensibilidade (conservadora / equilibrada / sensível).

## Dados necessários
Microfone, cru: `echoCancellation`, `noiseSuppression` e `autoGainControl`
pedidos desligados (o navegador pode recusar, e a tela mostra o que foi concedido).

## Dependências
`engine/escuta.js`, `core/escuta-ambiente.js`, `core/alertas-tateis.js`.

## Ações
- **COMEÇAR A ESCUTAR / PARAR** — abre e solta o microfone.
- **Trocar sensibilidade** — muda as margens do detector.

## Saídas
Espectro ao vivo, nível por banda, piso do lugar, taxa de subida e os eventos
`VEICULO_APROXIMANDO` e `CHAMADO_VOZ` com vibração.

## Estados
LOADING (permissão) · SUCCESS (escutando) · EMPTY (parada) · ERROR (falhou) ·
UNAVAILABLE (sem microfone no ambiente) · NEGADA (permissão recusada).

## Limitações
Não grava, não guarda, não transmite e não reproduz — o grafo termina no
`AnalyserNode`, e há teste estrutural cobrando a lista de APIs proibidas
(ADR-0041). Não identifica o que fez o som: mede energia por banda.

## Testes
`test/escuta.test.js` (20), `test/escuta-ambiente.test.js` (8, incluindo o
teste estrutural de não-transmissão).
