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

## Marco de importação defensiva de arquivos — 2026-08-27

A auditoria do fluxo de importação identificou que o Mapa escolhia o parser somente pela extensão do nome. Para tratar diferenças entre navegador, Android e iOS sem expandir o escopo, foi criado `src/core/registro-arquivo.js`, um classificador puro que normaliza extensão/MIME, aceita JSON/GPX/KML por metadado disponível e rejeita conflito específico antes de ler o arquivo. O conteúdo continua sendo validado pelos parsers locais, com limites e schema existentes; não há rede, execução XML ou assinatura implícita.

O Mapa foi integrado ao classificador, e `test/registro-arquivo.test.js` adicionou sete casos determinísticos. A suíte passou de 159 para 166 testes. O ADR-0022 registra a decisão e as limitações: MIME/extensão não autenticam conteúdo e Files/Share Sheet físicos ainda precisam de validação em aparelhos reais.

## Marco de separação entre mapas reais e Arma 3 — 2026-08-27

Foi esclarecido que, quando os mapas/terrenos do Arma 3 ainda não estavam disponíveis, o fluxo de construção do Claude Code colocou provisoriamente uma API de imagens de satélite do mundo real na camada cartográfica. Isso foi uma contingência técnica do processo de construção, não uma solicitação do usuário e não representava mapa ou terreno do jogo. O mapa real pertence ao contexto civil do Vanguard Field; os terrenos do Arma 3 pertencem à base virtual própria da wiki/ambiente de testes.

A política agora deixa explícito que os módulos balísticos foram criados somente para simulação e testes no videogame Arma 3, nunca para ambientes reais. A separação foi registrada em `SECURITY.md`, `README.md`, `CLAUDE.md`, `V2_STATUS.md`, `MOBILE_V2_STATUS.md`, `V2_DECISIONS.md`, `V2_ARCHITECTURE_MAP.md`, `docs/BALISTICA.md`, `docs/INTEGRACAO-BALUARTE.md` e no novo ADR-0023.

## Marco de configuração pública compartilhada — 2026-08-27

A auditoria identificou que identidade, versão e URLs oficiais de atualização estavam duplicadas entre o módulo de atualização e o diagnóstico. Foi criado `src/core/configuracao.js`, sem segredos e com objetos imutáveis para nome, application ID, versão, repositório e URLs oficiais. `src/core/atualizacao.js` mantém suas exportações públicas por compatibilidade, mas passa a consumir o contrato central; o diagnóstico também usa o mesmo nome e versão.

`test/configuracao.test.js` cobre conteúdo, imutabilidade, ausência de campos de segredo e compatibilidade das URLs. A suíte local passou a 168 testes. O ADR-0024 documenta que package version, configuração nativa, signing e release continuam gates separados.

## Marco de correção cartográfica e rota de referência — 2026-08-27

As capturas de tela mostraram que a base escura estava recebendo o watermark `API KEY REQUIRED` do CARTO. A auditoria também confirmou que o `mapaPage` iniciava apenas a base escolhida, sem adicionar o overlay de nomes/limites, e que o repositório não continha uma geometria oficial do Caminhos dos Anjos: a trilha desenhada é a trilha local gravada no aparelho.

A base escura agora usa tiles públicos do OpenStreetMap com tratamento visual local; o overlay usa `World_Boundaries_and_Places` do ArcGIS, com atribuição. O Service Worker permitiu `tile.openstreetmap.org`, removeu hosts CARTO sem uso e passou o cache de tiles para `v3` para descartar tiles antigos com watermark. O preparo offline inclui a base selecionada e o overlay de nomes/limites dentro do limite local de 256 URLs.

A pesquisa documentada em `docs/ROTAS-CAMINHOS-DOS-ANJOS.md` confirma a lista publicada pela associação e a Lei Estadual nº 22.530/2025, mas mantém cidades como referência, não como uma linha aproximada. Um GPX/KML oficial ou autorizado ainda é necessário para inserir o traçado navegável. A precisão do GPS dentro de prédios continua sendo um gargalo físico separado, sem promessa de correção por software.

## Marco de catálogo de rotas de peregrinação — 2026-08-27

