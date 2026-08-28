# Vanguard Field — Mobile V2 Omega Execution Log

> Log resumido e append-only das execuções relevantes. Atualizado em 2026-08-28.

## 2026-08-27 — auditoria Omega e estado inicial

- **Branch:** `main`.
- **Estado Git:** limpa e alinhada com `origin/main` antes da unidade.
- **HEAD auditado:** `d3175a0 docs(v2): registrar suporte kml`.
- **CI recente:** `33124273565` concluído com sucesso.
- **Release pública:** somente `v1.0.0-rc.2`; nenhuma `v1.0.0` final.
- **Memória Omega ausente:** `MOBILE_V2_MASTER_CHECKLIST.md`, `MOBILE_V2_FEATURE_MATRIX.md`, `MOBILE_V2_BUILD_MATRIX.md`, `MOBILE_V2_RELEASE_STATUS.md`, `MOBILE_V2_DEVICE_MATRIX.md`, `MOBILE_V2_EXECUTION_LOG.md`.
- **Auditoria de marcadores:** apenas placeholders de campos de interface e comentário de compatibilidade foram encontrados nos escopos auditados; não foram tratados como implementação faltante sem evidência de defeito.
- **Decisão:** criar a memória Omega faltante antes de iniciar nova migração estrutural.

## Unidades publicadas anteriores

| Commit | Unidade | Evidência |
|---|---|---|
| `f9da500` | diagnóstico compatível com `lat/lon` | testes e CI |
| `4f8e20a` | capacidades observáveis | testes e CI |
| `2bb3e74` | compartilhamento explícito | testes e CI |
| `15f9bac` | leitura de permissão GPS sem prompt automático | testes e CI |
| `cd47a0c` | persistência observável | testes e CI |
| `3d859f6` | tracking local Start/Pause/Resume/Stop | 156 testes e CI |
| `431449e` | importação/exportação KML 2.2 local | 159 testes e CI |

## Regra de continuidade

Toda nova entrada deve registrar data, estado de Git, commit, comandos, resultado, CI e limitações. Falhas devem ser registradas antes da correção; nenhum sucesso deve ser presumido por histórico anterior.

## 2026-08-27 — publicação da memória Omega e gates locais

- **Commit:** `ddd2e86 docs(v2): consolidar memoria omega`.
- **Push:** `origin/main` atualizado com sucesso; `main` ficou alinhada.
- **CI:** run de push `3312455...` listado como concluído com sucesso; confirmar ID completo no GitHub se necessário.
- **`npm test`:** 159 aprovados, 0 falhas.
- **`npm run build`:** aprovado; Vite produziu `dist/`.
- **`node --check public/sw.js`:** aprovado.
- **`git diff --check`:** aprovado.
- **`npm audit --omit=dev --audit-level=high`:** 0 vulnerabilidades.
- **Release:** não executada; `v1.0.0` não criada; `v1.0.0-rc.2` continua a única release pública.
- **Limitação:** esta unidade foi documental; não prova instalação, sensor, bateria, modo avião, assinatura, loja ou iOS IPA.

## 2026-08-27 — unidade nova: validação defensiva de formato de registro

- **Commit:** `1e0da64 feat(v2): validar formato de registros`.
- **CI:** run `33124902546` concluído com sucesso.
- **Escopo:** `src/core/registro-arquivo.js`, integração do handler em `src/pages/mapa.js` e `test/registro-arquivo.test.js`.
- **Comportamento:** normaliza extensão/MIME, aceita JSON/GPX/KML conhecidos, aceita um único sinal quando o outro é omitido e rejeita conflito específico antes de `arquivo.text()`.
- **Segurança preservada:** o módulo não abre arquivo, não executa XML, não faz rede e não substitui a validação geométrica/schema dos parsers existentes. A substituição continua confirmada e a rota importada continua pausada.
- **`npm test`:** 166 aprovados, 0 falhas.
- **`npm run build`:** aprovado.
- **`node --check public/sw.js`:** aprovado.
- **`git diff --check`:** aprovado.
- **`npm audit --omit=dev --audit-level=high`:** 0 vulnerabilidades.
- **`npm run mobile:sync:android`:** aprovado; plugins Capacitor presentes.
- **`npm run mobile:sync:ios`:** concluído dentro do gate composto; nenhum arquivo nativo versionado mudou.
- **`npm run mobile:android:debug`:** `BUILD SUCCESSFUL`; artifact de teste, não release.
- **Limitação:** MIME/extensão não autenticam conteúdo; validação física em Android/Xiaomi/iPhone, Files/Share Sheet, modo avião, bateria, signing e loja continuam pendentes.

## 2026-08-27 — fechamento da rodada

- **Commit documental:** `ea8fbf0 docs(v2): fechar registro da unidade`.
- **CI:** run `33124967071` concluído com sucesso.
- **Git:** `main` e `origin/main` alinhadas; worktree limpa após o push.
- **Release:** nenhuma tag `v1.0.0` criada e nenhuma release publicada nesta rodada. `v1.0.0-rc.2` permanece a única release pública registrada.
- **Conclusão:** a rodada fechou exatamente uma unidade nova de software, com testes, documentação, build e CI; os gates físicos e de distribuição permanecem bloqueados conforme a matriz Omega.

## 2026-08-27 — correção de escopo cartográfico e do legado Arma 3

