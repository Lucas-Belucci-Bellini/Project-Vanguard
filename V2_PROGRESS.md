==============================
PROJECT VANGUARD V2
EXECUTION REPORT
==============================

Current Version: 2.x em construção; pacote atual 1.0.0
Current Phase: Fase 2 — Engine/GPS mobile foundation + lifecycle observability
Current Milestone: Foundation Hardening + fronteira defensiva de tiles offline

Completed:
- O prompt V2 foi lido e decomposto sem reiniciar o trabalho existente.
- O Vanguard Field civil foi preservado como produto principal.
- O fluxo de build, artifact, candidate e release continua separado.

Implemented:
- GPS/GNSS local, MGRS, bússola, mapa, destinos, waypoints e trilha.
- Offline-first para shell, dados, manual e tiles preparados com limite explícito.
- JSON/GPX local, contextos civis, manual de sobrevivência e Socorro manual.
- Atualização confirmada para PWA/APK, sem auto-instalação silenciosa.
- Skill reutilizável em `.claude/skills/vanguard-field-release-ops/SKILL.md`.
- Diagnóstico local em `#/diagnostico`, com versão, plataforma, rede, GPS, frescor, cache, armazenamento, bateria quando disponível, service worker e bússola.
- Driver opcional `@capacitor/geolocation@8.2.2` para foreground nativo, com fallback Web/PWA e política de energia compartilhada.
- Observador de lifecycle com `@capacitor/app@8.1.1`, usando `appStateChange` nativo ou `visibilitychange` na Web; o estado aparece no Diagnóstico sem prometer background GPS.
- Hardening de acessibilidade na shell: link de salto, landmark `<main>` focável, foco após troca de rota, `aria-busy`, status ao vivo, alertas e serialização explícita de atalhos ARIA no helper.
- Fluxo de atualização endurecido: downloads aceitos apenas no caminho HTTPS oficial do repositório, fallback fixo para releases e teste PWA de waiting/negação/confirmação/reload/limpeza.
- Diagnóstico local passou a expor Navigation Timing, carga completa e memória JS opcional; APIs ausentes ou que lançam erro permanecem `INDISPONÍVEL`.
- O canvas de rótulos do Mapa agora deduplica eventos `render` idênticos usando chave pura de câmera, viewport, DPR e versão da grade; nenhuma frequência de GPS foi alterada.
- A prontidão offline não libera a posição quando `createdAt`/`timestamp` está ausente, zero, no futuro ou quando o relógio de referência é inválido; o item fica em `atencao`.
- O planner de tiles offline deduplica templates, ignora entradas vazias e interrompe a geração ao alcançar exatamente a cota local de 256 URLs.
- O Service Worker agora filtra `CACHE_TILES` por HTTPS/hosts permitidos, remove URLs duplicadas e limita a entrada a 256 itens antes de buscar ou gravar no cache.

Fixed:
- Idade do último fixo visível no HUD.
- Estado de cache cartográfico descrito sem prometer cobertura completa.
- Versão Android alinhada a `versionCode 100` e `versionName 1.0.0`.

Tests:
- `npm test`: 138 passados.
- `npm audit --omit=dev`: 0 vulnerabilidades de produção.
- `node --check public/sw.js`: aprovado.
- Skill validada pelo `quick_validate.py`.

Build:
- `npm run build`: aprovado.
- `npm run mobile:android:debug`: `BUILD SUCCESSFUL`; APK é artifact de teste.

Security:
- Posição local por padrão.
- Nenhum SOS automático, hardware falso ou expansão de armamento/legado.
- Importações locais validadas; atualização exige confirmação.

Documentation:
- README, MEGA-PLANO, release docs, checklist mobile, plano de campo, operação de bateria, atualização, tag, roteiro, simulação SOS e memória V2.

Files Created:
- `V2_STATUS.md`
- `V2_MASTER_CHECKLIST.md`
- `V2_PROGRESS.md`
- `V2_BLOCKERS.md`
- `V2_DECISIONS.md`
- `V2_CHANGELOG.md`
- `V2_RISK_REGISTER.md`
- `V2_TEST_MATRIX.md`
- `V2_FEATURE_MATRIX.md`
- `V2_ARCHITECTURE_MAP.md`
- `V3_BACKLOG.md`