A pesquisa verificou fontes institucionais do Caminhos dos Anjos, Caminho da Fé, Rota do Rosário e Caminho Sagrado. A expressão Rota do Carvalho não foi confirmada como peregrinação oficial; permaneceu fora da navegação. Foi criado `src/data/rotas-peregrinacao.js` com estados de evidência e sem geometria inventada, além de um seletor informativo no Mapa.

O catálogo mostra nomes, tipo, região, fontes e cidades publicadas quando disponíveis. Todas as rotas confirmadas continuam como `REFERÊNCIA · TRAÇADO LOCAL NECESSÁRIO`, pois a existência de cidades ou uma lei de reconhecimento não fornece automaticamente um GPX/KML navegável. A Rota do Carvalho aparece como `NÃO CONFIRMADA · FORA DA NAVEGAÇÃO`.

Foram adicionados `test/rotas-peregrinacao.test.js`, `docs/ROTAS-PEREGRINACAO-REFERENCIAS.md` e `docs/adr/ADR-0026-catalogo-rotas-peregrinacao.md`. O total local chegou a 173 testes aprovados. A funcionalidade é civil, local-first e permanece separada da wiki virtual de Arma 3 e de seus módulos balísticos legados.

## Marco de fixo manual de maior precisão — 2026-08-27

A auditoria confirmou que o watcher contínuo do modo cidade usa o perfil econômico, enquanto o botão **Centrar** apenas reposicionava a câmera sobre o último ponto ou solicitava uma consulta padrão. Foi adicionado o perfil `manual`, com `enableHighAccuracy: true`, `maximumAge: 0` e timeout de 20 segundos, usado somente após ação explícita da pessoa.

O botão agora solicita um novo fixo, atualiza HUD, marcador, destino e câmera com a leitura recebida e informa a precisão real retornada pelo aparelho. O watcher de cidade continua econômico; o watcher de trilha continua de maior precisão. A melhoria não aplica snap-to-road, não mascara `accuracy` e não transforma um ambiente interno em localização de precisão de edifício.

Foram atualizados `MOBILE_V2_TEST_MATRIX.md`, `MOBILE_V2_MASTER_CHECKLIST.md` e `MOBILE_V2_STATUS.md`, além do ADR-0027. O cenário físico T-005A compara o resultado externo e interno e permanece `PENDENTE` até execução em aparelho real.

## Marco de matriz de capacidades por plataforma — 2026-08-27

A auditoria Omega confirmou que `DEVICE_CAPABILITIES.md` ainda não existia. Foi criada uma matriz que separa Web, Android e iOS por feature, hardware necessário, permissão, fallback e estado de evidência. Ela cobre GPS/GNSS foreground, fixo manual, tracking, background não implementado, MGRS, mapas, tiles offline, storage, bússola, Wake Lock, compartilhamento, Files, manual offline, diagnóstico, updates, bateria, lifecycle e catálogo de rotas.

A matriz não declara suporte físico onde só há código, sync, CI, preview ou APK debug. Android real, Xiaomi/MIUI/HyperOS, iPhone e iPad continuam pendentes para instalação, GPS, sensores, modo avião, cache, lifecycle, bateria e compartilhamento. O documento também reforça a separação entre o Vanguard Field civil, os mapas do mundo real e a wiki virtual de Arma 3.

`MOBILE_V2_BUILD_MATRIX.md`, `MOBILE_V2_DEVICE_MATRIX.md`, `MOBILE_V2_MASTER_CHECKLIST.md`, `MOBILE_V2_STATUS.md` e `V2_STATUS.md` foram alinhados com a matriz. A unidade é documental e aguarda os gates locais e o CI desta rodada.

## Marco de memória de release candidate V2 — 2026-08-28

A auditoria do estado real confirmou que não existia `MOBILE_V2_RELEASE_CANDIDATE.md`. Foi criado um registro operacional para o snapshot de `main` em `d8bf3a1`, separando explicitamente código, build, APK debug, AAB não assinado, signing, instalação, validação, IPA, distribuição e release pública.

O documento classifica o snapshot como `NOT READY / BLOCKED`: ele não cria tag, não publica release e não atribui os hashes do workflow artifact-only ao snapshot atual. A única release pública continua sendo `v1.0.0-rc.2`. Os blockers físicos e de distribuição permanecem Android/Xiaomi/iPhone/iPad reais, GPS/sensores, modo avião/quota, lifecycle, bateria, Files/Share Sheet, signing, macOS/Xcode, IPA, AAB assinado e lojas.