- **Motivo:** o usuário esclareceu que a API de imagens de satélite foi inserida pelo fluxo do Claude Code como contingência porque os mapas/terrenos do jogo ainda não estavam disponíveis; isso não foi uma solicitação para colocar mapa GPS real no simulador/wiki.
- **Correção documental:** `SECURITY.md`, `README.md`, `CLAUDE.md`, `V2_STATUS.md`, `MOBILE_V2_STATUS.md`, `V2_DECISIONS.md`, `V2_ARCHITECTURE_MAP.md`, `docs/BALISTICA.md`, `docs/INTEGRACAO-BALUARTE.md` e `docs/ESCOPO-WIKI-ARMA3-E-MAPAS.md` agora distinguem mapa real do Vanguard Field civil e terrenos virtuais do Arma 3.
- **Regra:** a API de satélite real não representa mapa do jogo e não deve ser usada como substituto silencioso de terreno virtual. Os módulos balísticos permanecem restritos a testes/simulação no videogame e nunca a ambientes reais.
- **Escopo:** somente documentação e memória; nenhum código balístico, terreno ou provedor foi alterado nesta correção.

## 2026-08-27 — publicação da correção de escopo

- **Commit:** `6b7d9d9 docs(v2): separar mapas reais e arma3`.
- **Push:** `origin/main` atualizado com sucesso; a entrada complementar deste log será publicada após a confirmação do CI.
- **Arquivos centrais:** `SECURITY.md`, `README.md`, `CLAUDE.md`, `docs/ESCOPO-WIKI-ARMA3-E-MAPAS.md`, `docs/adr/ADR-0023-separacao-mapas-real-e-arma3.md` e memórias V2/Omega.
- **Limite:** nenhuma camada de mapa, provedor ou módulo balístico foi alterada; esta rodada apenas corrigiu a descrição e a separação de contexto.

## 2026-08-27 — unidade nova: configuração pública compartilhada

- **Commit:** `54d6c72 feat(v2): centralizar configuracao publica`.
- **CI:** run `33126077429` concluído com sucesso.
- **Escopo:** `src/core/configuracao.js`, `src/core/atualizacao.js`, `src/pages/diagnostico.js`, `test/configuracao.test.js` e ADR-0024.
- **Comportamento:** identidade pública, versão e URLs oficiais ficam em contrato imutável sem segredos; atualização preserva suas exportações e allowlist HTTPS; diagnóstico usa o mesmo nome/versão.
- **`npm test`:** 168 aprovados, 0 falhas.
- **Limite:** `package.json`, `capacitor.config.json`, versionCode/versionName, signing, providers de mapa e release permanecem gates separados; nenhuma instalação ou distribuição foi declarada.

## 2026-08-27 — unidade nova: correção cartográfica e rota de referência

- **Motivo:** capturas mostraram `API KEY REQUIRED` na base CARTO e ausência de nomes/cidades nas bases de imagem. A auditoria confirmou que o mapa inicial não adicionava o overlay de rótulos e que não havia GPX/KML oficial do Caminhos dos Anjos no repositório.
- **Fontes verificadas:** a associação publica cidades e leis de reconhecimento; a Lei Estadual nº 22.530/2025 descreve a rota geral, mas cidades de referência não fornecem uma geometria navegável. O resultado foi registrado em `docs/ROTAS-CAMINHOS-DOS-ANJOS.md`.
- **Implementação:** base escura trocada para OSM com tratamento visual local; overlay `labels` trocado para ArcGIS World Boundaries and Places; overlay adicionado ao estilo; preparação offline inclui base e rótulos; cache passou para `v3`; allowlist OSM adicionada e CARTO removido.
- **Testes:** `npm test` chegou a 170 aprovados, 0 falhas; `test/camadas-mapa.test.js` cobre as quatro bases, ausência de CARTO/API key e composição de rótulos.
- **Revisão visual:** prévia Vite na rota `#/mapa`; Topográfico, Tático escuro e Satélite carregaram sem watermark CARTO; nomes/limites permaneceram visíveis após o carregamento assíncrono da imagem. Evidência detalhada em `docs/visual-check-map-2026-08-27.md`.
- **Limite:** esta unidade não cria rota oficial, não transforma cidades em linha aproximada e não corrige a precisão física dentro de prédios; GPS interno permanece uma unidade posterior dependente de aparelho, céu, ambiente e permissões.

## 2026-08-27 — unidade nova: catálogo de rotas de peregrinação

- **Motivo:** o usuário pediu outras rotas e mencionou a possível Rota do Carvalho; a classificação dessa rota precisava ser verificada antes de qualquer inclusão.
- **Pesquisa:** fontes institucionais confirmaram o Caminho da Fé, a Rota do Rosário e o Caminho Sagrado como referências de peregrinação/roteiro religioso. A Rota do Carvalho não foi confirmada como peregrinação oficial e não recebeu fonte no catálogo.
- **Implementação:** `src/data/rotas-peregrinacao.js` e seletor informativo no `mapaPage`; catálogo imutável com nome, tipo, região, cidades quando publicadas, fontes, estado de evidência e `navegacaoDisponivel: false`.
- **Regra:** nenhuma cidade é ligada por linha aproximada. Uma rota só poderá entrar na navegação com GPX/KML oficial ou explicitamente autorizado, versão/data, fonte e validação física.
- **Testes:** `npm test` chegou a 173 aprovados, 0 falhas; `test/rotas-peregrinacao.test.js` cobre catálogo, Rota do Carvalho não confirmada e imutabilidade.
- **Documentação:** `docs/ROTAS-PEREGRINACAO-REFERENCIAS.md` e `docs/adr/ADR-0026-catalogo-rotas-peregrinacao.md`.
- **Limite:** esta unidade não cria navegação turn-by-turn, não incorpora geometrias de terceiros, não valida segurança de percurso e não muda a classificação da Rota do Carvalho sem nova fonte confiável.

## 2026-08-27 — unidade nova: fixo manual de maior precisão

