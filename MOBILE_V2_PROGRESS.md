# Vanguard Field — MOBILE V2 PROGRESS

## Registro da rodada — 2026-08-27

A auditoria partiu de `main` limpa em `6ce06a6` e confirmou que a camada Capacitor já possuía Android/iOS, GPS foreground, lifecycle observável, PWA, MapLibre, importação/exportação local e preparação defensiva de tiles. O gargalo verificável encontrado foi no diagnóstico: `statusPosicao()` lia somente `latitude`/`longitude`, embora o contrato normalizado e persistido pelo GPS use `lat`/`lon`. Isso podia exibir `UNAVAILABLE` mesmo depois de um fixo local válido.

A unidade implementada foi deliberadamente pequena. `src/core/diagnostico.js` agora aceita os dois shapes e permite injetar `agora` no `diagnosticoResumo()`; `test/diagnostico.test.js` cobre o shape normalizado e usa tempo determinístico. O commit foi publicado em `main` como `f9da500 fix(v2): reconhecer posição normalizada no diagnostico`.

## Evidências

| Gate | Resultado |
|---|---|
| `npm test` | 134 aprovados |
| `npm run build` | aprovado |
| `node --check public/sw.js` | aprovado |
| `git diff --check` | aprovado |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilidades reportadas |
| `npm run mobile:sync:android` | aprovado; plugins App e Geolocation sincronizados |
| `npm run mobile:sync:ios` | aprovado; plugins App e Geolocation sincronizados |
| `npm run mobile:android:debug` | `BUILD SUCCESSFUL` |
| APK | `android/app/build/outputs/apk/debug/app-debug.apk`, 8.284.304 bytes; somente artifact de teste |

## Histórico preservado

As unidades anteriores permanecem válidas e não foram repetidas: lifecycle observável, acessibilidade da shell, allowlist de atualização, performance local, deduplicação de render, frescor offline, planner de tiles e filtro defensivo do Service Worker.

## Próximo passo

Executar `MOBILE_V2_TEST_MATRIX.md` em Android comum, Xiaomi/MIUI/HyperOS e iPhone quando houver dispositivos. Priorizar permissões, troca de app/tela bloqueada, modo avião, persistência, quota/resposta de tiles, sensor de bússola, compartilhamento, update posterior e bateria. Sem hardware, não implementar background GPS, notificações, signing ou integrações fictícias.
