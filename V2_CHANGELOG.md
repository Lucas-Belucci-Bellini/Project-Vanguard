# Project Vanguard V2 — changelog de construção

## 2026-08-27 — Fundação de continuidade

A V2 foi iniciada a partir do estado real existente, sem reiniciar nem reescrever a base do Vanguard Field. O prompt-base foi decomposto em escopo civil, regras de evidência, memória persistente, ciclo de auditoria e restrições para o módulo legado.

O estado herdado inclui GPS/GNSS local, MGRS, bússola, mapa MapLibre, destinos, waypoints, trilha, cache offline limitado, armazenamento versionado, JSON/GPX, contextos civis, manual de sobrevivência, preparação de Socorro, atualização confirmada para PWA/APK e documentação de release. A validação reproduzida registra 112 testes, build web, service worker e Android debug aprovados.

A nova memória persistente foi criada em `V2_STATUS.md`, `V2_MASTER_CHECKLIST.md`, `V2_PROGRESS.md`, `V2_BLOCKERS.md`, `V2_DECISIONS.md`, `V2_RISK_REGISTER.md`, `V2_TEST_MATRIX.md`, `V2_FEATURE_MATRIX.md` e `V2_ARCHITECTURE_MAP.md`. O backlog fora do escopo fica em `V3_BACKLOG.md`.

O próximo gargalo escolhido é diagnóstico local observável. Ele deve mostrar estado do aplicativo, rede, GPS, frescor, armazenamento, cache, service worker e bateria quando a API fornecer esse dado, sem coletar telemetria escondida.

## Regra de registro

Cada execução futura deve adicionar uma entrada com data, commit, mudança, testes, documentação, blockers e próximo passo. Nenhuma execução deve marcar a V2 como completa apenas por compilar.
