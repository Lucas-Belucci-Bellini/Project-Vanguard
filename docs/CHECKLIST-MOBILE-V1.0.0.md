# Checklist de Validação Mobile — v1.0.0

Este checklist detalha os critérios de aceite obrigatórios para dispositivos móveis reais (Android e iOS) antes da aprovação da tag final `v1.0.0`. A validação deve ocorrer em hardware físico, pois emuladores não simulam corretamente a perda de sinal, o comportamento térmico ou a suspensão de processos em segundo plano.

## 1. Android (Geral e Xiaomi/HyperOS)

A validação em Android deve incluir um aparelho padrão (ex: Samsung/Motorola) e um aparelho com gerenciamento agressivo de bateria (ex: Xiaomi com MIUI ou HyperOS).

| Categoria | Critérios de Aceite |
|---|---|
| **Instalação e Permissões** | O aplicativo deve solicitar a permissão de localização apenas quando o usuário ativar o GPS explicitamente. Em caso de recusa, o sistema deve exibir a mensagem "PERMISSÃO NEGADA" sem causar travamentos. |
| **Ciclo de Vida e Bateria** | O modo "Cidade" deve reduzir a frequência de atualização do GPS, enquanto o modo "Trilha" deve manter a alta precisão durante a gravação. Ao minimizar o aplicativo com uma rota ativa, registrar o estado mostrado no Diagnóstico (`FOREGROUND`/`BACKGROUND`) e observar se a gravação ou renderização é suspensa; não tratar a observação de lifecycle como garantia de GPS contínuo. Qualquer ajuste de bateria deve ser específico, consentido e documentado, sem recomendar desativação indiscriminada das proteções do sistema. |
| **Armazenamento e Cache** | Os tiles preparados para uso offline devem persistir após o fechamento e a reabertura do aplicativo. A exportação de JSON e GPX deve salvar os arquivos em um diretório acessível (Downloads ou Documentos). A importação deve conseguir ler os arquivos armazenados no dispositivo. |
| **Atualização confirmada** | Publicar uma versão de teste posterior, abrir o app conectado e confirmar que o botão **ATUALIZAÇÃO PRONTA** ou **ATUALIZAÇÃO · vX.Y.Z** aparece. Tocar nele deve pedir confirmação; no PWA, ativar o service worker pendente e recarregar. No APK, abrir a página oficial e deixar a instalação para a confirmação nativa. Sem rede, o botão não deve impedir o uso offline. |
| **Sensores** | A bússola (magnetômetro e giroscópio) deve responder corretamente aos movimentos físicos do aparelho. |

## 2. iOS (iPhone)

A validação no iOS exige a compilação do projeto Capacitor no Xcode usando um Mac.

| Categoria | Critérios de Aceite |
|---|---|
| **Compilação e Assinatura** | O projeto `ios/` deve compilar sem erros críticos no Xcode e permitir assinatura para instalação em um iPhone físico, seja via cabo ou TestFlight. |
| **Permissões e Privacidade** | O prompt nativo do iOS para localização (Precisa ou Aproximada) deve ser exibido. Se o usuário escolher a localização aproximada, o aplicativo deve continuar operando de forma segura, informando a baixa precisão sem apresentar falhas. |
| **Ciclo de Vida em Background** | A gravação da trilha deve ser avaliada com a tela bloqueada. O Diagnóstico deve registrar a mudança de estado observada, sem afirmar execução contínua. Como o iOS restringe severamente o GPS em background, deve-se verificar a necessidade de configurar `UIBackgroundModes` no `Info.plist` somente após requisito, privacidade e validação nativa. Se a gravação for interrompida, essa limitação deve ser documentada explicitamente. |
| **Armazenamento e Quota** | A exportação de arquivos deve acionar a Share Sheet nativa ou salvar no aplicativo Arquivos (Files). O cache de tiles no WKWebView deve suportar a cota planejada de 256 URLs sem ser expurgado silenciosamente pelo gerenciamento de espaço do iOS. |

## 3. Testes Comuns (Ambas as Plataformas)

| Cenário de Teste | Procedimento e Resultado Esperado |
|---|---|
| **Modo Offline Real** | Com o aparelho em Modo Avião e Wi-Fi desligado, fechar totalmente o aplicativo e reabri-lo. A interface (shell) deve carregar imediatamente. O manual de sobrevivência deve permitir leitura e buscas. O mapa deve exibir os tiles previamente cacheados sem tentar conexões externas ou apresentar travamentos. |
| **Idade do Fixo (Frescor)** | Após obter um fixo GPS válido, isolar o aparelho do sinal (usando subsolo, gaiola de Faraday ou bloqueio físico). O HUD do mapa deve atualizar continuamente a idade da posição (por exemplo, "há 2 min") e transitar para o estado visual de alerta (âmbar) assim que o fixo ultrapassar cinco minutos de defasagem. |
| **Acessibilidade** | Utilizar teclado quando disponível e os leitores de tela nativos (TalkBack no Android, VoiceOver no iOS) para navegar pela interface. Verificar o link **Pular para o conteúdo principal**, foco visível, foco no `<main>` após troca de rota, nomes dos botões principais, HUD de coordenadas e textos de alerta do Modo Socorro. Tudo deve ser lido de forma clara e compreensível. |

## Critério de Bloqueio

Qualquer falha nos itens de **Ciclo de Vida**, **Modo Offline Real**, **Idade do Fixo** ou **Atualização confirmada** bloqueia a release `v1.0.0`. Falhas de background no iOS devem ser corrigidas no projeto Capacitor ou documentadas explicitamente como limitações conhecidas no README antes da publicação.
