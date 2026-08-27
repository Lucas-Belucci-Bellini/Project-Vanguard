# Checklist de Validação Mobile — v1.0.0

Este checklist detalha os critérios de aceite obrigatórios para dispositivos móveis reais (Android e iOS) antes da aprovação da tag final `v1.0.0`. A validação deve ocorrer em hardware físico, pois emuladores não simulam corretamente a perda de sinal, o comportamento térmico ou a suspensão de processos em segundo plano.

## 1. Android (Geral e Xiaomi/HyperOS)

A validação em Android deve incluir um aparelho padrão (ex: Samsung/Motorola) e um aparelho com gerenciamento agressivo de bateria (ex: Xiaomi com MIUI ou HyperOS).

| Categoria | Critérios de Aceite |
|---|---|
| **Instalação e Permissões** | O aplicativo deve solicitar a permissão de localização apenas quando o usuário ativar o GPS explicitamente. Em caso de recusa, o sistema deve exibir a mensagem "PERMISSÃO NEGADA" sem causar travamentos. |
| **Ciclo de Vida e Bateria** | O modo "Cidade" deve reduzir a frequência de atualização do GPS, enquanto o modo "Trilha" deve manter a alta precisão durante a gravação. Ao minimizar o aplicativo com uma rota ativa, o sistema operacional (especialmente MIUI/HyperOS) não deve matar o processo imediatamente; se necessário, documentar a exigência de ignorar a otimização de bateria. A renderização do MapLibre deve pausar corretamente em segundo plano. |
| **Armazenamento e Cache** | Os tiles preparados para uso offline devem persistir após o fechamento e a reabertura do aplicativo. A exportação de JSON e GPX deve salvar os arquivos em um diretório acessível (Downloads ou Documentos). A importação deve conseguir ler os arquivos armazenados no dispositivo. |
| **Sensores** | A bússola (magnetômetro e giroscópio) deve responder corretamente aos movimentos físicos do aparelho. |

## 2. iOS (iPhone)

A validação no iOS exige a compilação do projeto Capacitor no Xcode usando um Mac.

| Categoria | Critérios de Aceite |
|---|---|
| **Compilação e Assinatura** | O projeto `ios/` deve compilar sem erros críticos no Xcode e permitir assinatura para instalação em um iPhone físico, seja via cabo ou TestFlight. |
| **Permissões e Privacidade** | O prompt nativo do iOS para localização (Precisa ou Aproximada) deve ser exibido. Se o usuário escolher a localização aproximada, o aplicativo deve continuar operando de forma segura, informando a baixa precisão sem apresentar falhas. |
| **Ciclo de Vida em Background** | A gravação da trilha deve ser avaliada com a tela bloqueada. Como o iOS restringe severamente o GPS em background, deve-se verificar a necessidade de configurar `UIBackgroundModes` no `Info.plist`. Se a gravação for interrompida, essa limitação deve ser documentada explicitamente. |
| **Armazenamento e Quota** | A exportação de arquivos deve acionar a Share Sheet nativa ou salvar no aplicativo Arquivos (Files). O cache de tiles no WKWebView deve suportar a cota planejada de 256 URLs sem ser expurgado silenciosamente pelo gerenciamento de espaço do iOS. |

## 3. Testes Comuns (Ambas as Plataformas)

| Cenário de Teste | Procedimento e Resultado Esperado |
|---|---|
| **Modo Offline Real** | Com o aparelho em Modo Avião e Wi-Fi desligado, fechar totalmente o aplicativo e reabri-lo. A interface (shell) deve carregar imediatamente. O manual de sobrevivência deve permitir leitura e buscas. O mapa deve exibir os tiles previamente cacheados sem tentar conexões externas ou apresentar travamentos. |
| **Idade do Fixo (Frescor)** | Após obter um fixo GPS válido, isolar o aparelho do sinal (usando subsolo, gaiola de Faraday ou bloqueio físico). O HUD do mapa deve atualizar continuamente a idade da posição (por exemplo, "há 2 min") e transitar para o estado visual de alerta (âmbar) assim que o fixo ultrapassar cinco minutos de defasagem. |
| **Acessibilidade** | Utilizar os leitores de tela nativos (TalkBack no Android, VoiceOver no iOS) para navegar pela interface. Os botões principais, o HUD de coordenadas e os textos de alerta do Modo Socorro devem ser lidos de forma clara e compreensível. |

## Critério de Bloqueio

Qualquer falha nos itens de **Ciclo de Vida**, **Modo Offline Real** ou **Idade do Fixo** bloqueia a release `v1.0.0`. Falhas de background no iOS devem ser corrigidas no projeto Capacitor ou documentadas explicitamente como limitações conhecidas no README antes da publicação.
