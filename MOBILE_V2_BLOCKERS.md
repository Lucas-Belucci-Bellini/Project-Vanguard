# Vanguard Field — MOBILE V2 BLOCKERS

> Bloqueio significa ausência de evidência necessária ou de integração real; não é convite para inventar capacidade.

| Bloqueio | Impacto | Evidência faltante | Condição de desbloqueio |
|---|---|---|---|
| Android físico | permissões, GPS, touch, lifecycle, modo avião, Files/Share e update não verificados | aparelho Android com instalação do APK | executar `docs/CHECKLIST-MOBILE-V1.0.0.md` e anexar logs/capturas reais |
| Xiaomi/MIUI/HyperOS | políticas de bateria e suspensão podem diferir | aparelho Xiaomi compatível | repetir foreground, troca de app, tela bloqueada e operação econômica sem recomendar desativação indiscriminada de proteções |
| iPhone/iPad | build, permissões, sensor, storage, share e lifecycle não verificados | macOS/Xcode, conta Apple e dispositivo | compilar, assinar para teste, instalar e executar a matriz iOS |
| Background GPS | experimento nativo integrado, mas sem prova de continuidade após tela bloqueada/encerramento; Android/Xiaomi/iOS ainda não verificados | aparelho Android comum, Xiaomi/MIUI/HyperOS e iPhone/iPad; permissões, notificação, consumo, lacunas e retomada | executar T-021–T-030; somente reclassificar após evidência física. Manter `EXPERIMENTAL`/`DEVICE DEPENDENT`; não adicionar `ACCESS_BACKGROUND_LOCATION`, geofence, auto-boot ou envio remoto por hipótese |
| Bateria de quatro dias | o background tracking aumenta consumo e a autonomia não foi medida | medição comparável com foreground, tela bloqueada, serviço ativo, temperatura e recepção | seguir `docs/OPERACAO-BATERIA-GPS-4-DIAS.md`, registrar carga/horários e nunca prometer quatro dias |
| Offline físico | Cache Storage/localStorage e tiles preparados não foram confirmados em modo avião/quota real | teste no aparelho, inclusive área preparada | preparar online, verificar status, ativar modo avião, reabrir, navegar e registrar resultado |
| Bússola física | disponibilidade, calibração e orientação variam por aparelho/browser | sensor magnético real | executar o roteiro do checklist; manter `BROWSER DEPENDENT`/`DEVICE DEPENDENT` quando ausente |
| Update posterior | só há política e fluxo de confirmação; não há release posterior controlada | segundo artefato/release em ambiente de teste | publicar uma versão posterior deliberada, instalar a anterior e comprovar confirmação/negação sem auto-instalação |
| Signing/distribuição | APK debug não é release; iOS não foi assinado | keystore, credenciais Apple e processo de distribuição | autorização explícita, ambiente seguro, revisão de versão e validação de distribuição |
| Dados externos | pagamentos, Asaas, Supabase, e-mail, alertas e resgate não estão configurados | conta, credenciais e autorização | permanecer `NOT_CONFIGURED` até setup real; não simular confirmação fiscal, SOS ou resgate |

## Não são blockers de código desta rodada

O controlador `src/core/background-localizacao.js`, a integração do mapa e o manifesto nativo foram implementados localmente nesta unidade; os testes Node e o APK debug passaram, mas a validação física ainda não existe. A correção de `statusPosicao()` para reconhecer `lat/lon` foi publicada e testada no commit `f9da500`. O diagnóstico continua sendo observabilidade local, não prova de sinal, cobertura, comunicação, entrega de mensagem ou resgate.
