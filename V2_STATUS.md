# Project Vanguard V2 — estado persistente

> Atualizado em 2026-08-27 a partir do estado real de `main`. Este arquivo não declara a V2 completa sem evidência.

| Campo | Estado atual |
|---|---|
| **Version** | `2.x` em construção; pacote atual `1.0.0` |
| **Phase** | Fase 2 — Engine/GPS mobile foundation + lifecycle observability; V2 ainda `IN PROGRESS` |
| **Milestone** | V2 Foundation Hardening: capacidades observáveis, estado, observabilidade, offline-first e validação mobile |
| **Current Task** | Validar permissões, posição/frescor, modo avião, persistência, mapas preparados, lifecycle, sensores, performance e bateria em Android/Xiaomi/MIUI/HyperOS/iPhone; não assumir background GPS |
| **Last Completed Task** | Falhas de persistência local agora são observáveis no estado e no Diagnóstico, distinguindo `PERSISTIDO` de `FALHA` sem prometer quota |
| **Current Blocker** | Validação física em Android/Xiaomi/iPhone, bateria/background, assinatura/distribuição e teste offline real |
| **Next Task** | Executar `MOBILE_V2_TEST_MATRIX.md` em aparelhos reais; priorizar permissões, lifecycle, modo avião, import/export, bússola, update posterior e bateria |
| **Build** | `npm run build` aprovado em `main`; build é artefato técnico |
| **Tests** | `npm test`: 151 testes aprovados; `node --check public/sw.js`, `git diff --check` e auditoria de produção aprovados; persistência, permissões, compartilhamento, capacidades e diagnóstico `lat/lon` cobertos |
| **PWA** | Shell e tiles com service worker; atualização confirmada; cache de tiles permanece limitado e não prova cobertura completa |
| **Android** | Capacitor debug compilado com `@capacitor/geolocation@8.2.2` + `@capacitor/app@8.1.1`; `versionCode 100`, `versionName 1.0.0`; release assinada ainda não configurada |
| **iOS** | Plugin sincronizado e descrições foreground no `Info.plist`; build/assinatura e validação física exigem macOS, Xcode e conta Apple |
| **Security** | Posição local por padrão; sem SOS automático, hardware falso, integração militar ou expansão do legado balístico |
| **Documentation** | README, roadmap, notas de release, checklist mobile, plano de campo, atualização, tag, segurança, memória V2, memória MOBILE_V2, ADR-0005/0006/0007/0008/0009/0010/0011/0012/0013/0014/0015/0016/0017, referências WCAG/performance e validações do Diagnóstico/Mapa/Home/tiles/SW/capacidades/compartilhamento/permissões/persistência versionados |
| **Release Readiness** | `BLOCKED`: candidate pública `v1.0.0-rc.2`; tag final `v1.0.0` não criada |
| **Main** | `cd47a0c fix(v2): sinalizar falha de persistencia`; CI `33121288900` concluído com sucesso; documentação desta unidade aguarda commit separado |

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
