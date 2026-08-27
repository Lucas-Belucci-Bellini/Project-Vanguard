# ADR-0017 — Persistência local observável

- **Status:** Aceita
- **Data:** 2026-08-27
- **Escopo:** Mobile V2 / estado offline-first

## Contexto

O estado do produto é persistido em `localStorage`, mas a escrita pode falhar por quota cheia, modo privado, política do WebView, armazenamento bloqueado ou erro do sistema. Antes desta unidade, `estado.set()` ignorava o resultado de `setItem()` e continuava notificando listeners. A tela podia aparentar que um ponto, trilha ou alerta havia sido salvo mesmo quando a escrita não havia sido aceita.

## Decisão

Manter `localStorage` como backend leve atual e registrar o resultado da última tentativa de escrita:

| Resultado | Significado |
|---|---|
| `PERSISTIDO` | `setItem()` terminou sem lançar exceção |
| `FALHA` | `setItem()` lançou exceção; o nome do erro é retido sem dados sensíveis |
| `NAO_TESTADO` | nenhuma escrita observável ocorreu desde a inicialização do módulo |

`estado.statusPersistencia()` devolve uma cópia do estado `{ estado, chave, erro }`. `estado.set()` conserva o valor retornado e a notificação existente para manter compatibilidade; a UI pode informar que a gravação falhou e não deve tratar a operação como backup confirmado. O Diagnóstico expõe a última persistência no grupo `ARMAZENAMENTO`.

## Limites

O indicador representa somente a última tentativa, não uma auditoria de todos os registros nem uma garantia de quota restante, durabilidade, sincronização, backup externo ou sobrevivência à desinstalação. A implementação não adiciona telemetria, não transmite dados e não migra para IndexedDB sem medição e justificativa. Cache Storage de tiles continua com sua própria política e quota não confirmada.

## Evidência

`test/estado.test.js` cobre escrita normal, envelope, migração, fallback e `QuotaExceededError`, incluindo a preservação do valor em memória do chamador. Build web, sync Android/iOS, APK debug e CI permanecem gates técnicos; quota real, reinstalação, limpeza pelo sistema e persistência em aparelho continuam testes físicos pendentes.
