# Project Vanguard V2 — checklist mestre

> Regra: `COMPLETE` exige evidência. `PHYSICAL VALIDATION REQUIRED` não é aprovação.

| ID | Área | Requisito | Implementação | Teste | Documentação | Status | Evidência |
|---|---|---|---|---|---|---|---|
| V2-001 | Arquitetura | Separar UI, aplicação, core, engine e dados | Estrutura atual preservada; `src/engine` sem DOM | Importações e testes existentes | `CLAUDE.md`, `docs/MEGA-PLANO.md` | TESTED | CI e suíte Node |
| V2-002 | Build | Build reprodutível | Vite, `npm ci`, scripts mobile | `npm run build` | README, `docs/BUILD-VS-RELEASE.md` | TESTED | CI `main` |
| V2-003 | GPS/GNSS | Posição, erro e indisponibilidade | `src/core/localizacao.js` | Testes de normalização/idade; aparelho real pendente | README, checklist mobile | IN_PROGRESS | 122 testes; hardware pendente |
| V2-004 | MGRS | Converter e exibir referência local | `src/engine/mgrs.js`, HUD do mapa | Testes geográficos | README, mapa de funcionalidades | TESTED | Suíte determinística |
| V2-005 | Compass | Sensor/fallback/indisponibilidade | Página de bússola | Teste físico de sensor pendente | README | IN_PROGRESS | Web e hardware pendentes |
| V2-006 | Map | MapLibre, camadas, destino e waypoints | `src/pages/mapa.js` | Preview; aparelhos e rede real pendentes | README, docs mapa | IN_PROGRESS | Preview + CI |
| V2-007 | Tracking | Início, pausa, retomada e resumo | Trilha local | Teste Android/iOS e quatro dias pendentes | plano de campo | IN_PROGRESS | Código + testes |
| V2-008 | Offline | Shell, dados e manual reabrem sem rede | PWA/service worker/localStorage | Modo avião em aparelhos pendente | docs offline | IN_PROGRESS | CI não substitui campo |
| V2-009 | Offline maps | Preparar/consultar/limpar tiles | Cache HTTPS limitado a 256 URLs/preparação | Cobertura real e quota pendentes | README, plano de campo | IN_PROGRESS | Status local; não é cobertura completa |
| V2-010 | Storage | Versionamento, migração e fallback | Envelopes locais versionados | Corrupção/recuperação cobertas parcialmente | `estado.js`, README | TESTED | Testes de estado |
| V2-011 | Import/export | JSON e GPX validados | `registro-offline.js` | Testes determinísticos | plano de campo | TESTED | Suíte Node |
| V2-012 | Context | Contextos civis e validade | `contexto.js`, zonas locais | Testes de validade/prioridade | README | TESTED | Suíte Node |
| V2-013 | Survival | Manual offline conservador | catálogo versionado | Busca/filtros testados por uso | README | TESTED | Dados locais |
| V2-014 | Socorro | Preparar pacote sem falsa confirmação | `socorro.js` | Simulação controlada; transmissão real fora do escopo | simulação SOS | TESTED | Fluxo local |
| V2-015 | Privacy | Posição local e compartilhamento explícito | Sem upload automático | Revisão de fluxo | README | TESTED | Código/documentação |
| V2-016 | PWA | Manifest, cache e atualização | Service worker + confirmação | Teste de update posterior pendente | `ATUALIZACAO-CONFIRMADA.md` | IN_PROGRESS | Implementado; campo pendente |
| V2-017 | Android | Instalação, lifecycle, bateria e update | Capacitor; debug | Android/Xiaomi físico pendente | checklist mobile | IN_PROGRESS | APK debug |
| V2-018 | iOS | Build, permissões, lifecycle e update | Projeto Capacitor gerado | Mac/Xcode/iPhone pendente | checklist mobile | BLOCKED | PHYSICAL VALIDATION REQUIRED |
| V2-019 | Diagnostics | Mostrar estado de app, GPS, rede, cache, bateria e lifecycle | `src/core/diagnostico.js`, `src/core/ciclo-vida.js`, `src/pages/diagnostico.js`, rota `#/diagnostico` | 8 testes de diagnóstico/lifecycle + preview; validação física pendente | `V2_STATUS.md`, ADR-0005, README | IN_PROGRESS | 123 testes totais; browser validado; device pending |
| V2-020 | Accessibility | Labels, salto de conteúdo, foco e leitores de tela | Shell com link de salto, `<main>` focável, ARIA explícito e foco pós-rota | DOM do preview validado; TalkBack/VoiceOver pendentes | ADR-0006, checklist mobile | IN_PROGRESS | Preview semântico; PHYSICAL VALIDATION REQUIRED |
| V2-021 | Performance | Medir startup, mapa, memória e bundle | `desempenhoResumo()` no Diagnóstico com Navigation Timing e memória JS opcional | 3 testes puros; profiling de mapa/bateria/memória do sistema pendente | `ADR-0008`, referências de performance | IN_PROGRESS | 126 testes; métricas locais; sem profiling físico completo |
| V2-022 | Updates | Detectar, confirmar, recarregar/abrir release | `atualizacao.js`, `atualizacao-ui.js` e SW; allowlist HTTPS oficial | Teste unitário de waiting, negar, confirmar, `SKIP_WAITING`, reload e limpeza; release posterior pendente | atualização confirmada, ADR-0007 | IN_PROGRESS | 124 testes; fluxo PWA fake validado; release posterior pending |
| V2-023 | Release | Tag assinada e artefatos distribuíveis | Workflow separado; signing externo | GPG/SSH, APK/AAB/IPA reais pendentes | comandos de tag | BLOCKED | Candidate `rc.2` |
| V2-024 | Legacy | Não ampliar balística/armamento | Módulos isolados | Revisão de escopo | `CLAUDE.md` | VERIFIED | LEGACY-RESTRICTED |

## Estados

`NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `IMPLEMENTED`, `TESTED`, `VERIFIED` e `COMPLETE`. O uso de `COMPLETE` fica reservado a itens com evidência verificável e sem dependência pendente.