`MOBILE_V2_RELEASE_STATUS.md`, `MOBILE_V2_STATUS.md` e `V2_STATUS.md` foram alinhados com o novo registro. A documentação aguarda o commit desta rodada.

## Marco de cleanup da centralização manual — 2026-08-28

A auditoria do consumidor `mapaPage` encontrou um gargalo de lifecycle: o botão Centralizar agendava diretamente um timer de 21 segundos e seus callbacks de posição/erro não tinham um contrato explícito para sobreviver ou não à desmontagem da página. O mapa é desmontado na troca de rota, portanto esse fluxo podia deixar trabalho assíncrono associado à tela anterior.

Foi criado `src/core/centralizacao-manual.js`, um controlador puro com estados `LIVRE`, `BUSCANDO` e `ENCERRADA`, reentrada bloqueada, timer injetável/cancelável e descarte de callbacks tardios. `src/pages/mapa.js` passou a usá-lo e também evita que o listener de `release` do Wake Lock atualize a UI depois da desmontagem. Não foram adicionadas permissões, background GPS ou correção artificial de precisão.

`test/centralizacao-manual.test.js` cobre janela de 21 segundos, reentrada, posição/erro durante busca, finalização, cancelamento, cleanup e callbacks tardios. A primeira execução da suíte falhou por ausência do import do runner `node:test`; o harness foi corrigido e a execução seguinte passou com 176 testes. O commit funcional `6d7c7fb fix(v2): limpar centralizacao ao desmontar mapa` foi publicado em `main`; a documentação de estado desta unidade aguarda seu CI.

A mudança melhora o contrato de cleanup local, mas não prova GPS, Wake Lock, tela bloqueada, suspensão, bateria ou lifecycle físico. T-005A/T-007 continuam dependentes de Android/Xiaomi/iPhone reais.

## Marco de cleanup da atualização PWA — 2026-08-28

A auditoria do controle global de atualização identificou um timer inicial de 2,5 segundos sem identificador guardado: `setTimeout(verificarRelease, 2500)` podia continuar associado a uma instância do controle depois de `desmontar()`. Como o controle vive na shell e consulta uma release oficial somente quando há rede, o cleanup precisava ser autossuficiente e não depender da troca de páginas.

`src/core/atualizacao-ui.js` agora guarda o timer, limpa o identificador quando a verificação começa e o cancela na desmontagem. A resposta remota também é descartada quando o controle foi desmontado enquanto `fetch()` ou `response.json()` aguardava. A confirmação explícita do Service Worker, a allowlist HTTPS e o comportamento offline foram preservados; não há instalação silenciosa nem alteração de versão.

`test/atualizacao-ui.test.js` passou a usar timers fake e verifica a janela de 2,5 segundos, seu cancelamento no cleanup, a remoção dos listeners e o fluxo waiting/negação/confirmação. A execução final passou com 176 testes. O ADR-0029 registra a decisão e seus limites. O commit `11767e6 fix(v2): limpar timer da atualizacao pwa` foi publicado em `main` e o CI `33129751294` concluiu com sucesso.

A unidade prova o contrato assíncrono local. Não prova instalação PWA, modo avião, quota, reabertura, confirmação do sistema operacional, WebView ou atualização posterior em aparelho. T-017 e T-018 permanecem pendentes.

## Marco de manifesto versionado do Global Offline Data Engine — 2026-08-28

A nova ordem de continuidade pediu uma plataforma de dados offline mundial, mas a auditoria confirmou que o repositório atual ainda possui somente planner de tiles e cache técnico do Service Worker. Não há dataset mundial empacotado, índice local de cidades/estradas, pipeline de processamento, fonte com redistribuição offline comprovada, armazenamento gerenciado de mapas, checksum calculado de pacote, staging ou rollback. O cache público de tiles não foi promovido indevidamente a “mapa mundial offline”.

