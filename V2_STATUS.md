# Project Vanguard V2 — estado persistente

> Atualizado em 2026-08-27 a partir do estado real de `main`. Este arquivo não declara a V2 completa sem evidência.

| Campo | Estado atual |
|---|---|
| **Version** | `2.x` em construção; pacote atual `1.0.0` |
| **Phase** | Fase 1 — Foundation Hardening e observabilidade local; V2 ainda `IN PROGRESS` |
| **Milestone** | V2 Foundation Hardening: estado, observabilidade, offline-first e validação mobile |
| **Current Task** | Validar em navegador e aparelhos a nova tela Diagnóstico, incluindo APIs disponíveis e estados offline |
| **Last Completed Task** | Memória persistente V2 e primeira tela de Diagnóstico local para versão, rede, GPS, frescor, cache, armazenamento, bateria e sensores |
| **Current Blocker** | Validação física em Android/Xiaomi/iPhone, bateria/background, assinatura/distribuição e teste offline real |
| **Next Task** | Validar o diagnóstico em Android/Xiaomi/iOS e priorizar a próxima lacuna física: lifecycle/background, bateria ou cobertura real de mapas |
| **Build** | `npm run build` aprovado em `main`; build é artefato técnico |
| **Tests** | `npm test`: 117 testes aprovados; `node --check public/sw.js`: aprovado |
| **PWA** | Shell e tiles com service worker; atualização confirmada; cache de tiles permanece limitado e não prova cobertura completa |
| **Android** | Capacitor debug compilado; `versionCode 100`, `versionName 1.0.0`; release assinada ainda não configurada |
| **iOS** | Projeto Capacitor gerado; build/assinatura e validação física exigem macOS, Xcode e conta Apple |
| **Security** | Posição local por padrão; sem SOS automático, hardware falso, integração militar ou expansão do legado balístico |
| **Documentation** | README, roadmap, notas de release, checklist mobile, plano de campo, atualização, tag, simulação, limitações, segurança, memória V2 e skill versionados |
| **Release Readiness** | `BLOCKED`: candidate pública `v1.0.0-rc.2`; tag final `v1.0.0` não criada |
| **Main** | Diagnóstico validado localmente nesta execução; commit e CI serão registrados após o push |

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
