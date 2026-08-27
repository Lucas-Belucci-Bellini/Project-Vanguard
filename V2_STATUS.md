# Project Vanguard V2 — estado persistente

> Atualizado em 2026-08-27 a partir do estado real de `main`. Este arquivo não declara a V2 completa sem evidência.

| Campo | Estado atual |
|---|---|
| **Version** | `2.x` em construção; pacote atual `1.0.0` |
| **Phase** | Fase 2 — Engine/GPS mobile foundation + lifecycle observability; V2 ainda `IN PROGRESS` |
| **Milestone** | V2 Foundation Hardening: estado, observabilidade, offline-first e validação mobile |
| **Current Task** | Validar em aparelhos GPS foreground, lifecycle, acessibilidade e atualização; executar profiling físico de performance antes de decidir otimizações ou background GPS |
| **Last Completed Task** | Instrumentação local de performance no Diagnóstico: Navigation Timing, carga completa e memória JS opcional com fallback honesto |
| **Current Blocker** | Validação física em Android/Xiaomi/iPhone, bateria/background, assinatura/distribuição e teste offline real |
| **Next Task** | Executar profiling físico de startup, mapa, memória, bateria e suspensão em Android, Xiaomi/MIUI/HyperOS e iPhone; validar GPS/lifecycle/acessibilidade/update e só então decidir otimizações ou background GPS |
| **Build** | `npm run build` aprovado em `main`; build é artefato técnico |
| **Tests** | `npm test`: 126 testes aprovados; `node --check public/sw.js`: aprovado; preview do Diagnóstico e fallback de APIs validados |
| **PWA** | Shell e tiles com service worker; atualização confirmada; cache de tiles permanece limitado e não prova cobertura completa |
| **Android** | Capacitor debug compilado com `@capacitor/geolocation@8.2.2` + `@capacitor/app@8.1.1`; `versionCode 100`, `versionName 1.0.0`; release assinada ainda não configurada |
| **iOS** | Plugin sincronizado e descrições foreground no `Info.plist`; build/assinatura e validação física exigem macOS, Xcode e conta Apple |
| **Security** | Posição local por padrão; sem SOS automático, hardware falso, integração militar ou expansão do legado balístico |
| **Documentation** | README, roadmap, notas de release, checklist mobile, plano de campo, atualização, tag, segurança, memória V2, ADR-0005/0006/0007/0008, referências WCAG/performance e validação do Diagnóstico versionados |
| **Release Readiness** | `BLOCKED`: candidate pública `v1.0.0-rc.2`; tag final `v1.0.0` não criada |
| **Main** | `3d171e8 perf(v2): expor diagnostico de performance`; CI `33114175983` concluído com sucesso |

## Regra de conclusão

A V2 permanece `IN PROGRESS` até que cada item obrigatório tenha implementação, teste, documentação e verificação. Um build verde não encerra os gates de hardware, segurança, acessibilidade, bateria, background, assinatura ou distribuição.

## Classificação de escopo

| Classe | Tratamento |
|---|---|
| **V2 civil** | Navegação, GPS/GNSS, MGRS, bússola, mapa, trilha, offline, armazenamento, diagnóstico, PWA, mobile e atualização |
| **Preparado** | Integrações externas, fontes oficiais sincronizadas, hardware real, pagamentos e comunicação externa |
| **PHYSICAL VALIDATION REQUIRED** | Android/Xiaomi/iOS, consumo, permissões, ciclo de vida, background e distribuição |
| **LEGACY-RESTRICTED** | Computador de tiro, balística, controle de tiro e qualquer automação operacional de armas |
| **V3** | Itens não necessários para a definição de pronto da V2, registrados em `V3_BACKLOG.md` |
