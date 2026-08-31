# Project Vanguard V2 — estado persistente

> Atualizado em 2026-08-31 a partir do estado real de `main`. Este arquivo não declara a V2 completa sem evidência.

| Campo | Estado atual |
|---|---|
| **Version** | `2.x` em construção; pacote público atual `1.3.0` |
| **Phase** | Fase 2 — Engine/GPS mobile foundation + lifecycle observability; V2 ainda `IN PROGRESS` |
| **Milestone** | V2 Foundation Hardening + tentativa experimental de tracking GPS local em segundo plano, com validação mobile ainda pendente |
| **Current Task** | Executar T-021–T-030 do background tracking em aparelhos reais e registrar lacunas, bateria, permissões e interrupções sem inventar continuidade |
| **Last Completed Task** | Orquestração do ciclo de vida do dataset offline (`src/core/dataset-sync.js`), fechando a costura entre manifesto, transação, storage e gate de fontes; publicada e mesclada em `main` no commit `2382b01` |
| **Current Blocker** | Validação física em Android/Xiaomi/iPhone, notificação, tela bloqueada, bateria/background, assinatura/distribuição e teste offline real |
| **Next Task** | Publicar o fechamento documental e executar `MOBILE_V2_TEST_MATRIX.md`, priorizando T-021–T-030, além de KML/JSON/GPX, modo avião, bússola, update posterior e bateria |
| **Build** | `npm run build` aprovado em `main`; build é artefato técnico |
| **Tests** | `npm test`: 284 testes aprovados (267 Node + 17 Vitest); inclui contratos de dataset, offline, GPS, trilha, diagnóstico e Map Engine |
| **PWA** | Shell e tiles com Service Worker; atualização confirmada e timer inicial cancelável no cleanup; cache `v3` inclui base + rótulos preparados, mas não prova dataset mundial ou cobertura completa |
| **Android** | Capacitor configurado com `@capacitor/geolocation@8.2.2`, `@capacitor/app@8.1.1` e `@capgo/background-geolocation@8.4.3`; FGS `location`, `POST_NOTIFICATIONS`, `WAKE_LOCK`, receivers geofence/boot desabilitados; `versionCode 130`, `versionName 1.3.0`; release assinada ainda não configurada |
| **iOS** | Plugin sincronizado, descrições de localização e `UIBackgroundModes=location` preparados no `Info.plist`; build/assinatura e validação física exigem macOS, Xcode e conta Apple |
| **Security** | Posição local por padrão; sem SOS automático, hardware falso, integração militar ou expansão do legado balístico. O legado pertence a uma wiki separada de Arma 3, somente virtual/teste e nunca destinado a uso real |
| **Documentation** | `docs/adr/ADR-0034-tracking-background-opt-in.md`, `MOBILE_V2_TEST_MATRIX.md` (T-021–T-030), `OFFLINE_DATA_STATUS.md`, `MAP_DATA_STATUS.md`, `SYNC_STATUS.md`, `DEVICE_CAPABILITIES.md`, `MOBILE_V2_RELEASE_CANDIDATE.md`, `docs/adr/ADR-0028-cleanup-centralizacao-manual.md`, `docs/adr/ADR-0029-cleanup-atualizacao-pwa.md`, `docs/adr/ADR-0030-manifesto-dataset-offline.md`, `docs/adr/ADR-0031-transacao-atomica-dataset.md`, `docs/adr/ADR-0032-storage-dataset-isolado.md`, `docs/adr/ADR-0033-governanca-fontes-cartograficas.md`, `docs/adr/ADR-0035-orquestracao-ciclo-vida-dataset.md`, README, `docs/ESCOPO-WIKI-ARMA3-E-MAPAS.md`, `docs/ROTAS-CAMINHOS-DOS-ANJOS.md`, `docs/ROTAS-PEREGRINACAO-REFERENCIAS.md`, roadmap, notas de release, checklist mobile, plano de campo, atualização, tag, segurança, memória V2, memória MOBILE_V2, memória Omega (`MOBILE_V2_MASTER_CHECKLIST`, `FEATURE_MATRIX`, `BUILD_MATRIX`, `RELEASE_STATUS`, `DEVICE_MATRIX`, `EXECUTION_LOG`), ADR-0005/0006/0007/0008/0009/0010/0011/0012/0013/0014/0015/0016/0017/0018/0019/0020/0021/0022/0023/0024/0025/0026/0027, referências do Baluarte, WCAG/performance e validações do Diagnóstico/Mapa/Home/tiles/SW/capacidades/compartilhamento/permissões/persistência/release artifact-only/GPS/trilha/KML/fixo manual versionados |
| **Release Readiness** | `BLOCKED`: foundation pública `1.3.0` testada localmente; tag final `v1.3.0` ainda não criada e gates físicos/assinatura/distribuição continuam pendentes |
| **Main** | `cb76817 docs: record 1.3.0 validation boundaries`; commits anteriores preservados; nenhuma tag/release criada |

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


## 2026-08-28 — storage físico de pacote iniciado

Foi criado `src/core/dataset-package-storage.js`, um adapter assíncrono sobre IndexedDB dedicado exclusivamente aos bytes do pacote de dataset. Ele separa o artefato físico do manifesto/transação e dos dados do usuário, oferece salvar/ler/remover/limpar e reporta indisponibilidade e quota. Testes de contrato cobrem ambientes sem IndexedDB, validação de entrada e diagnóstico.

**Limite:** esta unidade não é prova de atomicidade de disco, durabilidade contra power loss, quota física garantida nem teste em aparelho real. A integração final com o orquestrador deve ocorrer depois de validar o contrato físico no runtime alvo.


## 2026-08-28 — integração do pacote físico ao sync

O `dataset-sync` agora aceita um `packageStorage` injetável. A nova operação `armazenarBytes(bytes, metadata)` grava o artefato no storage físico dedicado e só avança para STAGING depois da verificação SHA-256 real. Na ativação, quando o storage físico foi fornecido, o pacote é relido e sua integridade/tamanho são conferidos novamente antes de gravar o manifesto ativo.

Isso fecha a costura lógica entre transação, bytes físicos, integridade e ativação. Não é prova de durabilidade contra power loss nem de quota física em aparelhos reais; esses itens continuam como validação de runtime/hardware.
