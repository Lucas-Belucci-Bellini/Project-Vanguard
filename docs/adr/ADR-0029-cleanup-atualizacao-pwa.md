# ADR-0029 — cleanup da verificação de atualização PWA

- **Status:** Aceita
- **Data:** 2026-08-28
- **Escopo:** controle de atualização PWA/WebView, timer inicial e desmontagem da UI

## Contexto

O controle de atualização agendava uma verificação remota inicial com `setTimeout(verificarRelease, 2500)`, mas não guardava o identificador nem o cancelava em `desmontar()`. A shell pode trocar de página ou ser encerrada antes da execução, deixando um callback associado a uma instância de controle que já não deve atualizar a interface.

O fluxo também consulta uma release oficial somente quando existe rede e usa URLs HTTPS permitidas. A correção não muda a política de atualização nem permite instalação silenciosa.

## Decisão

`src/core/atualizacao-ui.js` passou a guardar o timer inicial em `timerVerificacao`, limpar o identificador quando o callback é executado e chamar `clearTimeout()` no `desmontar()`. A resposta da consulta remota é descartada se o controle tiver sido desmontado enquanto `fetch()` ou `response.json()` aguardava.

O restante do cleanup existente permanece: listeners de `vanguard:sw-ready`, `online` e `visibilitychange` são removidos; a atualização do Service Worker continua exigindo ação e confirmação explícitas; no Capacitor, o botão apenas abre a página oficial e o sistema operacional controla download/instalação.

## Evidência e limites

`test/atualizacao-ui.test.js` injeta um relógio fake, confirma a janela de 2,5 segundos e verifica que o timer é cancelado na desmontagem, além da remoção dos listeners e do fluxo de confirmação do Service Worker. Isso é uma prova determinística do contrato de cleanup, não uma validação de rede, Service Worker, instalação PWA, WebView ou atualização em aparelho.

A validação física continua pendente para instalação, modo avião, reabertura, lifecycle, confirmação do sistema e teste com uma versão posterior. A V2 permanece `IN PROGRESS`/`BLOCKED` nos gates físicos e de distribuição.