Files Modified:
- `src/core/diagnostico.js`, `src/pages/diagnostico.js`, `src/styles/diagnostico.css` e `test/diagnostico.test.js`; a compatibilidade `lat/lon` foi publicada em `f9da500`.
- `src/core/capacidades.js`, `src/pages/diagnostico.js` e `test/capacidades.test.js`; estados observáveis publicados em `4f8e20a`.
- `src/core/localizacao.js` com driver nativo opcional e teste de fonte.
- `src/core/ciclo-vida.js` com testes de estado e limpeza de listeners.
- `src/ui/helpers.js` com serialização ARIA explícita e `test/helpers.test.js` cobrindo os atributos.
- `src/core/atualizacao.js` com allowlist HTTPS do repositório e `test/atualizacao-ui.test.js` cobrindo o fluxo PWA waiting.
- `src/core/diagnostico.js` com `desempenhoResumo()`, `test/diagnostico.test.js` cobrindo APIs válidas/ausentes/array-like/com erro, e grupo `DESEMPENHO` na tela.
- `src/core/chave-renderizacao.js` com `test/chave-renderizacao.test.js`; `src/pages/mapa.js` usa a chave para evitar pintura idêntica do canvas.
- `src/core/prontidao-offline.js` exige frescor verificável do fixo e `test/prontidao-offline.test.js` cobre ausência, zero, futuro, relógio inválido e posição antiga.
- `src/core/mapa-offline.js` deduplica templates antes da estimativa/cota e `test/mapa-offline.test.js` compara template único e duplicado.
- `public/sw.js` aplica allowlist HTTPS/host e deduplicação defensiva; `test/sw-policy.test.js` executa o script real em contexto controlado com entradas inválidas, repetidas e acima da cota.
- Android/iOS sincronizados com `@capacitor/geolocation@8.2.2` e `@capacitor/app@8.1.1`; permissões Android foreground e descrições iOS atualizadas.
- A rota `#/diagnostico` e o atalho correspondente foram adicionados ao app.

Blockers:
- Validação física do diagnóstico, driver foreground, lifecycle, acessibilidade e update em Android/Xiaomi/MIUI/HyperOS e iPhone; a correção de shape foi testada em Node/CI, não em hardware.
- Profiling físico de startup, mapa/FPS, memória do sistema, bateria e suspensão; teste com release posterior real, background GPS e quota de cache.
- Assinatura Android/iOS e distribuição.

Next Task:
- Validar modo avião, persistência, posição/frescor, resposta dos provedores e quota de mapas preparados em Android/Xiaomi/MIUI/HyperOS/iPhone; medir performance, bateria e suspensão antes de decidir novas otimizações ou background GPS.
- Commit anterior publicado: `bb240e7`; CI `33108661603` passou.
- Unidade publicada: `2bfd797 feat(v2): observar ciclo de vida mobile`; CI `33110246185` concluído com sucesso.
- Preview limpo confirmou `FOREGROUND · VISIBILITY API`; a primeira tentativa presa em loading levou à correção não bloqueante de `getRegistration()`. Isso não substitui validação nativa.
- Unidade anterior publicada como `b5a83c9 feat(v2): fortalecer acessibilidade da shell`; CI `33111683598` concluído com sucesso.
- Unidade anterior publicada como `e0e632b security(v2): restringir destinos de atualizacao`; CI `33112962807` concluído com sucesso.
- Unidade anterior publicada como `3d171e8 perf(v2): expor diagnostico de performance`; CI `33114175983` concluído com sucesso.
- Unidade anterior publicada como `8706485 perf(v2): deduplicar render do mapa`; CI `33115313412` concluído com sucesso.
- Unidade anterior publicada como `cc076bb fix(v2): exigir frescor na prontidao offline`; CI `33116563282` concluído com sucesso.
- Unidade anterior publicada como `1b1fb50 perf(v2): deduplicar planner de tiles offline`; CI `33117511617` concluído com sucesso.
- Unidade publicada como `bddc6b6 security(v2): filtrar tiles no service worker`; CI `33118348438` concluído com sucesso. Validação local: 133 testes, build web, filtro do Service Worker, audit de produção, sync Android/iOS e APK debug.