Foi implementado `src/core/dataset-manifest.js` como primeiro bloco incremental e puro. O contrato valida `schema`, `manifestVersion`, `datasetId`, versão, `formatVersion`, datas UTC, origem, licença, checksum SHA-256 esperado, compatibilidade mínima e regiões com tamanho/checksum. Também classifica o frescor fornecido como `CURRENT`, `STALE` ou `UNKNOWN`, sem fazer rede, persistência, download ou ativação.

A cobertura em `test/dataset-manifest.test.js` verifica manifesto válido, schema/campos inválidos, regiões duplicadas, tamanho negativo, datas invertidas, normalização sem mutação e frescor por versão/idade/data futura. A suíte local chegou a 181 testes aprovados. `ADR-0030-manifesto-dataset-offline.md`, `OFFLINE_DATA_STATUS.md`, `MAP_DATA_STATUS.md` e `SYNC_STATUS.md` registram a separação entre dados do usuário, cache técnico, manifesto e futuro dataset gerenciado.

O manifesto não cria cobertura mundial, busca offline, roteamento, sync, pacote regional ou autorização de redistribuição. O próximo bloco deve auditar fontes/licenças e escolha de armazenamento antes de qualquer download ou integração; a validação física PWA/Android/iOS permanece pendente.

## Marco de transação atômica de dataset — 2026-08-28

A auditoria do estado publicado confirmou que o manifesto de dataset já validava identidade, versão, regiões, licença e checksum esperado, mas não havia uma regra executável para preservar a versão ativa durante uma falha ou impedir duas atualizações simultâneas do mesmo dataset. O próximo gargalo foi fechado com `src/core/dataset-transacao.js`.

A máquina pura reserva o dataset desde `IDLE`, passa por `CHECKING`, `AVAILABLE`, `DOWNLOADING`, `VERIFYING`, `STAGING` e `ACTIVATING`, e somente troca o snapshot `ativo` em `COMPLETE`. Tamanho e checksum fornecidos precisam coincidir com o manifesto antes do staging. Cancelamento antes da ativação remove apenas a referência temporária; falhas seguem para `FAILED` e podem ser revertidas para `ROLLED_BACK` preservando o ativo anterior. Estados terminais rejeitam nova execução.

`test/dataset-transacao.test.js` cobre lock concorrente, fluxo feliz, staging antes da troca, tamanho/checksum inválidos, cancelamento, rollback, transições inválidas, ativação sem staging, versão igual e datasetId divergente. A suíte local passou com 187 testes.

A unidade é uma máquina de contrato, não um sync de produção. Não há download, cálculo SHA-256 de bytes, storage de staging, persistência da transação, recuperação após power loss, retry/resume, endpoint ou pacote autorizado. O cache técnico de tiles e o store local dos dados do usuário continuam separados.

## Marco de storage isolado de dataset — 2026-08-28

A auditoria confirmou que o store oficial de `src/core/estado.js` é destinado aos dados da pessoa e que o Cache Storage do Service Worker é apenas cache técnico de shell/tiles. Para não misturar camadas, foi criado `src/core/dataset-storage.js` como adapter injetável com namespace próprio para manifesto ativo e transação de dataset.

O adapter usa envelopes versionados (`vanguard-dataset-storage`, versão 1), valida o manifesto na escrita e leitura, valida o estado básico da transação, identifica envelopes corrompidos ou incompatíveis e reporta `STORAGE_UNAVAILABLE`/`STORAGE_WRITE_FAILED`/`STORAGE_READ_FAILED`/`STORAGE_REMOVE_FAILED` sem transformar falha em sucesso silencioso. `limparTransacao()` não remove o manifesto ativo nem chaves de dados do usuário.

`test/dataset-storage.test.js` cobre normalização, rejeição, corrupção, isolamento de trilha, limpeza seletiva, estado inválido, backend ausente e falha de quota/escrita. A suíte local passou com 194 testes.

Este adapter ainda não fornece atomicidade de disco, storage binário de pacotes, checksum calculado sobre bytes, recuperação após power loss, migração/reinstalação, quota física ou sync. Nenhum pacote cartográfico mundial ou regional foi incorporado, e fonte/licença de redistribuição permanece não confirmada.

## Marco de governança de fontes cartográficas — 2026-08-28