- **Execution:** rodada contínua Mobile V2/Omega após o catálogo de rotas.
- **Objective:** reduzir a dependência do último fixo ao tocar em Centralizar, sem prometer precisão de prédio e sem manter alta precisão ativa continuamente.
- **Implemented:** perfil `manual` em `src/core/localizacao.js`; `solicitarPosicao({ mode: 'manual' })` no botão Centralizar; atualização do HUD, marcadores, destino e câmera após novo fixo.
- **Policy:** modo cidade permanece econômico; trilha permanece em alta precisão; alta precisão manual ocorre apenas por ação explícita.
- **Tests:** `npm test` aprovado com 173 testes; cobertura do perfil manual inclui alta precisão, `maximumAge: 0` e timeout de 20 s.
- **Documentation:** `docs/adr/ADR-0027-fixo-manual-alta-precisao.md`, `MOBILE_V2_TEST_MATRIX.md`, `MOBILE_V2_MASTER_CHECKLIST.md`, `MOBILE_V2_STATUS.md` e `MOBILE_V2_PROGRESS.md`.
- **Physical blocker:** cenário T-005A continua pendente em Android/iPhone: comparar área externa aberta com interior do prédio, registrar `±N m`, horário e comportamento sem descartar a incerteza.
- **Security/privacy:** localização permanece local e foreground-only; GPS posiciona e não transmite; nenhuma correção visual, snap-to-road ou combinação artificial de leituras foi adicionada.
- **Status:** IN PROGRESS até gates locais, CI e validação física.

## 2026-08-27 — unidade documental: matriz de capacidades por plataforma

- **Execution:** nova execução contínua a partir de `e7bfb10`; auditoria confirmou que `DEVICE_CAPABILITIES.md` estava ausente.
- **Objective:** tornar explícitas as diferenças entre Web/PWA, Android e iOS por feature, hardware, permissão e fallback, sem afirmar suporte físico não testado.
- **Implemented:** `DEVICE_CAPABILITIES.md`, com GPS/GNSS foreground, fixo manual, tracking, background não implementado, MGRS, mapas, tiles offline, storage, bússola, Wake Lock, share, Files, manual offline, diagnóstico, atualização, bateria, lifecycle e catálogo de rotas.
- **Documentation:** `MOBILE_V2_DEVICE_MATRIX.md`, `MOBILE_V2_BUILD_MATRIX.md`, `MOBILE_V2_MASTER_CHECKLIST.md`, `MOBILE_V2_STATUS.md`, `V2_STATUS.md` e `MOBILE_V2_PROGRESS.md` alinhados; item OMEGA-020 criado como `IN_PROGRESS`.
- **Evidence:** código, testes, build, sync, CI e APK debug só provam seus escopos. Não houve aparelho real, macOS/Xcode, assinatura, loja ou modo avião físico nesta rodada.
- **Security/privacy:** sem permissões novas, sem secrets, sem background GPS, sem telemetria e sem mapa/rota inventados. O Vanguard Field civil permanece separado da wiki virtual de Arma 3 e dos módulos balísticos legados.
- **Blockers:** Android/Xiaomi/iPhone/iPad reais, GPS/sensores, lifecycle, cache offline, bateria, Files/Share Sheet, signing e distribuição.
- **Next Task:** executar os casos da `MOBILE_V2_DEVICE_MATRIX.md`, começando por T-005A e instalação Android debug quando houver aparelho disponível.
- **Status:** IN PROGRESS até gates e validação física.

## 2026-08-28 — memória operacional de release candidate

A auditoria do estado remoto confirmou `main` alinhada no commit `d8bf3a1`, cinco CIs recentes verdes e somente `v1.0.0-rc.2` publicada. O arquivo `MOBILE_V2_RELEASE_CANDIDATE.md` foi criado como registro factual de prontidão, com estado `NOT READY / BLOCKED`; ele não cria tag nem release.

O registro separa Web/PWA, Android debug, Android release/AAB, Android signed/installed, iOS sync, archive/IPA, validação física e store readiness. O APK debug e o AAB não assinado do run `33121937373` continuam evidência de artifact-only e não foram atribuídos automaticamente ao snapshot `d8bf3a1`.

A validação desta unidade inclui `npm test` com 173 aprovados, build aprovado, sintaxe do Service Worker, `git diff --check`, auditoria de produção sem vulnerabilidades e estrutura do documento candidate conferida. Ainda faltam instalação, signing, aparelhos reais, macOS/Xcode, modo avião, sensores, bateria, Share Sheet/Files, inspeção de distribuição e autorização deliberada.

## 2026-08-28 — cleanup da centralização manual no mapa

