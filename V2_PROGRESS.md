==============================
PROJECT VANGUARD V2
EXECUTION REPORT
==============================

Current Version: 2.x em construção; pacote atual 1.0.0
Current Phase: Fase 2 — Engine/GPS mobile foundation + lifecycle observability
Current Milestone: Foundation Hardening + atualização segura

Completed:
- O prompt V2 foi lido e decomposto sem reiniciar o trabalho existente.
- O Vanguard Field civil foi preservado como produto principal.
- O fluxo de build, artifact, candidate e release continua separado.

Implemented:
- GPS/GNSS local, MGRS, bússola, mapa, destinos, waypoints e trilha.
- Offline-first para shell, dados, manual e tiles preparados com limite explícito.
- JSON/GPX local, contextos civis, manual de sobrevivência e Socorro manual.
- Atualização confirmada para PWA/APK, sem auto-instalação silenciosa.
- Skill reutilizável em `.claude/skills/vanguard-field-release-ops/SKILL.md`.
- Diagnóstico local em `#/diagnostico`, com versão, plataforma, rede, GPS, frescor, cache, armazenamento, bateria quando disponível, service worker e bússola.
- Driver opcional `@capacitor/geolocation@8.2.2` para foreground nativo, com fallback Web/PWA e política de energia compartilhada.
- Observador de lifecycle com `@capacitor/app@8.1.1`, usando `appStateChange` nativo ou `visibilitychange` na Web; o estado aparece no Diagnóstico sem prometer background GPS.
- Hardening de acessibilidade na shell: link de salto, landmark `<main>` focável, foco após troca de rota, `aria-busy`, status ao vivo, alertas e serialização explícita de atalhos ARIA no helper.
- Fluxo de atualização endurecido: downloads aceitos apenas no caminho HTTPS oficial do repositório, fallback fixo para releases e teste PWA de waiting/negação/confirmação/reload/limpeza.

Fixed:
- Idade do último fixo visível no HUD.
- Estado de cache cartográfico descrito sem prometer cobertura completa.
- Versão Android alinhada a `versionCode 100` e `versionName 1.0.0`.

Tests:
- `npm test`: 124 passados.
- `npm audit --omit=dev`: 0 vulnerabilidades de produção.
- `node --check public/sw.js`: aprovado.
- Skill validada pelo `quick_validate.py`.

Build:
- `npm run build`: aprovado.
- `npm run mobile:android:debug`: `BUILD SUCCESSFUL`; APK é artifact de teste.

Security:
- Posição local por padrão.
- Nenhum SOS automático, hardware falso ou expansão de armamento/legado.
- Importações locais validadas; atualização exige confirmação.

Documentation:
- README, MEGA-PLANO, release docs, checklist mobile, plano de campo, operação de bateria, atualização, tag, roteiro, simulação SOS e memória V2.

Files Created:
- `V2_STATUS.md`
- `V2_MASTER_CHECKLIST.md`
- `V2_PROGRESS.md`
- `V2_BLOCKERS.md`
- `V2_DECISIONS.md`
- `V2_CHANGELOG.md`
- `V2_RISK_REGISTER.md`
- `V2_TEST_MATRIX.md`
- `V2_FEATURE_MATRIX.md`
- `V2_ARCHITECTURE_MAP.md`
- `V3_BACKLOG.md`

Files Modified:
- `src/core/diagnostico.js`, `src/pages/diagnostico.js`, `src/styles/diagnostico.css` e `test/diagnostico.test.js`.
- `src/core/localizacao.js` com driver nativo opcional e teste de fonte.
- `src/core/ciclo-vida.js` com testes de estado e limpeza de listeners.
- `src/ui/helpers.js` com serialização ARIA explícita e `test/helpers.test.js` cobrindo os atributos.
- `src/core/atualizacao.js` com allowlist HTTPS do repositório e `test/atualizacao-ui.test.js` cobrindo o fluxo PWA waiting.
- Android/iOS sincronizados com `@capacitor/geolocation@8.2.2` e `@capacitor/app@8.1.1`; permissões Android foreground e descrições iOS atualizadas.
- A rota `#/diagnostico` e o atalho correspondente foram adicionados ao app.

Blockers:
- Validação física do diagnóstico, driver foreground, lifecycle, acessibilidade e update em Android/Xiaomi/MIUI/HyperOS e iPhone.
- Teste com release posterior real, background GPS, consumo e quota de cache.
- Assinatura Android/iOS e distribuição.

Next Task:
- Validar Geolocation foreground, permissões, lifecycle, acessibilidade e update em Android/Xiaomi/iOS; testar uma release posterior controlada antes de considerar o fluxo de atualização verificado. Somente depois decidir sobre background GPS nativo.
- Commit anterior publicado: `bb240e7`; CI `33108661603` passou.
- Unidade publicada: `2bfd797 feat(v2): observar ciclo de vida mobile`; CI `33110246185` concluído com sucesso.
- Preview limpo confirmou `FOREGROUND · VISIBILITY API`; a primeira tentativa presa em loading levou à correção não bloqueante de `getRegistration()`. Isso não substitui validação nativa.
- Unidade anterior publicada como `b5a83c9 feat(v2): fortalecer acessibilidade da shell`; CI `33111683598` concluído com sucesso.
- Unidade publicada como `e0e632b security(v2): restringir destinos de atualizacao`; CI `33112962807` concluído com sucesso. Validação local: 124 testes, build web, audit de produção, sync Android/iOS e APK debug.

V2 Completion:
IN PROGRESS
