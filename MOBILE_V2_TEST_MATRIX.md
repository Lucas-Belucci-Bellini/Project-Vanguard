# Vanguard Field — MOBILE V2 TEST MATRIX

> A matriz separa o que pode ser provado no Node/preview do que exige execução em dispositivo. Um build verde não equivale a `VERIFIED`.

| ID | Cenário | Android comum | Xiaomi/MIUI/HyperOS | iPhone/iPad | Evidência de aceite |
|---|---|---:|---:|---:|---|
| T-001 | Instalação e abertura | PENDENTE | PENDENTE | PENDENTE | app abre sem crash e mostra Vanguard Field |
| T-002 | Permissão GPS concedida | PENDENTE | PENDENTE | PENDENTE | estado concedido, fixo válido, precisão visível |
| T-003 | Permissão GPS negada/restrita | PENDENTE | PENDENTE | PENDENTE | `PERMISSÃO NEGADA`/estado equivalente e fallback sem crash |
| T-004 | GPS desligado ou sem sinal | PENDENTE | PENDENTE | PENDENTE | erro compreensível; nenhum fixo inventado |
| T-005 | Fixo antigo/frescor | PENDENTE | PENDENTE | PENDENTE | HUD/diagnóstico distinguem posição atual, antiga e inválida |
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

## Cobertura automatizada atual

| Área | Resultado |
|---|---|
| Contratos GPS, normalização, frescor e distância | Node: aprovado |
| Diagnóstico, inclusive posição persistida `lat/lon` | Node: aprovado; regressão publicada em `f9da500` |
| Capacidades observáveis | Node: aprovado; GPS/orientação/storage/rede/bateria/compartilhamento e estados `AVAILABLE`/`UNAVAILABLE`/`DENIED`/`NOT_SUPPORTED` cobertos em `test/capacidades.test.js` |
| Planner e filtro do Service Worker | Node/VM: aprovado; limite defensivo de 256 URLs |
| Build web e sintaxe do Service Worker | aprovado |
| Sync Capacitor Android/iOS | aprovado no ambiente Linux |
| APK debug | `BUILD SUCCESSFUL`; artifact de teste |
| Estados do watcher GPS | Node: `STARTING`/`ACTIVE`/`PAUSED`/`ERROR`/`UNAVAILABLE`/`STOPPED`, pausa e retomada foreground-only cobertas em `test/localizacao.test.js` |
| Workflow Mobile Release artifact-only | run `33121937373` aprovado; APK debug e AAB não assinado baixados, tipos e SHA-256 registrados em `MOBILE_V2_RELEASE.md`; etapa de publicação pulada |

## Procedimento de registro

Para cada caso, anotar aparelho/modelo/versão do sistema, versão do app, rede, bateria inicial/final, horário, resultado, mensagem exibida e evidência local. Não registrar CPF, coordenadas ou dados pessoais em relatório compartilhado sem necessidade. O plano da peregrinação em `docs/PLANO-TESTE-PEREGRINACAO-CAMINHOS-DOS-ANJOS-2026-09.md` continua sendo planejamento de campo, não gatilho de release.