- **Execution:** continuação Omega após a memória de release candidate.
- **Estado Git inicial:** `main` limpa e alinhada com `origin/main` em `1ac26e9`; CI `33128822658` anterior concluído com sucesso.
- **Phase:** Mobile foundation + lifecycle observability.
- **Milestone:** reduzir trabalho assíncrono sobrevivente à desmontagem da página do mapa.
- **Objective:** limpar o timer de 21 segundos do botão Centralizar e impedir callbacks tardios de atualizarem uma UI/instância MapLibre já removida.
- **Implemented:** `src/core/centralizacao-manual.js` com estados `LIVRE`/`BUSCANDO`/`ENCERRADA`, reentrada bloqueada, timer injetável/cancelável e descarte após cleanup; integração em `src/pages/mapa.js`.
- **Fixed:** `mapaPage()` agora desmonta o controlador antes de parar o GPS; o listener de `release` do Wake Lock não chama `atualizarSheet()` depois da desmontagem.
- **Tests:** a primeira execução falhou porque o novo teste não importava `test` de `node:test`; o harness foi corrigido. Execução final: `npm test` com 176 aprovados e 0 falhas.
- **Build gates:** `npm run build`, `node --check public/sw.js`, `git diff --check` e `npm audit --omit=dev --audit-level=high` aprovados; auditoria reportou 0 vulnerabilidades.
- **Android:** `npm run mobile:android:debug` aprovado com `BUILD SUCCESSFUL`; APK continua artifact debug/teste, não release.
- **iOS:** nenhum build Xcode/signing/IPA executado; ambiente Linux continua `ENVIRONMENT BLOCKED`.
- **PWA:** build compartilhado aprovado; não houve nova validação física de instalação, modo avião ou quota.
- **Artifacts:** apenas APK debug local regenerado pelo gate mobile; nenhum artifact assinado, AAB distribuível ou IPA.
- **Security/privacy:** sem permissões novas, sem background GPS, sem telemetria, sem transmissão automática e sem alteração do legado Arma 3 restrito a videogame/testes.
- **Documentation:** `ADR-0028-cleanup-centralizacao-manual.md`, `MOBILE_V2_MASTER_CHECKLIST.md`, `MOBILE_V2_BUILD_MATRIX.md`, `MOBILE_V2_STATUS.md`, `V2_STATUS.md`, `MOBILE_V2_RELEASE_STATUS.md`, `MOBILE_V2_RELEASE_CANDIDATE.md` e este log alinhados.
- **Commit:** `6d7c7fb fix(v2): limpar centralizacao ao desmontar mapa`; push para `origin/main` concluído.
- **Blockers:** lifecycle/tela bloqueada, Wake Lock real, GPS interno/externo, modo avião/quota, Files/Share Sheet, bateria de quatro dias, signing Android, macOS/Xcode/iOS, AAB assinado e distribuição continuam pendentes.
- **Next Task:** aguardar CI e, com aparelho disponível, executar T-005A/T-007; sem aparelho, escolher somente outro gargalo seguro e verificável.
- **Status:** IN PROGRESS / BLOCKED nos gates físicos e de distribuição.

## 2026-08-28 — cleanup do timer de atualização PWA

- **Execution:** continuação do prompt Omega após o cleanup da centralização manual.
- **Date:** 2026-08-28.
- **Estado inicial:** `main` limpa e alinhada com `origin/main` em `8bb89dc`; CI `33129436543` anterior concluído com sucesso.
- **Phase:** Mobile foundation + lifecycle observability.
- **Milestone:** impedir que a verificação remota inicial do update sobreviva ao cleanup do controle global da shell.
- **Objective:** guardar e cancelar o timer de 2,5 segundos e descartar respostas remotas depois da desmontagem.
- **Implemented:** `src/core/atualizacao-ui.js` passou a manter `timerVerificacao`, cancelá-lo em `desmontar()` e limpar o estado quando o callback é executado; a resposta de `fetch()`/`json()` é ignorada se o controle já foi removido.
- **Fixed:** o controle não deixa o timer inicial pendente após desmontagem; a confirmação explícita do Service Worker, a allowlist HTTPS, o comportamento offline e a abertura oficial de download foram preservados.
- **Tests:** `test/atualizacao-ui.test.js` recebeu timers fake e verificou o atraso de 2,5 segundos, cancelamento, listeners e fluxo waiting/negação/confirmação. `npm test`: 176 aprovados e 0 falhas.
- **Build gates:** `npm run build`, `node --check public/sw.js`, `git diff --check` e `npm audit --omit=dev --audit-level=high` aprovados; auditoria reportou 0 vulnerabilidades.
- **Android:** `npm run mobile:android:debug` aprovado com `BUILD SUCCESSFUL`; APK permanece artifact debug/teste e não release.
- **iOS:** nenhum build Xcode, archive, signing ou IPA; ambiente Linux permanece `ENVIRONMENT BLOCKED`.
- **PWA:** build e CI `33129751294` concluídos com sucesso; instalação, modo avião, quota, reabertura e update posterior continuam sem validação física.
- **Artifacts:** somente APK debug local regenerado; nenhum APK release assinado, AAB distribuível ou IPA.
- **Security/privacy:** sem permissões novas, sem background GPS, sem telemetria, sem transmissão automática, sem instalação silenciosa e sem alteração do legado Arma 3 restrito a videogame/testes.
- **Documentation:** `docs/adr/ADR-0029-cleanup-atualizacao-pwa.md`, `MOBILE_V2_RELEASE_CANDIDATE.md`, `MOBILE_V2_RELEASE_STATUS.md`, `MOBILE_V2_STATUS.md`, `V2_STATUS.md`, `MOBILE_V2_PROGRESS.md` e este log alinhados.
- **Commit:** `11767e6 fix(v2): limpar timer da atualizacao pwa`; push para `origin/main` concluído; CI `33129751294` concluído com sucesso.
- **Blockers:** instalação PWA, modo avião/quota, reabertura, update posterior em aparelho, lifecycle, Android/Xiaomi/iPhone físicos, bateria, signing Android, macOS/Xcode/iOS, AAB/IPA e distribuição continuam pendentes.
- **Next Task:** executar T-005A/T-007/T-017 quando houver aparelhos; sem hardware, escolher apenas outro gargalo seguro e verificável.
- **Status:** IN PROGRESS / BLOCKED nos gates físicos e de distribuição.

## 2026-08-28 — manifesto versionado de dataset offline

