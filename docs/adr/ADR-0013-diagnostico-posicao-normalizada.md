# ADR-0013 — Diagnóstico aceita posição normalizada

- **Status:** Aceita
- **Data:** 2026-08-27
- **Escopo:** Mobile V2 / diagnóstico local

## Contexto

O contrato compartilhado de localização normaliza leituras para `{ lat, lon, accuracy, timestamp }` e grava esse objeto no estado local. O formatador de diagnóstico verificava apenas `latitude` e `longitude`, nomes comuns de APIs externas/legadas. Assim, um fixo válido do próprio app podia ser mostrado como `UNAVAILABLE` na tela `#/diagnostico`.

## Decisão

`statusPosicao()` passa a reconhecer os dois shapes: `lat`/`lon` como contrato primário e `latitude`/`longitude` como compatibilidade. A função continua exigindo coordenadas numéricas e timestamp válido para declarar `AVAILABLE`; posição sem idade verificável ou com cinco minutos ou mais permanece `STALE`.

`diagnosticoResumo()` aceita um parâmetro opcional `agora`, com `Date.now()` como padrão, para permitir testes determinísticos do frescor sem mudar o comportamento de produção.

## Consequências

O diagnóstico passa a refletir corretamente os dados que o Vanguard Field já salva localmente, sem duplicar ou transformar a posição. A compatibilidade legada evita regressão para consumidores que ainda fornecem latitude/longitude. A correção não melhora sinal, precisão, cobertura, comunicação ou resgate e não altera a política de GPS foreground.

## Evidência

A regressão está em `test/diagnostico.test.js`. A suíte completa passou com 134 testes, o build web passou, Android/iOS foram sincronizados e o APK debug foi compilado. A implementação foi publicada em `main` no commit `f9da500`.
