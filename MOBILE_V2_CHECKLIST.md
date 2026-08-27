# Vanguard Field — MOBILE V2 CHECKLIST

> Estados permitidos: `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `IMPLEMENTED`, `TESTED`, `VERIFIED`, `COMPLETE`. `VERIFIED` exige evidência física ou de integração real; build isolado não basta.

| ID | Plataforma | Feature | Status | Implementação | Teste | Evidência | Documentação |
|---|---|---|---|---|---|---|---|
| MV2-001 | Compartilhada | GPS/GNSS local foreground | TESTED | `src/core/localizacao.js`; Capacitor + fallback Web | testes de localização; build/sync | CI/local; aparelho real pendente | `docs/BUILD-MOBILE.md`, ADR-0004 |
| MV2-002 | Compartilhada | Diagnóstico local | TESTED | `src/pages/diagnostico.js` e `src/core/diagnostico.js` | 134 testes; regressão `lat/lon` | commit `f9da500` | `MOBILE_V2_PROGRESS.md`, ADR-0013 |
| MV2-003 | Compartilhada | Posição/frescor | TESTED | timestamp e estados `AVAILABLE`/`STALE`/`UNAVAILABLE` | testes determinísticos | navegador/Node; aparelho pendente | `V2_TEST_MATRIX.md` |
| MV2-004 | Android | Identidade e permissões foreground | IMPLEMENTED | `com.projectvanguard.field`; coarse/fine | sync + `assembleDebug` | APK debug; instalação/aparelho pendente | `MOBILE_V2_RELEASE.md` |
| MV2-005 | iOS | Identidade e descrição de localização | IMPLEMENTED | bundle `com.projectvanguard.field`; `Info.plist` | sync iOS | Linux sync; Xcode/iPhone pendentes | `MOBILE_V2_RELEASE.md` |
| MV2-006 | PWA | Shell, manifest e service worker | TESTED | shell/cache/update confirmado | build e testes do SW | navegador; instalação/modo avião pendentes | `docs/BUILD-MOBILE.md` |
| MV2-007 | Offline | Dados locais, tiles preparados e quota defensiva | TESTED | localStorage/Cache Storage, planner/SW até 256 URLs | testes de planner/SW | sem quota/modo avião físico | `MOBILE_V2_TEST_MATRIX.md` |
| MV2-008 | Mapa | Touch, centralização e tiles locais | IN_PROGRESS | MapLibre e HUD existentes | build; gestos físicos pendentes | nenhum dispositivo validado | `MOBILE_V2_TEST_MATRIX.md` |
| MV2-009 | Lifecycle | foreground/background/resume observável | TESTED | Capacitor App + `visibilitychange` | testes e diagnóstico local | execução nativa/tela bloqueada pendente | ADR-0005 |
| MV2-010 | Compass | Sensor, orientação, calibração e fallback | IN_PROGRESS | bússola de UI e fallback GPS; sensor físico não afirmado | build; sensor real pendente | nenhum sensor verificado | `MOBILE_V2_BLOCKERS.md` |
| MV2-011 | Compartilhada | JSON/GPX local | TESTED | validação, limites, import/export local | testes de registro | Files/Share Sheet e aparelhos pendentes | `docs/IMPORT-EXPORT.md` |
| MV2-012 | Compartilhada | Socorro manual | IMPLEMENTED | prepara coordenadas/pacote e compartilha por ação explícita | testes de preparação | entrega/resgate nunca testados nem afirmados | `docs/SIMULACAO-MODO-SOCORRO.md` |
| MV2-013 | Android/iOS | Background GPS | BLOCKED | não implementado de propósito | não há teste físico | exige requisito, implementação nativa e validação | `MOBILE_V2_BLOCKERS.md` |
| MV2-014 | Android/iOS | Bateria por quatro dias | BLOCKED | perfis econômicos documentados | sem profiling físico | aparelhos, temperatura e operação reais pendentes | `docs/OPERACAO-BATERIA-GPS-4-DIAS.md` |
| MV2-015 | Android/iOS | Atualização confirmada | IN_PROGRESS | PWA waiting; APK apenas abre origem oficial após confirmação | testes de política/fluxo local | release posterior e instalador físico pendentes | `MOBILE_V2_RELEASE.md` |
| MV2-016 | Distribuição | Release assinada | BLOCKED | scripts/documentação, sem credenciais | debug aprovado | keystore, Apple signing e publicação pendentes | `MOBILE_V2_RELEASE.md`, `V2_BLOCKERS.md` |
| MV2-017 | Compartilhada | Camada de capacidades observáveis | TESTED | `src/core/capacidades.js` + grupo `CAPACIDADES` no Diagnóstico | testes determinísticos de estados e APIs ausentes | Node/CI; hardware, sensor e quota pendentes | `MOBILE_V2_DECISIONS.md`, ADR-0014 |
| MV2-018 | Android/iOS/PWA | Compartilhamento de texto e JSON/GPX | TESTED | `src/platform/compartilhamento.js`; Socorro e Mapa integrados | Web Share, cancelamento, clipboard, download e APIs ausentes | Node/CI; Share Sheet/Files/download físico pendentes | `MOBILE_V2_DECISIONS.md`, ADR-0015 |
| MV2-019 | Android/iOS/PWA | Leitura de permissão GPS | TESTED | `src/platform/permissoes.js`; Capacitor `checkPermissions()` e Permissions API Web sem prompt automático | plugin concedido/negado, Web granted/denied/prompt, bridge/API ausentes | Node/CI; prompts nativos e mudanças em Configurações pendentes | `MOBILE_V2_DECISIONS.md`, ADR-0016 |
| MV2-020 | Android/iOS/PWA | Falha de persistência e quota | TESTED | `estado.statusPersistencia()` e grupo `ARMAZENAMENTO` no Diagnóstico; `estado.set()` mantém o contrato | escrita normal e `QuotaExceededError` cobertos em `test/estado.test.js` | Node/CI; quota, reinstalação, limpeza do SO e persistência física pendentes | `MOBILE_V2_DECISIONS.md`, ADR-0017 |

| MV2-021 | Android/iOS/PWA | Estados do acompanhamento GPS foreground-only | TESTED | `src/core/localizacao.js` emite `STARTING`/`ACTIVE`/`PAUSED`/`ERROR`/`UNAVAILABLE`/`STOPPED`; Mapa usa `setPaused()` ao ocultar/retomar | Web, Capacitor injetado, cleanup e ausência de API cobertos em `test/localizacao.test.js` | Node/CI; tela bloqueada, suspensão e retorno físico pendentes | `MOBILE_V2_DECISIONS.md`, ADR-0019 |

## Regra de encerramento

Nenhum item bloqueado por hardware, assinatura, quota, ciclo de vida ou integração pode ser promovido automaticamente para `VERIFIED` ou `COMPLETE`. A tag `v1.0.0` permanece fora deste ciclo até que os gates do checklist de campo sejam executados e registrados.