- **Execution:** continuação Omega após o cleanup do update PWA, seguindo a nova ordem de Global Offline Data Engine.
- **Estado inicial:** `main` limpa e alinhada com `origin/main` em `0e0eda0`; CI `33129865687` anterior concluído com sucesso.
- **Phase:** Dataset architecture / offline-first foundation.
- **Milestone:** introduzir identidade, versão e integridade esperada de dataset sem transformar cache de tiles em dataset mundial.
- **Objective:** criar um contrato mínimo e verificável para manifestos de dados cartográficos locais.
- **Audit:** `src/core/mapa-offline.js` calcula até 256 URLs de tiles do viewport; `public/sw.js` mantém cache técnico de shell/tiles; `src/core/estado.js` mantém envelopes v1 de dados do usuário. Não havia manifesto, pacote regional, índice, staging, ativação atômica, rollback ou sync de dataset.
- **Implemented:** `src/core/dataset-manifest.js`, com `schema`, versão de manifesto, `datasetId`, versão, `formatVersion`, datas UTC, source, license, checksum SHA-256 esperado, `minimumAppVersion`, regiões e estados `CURRENT`/`STALE`/`UNKNOWN`.
- **Tests:** `test/dataset-manifest.test.js` cobre manifesto válido, campos inválidos, regiões duplicadas, tamanho negativo, datas invertidas, normalização sem mutação e frescor. `npm test`: 181 aprovados e 0 falhas.
- **Build gates:** `npm run build`, `node --check public/sw.js`, `git diff --check` e `npm audit --omit=dev --audit-level=high` aprovados; auditoria reportou 0 vulnerabilidades.
- **Android/iOS:** nenhum arquivo de plataforma foi alterado nesta unidade; não houve novo signing, instalação, IPA ou validação física.
- **PWA/offline:** o Service Worker e o planner de tiles não foram substituídos. Não houve declaração de mapa mundial offline, busca local ou roteamento offline.
- **Dataset:** nenhum pacote mundial ou regional foi incorporado; nenhuma fonte foi considerada autorizada para redistribuição offline; o manifesto registra checksum esperado, mas não calcula hash de arquivo.
- **Sync:** nenhum download, retry, resume, fila de datasets, staging, ativação, rollback ou evento de sincronização foi implementado.
- **Storage:** dados do usuário continuam no store local oficial; dataset gerenciado permanece separado e sem armazenamento definido.
- **Security/privacy:** sem scraping/bulk-download de tiles públicos, sem rede no módulo puro, sem execução de código, sem envio de GPS/trilhas/waypoints/rotas e sem alteração do escopo civil/Arma 3 restrito.
- **Documentation:** `ADR-0030-manifesto-dataset-offline.md`, `OFFLINE_DATA_STATUS.md`, `MAP_DATA_STATUS.md`, `SYNC_STATUS.md`, `MOBILE_V2_MASTER_CHECKLIST.md`, `MOBILE_V2_BUILD_MATRIX.md`, `MOBILE_V2_STATUS.md`, `V2_STATUS.md`, `MOBILE_V2_PROGRESS.md` e este log alinhados.
- **Blockers:** fonte/licença de redistribuição, formato/pacote, armazenamento de dataset, índice, servidor, checksum calculado, staging, atomicidade, rollback, teste offline real e validação de aparelhos continuam pendentes.
- **Next Task:** auditar fontes/licenças e escolher armazenamento para metadados; depois avaliar um pacote pequeno e autorizado, sem criar segundo sistema offline.
- **Status:** IN PROGRESS / BLOCKED para dataset mundial, sync e validação física.

## Fechamento da rodada — 2026-08-28

O bloco funcional foi publicado em `57a387a feat(v2): validar manifesto de dataset offline`; o CI `33130481662` concluiu com sucesso. A memória e os status foram publicados em `ae2edbe docs(v2): registrar arquitetura de dataset offline`; o CI `33130631235` também concluiu com sucesso. `main` e `origin/main` permaneceram alinhadas e nenhum workflow de release foi disparado.

A rodada entregou contrato, testes e documentação, não um dataset mundial. O projeto continua sem cobertura cartográfica offline mundial, busca local mundial, roteamento offline, pacote regional, sync, checksum calculado de arquivo, staging, ativação atômica, rollback ou licença de redistribuição confirmada. Os dados de usuário continuam separados do cache técnico de tiles.

## 2026-08-28 — transação atômica de dataset offline

- **Execution:** continuação do Global Offline Data Engine após o manifesto versionado.
- **Estado inicial:** `main` limpa e alinhada no commit `68b2a97`; CIs recentes `33130481662`, `33130631235` e `33130691513` concluídos com sucesso.
- **Phase:** dataset transaction / atomic update foundation.
- **Audit:** manifesto validava metadados, mas não havia lock de atualização, staging, ativação explícita ou rollback preservando o ativo.
- **Implemented:** `src/core/dataset-transacao.js`, com estados `IDLE`, `CHECKING`, `AVAILABLE`, `DOWNLOADING`, `VERIFYING`, `STAGING`, `ACTIVATING`, `COMPLETE`, `FAILED`, `ROLLED_BACK` e `CANCELLED`.
- **Invariants:** uma transação não terminal reserva o dataset; o ativo só muda em `COMPLETE`; checksum/tamanho fornecidos precisam coincidir antes do staging; falha mantém o ativo anterior; estados terminais não podem ser reabertos.
- **Tests:** `test/dataset-transacao.test.js` cobre concorrência, caminho feliz, staging, tamanho/checksum inválidos, cancelamento, rollback, transições inválidas, ativação sem staging e identidade/versão; `npm test`: 187 aprovados e 0 falhas.
- **Build gates:** `npm run build`, `node --check public/sw.js`, `git diff --check` e `npm audit --omit=dev --audit-level=high` aprovados; auditoria reportou 0 vulnerabilidades.
- **Dataset:** nenhum pacote mundial ou regional foi incorporado; nenhum checksum de bytes foi calculado; fonte/licença de redistribuição permanece não confirmada.
- **Sync:** máquina pura parcial implementada; não há download, endpoint, retry, resume, fila, I/O, persistência, power-loss recovery ou histórico persistente.
- **Storage/privacy:** `src/core/estado.js` continua o store oficial de dados do usuário; cache do Service Worker permanece técnico; a transação não envia GPS, trilhas, waypoints, rotas ou emergência.
- **Documentation:** ADR-0031, `OFFLINE_DATA_STATUS.md`, `SYNC_STATUS.md`, `MOBILE_V2_MASTER_CHECKLIST.md`, `MOBILE_V2_BUILD_MATRIX.md`, `MOBILE_V2_STATUS.md`, `V2_STATUS.md`, `MOBILE_V2_PROGRESS.md`, `MOBILE_V2_RELEASE_CANDIDATE.md` e este log foram atualizados.
- **Blockers:** armazenamento gerenciado, pacote/fonte/licença, cálculo real de checksum, atomicidade no dispositivo, recovery, teste offline e validação PWA/Android/iOS permanecem pendentes.
- **Status:** IN PROGRESS / BLOCKED; nenhuma tag, release, signing ou artifact novo foi criado.