V2 Completion:
IN PROGRESS

## Marco Mobile V2 — 2026-08-27

- Auditoria confirmou Android/iOS/PWA em Capacitor, GPS foreground, lifecycle observável, MapLibre, offline local e ausência deliberada de background GPS.
- O diagnóstico foi corrigido para reconhecer o shape persistido `{ lat, lon }` sem remover compatibilidade com `{ latitude, longitude }`; commit publicado: `f9da500 fix(v2): reconhecer posição normalizada no diagnostico`.
- Validação local da unidade: 134 testes, build web, sintaxe do Service Worker, diff, audit de produção, sync Android/iOS e APK debug de 8.284.304 bytes. O APK continua sendo artifact de teste.
- Criados os registros `MOBILE_V2_STATUS.md`, `MOBILE_V2_CHECKLIST.md`, `MOBILE_V2_PROGRESS.md`, `MOBILE_V2_BLOCKERS.md`, `MOBILE_V2_TEST_MATRIX.md`, `MOBILE_V2_DECISIONS.md`, `MOBILE_V2_RISK_REGISTER.md`, `MOBILE_V2_RELEASE.md`, ADR-0013 e ADR-0014.
- A unidade de capacidades locais passou em 138 testes, build web, sintaxe do Service Worker, audit de produção, sync Android/iOS e APK debug. O commit funcional `4f8e20a` ainda aguarda registro do CI.
- Próxima unidade: executar a matriz Mobile V2 em dispositivos reais. Não promover hardware, bateria, sensores, quota, background, signing ou release a `VERIFIED` por inferência.

## Marco Mobile V2 — compartilhamento explícito — 2026-08-27

A nova unidade centraliza em `src/platform/compartilhamento.js` o compartilhamento de texto/coordenadas e de arquivos JSON/GPX. O Socorro usa Web Share ou clipboard; o Mapa tenta Web Share para arquivos e usa download local como fallback. Cancelamento, indisponibilidade e aceitação pelo sistema são estados distintos, e nenhum deles confirma entrega, resgate ou comunicação automática.

A unidade está coberta por `test/compartilhamento.test.js`. A validação local alcançou 145 testes, build web, sintaxe do Service Worker, diff, auditoria de produção, sync Android/iOS e APK debug. O próximo gate é validar Share Sheet, Files, clipboard e diretório de download em aparelhos reais. ADR-0015 registra a decisão.

## Marco Mobile V2 — leitura de permissão GPS — 2026-08-27

`src/platform/permissoes.js` passou a consultar `checkPermissions()` no plugin Capacitor em plataforma nativa e `navigator.permissions.query()` na Web. O Diagnóstico somente lê e exibe o estado; não dispara `requestPermissions()` nem abre prompt automaticamente. A implementação distingue concedida, negada, não solicitada, indisponível e dependência do navegador, sem inferir sinal, precisão ou background GPS.

`test/permissoes.test.js` cobre os estados do plugin, Permissions API Web, ausência de APIs, ausência de request e falha do bridge. A unidade alcançou 150 testes locais, build web, sintaxe do Service Worker, diff, audit de produção, sync Android/iOS e APK debug. ADR-0016 registra a decisão; a validação física dos prompts e das configurações do aparelho permanece pendente.

## Marco Mobile V2 — persistência observável — 2026-08-27

A auditoria confirmou que `estado.set()` ignorava silenciosamente falhas de `localStorage.setItem()`, o que poderia aparentar que trilhas, waypoints ou alertas foram salvos quando a quota ou o WebView rejeitava a escrita. `src/core/estado.js` agora mantém o contrato de retorno e listeners, mas registra `statusPersistencia()` com `PERSISTIDO`, `FALHA` ou `NAO_TESTADO`; o Diagnóstico mostra a última tentativa no grupo `ARMAZENAMENTO`.

`test/estado.test.js` cobre `QuotaExceededError` e confirma que a falha não é convertida em persistência confirmada. A unidade foi publicada como `cd47a0c fix(v2): sinalizar falha de persistencia`, com CI `33121288900` aprovado. O ADR-0017 registra os limites: quota real, reinstalação, limpeza do sistema e durabilidade física continuam pendentes.