A auditoria do catálogo em `src/data/camadas-mapa.js` confirmou que o app usa endpoints de Google Satellite, OpenTopoMap, OpenStreetMap, Esri World Imagery, ArcGIS World Boundaries and Places, NASA GIBS, GEBCO WMS e Mapzen/AWS Terrain Tiles. Renderizar uma camada online não é prova de direito para copiar, pré-buscar, armazenar ou redistribuir um pacote offline.

Foi criado `src/data/fontes-dataset.js` com catálogo imutável e `avaliarFonteDataset()`. Cada fonte precisa declarar URL HTTPS, política oficial, uso atual e oito critérios: licença, redistribuição, uso offline, uso comercial, atribuição, política de atualização, direitos de armazenamento e restrições do provedor. Somente oito valores `true` produzem `APPROVED`; registro inválido vira `UNKNOWN`; critério não confirmado permanece `REVIEW_REQUIRED`. O catálogo atual mantém `podeCriarPacote: false`.

A política oficial do servidor de tiles do OpenStreetMap proíbe bulk download, prefetch e uso offline; a documentação do Google restringe prefetch, armazenamento e uso offline conforme o acordo aplicável. OpenTopoMap declara CC-BY-SA e uso em aplicações com atribuição; GEBCO informa uso gratuito/domínio público com condições; NASA exige validar a fonte específica e material de terceiros; AWS aponta documentação de atribuição para Terrain Tiles; e a Esri exige atenção aos termos específicos do serviço. Nenhuma dessas constatações foi usada para autorizar pacote do Vanguard.

`test/fontes-dataset.test.js` cobre catálogo válido mas não aprovado, aprovação somente com todos os critérios, revisão por critério ausente, registro inválido, catálogo inválido e imutabilidade. A suíte local chegou a 200 testes aprovados.

A unidade não alterou URLs, não fez scraping, não baixou tiles e não criou dataset. O cache técnico continua limitado ao seu escopo, e qualquer pacote mundial/regional permanece bloqueado até haver fonte autorizada, contrato aplicável, pipeline, formato, storage e validação do uso pretendido.

## Marco de tracking GPS experimental em segundo plano — 2026-08-28

A ordem de continuidade pediu uma tentativa real de manter a trilha com a tela bloqueada antes da peregrinação. A solução escolhida é explicitamente experimental, opt-in e local: `@capgo/background-geolocation@8.4.3` foi integrado ao Capacitor 8, o mapa ganhou o controle **ATIVAR GPS EM 2º PLANO** somente durante uma rota ativa e a confirmação informa consumo maior, notificação persistente, interrupções possíveis e ausência de envio remoto.

`src/core/background-localizacao.js` implementa os estados `IDLE`, `STARTING`, `ACTIVE`, `STOPPED`, `ERROR` e `UNAVAILABLE`, normaliza leituras nativas e ignora callbacks tardios. Durante a sessão nativa, o watcher foreground é pausado para evitar duplicação. `PARAR E GUARDAR`, `LIMPAR TRILHA`, importação, desmontagem e erro encerram ou invalidam a sessão conforme o contrato; o foreground só é restaurado automaticamente quando a página está visível.

