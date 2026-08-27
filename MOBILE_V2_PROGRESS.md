# Vanguard Field — MOBILE V2 PROGRESS

## Registro da rodada — 2026-08-27

A auditoria de continuidade confirmou `main` limpa em `478d87c`, CI anterior concluído e somente a pré-release `v1.0.0-rc.2`. O próximo gap do prompt Mobile V2 era a ausência de uma camada explícita para capacidades observáveis. A unidade implementada não presume hardware, sinal, quota ou sensor físico: ela classifica GPS, orientação, storage, rede, bateria e compartilhamento em `AVAILABLE`, `UNAVAILABLE`, `DENIED` ou `NOT_SUPPORTED`.

`src/core/capacidades.js` foi integrado ao Diagnóstico local, e `test/capacidades.test.js` cobre disponibilidade, negação, APIs ausentes e bridge Capacitor com falha. A presença da API de orientação é reportada como capacidade de API; calibração e sensor físico continuam dependentes do dispositivo.


A auditoria partiu de `main` limpa em `6ce06a6` e confirmou que a camada Capacitor já possuía Android/iOS, GPS foreground, lifecycle observável, PWA, MapLibre, importação/exportação local e preparação defensiva de tiles. O gargalo verificável encontrado foi no diagnóstico: `statusPosicao()` lia somente `latitude`/`longitude`, embora o contrato normalizado e persistido pelo GPS use `lat`/`lon`. Isso podia exibir `UNAVAILABLE` mesmo depois de um fixo local válido.

A unidade implementada foi deliberadamente pequena. `src/core/diagnostico.js` agora aceita os dois shapes e permite injetar `agora` no `diagnosticoResumo()`; `test/diagnostico.test.js` cobre o shape normalizado e usa tempo determinístico. O commit foi publicado em `main` como `f9da500 fix(v2): reconhecer posição normalizada no diagnostico` e o CI `33119352814` concluiu com sucesso.

## Evidências

| Gate | Resultado |
|---|---|
| `npm test` | 138 aprovados |
| `npm run build` | aprovado |
| `node --check public/sw.js` | aprovado |
| `git diff --check` | aprovado |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilidades reportadas |
| `npm run mobile:sync:android` | aprovado; plugins App e Geolocation sincronizados |
| `npm run mobile:sync:ios` | aprovado; plugins App e Geolocation sincronizados |
| `npm run mobile:android:debug` | `BUILD SUCCESSFUL` |
| APK | `android/app/build/outputs/apk/debug/app-debug.apk`, 8.284.304 bytes; somente artifact de teste |

O commit documental `cbc7e19 docs(v2): registrar memoria mobile` também foi publicado em `main`; o CI `33119634669` concluiu com sucesso.

## Histórico preservado

As unidades anteriores permanecem válidas e não foram repetidas: lifecycle observável, acessibilidade da shell, allowlist de atualização, performance local, deduplicação de render, frescor offline, planner de tiles e filtro defensivo do Service Worker.

## Próximo passo

Executar `MOBILE_V2_TEST_MATRIX.md` em Android comum, Xiaomi/MIUI/HyperOS e iPhone quando houver dispositivos. Priorizar permissões, troca de app/tela bloqueada, modo avião, persistência, quota/resposta de tiles, sensor de bússola, compartilhamento, update posterior e bateria. Sem hardware, não implementar background GPS, notificações, signing ou integrações fictícias.

## Marco de compartilhamento — 2026-08-27

A auditoria encontrou uma lacuna entre o fluxo de texto do Socorro e os downloads JSON/GPX do Mapa: cada tela tratava a plataforma de forma diferente. `src/platform/compartilhamento.js` agora centraliza Web Share, clipboard e download local, com estados explícitos para sucesso aceito pelo sistema, cópia, download, cancelamento, indisponibilidade e falha.

O Socorro usa o adaptador para coordenadas e mantém a regra de que compartilhar não confirma entrega. O Mapa usa o mesmo adaptador para JSON e GPX, tentando compartilhamento de arquivos quando `canShare` aceita e usando download local como fallback. Nenhuma permissão nova, transmissão automática ou confirmação de resgate foi adicionada.

A cobertura em `test/compartilhamento.test.js` passou junto com a suíte completa, build web, sintaxe do Service Worker, auditoria de produção, sync Android/iOS e APK debug. O commit funcional `2bb3e74 feat(v2): compartilhar registros no mobile` foi publicado e o CI `33120523569` concluiu com sucesso. O Share Sheet, Files, clipboard e diretório de download ainda precisam de validação em Android comum, Xiaomi/MIUI/HyperOS e iPhone.

## Marco de permissões GPS — 2026-08-27

A auditoria encontrou que o Diagnóstico consultava somente a Permissions API Web, embora o app tenha um bridge nativo Capacitor. `src/platform/permissoes.js` agora lê `checkPermissions()` no Capacitor e `navigator.permissions.query()` na Web, sem executar `requestPermissions()` e sem abrir prompt durante o diagnóstico.

Os estados `CONCEDIDA`, `NEGADA`, `NÃO SOLICITADA`, `INDISPONÍVEL` e `BROWSER DEPENDENT` são preservados. Um erro do bridge ou estado desconhecido não é tratado como permissão concedida. A integração não adiciona background GPS, não altera o Manifest/Info.plist e não substitui a verificação nativa de prompts, Configurações, GPS desligado ou tela bloqueada.

`test/permissoes.test.js` cobre plugin concedido/negado, ausência de request, Permissions API Web, ausência de APIs e falha do bridge. A suíte local chegou a 150 testes aprovados; build web, sintaxe do Service Worker, auditoria de produção, sync Android/iOS e APK debug também passaram.