## Marco Mobile V2 — teste de release artifact-only — 2026-08-27

A autenticação do GitHub foi recuperada após o erro transitório `HTTP 401`. O processo do Projeto-Baluarte foi consultado como referência: dispatch ou tag explícitos, APK debug e AAB não assinado como artifacts, etapa de publicação condicionada e handoff separado para teste físico/assinatura/iOS.

O Vanguard executou o workflow manual `33121937373` sobre `main`, com `version=1.0.0` e sem `publish_tag`. O job Android foi aprovado, os artifacts `vanguard-android-debug-apk` e `vanguard-android-release-aab-unsigned` foram baixados, seus tipos e SHA-256 foram registrados em `MOBILE_V2_RELEASE.md`, e a etapa de publicação foi pulada. A lista de releases continuou contendo somente `v1.0.0-rc.2`.

A prova confirma o caminho remoto de build/artifacts e não confirma instalação, assinatura, Play Console, iOS, TestFlight ou release pública. A tag/release final permanece deliberadamente fora desta execução.

## Marco Mobile V2 — estados GPS foreground-only — 2026-08-27

A auditoria identificou que o watcher GPS tinha callbacks de posição/erro, mas não expunha estados operacionais claros. `src/core/localizacao.js` agora emite `STARTING`, `ACTIVE`, `PAUSED`, `ERROR`, `UNAVAILABLE` e `STOPPED`, aceita APIs injetáveis em testes e expõe `setPaused(true/false)`.

O Mapa integra o estado ao HUD e limpa o watcher quando a página fica oculta, retomando-o no retorno ao foreground. Isto é uma política foreground-only, não tracking em background. `test/localizacao.test.js` cobre Web, Capacitor injetado, pausa, retomada, cleanup e ausência de API. A suíte chegou a 154 testes; build, sync Android/iOS e APK debug passaram. O ADR-0019 registra limites e a necessidade de validação física em tela bloqueada/suspensão.

## Marco Mobile V2 — suporte KML local — 2026-08-27

A FASE 14 do prompt foi atendida de forma incremental: `src/core/registro-offline.js` agora exporta e importa um subconjunto seguro de KML 2.2. `Point` representa waypoints/destino e `LineString` representa trilha; as coordenadas seguem `longitude,latitude[,altitude]`, com validação geográfica e limites locais existentes.

O Mapa integra `EXPORTAR KML`, compartilhamento explícito e importação por `.kml`. O parser trata o XML como dados, não executa scripts/links/NetworkLink, ignora elementos não suportados e rejeita raiz ausente, ausência de pontos, coordenadas inválidas e arquivos acima do limite. A suíte chegou a 159 testes aprovados; build, sync Android/iOS, APK debug e CI `33124173644` passaram.

Interoperabilidade completa com o ecossistema KML, Files/Share Sheet e uso físico em Android/iOS continuam pendentes. O ADR-0021 registra o contrato.

## 2026-08-31 — Foundation da release 1.3.0

A auditoria real foi registrada em `docs/AUDITORIA-V1.3.0.md`. A identidade pública foi alinhada para `1.3.0` em package/configuração, Android, iOS e workflow mobile, sem substituir tags históricas. O provider CARTO foi mantido como opcional do runtime, mas retirado do catálogo público de bases que não pode depender de CARTO/API key. A suíte de testes passou a separar testes Node e Vitest, conforme os imports existentes.

Evidência reproduzida no commit `cb76817`: `npm ci`, `npm test` com 267 testes Node e 17 testes Vitest aprovados, e `npm run build` aprovado. Foram criados `docs/RELEASE-1.3.0.md` e `docs/VALIDACAO-1.3.0.md`. Permanecem pendentes validação física Android/iOS, assinatura/distribuição, dataset regional/mundial aprovado e serviços externos.

Próximo passo: continuar a revisão funcional de mapa/offline/GPS/diagnóstico e manter a separação entre `IMPLEMENTED`, `TESTED`, `PHYSICAL VALIDATION REQUIRED`, `BLOCKED` e `NOT CONFIGURED`.
