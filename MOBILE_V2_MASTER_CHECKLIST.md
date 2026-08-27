# Vanguard Field — Mobile V2 Omega Master Checklist

> Matriz consolidada da execução Mobile V2. Atualizada em 2026-08-27 a partir de `main`. `VERIFIED` exige evidência física ou integração real; build, teste automatizado e CI não substituem aparelho.

| ID | Platform | Area | Requirement | Implementation | Test | Evidence | Documentation | Status | Blocker |
|---|---|---|---|---|---|---|---|---|---|
| OMEGA-001 | Shared | Foundation | Base compartilhada Web/PWA/Capacitor | JS ES2022, Vite, MapLibre, Capacitor | build e CI | `main` verde | `docs/BUILD-MOBILE.md` | TESTED | nenhum para build; instalação pendente |
| OMEGA-002 | PWA | Shell/offline | Manifest, service worker, shell e atualização confirmada | `public/sw.js`, PWA e cache local | testes do SW/build | navegador/CI | `docs/BUILD-MOBILE.md` | TESTED | modo avião e instalação física |
| OMEGA-003 | Shared | GPS | Posição local com fallback Web/Capacitor e frescor | `src/core/localizacao.js` | testes de localização | Node/CI | ADR-0004, ADR-0010 | TESTED | aparelho, sinal e permissões reais |
| OMEGA-004 | Shared | GPS lifecycle | Estados `STARTING`/`ACTIVE`/`PAUSED`/`ERROR`/`UNAVAILABLE`/`STOPPED` | watcher foreground-only e `setPaused()` | testes de localização | Node/CI | ADR-0019 | TESTED | tela bloqueada, suspensão e retomada |
| OMEGA-005 | Shared | Tracking | Start/Pause/Resume/Stop local | `src/core/trilha-sessao.js`, `rotaPausada`, Mapa/Home | testes de máquina de estados | Node/CI | ADR-0020 | TESTED | aparelho e bateria |
| OMEGA-006 | Shared | Navigation | MGRS, rumo, distância e waypoints | engine e estado locais | testes do motor | Node/CI | `V2_FEATURE_MATRIX.md` | TESTED | validação de uso em campo |
| OMEGA-007 | Map | Touch/maps | Mapa MapLibre, quatro bases, rótulos públicos, centralização, gestos e tiles preparados | `src/pages/mapa.js`, `src/data/camadas-mapa.js`, planner/SW; OSM e ArcGIS sem CARTO/API key | contratos das camadas, build e testes do planner/SW | Node/CI | `MOBILE_V2_TEST_MATRIX.md`, ADR-0025 | IN_PROGRESS | touch, cobertura, quota e modo avião físicos |
| OMEGA-008 | Offline | Prepared maps | Select/prepare/download/verify/use local, incluindo nomes/limites | planner até 256 URLs; base selecionada + overlay `labels`; cache `v3` | testes planner/SW e contratos de camadas | Node/CI | ADR-0011/0012/0025 | IN_PROGRESS | quota, retenção de cache, tiles e modo avião |
| OMEGA-009 | Storage | Local state | Estado versionado e falha de escrita observável | `localStorage`, envelope v1 e status de persistência | testes de quota simulada | Node/CI | ADR-0017 | TESTED | quota/reinstalação/limpeza do SO |
| OMEGA-010 | Import/export | JSON/GPX/KML | Importar, validar, visualizar, exportar e compartilhar local | `registro-offline.js`, Mapa e Share adapter | testes JSON/GPX/KML | Node/CI | ADR-0015/0021 | TESTED | Files/Share Sheet/interoperabilidade física |
| OMEGA-011 | Emergency | Manual preparation | Preparar coordenadas e pacote, compartilhar sob ação | `src/pages/socorro.js` | testes do contrato | Node/CI | `docs/SIMULACAO-MODO-SOCORRO.md` | IMPLEMENTED | não confirma SOS, entrega ou resgate |
| OMEGA-012 | Device | Capabilities | GPS, orientação, storage, rede, bateria e share honestos | `src/core/capacidades.js` | testes de estados/API ausente | Node/CI | ADR-0014 | TESTED | sensor/hardware físicos |
| OMEGA-013 | Device | Permissions | Ler permissão sem prompt automático | Capacitor `checkPermissions()` e Permissions API | testes Web/native injetado | Node/CI | ADR-0016 | TESTED | prompt/configuração física |
| OMEGA-014 | Android | Native | Identidade, coarse/fine, sync e debug build | Capacitor Android | sync/assembleDebug/CI | APK debug | `MOBILE_V2_RELEASE.md` | IMPLEMENTED | aparelho, Xiaomi e assinatura |
| OMEGA-015 | iOS | Native | Bundle, foreground description e sync | Capacitor iOS | sync no Linux | projeto gerado | `MOBILE_V2_RELEASE.md` | IMPLEMENTED | macOS/Xcode, assinatura e iPhone |
| OMEGA-016 | Performance | Battery | Precisão e wake lock econômicos | política documentada, wake lock opcional | build/local | nenhum profiling físico | `docs/OPERACAO-BATERIA-GPS-4-DIAS.md` | IN_PROGRESS | medição de quatro dias |
| OMEGA-017 | Security | Civil/privacy | Sem telemetria, background GPS presumido ou SOS falso | limites documentados | auditoria/CI | código e docs | `V2_BLOCKERS.md` | TESTED | revisão física e operacional |
| OMEGA-018 | Release | Distribution | Debug → release → signed → installed → validated → AAB/store-ready | workflow artifact-only, sem signing | workflow `33121937373` | APK/AAB hashes registrados | `MOBILE_V2_RELEASE.md`, ADR-0018 | BLOCKED | keystore, Apple signing e gates físicos |
| OMEGA-019 | Shared | Route catalog | Catálogo informativo de rotas de peregrinação com fontes e estados de evidência | `src/data/rotas-peregrinacao.js`, seletor no Mapa; sem geometria inventada | testes do catálogo e imutabilidade | Node/CI e fontes públicas | `docs/ROTAS-PEREGRINACAO-REFERENCIAS.md`, ADR-0026 | IN_PROGRESS | GPX/KML oficial/autorizado e validação de rota física |

## Regra de encerramento

Nenhum item pode ser promovido automaticamente para `VERIFIED` ou `COMPLETE`. A tag final `v1.0.0` permanece bloqueada até execução dos checklists físicos, assinatura deliberada e revisão de distribuição. Build e artifact são evidências distintas de release.

## Fonte da verdade

O código em `src/`, `public/`, `android/`, `ios/` e os testes são a evidência primária. Os demais arquivos `MOBILE_V2_*` detalham execução, risco, dispositivo, build e release sem substituir a evidência.
