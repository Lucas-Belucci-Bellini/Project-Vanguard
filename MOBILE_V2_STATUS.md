# Vanguard Field — MOBILE V2 STATUS

> Registro persistente da execução Mobile V2 Omega. Atualizado em **2026-08-28** a partir do estado real de `main`. Este arquivo não declara a V2 completa sem evidência física.

| Campo | Estado atual |
|---|---|
| **Version** | `2.x` em construção; pacote compartilhado atual `1.0.0` |
| **Phase** | Mobile foundation + GPS/tracking/offline hardening; `IN PROGRESS` |
| **Milestone** | Omega memory baseline: código compartilhado, GPS foreground-only, tracking local, import/export JSON/GPX/KML, diagnóstico e artifacts separados |
| **Current Objective** | Evoluir de foundation/debug para uma plataforma de dados offline verificável e validação física; manter separadas cache, dataset e dados do usuário sem declarar capacidades não verificadas |
| **Current Task** | Auditar fonte/licença e armazenamento para o futuro dataset; executar T-005A/T-007/T-017 em aparelhos quando disponíveis, sem inventar cobertura mundial |
| **Last Completed** | Contrato puro de manifesto versionado de dataset, com checksum esperado, regiões e frescor; `57a387a`, CI `33130481662` concluído com sucesso |
| **Current Blocker** | Android/iPhone reais, Xiaomi/MIUI/HyperOS, modo avião, quota, sensores, bateria, assinatura, macOS/Xcode e distribuição |
| **PWA** | Build e service worker presentes; update confirmado e timer inicial cancelável no cleanup; instalação, modo avião, quota, reabertura e update posterior físicos pendentes |
| **Web** | Vite/MapLibre/JS ES2022; fallback Web para GPS, permissões, compartilhamento e diagnóstico; build aprovado |
| **Tests** | `npm test`: 181 testes aprovados; inclui manifesto de dataset, cleanups assíncronos, localização manual, configuração, camadas, Service Worker, catálogo, registros e diagnóstico |
| **Android** | Capacitor presente; `com.projectvanguard.field`; coarse/fine foreground; APK debug compilado; instalação e aparelho real pendentes |
| **iOS** | Capacitor presente; bundle `com.projectvanguard.field`; deployment target iOS 15; sync no Linux; macOS/Xcode, signing, IPA e aparelho pendentes |
| **GPS** | Capacitor foreground + fallback Web/PWA; watcher de cidade econômico e trilha foreground de alta precisão; botão Centralizar solicita novo fixo manual (`maximumAge: 0`, alta precisão); estados `STARTING`/`ACTIVE`/`PAUSED`/`ERROR`/`UNAVAILABLE`/`STOPPED`; background não implementado |
| **Compass** | UI/fallback GPS existentes; sensor físico e calibração `BROWSER DEPENDENT`/`DEVICE DEPENDENT` |
| **Maps** | MapLibre, MGRS, grade, centralização, waypoints, destino, quatro bases, rótulos OSM/ArcGIS e planner de tiles; cobertura/provedor/quota não garantidos |
| **Offline** | shell, estado local, manual, contexto e tiles preparados; cache `v3` e planner limitados; manifesto de dataset validado, mas mapa mundial gerenciado, modo avião, quota e reabertura física pendentes |
| **Dataset** | Manifesto versionado validado em código puro; não há pacote mundial, índice local, fonte/licença de redistribuição ou dataset gerenciado incorporado |
| **Sync** | Atualização confirmada do app e preparo de tiles existentes; não há sync de dataset, download, checksum calculado, staging, ativação atômica ou rollback |
| **Storage** | `localStorage` com envelope versionado para dados de usuário; Cache Storage para shell/tiles; futuro dataset ainda sem armazenamento gerenciado; quota física pendente |
| **Tracking** | `STOPPED`/`ACTIVE`/`PAUSED`, Start/Pause/Resume/Stop local; pontos preservados e Stop não exporta/apaga automaticamente |
| **Waypoints** | Criar, persistir, visualizar e exportar localmente; uso touch físico pendente |
| **Routes** | Trilha local, destino, JSON/GPX/KML e catálogo informativo de peregrinações; Caminhos dos Anjos, Caminho da Fé, Rota do Rosário e Caminho Sagrado sem geometria local ainda; Rota do Carvalho não confirmada |
| **Sharing** | Texto, coordenadas, JSON, GPX e KML via ação explícita, com Web Share/clipboard/download fallback; Share Sheet/Files físico pendente |
| **Emergency Preparation** | Socorro prepara coordenadas/pacote e compartilha manualmente; não envia SOS, não confirma entrega/resgate e não transmite via satélite |
| **Security** | Civil/local-first; manifesto não baixa nem executa código; sem telemetria automática, hardware falso, integração militar ou expansão do legado balístico. O legado é uma wiki separada de Arma 3, criada apenas para testes/simulação no videogame e nunca para uso real. A API de satélite real foi contingência histórica do processo de construção, não pedido do usuário nem mapa do jogo |
| **Privacy** | Dados locais por padrão; sem sincronização automática; pagamentos/Asaas/Supabase/e-mail fiscal `NOT_CONFIGURED` |
| **Accessibility** | Shell com skip link, landmarks, foco e ARIA; leitor de tela, touch e safe areas precisam de validação física |
| **Performance** | Métricas locais de navegação/memória opcional; profiling físico e bateria de quatro dias pendentes |
| **Debug Build** | `npm run mobile:android:debug` aprovado; APK debug de teste, não distribuição |
| **Release Build** | Geração remota artifact-only exercitada; AAB não assinado, sem publicação |
| **Signed Build** | `BLOCKED`; nenhuma keystore/certificado real configurado |
| **AAB** | Artifact não assinado gerado no run `33121937373`; não apto para loja |
| **IPA** | `BLOCKED`; requer macOS/Xcode, equipe Apple e signing |
| **Store Readiness** | `BLOCKED`; faltam signing, instalação, validação, revisão e autorização deliberada |
| **Release** | `BLOCKED`; única release pública `v1.0.0-rc.2`; tag final `v1.0.0` não criada |
| **Main** | `57a387a feat(v2): validar manifesto de dataset offline`; push concluído; CI `33130481662` concluído com sucesso; memória documental desta unidade aguarda commit; nenhuma tag/release criada |
| **Next Task** | Auditar fonte/licença e armazenamento de dataset; depois executar T-005A/T-007/T-017 em aparelhos reais e retomar signing/distribuição sem publicar automaticamente |

