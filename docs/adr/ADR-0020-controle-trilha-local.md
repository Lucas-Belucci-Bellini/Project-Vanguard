# ADR-0020 — Controle de sessão de trilha local

- **Status:** Aceita
- **Data:** 2026-08-27
- **Escopo:** Mobile V2 / tracking / estado local

## Contexto

O Mapa tinha um único botão que alternava entre iniciar e parar a rota. O prompt Mobile V2 exige uma sessão local com Start, Pause, Resume, Stop, Save, Restore e Export. Sem uma pausa manual distinta, a pessoa não conseguia interromper a gravação sem encerrar a rota, e a Home não distinguia uma rota pausada de uma rota parada.

## Decisão

Adicionar `src/core/trilha-sessao.js` como máquina de estados pura:

| Estado | Evento principal | Efeito |
|---|---|---|
| `STOPPED` | `START` | cria/retoma a sessão como gravação local |
| `ACTIVE` | `PAUSE` | mantém os pontos e interrompe a inclusão de novos pontos |
| `PAUSED` | `RESUME` | volta a aceitar pontos do watcher |
| `ACTIVE` ou `PAUSED` | `STOP` | encerra a gravação sem apagar o registro |

O estado manual é persistido na chave local `rotaPausada`; `rotaAtiva` continua preservada para compatibilidade. O Mapa expõe `INICIAR ROTA`, `PAUSAR ROTA`, `RETOMAR ROTA` e `PARAR E GUARDAR`. A Home informa `GRAVAÇÃO ATIVA`, `ROTA PAUSADA` ou `REGISTRO PRONTO`.

A pausa de sessão não é a mesma coisa que a pausa de lifecycle. Ao ocultar a página, o watcher GPS continua obedecendo `setPaused(true)` e a política `FOREGROUND_ONLY`; ao retornar, o watcher pode ser retomado, mas a sessão manual continua pausada se a pessoa a tiver pausado.

## Limites

Os pontos, waypoints e destino permanecem locais. `STOP` não exporta nem compartilha automaticamente. O estado `ACTIVE` da sessão não prova fixo recente, sinal, precisão, continuidade, bateria ou tracking em background. Não foram adicionadas permissões sensíveis, serviços em segundo plano ou integração externa.

Importação JSON/GPX sempre deixa a rota parada por segurança. Limpar a trilha também limpa o estado de pausa. Quota e falha de persistência continuam observáveis por `estado.statusPersistencia()` e não são transformadas em confirmação de backup.

## Evidência

`test/trilha-sessao.test.js` cobre a máquina pura e `test/localizacao.test.js` cobre o watcher GPS. A suíte chegou a 156 testes aprovados; build, sync Capacitor e APK debug passaram. A validação em aparelho, tela bloqueada, suspensão, retomada e duração de bateria continua pendente.