## 2026-08-28 — storage isolado de dataset e transação

- **Execution:** continuação do Global Offline Data Engine após a máquina pura de transação.
- **Estado inicial:** `main` limpa e alinhada no commit `809826d`; CI `33131157977` concluído com sucesso.
- **Phase:** dataset storage / metadata persistence foundation.
- **Audit:** `src/core/estado.js` permanece store oficial dos dados do usuário; `public/sw.js` permanece cache técnico de shell/tiles; não existia fronteira persistente para manifesto ativo e transação.
- **Implemented:** `src/core/dataset-storage.js`, adapter injetável com chaves `vanguard:maps:dataset:active` e `vanguard:maps:dataset:transaction`, envelopes versionados, validação de manifesto/transação, diagnóstico e falhas explícitas.
- **Isolation:** a unidade não escreve nem limpa trilhas, waypoints, rotas, configurações ou preparação de emergência; `limparTransacao()` remove somente a chave temporária do dataset.
- **Tests:** `test/dataset-storage.test.js` cobre leitura/escrita normalizada, manifesto inválido, envelope corrompido, isolamento, limpeza seletiva, estado inválido, backend ausente e falha de quota/escrita; `npm test`: 194 aprovados e 0 falhas.
- **Build gates:** `npm run build`, `node --check public/sw.js`, `git diff --check` e `npm audit --omit=dev --audit-level=high` aprovados; auditoria reportou 0 vulnerabilidades.
- **Commit:** código/testes/ADR publicados em `4aa6556 feat(v2): isolar storage de dataset`; CI `33131381528` concluído com sucesso.
- **Documentation:** `docs/adr/ADR-0032-storage-dataset-isolado.md`, `OFFLINE_DATA_STATUS.md`, `SYNC_STATUS.md`, `MOBILE_V2_BUILD_MATRIX.md`, `MOBILE_V2_MASTER_CHECKLIST.md`, `MOBILE_V2_RELEASE_CANDIDATE.md`, `MOBILE_V2_RELEASE_STATUS.md`, `MOBILE_V2_STATUS.md`, `V2_STATUS.md`, `MOBILE_V2_PROGRESS.md` e este log foram alinhados.
- **Limits:** `localStorage` é apenas o backend compatível desta fundação; ainda não há storage atômico de disco, pacote binário, checksum calculado de bytes, download, endpoint, retry/resume, startup recovery ou teste físico de quota/power loss.
- **Status:** IN PROGRESS / BLOCKED; nenhuma tag, release, signing ou artifact novo foi criado.

## Fechamento da rodada — 2026-08-28

O bloco funcional foi publicado em `4aa6556 feat(v2): isolar storage de dataset`; o CI `33131381528` concluiu com sucesso. O alinhamento das memórias foi publicado em `094bd6a docs(v2): registrar storage isolado de dataset`; o CI `33131481446` concluiu com sucesso. `main` e `origin/main` permaneceram alinhadas e nenhum workflow de release foi disparado.

A rodada entregou uma fronteira local isolada para metadados e transações, não um storage de pacotes mundial. O projeto continua sem atomicidade de disco, checksum calculado de bytes, download, endpoint, retry/resume, recuperação após power loss, fonte/licença de redistribuição confirmada, pacote cartográfico ou validação offline em aparelho.

## 2026-08-28 — governança de fontes cartográficas

- **Execution:** continuação do Global Offline Data Engine após o adapter de storage isolado.
- **Estado inicial:** `main` limpa e alinhada no commit `7c963f0`; CI `33131536514` concluído com sucesso.
- **Phase:** cartographic source governance / offline redistribution gate.
- **Audit:** `src/data/camadas-mapa.js` contém Google Satellite, OpenTopoMap, OpenStreetMap, Esri World Imagery, ArcGIS Boundaries and Places, NASA GIBS, GEBCO WMS e Mapzen/AWS Terrain Tiles; todos são usados como renderização online/cache técnico, não como dataset gerenciado.
- **Research:** políticas oficiais consultadas para OSM, Google Maps Platform, OpenTopoMap, Esri, NASA Earthdata, GEBCO e AWS Terrain Tiles; as fontes foram registradas com data da rodada e links no ADR-0033/MAP_DATA_STATUS.
- **Implemented:** `src/data/fontes-dataset.js`, catálogo imutável com oito critérios obrigatórios e estados `APPROVED`, `REVIEW_REQUIRED`, `NOT_APPROVED` e `UNKNOWN`.
- **Gate:** somente oito critérios explicitamente `true` permitem `APPROVED`; o catálogo atual mantém `podeCriarPacote: false`. Nenhum endpoint atual foi aprovado automaticamente para redistribuição offline.
- **Safety:** nenhuma alteração de URL, scraping, bulk download, prefetch mundial, geocodificação obrigatória ou dataset foi criada. A política OSM de tiles públicos não é usada como autorização de pacote.
- **Tests:** `test/fontes-dataset.test.js` cobre catálogo atual, aprovação condicional, revisão por critério, registro malformado, catálogo inválido e imutabilidade; `npm test`: 200 aprovados e 0 falhas.
- **Build gates:** `npm run build`, `node --check public/sw.js`, `git diff --check` e `npm audit --omit=dev --audit-level=high` aprovados; auditoria reportou 0 vulnerabilidades.
- **Commit:** código/testes/ADR publicados em `edf0682 feat(v2): governar fontes cartograficas`; CI `33131867028` concluído com sucesso.
- **Documentation:** ADR-0033, `MAP_DATA_STATUS.md`, `OFFLINE_DATA_STATUS.md`, `SYNC_STATUS.md`, `MOBILE_V2_MASTER_CHECKLIST.md`, `MOBILE_V2_BUILD_MATRIX.md`, `MOBILE_V2_RELEASE_CANDIDATE.md`, `MOBILE_V2_RELEASE_STATUS.md`, `MOBILE_V2_STATUS.md`, `V2_STATUS.md`, `MOBILE_V2_PROGRESS.md` e este log foram alinhados.
- **Limits:** o catálogo é um gate técnico, não licença ou parecer jurídico; ainda faltam contrato específico, formato/pipeline, pacote, checksum de bytes, download e storage atômico.
- **Status:** IN PROGRESS / BLOCKED; nenhuma tag, release, signing ou artifact novo foi criado.

