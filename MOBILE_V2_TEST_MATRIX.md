# Vanguard Field — MOBILE V2 TEST MATRIX

> A matriz separa o que pode ser provado no Node/preview do que exige execução em dispositivo. Um build verde não equivale a `VERIFIED`.

| ID | Cenário | Android comum | Xiaomi/MIUI/HyperOS | iPhone/iPad | Evidência de aceite |
|---|---|---:|---:|---:|---|
| T-001 | Instalação e abertura | PENDENTE | PENDENTE | PENDENTE | app abre sem crash e mostra Vanguard Field |
| T-002 | Permissão GPS concedida | PENDENTE | PENDENTE | PENDENTE | estado concedido, fixo válido, precisão visível |
| T-003 | Permissão GPS negada/restrita | PENDENTE | PENDENTE | PENDENTE | `PERMISSÃO NEGADA`/estado equivalente e fallback sem crash |
| T-004 | GPS desligado ou sem sinal | PENDENTE | PENDENTE | PENDENTE | erro compreensível; nenhum fixo inventado |
| T-005 | Fixo antigo/frescor | PENDENTE | PENDENTE | PENDENTE | HUD/diagnóstico distinguem posição atual, antiga e inválida |
| T-005A | Fixo manual externo vs. ambiente interno | PENDENTE | PENDENTE | PENDENTE | botão Centralizar solicita leitura atual, exibe `±N m`, horário e limitações; não prometer precisão de prédio |
| T-006 | Troca foreground/background | PENDENTE | PENDENTE | PENDENTE | lifecycle aparece como observação; não se presume tracking contínuo |
| T-007 | Tela bloqueada e retomada | PENDENTE | PENDENTE | PENDENTE | comportamento documentado, sem loop/wakelock indevido |
| T-008 | Mapa com toque | PENDENTE | PENDENTE | PENDENTE | pinch, duplo toque, arraste, rotação, marcador e centralização |
| T-009 | Área offline preparada | PENDENTE | PENDENTE | PENDENTE | preparar online, verificar status reportado e reabrir sem rede |
| T-010 | Quota/cache de tiles | PENDENTE | PENDENTE | PENDENTE | resposta real; limite defensivo de 256 não é cobertura garantida |
| T-011 | Modo avião | PENDENTE | PENDENTE | PENDENTE | shell, dados locais e tiles preparados continuam acessíveis |
| T-012 | Persistência local | PENDENTE | PENDENTE | PENDENTE | waypoints, trilha, destino e contexto sobrevivem a fechar/reabrir |
| T-013 | Exportação JSON/GPX | PENDENTE | PENDENTE | PENDENTE | arquivo válido, conteúdo local e compartilhamento explícito |
| T-014 | Importação segura | PENDENTE | PENDENTE | PENDENTE | arquivo válido aparece; schema/geometria inválidos são recusados |
| T-015 | Bússola/sensor | PENDENTE | PENDENTE | PENDENTE | sensor disponível ou `DEVICE/BROWSER DEPENDENT`; sem rumo inventado |
| T-016 | Socorro manual controlado | PENDENTE | PENDENTE | PENDENTE | prepara pacote, não envia SOS nem confirma resgate |
| T-017 | Update PWA | PENDENTE | PENDENTE | PENDENTE | waiting só atualiza após confirmação explícita |
| T-018 | Update APK | PENDENTE | PENDENTE | PENDENTE | origem oficial abre após confirmação; instalador decide instalação |
| T-019 | Acessibilidade | PENDENTE | PENDENTE | PENDENTE | teclado/leitor/tamanho de toque/foco verificados |
| T-020 | Bateria em quatro dias | PENDENTE | PENDENTE | PENDENTE | medição conforme plano de operação; sem promessa universal |
| T-021 | Opt-in explícito para background tracking | PENDENTE | PENDENTE | ENVIRONMENT BLOCKED | rota ativa, confirmação visível e estado `SOLICITANDO` antes do serviço |
| T-022 | Notificação persistente e permissão de notificações | PENDENTE | PENDENTE | ENVIRONMENT BLOCKED | Android 13+ mostra notificação após opt-in; recusa fica observável; não iniciar silenciosamente |
| T-023 | Tela bloqueada por 10–20 minutos | PENDENTE | PENDENTE | ENVIRONMENT BLOCKED | ao reabrir, verificar timestamps, quantidade, precisão e lacunas; sem garantia de continuidade |
| T-024 | Home/Recents e retorno ao app | PENDENTE | PENDENTE | ENVIRONMENT BLOCKED | serviço e trilha local permanecem observáveis ou interrupção é informada; nenhum ponto inventado |
| T-025 | Encerrar pelo botão `PARAR E GUARDAR` | PENDENTE | PENDENTE | ENVIRONMENT BLOCKED | serviço nativo para, pontos permanecem locais e watcher foreground volta somente com página visível |
| T-026 | `LIMPAR TRILHA` com background ativo | PENDENTE | PENDENTE | ENVIRONMENT BLOCKED | serviço para e trilha/waypoints são removidos somente após ação local explícita |
| T-027 | GPS, localização ou notificação negados | PENDENTE | PENDENTE | ENVIRONMENT BLOCKED | estado `ERRO`/`INDISPONÍVEL`, fallback foreground seguro quando visível e nenhum upload |
| T-028 | Modo avião/offline durante background | PENDENTE | PENDENTE | ENVIRONMENT BLOCKED | posição e exportação continuam locais; ausência de rede não altera o fluxo |
| T-029 | Xiaomi/MIUI/HyperOS e economia de bateria | PENDENTE | PENDENTE | ENVIRONMENT BLOCKED | registrar otimização de bateria, auto-start e interrupções; não orientar bypass inseguro |
| T-030 | iOS background location | ENVIRONMENT BLOCKED | ENVIRONMENT BLOCKED | ENVIRONMENT BLOCKED | requer macOS/Xcode, permissões, capability e dispositivo Apple; nenhuma alegação sem teste físico |

