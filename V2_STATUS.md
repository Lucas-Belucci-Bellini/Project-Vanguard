# Project Vanguard V2 — estado persistente

> Atualizado em 2026-08-28 a partir do estado real de `main`. Este arquivo não declara a V2 completa sem evidência.

| Campo | Estado atual |
|---|---|
| **Version** | `2.x` em construção; pacote atual `1.0.0` |
| **Phase** | Fase 2 — Engine/GPS mobile foundation + lifecycle observability; V2 ainda `IN PROGRESS` |
| **Milestone** | V2 Foundation Hardening: capacidades observáveis, estado, observabilidade, offline-first e validação mobile |
| **Current Task** | Auditar fonte/licença e armazenamento para o futuro dataset; usar `OFFLINE_DATA_STATUS.md`, `MAP_DATA_STATUS.md` e `SYNC_STATUS.md` sem inventar cobertura mundial offline |
| **Last Completed Task** | Contrato puro de manifesto versionado de dataset, com checksum esperado, regiões e frescor; `57a387a`, CI `33130481662` concluído com sucesso |
| **Current Blocker** | Validação física em Android/Xiaomi/iPhone, bateria/background, assinatura/distribuição e teste offline real |
| **Next Task** | Executar `MOBILE_V2_TEST_MATRIX.md` em aparelhos reais; priorizar KML/JSON/GPX, sessão da trilha, tela bloqueada, pausa/retomada do watcher, permissões, modo avião, bússola, update posterior e bateria |
| **Build** | `npm run build` aprovado em `main`; build é artefato técnico |
| **Tests** | `npm test`: 181 testes aprovados; manifesto de dataset, cleanups assíncronos, fixo manual, configuração pública, atualização, camadas, Service Worker, catálogo, registros e diagnóstico cobertos |
| **PWA** | Shell e tiles com Service Worker; atualização confirmada e timer inicial cancelável no cleanup; cache `v3` inclui base + rótulos preparados, mas não prova dataset mundial ou cobertura completa |
| **Android** | Capacitor debug compilado com `@capacitor/geolocation@8.2.2` + `@capacitor/app@8.1.1`; `versionCode 100`, `versionName 1.0.0`; release assinada ainda não configurada |
| **iOS** | Plugin sincronizado e descrições foreground no `Info.plist`; build/assinatura e validação física exigem macOS, Xcode e conta Apple |
| **Security** | Posição local por padrão; sem SOS automático, hardware falso, integração militar ou expansão do legado balístico. O legado pertence a uma wiki separada de Arma 3, somente virtual/teste e nunca destinado a uso real |
| **Documentation** | `OFFLINE_DATA_STATUS.md`, `MAP_DATA_STATUS.md`, `SYNC_STATUS.md`, `DEVICE_CAPABILITIES.md`, `MOBILE_V2_RELEASE_CANDIDATE.md`, `docs/adr/ADR-0028-cleanup-centralizacao-manual.md`, `docs/adr/ADR-0029-cleanup-atualizacao-pwa.md`, `docs/adr/ADR-0030-manifesto-dataset-offline.md`, README, `docs/ESCOPO-WIKI-ARMA3-E-MAPAS.md`, `docs/ROTAS-CAMINHOS-DOS-ANJOS.md`, `docs/ROTAS-PEREGRINACAO-REFERENCIAS.md`, roadmap, notas de release, checklist mobile, plano de campo, atualização, tag, segurança, memória V2, memória MOBILE_V2, memória Omega (`MOBILE_V2_MASTER_CHECKLIST`, `FEATURE_MATRIX`, `BUILD_MATRIX`, `RELEASE_STATUS`, `DEVICE_MATRIX`, `EXECUTION_LOG`), ADR-0005/0006/0007/0008/0009/0010/0011/0012/0013/0014/0015/0016/0017/0018/0019/0020/0021/0022/0023/0024/0025/0026/0027, referências do Baluarte, WCAG/performance e validações do Diagnóstico/Mapa/Home/tiles/SW/capacidades/compartilhamento/permissões/persistência/release artifact-only/GPS/trilha/KML/fixo manual versionados |
| **Release Readiness** | `BLOCKED`: candidate pública `v1.0.0-rc.2`; tag final `v1.0.0` não criada |
| **Main** | `ae2edbe docs(v2): registrar arquitetura de dataset offline`; push concluído; CI `33130631235` concluído com sucesso; nenhuma tag/release criada |

## Regra de conclusão

A V2 permanece `IN PROGRESS` até que cada item obrigatório tenha implementação, teste, documentação e verificação. Um build verde não encerra os gates de hardware, segurança, acessibilidade, bateria, background, assinatura ou distribuição.

## Classificação de escopo

| Classe | Tratamento |
|---|---|
| **V2 civil** | Navegação, GPS/GNSS, MGRS, bússola, mapa, trilha, offline, armazenamento, diagnóstico, PWA, mobile e atualização |
| **Preparado** | Integrações externas, fontes oficiais sincronizadas, hardware real, pagamentos e comunicação externa |
| **PHYSICAL VALIDATION REQUIRED** | Android/Xiaomi/iOS, consumo, permissões, ciclo de vida, background e distribuição |
| **LEGACY-RESTRICTED** | Wiki/ambiente separado de Arma 3 e seus módulos balísticos de videogame; nunca adaptar para ambientes reais, controle de tiro, armamento ou automação operacional |
| **V3** | Itens não necessários para a definição de pronto da V2, registrados em `V3_BACKLOG.md` |