## Fechamento da rodada — 2026-08-28

O catálogo funcional foi publicado em `edf0682 feat(v2): governar fontes cartograficas`; o CI `33131867028` concluiu com sucesso. As memórias de governança foram publicadas em `cb476e4 docs(v2): registrar governanca de fontes`; o CI `33131968614` concluiu com sucesso. `main` e `origin/main` permaneceram alinhadas e a worktree ficou limpa.

A unidade fechou um gate técnico negativo: nenhum provedor atual está automaticamente apto a originar pacote offline. O projeto continua sem dataset mundial/regional distribuível, e nenhuma tag, release, signing ou artifact novo foi criado.

## 2026-08-28 — tracking GPS experimental em segundo plano

- **Execution:** continuação urgente para permitir teste real de caminhada com tela bloqueada antes da peregrinação; mudança classificada como código + configuração nativa + artifact debug, não release.
- **Estado inicial:** `main` limpa e alinhada em `d3bf340`; CI `33132011040` concluído com sucesso; somente `v1.0.0-rc.2` pública.
- **Implemented:** `src/core/background-localizacao.js` com estados `IDLE`/`STARTING`/`ACTIVE`/`STOPPED`/`ERROR`/`UNAVAILABLE`, normalização, reentrada bloqueada, stop, teardown e callbacks tardios ignorados; UI no Mapa somente durante rota ativa, com `confirm` explícito e status observável.
- **Single source:** o callback background alimenta o mesmo registrador local da trilha; o watcher foreground é pausado durante `STARTING`/`ACTIVE` e só volta quando a sessão termina/falha e a página está visível. `PARAR E GUARDAR`, `LIMPAR TRILHA`, importação e desmontagem encerram a sessão.
- **Privacy:** não foram configurados `url`, `headers`, POST, geofence, `ACCESS_BACKGROUND_LOCATION`, auto-início no boot, reconexão ou upload. Dados permanecem no store local; exportação/contribuição voluntária continua manual e pós-rota.
- **Android:** `@capgo/background-geolocation@8.4.3` sincronizado; manifesto mesclado contém serviço `foregroundServiceType=location`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS` e `WAKE_LOCK`. Receivers `GeofenceBroadcastReceiver`/`GeofenceBootReceiver` foram desabilitados pelo manifesto app-owned e `RECEIVE_BOOT_COMPLETED` removido.
- **iOS:** plugin sincronizado e `UIBackgroundModes=location` preparado no `Info.plist`; sem macOS/Xcode, signing, archive, IPA ou dispositivo Apple. Classificação: `ENVIRONMENT BLOCKED`.
- **Tests:** `npm test` passou com 206 testes e 0 falhas; `npm run build`, `node --check public/sw.js`, `git diff --check` e `npm audit --omit=dev --audit-level=high` passaram; auditoria de produção reportou 0 vulnerabilidades.
- **Mobile gates:** `npm run mobile:sync:android`, `npm run mobile:sync:ios` e `npm run mobile:android:debug` passaram; build Gradle `BUILD SUCCESSFUL`.
- **Artifact:** `android/app/build/outputs/apk/debug/app-debug.apk`, `versionName 1.0.0`, `versionCode 100`, 8.816.910 bytes, SHA-256 `afbf0c0091e9b8e02fcdfff2e31c48f0b969a3dea508afd1ea6b7be04fc96db5`; somente APK debug/teste, não assinado, não candidate e não release.
- **Commit/CI:** funcional publicado como `4b3855b feat(v2): adicionar tracking gps experimental em background`; CI `33134403140` concluído com sucesso; `main` e `origin/main` alinhadas após o push funcional.
- **Documentation:** ADR-0034, `docs/ROTEIRO-TESTE-BACKGROUND-GPS.md`, matriz T-021–T-030, capabilities, blockers, checklist Omega, build matrix, release status/candidate, V2 status/progress, BUILD-VS-RELEASE e este log foram atualizados para o fechamento documental separado.
- **Limits:** nenhuma validação física foi feita. Tela bloqueada, Home/Recents, encerramento do processo, permissões, notificação Android 13+, Xiaomi/MIUI/HyperOS, modo avião, lacunas, bateria e iOS continuam pendentes; não há promessa de tracking contínuo ou quatro dias.
- **Status:** código funcional publicado; documentação de fechamento pronta para o segundo commit/CI; physical validation `BLOCKED`; release/signing/store `BLOCKED`; nenhuma tag ou release criada.

## Fechamento da rodada — 2026-08-28

O bloco funcional de tracking GPS experimental em background foi publicado em `4b3855b`; o CI `33134403140` concluiu com sucesso. A documentação atualizada, a ADR-0034 e o roteiro físico serão publicados em commit separado após revisão final. O APK gerado é um artifact debug local para instalação consciente em aparelho de teste; não é release, candidate, build assinado ou garantia de continuidade.

## 2026-08-28 — orquestração do ciclo de vida do dataset

- **Execution:** continuação do bloco de dataset offline; unidade classificada como código + teste + documentação, sem release, artifact ou interface.
- **Estado inicial:** `main` limpa e alinhada em `c0ca171`; worktree limpa; somente `v1.0.0-rc.2` pública.
- **Auditoria de partida:** os seis commits das rodadas anteriores (`4aa6556`, `094bd6a`, `7c963f0`, `edf0682`, `cb476e4`, `d3bf340`) foram confirmados como ancestrais de `HEAD`, com todos os arquivos presentes. Constatado que `dataset-manifest`, `dataset-transacao`, `dataset-storage` e `fontes-dataset` só eram importados entre si e por testes: nenhuma página do app os consumia.
- **Implemented:** `src/core/dataset-sync.js` com `criarSincronizacaoDataset({ storage, fontes, relogio })` e as operações `estado`, `recuperar`, `iniciar`, `avancar`, `verificar`, `ativar`, `cancelar`, `falhar` e `rollback`.
- **Ordem de gravação:** ativação em quatro gravações (`ACTIVATING` → manifesto ativo → `COMPLETE` → limpeza). O ativo só é escrito depois de `ACTIVATING` estar gravado; a transação só é apagada depois do ativo ter sucesso.
- **Recovery:** `recuperar()` classifica em `CLEAN`, `RESIDUAL`, `INTERRUPTED`, `ACTIVATION_CONFIRMED`, `ACTIVATION_REVERTED`, `ROLLBACK_APPLIED` e `UNREADABLE`. O caso `ACTIVATING` é decidido comparando `datasetId`, `version` e `checksum`. Download interrompido nunca é retomado.
- **Gate:** governança aplicada em `iniciar()` com `sourceId` obrigatório e explícito. Com o catálogo atual, todas as oito fontes são recusadas; há teste cobrindo a recusa do catálogo real.
- **Invariantes:** o orquestrador lê o armazenamento a cada operação, sem cache em memória; falhas de leitura e escrita são propagadas com o código do storage e nunca convertidas em ausência de dado; uma gravação que falha impede o avanço do estado; as chaves de trilha, waypoint, rota, configuração e emergência não são tocadas.
- **Tests:** `test/dataset-sync.test.js` com dezessete casos; `npm test`: 223 aprovados e 0 falhas.
- **Defeito próprio encontrado e corrigido:** na primeira escrita, `estado().podeIniciar` usava `podeCriarPacote`, que exige o catálogo inteiro aprovado, enquanto `iniciar()` exige apenas a fonte declarada. Num catálogo misto o retrato diria "não dá" com origem válida disponível. O predicado passou a ser `fontesAptas.length > 0` e um teste de catálogo misto prende o comportamento.
- **Verificação dos testes:** três mutações deliberadas no módulo reprovaram a suíte — `mesmoManifesto` sempre verdadeiro (1 falha), gate de fonte sempre aprovando (1 falha) e `encerrar()` sem limpar a transação (6 falhas). A suíte prende o comportamento, não apenas o executa.
- **Build gates:** `npm run build`, `node --check public/sw.js`, `git diff --check` e `npm audit --omit=dev --audit-level=high` aprovados; auditoria de produção reportou 0 vulnerabilidades.
- **Documentation:** ADR-0035, `OFFLINE_DATA_STATUS.md`, `SYNC_STATUS.md`, `MOBILE_V2_MASTER_CHECKLIST.md` (OMEGA-027), `V2_STATUS.md`, `MOBILE_V2_PROGRESS.md` e este log. Uma linha malformada da tabela de `SYNC_STATUS.md` (quatro colunas em tabela de três) foi corrigida na mesma passagem.
- **Não feito, deliberadamente:** nenhuma interface de usuário, nenhum download, nenhum cálculo de SHA-256 sobre bytes, nenhum endpoint, nenhum pacote, nenhuma alteração de URL de camada e nenhuma aprovação de fonte. Enquanto nenhuma fonte estiver aprovada, expor um botão de download seria promessa sem lastro.
- **Limits:** a garantia adicionada é de ordem, não de durabilidade física. Quota real, escrita atômica de disco e power loss em aparelho continuam sem prova. O gargalo do dataset mundial permanece de origem — fonte licenciada para redistribuição —, não de código.
- **Status:** IN PROGRESS / BLOCKED para dataset mundial, endpoint, pacote, storage físico, aparelhos reais, signing e distribuição. Nenhuma tag, release, signing ou artifact novo foi criado.


## Fechamento da orquestração do dataset — 2026-08-28

A unidade OMEGA-027 foi revisada e mesclada em `main` pelo PR #3, commit `2382b01`. O módulo `src/core/dataset-sync.js` agora costura manifesto, transação, storage e governança de fontes, com recuperação de interrupções e ordem de gravação explícita. A unidade permanece TESTED/IN PROGRESS: não cria download, pacote, endpoint ou prova de durabilidade física.

O próximo gargalo verificável continua sendo a validação física do background GPS (T-021–T-030) e, separadamente, a obtenção de uma fonte cartográfica realmente licenciada para redistribuição offline. Nenhum resultado de CI ou build será usado para marcar hardware, bateria, modo avião, quota, assinatura ou distribuição como verificados.