## Cobertura automatizada atual

| Área | Resultado |
|---|---|
| Contratos GPS, normalização, frescor, distância e opções do fixo manual | Node: aprovado; `manual` usa alta precisão, `maximumAge: 0` e timeout de 20 s |

| Diagnóstico, inclusive posição persistida `lat/lon` | Node: aprovado; regressão publicada em `f9da500` |
| Capacidades observáveis | Node: aprovado; GPS/orientação/storage/rede/bateria/compartilhamento e estados `AVAILABLE`/`UNAVAILABLE`/`DENIED`/`NOT_SUPPORTED` cobertos em `test/capacidades.test.js` |
| Planner e filtro do Service Worker | Node/VM: aprovado; limite defensivo de 256 URLs |
| Build web e sintaxe do Service Worker | aprovado |
| Sync Capacitor Android/iOS | aprovado no ambiente Linux |
| APK debug | `BUILD SUCCESSFUL`; artifact de teste |
| Estados do watcher GPS | Node: `STARTING`/`ACTIVE`/`PAUSED`/`ERROR`/`UNAVAILABLE`/`STOPPED`, pausa e retomada foreground-only cobertas em `test/localizacao.test.js` |
| Workflow Mobile Release artifact-only | run `33121937373` aprovado; APK debug e AAB não assinado baixados, tipos e SHA-256 registrados em `MOBILE_V2_RELEASE.md`; etapa de publicação pulada |
| Controlador background local | Node: aprovado; opt-in nativo, normalização, reentrada, stop, callbacks tardios, erro, desmontagem e fallback Web em `test/background-localizacao.test.js` |
| Manifesto Android do APK desta rodada | aprovado; `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`, `WAKE_LOCK` e serviço `foregroundServiceType=location`; receivers de geofence/boot desabilitados e `ACCESS_BACKGROUND_LOCATION` ausente |

## Procedimento de registro

Para cada caso, anotar aparelho/modelo/versão do sistema, versão do app, rede, bateria inicial/final, horário, resultado, mensagem exibida e evidência local. Para T-021–T-030, registrar também se a notificação foi permitida, se o serviço foi interrompido pelo SO/fabricante e se houve lacunas temporais. Não concluir que a trilha foi contínua apenas porque o app reabriu. Não registrar CPF, coordenadas ou dados pessoais em relatório compartilhado sem necessidade. O plano da peregrinação em `docs/PLANO-TESTE-PEREGRINACAO-CAMINHOS-DOS-ANJOS-2026-09.md` continua sendo planejamento de campo, não gatilho de release.
