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