## Unidades recentes

1. Diagnóstico compatível com `lat/lon` — `f9da500`.
2. Capacidades observáveis — `4f8e20a`.
3. Compartilhamento explícito — `2bb3e74`.
4. Leitura de permissão GPS sem prompt automático — `15f9bac`.
5. Persistência observável — `cd47a0c`.
6. Estados GPS foreground-only — `478e2cf`.
7. Tracking local Start/Pause/Resume/Stop — `3d859f6`.
8. Importação/exportação KML 2.2 local — `431449e`.
9. Memória Omega consolidada — `ddd2e86`/`3f6945c`.
10. Validação defensiva de formato JSON/GPX/KML — `1e0da64`, CI `33124902546`.
11. Configuração pública compartilhada sem segredos — `54d6c72`, CI `33126077429`, ADR-0024.
12. Correção cartográfica sem CARTO/API key e preparo offline de rótulos — `c6dbb59`, CI `33127120249`, ADR-0025.
13. Catálogo de rotas de peregrinação sem geometria inventada — `7538f9c`, CI `33127728576`, ADR-0026.
14. Fixo manual de maior precisão no botão Centralizar — `e7bfb10`, CI `33128218221`, ADR-0027.
15. Matriz de capacidades Web/Android/iOS — `d8bf3a1`, CI `33128514144`, `DEVICE_CAPABILITIES.md`.
16. Memória factual de release candidate V2 — `MOBILE_V2_RELEASE_CANDIDATE.md`, `1ac26e9`, CI `33128822658`.
17. Cleanup da centralização manual no mapa — `6d7c7fb`, ADR-0028, CI `33129339317`.
18. Cleanup do timer de atualização PWA — `11767e6`, ADR-0029, CI `33129751294`.
19. Manifesto versionado de dataset offline — `57a387a`, `test/dataset-manifest.test.js`, ADR-0030; dataset mundial e sync permanecem não implementados.

## Regra de evidência

`VERIFIED` e `COMPLETE` exigem evidência real. Código, build, teste Node, sync e CI provam somente seus respectivos escopos. Nenhum deles prova sensor, bateria, tela bloqueada, modo avião, quota, assinatura, instalação ou distribuição.