No Android, o manifesto mesclado contém serviço foreground `location`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS` e `WAKE_LOCK`. O app desabilita os receivers de geofence/boot fornecidos pelo plugin e remove `RECEIVE_BOOT_COMPLETED`; não configura `ACCESS_BACKGROUND_LOCATION`, geofence, URL, headers, POST, auto-início ou upload. No iOS, `UIBackgroundModes=location` foi preparado e o plugin foi sincronizado, mas build, signing, instalação e teste continuam bloqueados por falta de macOS/Xcode/dispositivo Apple.

A suíte passou com 206 testes, o build Web e a auditoria de produção passaram, os syncs Android/iOS passaram e `npm run mobile:android:debug` terminou com `BUILD SUCCESSFUL`. O commit funcional `4b3855b feat(v2): adicionar tracking gps experimental em background` foi publicado em `main`; o CI `33134403140` concluiu com sucesso. O APK local `android/app/build/outputs/apk/debug/app-debug.apk` tem 8.816.910 bytes e SHA-256 `afbf0c0091e9b8e02fcdfff2e31c48f0b969a3dea508afd1ea6b7be04fc96db5`; ele é um artifact debug de teste, não signing, candidate ou release.

O experimento ainda não prova continuidade após tela bloqueada, Home/Recents, encerramento do processo, política Xiaomi/MIUI/HyperOS, modo avião, bateria ou iOS. Os casos T-021 a T-030 foram adicionados à `MOBILE_V2_TEST_MATRIX.md`; nenhum pode ser marcado `VERIFIED` por build ou CI. A decisão completa e as referências de plataforma estão em `docs/adr/ADR-0034-tracking-background-opt-in.md`; o procedimento operacional está em `docs/ROTEIRO-TESTE-BACKGROUND-GPS.md`.

## Marco de orquestração do ciclo de vida do dataset — 2026-08-28

As quatro peças da fundação do dataset offline existiam isoladas: manifesto (ADR-0030), transação pura (ADR-0031), storage isolado (ADR-0032) e gate de fontes (ADR-0033). Nenhuma delas conhecia as outras. `src/core/dataset-sync.js` fecha essa costura e é o único ponto que combina os quatro módulos.

A contribuição real não é uma função nova: é a **ordem de gravação**. A ativação acontece em quatro passos — transação como `ACTIVATING`, escrita do manifesto ativo, transação como `COMPLETE`, remoção do registro — de modo que o ativo só é escrito depois do primeiro passo estar gravado e a transação só é apagada depois do segundo ter sucesso. Uma queda entre eles deixa de ser ambígua.

`recuperar()` reconcilia na partida o que sobrou de uma interrupção, classificando em `CLEAN`, `RESIDUAL`, `INTERRUPTED`, `ACTIVATION_CONFIRMED`, `ACTIVATION_REVERTED`, `ROLLBACK_APPLIED` ou `UNREADABLE`. O caso ambíguo — queda durante `ACTIVATING` — é decidido comparando `datasetId`, `version` e `checksum` do ativo gravado com o manifesto novo. Download interrompido nunca é retomado: bytes parciais não verificados não têm garantia de integridade, e o checksum do manifesto cobre o pacote inteiro, não um prefixo.

O gate de governança passou a ser aplicado na entrada, em `iniciar()`, e exige `sourceId` explícito: um manifesto não se autoriza pelo próprio campo textual `source`. Com o catálogo atual isso significa que abrir transação é recusado para as oito fontes registradas — comportamento correto, coberto por teste.

A suíte passou com 223 testes; os dezessete casos novos incluem os quatro pontos de queda da ativação, verificação reprovada por checksum e por tamanho, falha de escrita do ativo com preservação do anterior, transação concorrente, resíduo terminal, envelope ilegível e ausência de armazenamento. Os testes de interrupção não simulam exceções: reconstroem no armazenamento o estado que uma queda deixaria e reabrem o orquestrador sobre o mesmo backend, que é o que o app faz ao ser reaberto. Três mutações deliberadas no módulo (comparação de manifesto sempre verdadeira, gate sempre aprovando, limpeza da transação removida) reprovaram a suíte, confirmando que os testes prendem o comportamento.

Nenhuma interface foi criada. Enquanto nenhuma fonte estiver aprovada, um botão de download seria promessa sem lastro. Não houve download, cálculo de SHA-256 sobre bytes, endpoint, pacote, alteração de URL ou prova de durabilidade física. A decisão completa está em `docs/adr/ADR-0035-orquestracao-ciclo-vida-dataset.md`.

## Próximo passo operacional

Instalar o APK debug somente em aparelho de teste, registrar modelo/versão/bateria/permissões/notificação, preparar uma área cartográfica enquanto houver rede, iniciar uma rota local, aceitar explicitamente o background tracking, bloquear a tela por 10–20 minutos, voltar ao app, parar a sessão e a rota, conferir quantidade/timestamps/precisão/lacunas e exportar JSON+GPX. O teste deve levar power bank e comunicação independente. Nenhum resultado deve ser extrapolado para quatro dias ou para iOS sem evidência física.

A opção A permanece posterior e separada: exportação/contribuição manual voluntária somente após a rota, WeatherProvider sem chave embutida e manual offline de sobrevivência com fontes, região, data de revisão e limites explícitos. A versão de pacote continua `1.0.0`; não foi criada `0.7.0`, tag ou release nesta unidade.
