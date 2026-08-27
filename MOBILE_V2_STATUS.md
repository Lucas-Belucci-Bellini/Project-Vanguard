# Vanguard Field — MOBILE V2 STATUS

> Registro persistente da execução Mobile V2. Atualizado em **2026-08-27**, após o commit `f9da500`. Este arquivo não declara a V2 completa sem validação física.

| Campo | Estado atual |
|---|---|
| **Version** | `2.x` em construção; pacote compartilhado atual `1.0.0` |
| **Phase** | Mobile foundation com diagnóstico local, PWA e Capacitor; `IN PROGRESS` |
| **Milestone** | Corrigir evidência local de GPS e preparar a matriz de validação Android/iOS |
| **Android** | Projeto Capacitor presente; `com.projectvanguard.field`; permissões somente coarse/fine; APK debug compilado; aparelho real ainda não validado |
| **iOS** | Projeto Capacitor presente; bundle `com.projectvanguard.field`; deployment target iOS 15; sync validado no Linux; build, assinatura e aparelho real pendentes em macOS/Xcode |
| **PWA** | Build e service worker presentes; shell/estado/tile cache local; instalação e modo avião ainda exigem teste físico |
| **Build** | `npm run build`, sync Android/iOS e `assembleDebug` aprovados nesta execução |
| **Tests** | `npm test`: **134 aprovados**; `node --check public/sw.js`, `git diff --check` e `npm audit --omit=dev --audit-level=high` aprovados |
| **Permissions** | Android foreground coarse/fine; iOS descrição foreground; não há background location, foreground service ou `UIBackgroundModes` |
| **GPS** | Driver Capacitor foreground com fallback Web/PWA; posição normalizada usa `lat/lon`; diagnóstico agora reconhece também esse formato |
| **Compass** | Sensor físico ainda `BROWSER DEPENDENT`/`DEVICE DEPENDENT`; fallback de rumo GPS não prova sensor magnético |
| **Storage** | `localStorage` para dados do produto e Cache Storage para shell/tiles; quota e persistência física ainda pendentes |
| **Offline** | Planner/SW defensivos e limite local de 256 URLs; cobertura real e modo avião pendentes |
| **Maps** | MapLibre, tiles preparados e deduplicação; provedores/cobertura/quota não são garantidos |
| **Battery** | Política econômica documentada; consumo de quatro dias e suspensão em background exigem aparelho real |
| **Security** | Civil, local-first, sem telemetria automática, sem SOS/resgate confirmado, sem integração militar e sem expansão do legado balístico |
| **Accessibility** | Shell com skip link, landmarks, foco, ARIA e status; leitor de tela/touch precisam de validação em dispositivos |
| **Release** | `BLOCKED`; a única release continua `v1.0.0-rc.2`; `v1.0.0` final não foi criada |
| **Current Task** | Executar a matriz `MOBILE_V2_TEST_MATRIX.md` em Android comum, Xiaomi/MIUI/HyperOS e iPhone quando os aparelhos estiverem disponíveis |
| **Next Task** | Validar permissões, ciclo de vida, offline real, importação/exportação, bússola, atualização confirmada e bateria; não assumir background contínuo |

## Unidade entregue nesta execução

O diagnóstico comparava a posição apenas pelos campos legados `latitude`/`longitude`, enquanto o contrato compartilhado do GPS persistia `lat`/`lon`. A função `statusPosicao()` passou a aceitar ambos os formatos, e `diagnosticoResumo()` recebeu um relógio opcional para testes determinísticos. A regressão é coberta em `test/diagnostico.test.js` e foi publicada no commit `f9da500`.

## Evidência e limites

O build do Android produz um **APK debug de teste**, não um artefato de distribuição. A sincronização iOS confirma apenas a geração dos recursos nativos no ambiente Linux; ela não substitui Xcode, assinatura Apple, instalação ou execução em iPhone. Nenhum estado `VERIFIED` deve ser atribuído a hardware, bateria, background, sensores, quota ou release sem evidência física correspondente.

Referências do projeto: [`docs/BUILD-MOBILE.md`](docs/BUILD-MOBILE.md), [`docs/CHECKLIST-MOBILE-V1.0.0.md`](docs/CHECKLIST-MOBILE-V1.0.0.md), [`MOBILE_V2_TEST_MATRIX.md`](MOBILE_V2_TEST_MATRIX.md) e [`V2_BLOCKERS.md`](V2_BLOCKERS.md).