## Marco de release mobile artifact-only — 2026-08-27

A autenticação do GitHub foi revalidada e o CI documental da persistência concluiu com sucesso no run `33121423458`. Em seguida, foi estudado o processo do [Projeto-Baluarte](https://github.com/Lucas-Belucci-Bellini/Projeto-Baluarte): workflow mobile separado, dispatch/tag explícito, APK debug para teste, AAB não assinado para assinatura posterior, teste físico antes da distribuição e handoff iOS dependente de macOS/Xcode.

O Vanguard executou o workflow manual `33121937373` sobre `main`, com `version=1.0.0` e sem `publish_tag`. O job Android passou, gerou e enviou `vanguard-android-debug-apk` e `vanguard-android-release-aab-unsigned`, e pulou a etapa de publicação. Os artifacts foram baixados e tiveram seus tipos e SHA-256 registrados em `MOBILE_V2_RELEASE.md`. A lista de releases permaneceu somente com `v1.0.0-rc.2`.

Este teste confirma o caminho remoto de artifacts e a separação build/artifact/release. Não confirma instalação em aparelho, assinatura, Play Console, iOS, TestFlight ou release pública.

## Marco de estados GPS foreground-only — 2026-08-27

A auditoria encontrou que o watcher GPS tinha callbacks de posição e erro, mas não expunha estados operacionais para a UI. `src/core/localizacao.js` agora emite `STARTING`, `ACTIVE`, `PAUSED`, `ERROR`, `UNAVAILABLE` e `STOPPED`, aceita APIs injetáveis para testes e expõe `setPaused(true/false)`.

O Mapa usa esses estados no HUD e pausa o watcher quando a página fica oculta, retomando-o ao voltar ao foreground. Essa é uma política foreground-only e não uma implementação de tracking em background. `test/localizacao.test.js` cobre Web, Capacitor injetado, pausa, retomada, cleanup e ausência de API. A suíte local chegou a 154 testes, e build, sync Android/iOS e APK debug passaram.

## Marco de tracking local Start/Pause/Resume/Stop — 2026-08-27

A auditoria do prompt Mobile V2 confirmou que o Mapa tinha somente alternância iniciar/parar. Foi adicionada a máquina pura `src/core/trilha-sessao.js`, com os estados `STOPPED`, `ACTIVE` e `PAUSED`, e a chave local `rotaPausada` foi criada sem remover `rotaAtiva`.

O Mapa agora oferece `INICIAR ROTA`, `PAUSAR ROTA`, `RETOMAR ROTA` e `PARAR E GUARDAR`; a Home distingue `GRAVAÇÃO ATIVA`, `ROTA PAUSADA` e `REGISTRO PRONTO`. Pausar impede novos pontos, preservando o registro local; parar não apaga, exporta nem compartilha. A pausa manual permanece separada da pausa de lifecycle foreground-only.

`test/trilha-sessao.test.js` cobre transições válidas e eventos inválidos; os testes de localização cobrem o watcher. A suíte chegou a 156 testes, com build, sync Capacitor, auditoria e APK debug aprovados. Sessão real, tela bloqueada, suspensão, retomada e consumo de bateria continuam pendentes em dispositivos.

## Marco de importação/exportação KML — 2026-08-27

A auditoria da FASE 14 do prompt identificou que o Vanguard oferecia JSON e GPX, mas não KML. Foi adicionado suporte local conservador em `src/core/registro-offline.js`: `Point` representa waypoints/destino e `LineString` representa a trilha; coordenadas seguem `longitude,latitude[,altitude]`, com limites geográficos e de quantidade preservados.

O Mapa oferece `EXPORTAR KML`, integra o mesmo adaptador de compartilhamento explícito e aceita `.kml` na importação. O parser trata o conteúdo como dados, escapa/decodifica nomes e ignora elementos não suportados; não executa scripts, links nem dados externos. `test/registro-offline.test.js` cobre exportação, importação, XML escapado, altitude, raiz ausente, arquivo vazio e coordenadas inválidas. A suíte chegou a 159 testes aprovados.

Interoperabilidade completa de KML, Files/Share Sheet em aparelho e comportamento físico continuam pendentes; o recurso não é uma promessa de sincronização ou mapa oficial.

## Marco Omega — memória persistente consolidada — 2026-08-27

A nova ordem Omega exige uma memória mais ampla que os arquivos Mobile V2 anteriores. A auditoria de `main` confirmou que seis arquivos ainda não existiam: `MOBILE_V2_MASTER_CHECKLIST.md`, `MOBILE_V2_FEATURE_MATRIX.md`, `MOBILE_V2_BUILD_MATRIX.md`, `MOBILE_V2_RELEASE_STATUS.md`, `MOBILE_V2_DEVICE_MATRIX.md` e `MOBILE_V2_EXECUTION_LOG.md`.

Esses arquivos foram criados com a separação entre implementação, teste, CI, artifact, assinatura, instalação, validação física e release. A implementação existente foi preservada: JS ES2022/Vite/MapLibre/Capacitor/PWA, GPS foreground-only, tracking local, JSON/GPX/KML, compartilhamento explícito e diagnóstico. A auditoria de marcadores encontrou somente placeholders legítimos de interface/comentários no escopo avaliado; não foram convertidos em features fictícias.

A memória Omega mantém `IN PROGRESS` e `BLOCKED` onde faltam aparelhos, macOS/Xcode, signing, quota, modo avião, sensores, bateria ou distribuição. A release pública segue somente `v1.0.0-rc.2`.
