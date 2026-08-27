# ADR-0019 — Estados do acompanhamento GPS em foreground

- **Status:** Aceita
- **Data:** 2026-08-27
- **Escopo:** Mobile V2 / localização / lifecycle

## Contexto

O acompanhamento GPS compartilhado iniciava um watcher e persistia posições, mas seu callback `onState` não tinha um contrato de estados operacionais. O Mapa não conseguia distinguir busca inicial, acompanhamento ativo, pausa, encerramento ou erro. Isso era especialmente importante para não sugerir que o GPS continuaria executando quando a página estivesse oculta.

## Decisão

`iniciarAcompanhamento()` passa a emitir estados explícitos:

| Estado | Significado |
|---|---|
| `STARTING` | permissão e watcher estão sendo preparados |
| `ACTIVE` | watcher aceito pelo driver Capacitor ou Web |
| `PAUSED` | watcher foi limpo deliberadamente, com fonte `FOREGROUND_ONLY` |
| `ERROR` | o driver reportou erro; a mensagem original segue para a UI |
| `UNAVAILABLE` | nenhuma API de localização utilizável foi encontrada |
| `STOPPED` | o consumidor encerrou o acompanhamento |

O retorno do watcher expõe `setPaused(true/false)`. O Mapa chama esse método ao ocultar/mostrar a página: ao ficar oculta, o watcher é limpo; ao voltar, o watcher é iniciado novamente. O comportamento é uma política de foreground-only e não é uma implementação de localização em background.

A API aceita `navigatorApi`, `capacitorApi` e `geolocationApi` injetáveis para testes determinísticos. O plugin nativo é envolvido em um adaptador simples para não tratar o proxy Capacitor como Promise acidentalmente.

## Limites

O estado `ACTIVE` prova apenas que o watcher foi aceito pela API; não prova sinal, precisão, continuidade, bateria ou fixo recente. `PAUSED` não prova o estado do processo no sistema operacional depois que a aplicação é suspensa. Não foram adicionados `ACCESS_BACKGROUND_LOCATION`, foreground service, `UIBackgroundModes`, `allowsBackgroundLocationUpdates` ou promessas de tracking contínuo.

Os fluxos de posição única e permissão continuam separados. A validação de background/suspensão, tela bloqueada, retorno do app e comportamento real em Android/iOS permanece física e está bloqueada até haver aparelhos.

## Evidência

`test/localizacao.test.js` cobre ACTIVE/PAUSED/STOPPED no fallback Web, pausa/limpeza do caminho Capacitor e UNAVAILABLE sem API. A suíte local, build, sync e APK debug são gates técnicos; não substituem a matriz de campo.
