# Roteiro de teste físico — GPS em segundo plano

> **Classificação:** teste experimental local, não resgate, não comunicação de emergência e não prova de autonomia de quatro dias. O GPS posiciona e registra; ele não transmite sua localização.

## Objetivo

Verificar se o APK debug do Vanguard Field consegue continuar recebendo e guardando pontos localmente enquanto uma rota está ativa e a tela está bloqueada. O teste deve medir o comportamento real do aparelho, do sistema operacional e do fabricante. Um resultado positivo em um aparelho não autoriza afirmar o mesmo em outro modelo, Xiaomi/MIUI/HyperOS, iPhone ou iPad.

## Antes de sair

Carregue o telefone e o power bank. Leve uma forma independente de comunicação e não dependa do aplicativo para pedir ajuda. Instale apenas o APK debug de teste obtido por canal controlado; confira que o aplicativo exibido é **Vanguard Field**, que a versão é `1.0.0` e que o aparelho não está usando uma versão antiga. Não instale em um telefone sem backup ou sem possibilidade de desinstalação.

Com internet disponível, abra o Mapa e prepare somente a área necessária para o percurso. Confirme o status da preparação, reabra o app e exporte um JSON e um GPX de qualquer registro existente antes de iniciar. A preparação de tiles é cache técnico limitado; ela não significa mapa mundial offline nem substitui carta, sinalização, autoridade ou conhecimento local.

Registre os dados abaixo antes do teste. Não envie coordenadas pessoais ou o arquivo bruto para issue, commit, GitHub ou relatório compartilhado; mantenha a evidência local e redija apenas resultados agregados se decidir contribuir depois.

| Campo | Registro |
|---|---|
| Data/hora de início e fim | preencher |
| Modelo e fabricante | preencher |
| Android/MIUI/HyperOS ou iOS | preencher |
| Versão do app | `1.0.0` nesta rodada |
| Bateria inicial/final | preencher |
| Economia de bateria ativa? | sim/não + política observada |
| Permissão de localização | concedida/negada/precisa revisar |
| Permissão de notificação Android | concedida/negada/não aplicável |
| Rede no início e durante o teste | preencher; usar modo avião somente no caso específico |
| Número de pontos antes/depois | preencher |
| Primeiro/último timestamp e lacunas | preencher |

## Execução controlada de 10–20 minutos

Primeiro, deixe o aparelho em local aberto por alguns minutos e aguarde um fixo com latitude/longitude, precisão e idade visíveis. Em seguida, abra **Mapa**, inicie **INICIAR ROTA** e verifique que o contador local começou. Toque em **ATIVAR GPS EM 2º PLANO**. Leia o aviso e confirme somente se aceitar o consumo maior, a notificação persistente e a possibilidade de interrupção do sistema. Recuse a confirmação para verificar que nada começa silenciosamente.

Depois que o status mostrar **GPS em segundo plano ativo**, confirme visualmente a notificação do sistema e bloqueie a tela. Caminhe por um trajeto curto e conhecido durante 10–20 minutos. Não altere permissões, não force o encerramento e não ative economia extrema no meio deste caso; essas variações pertencem aos casos separados da matriz. Anote horário aproximado, bateria, condições de recepção e qualquer notificação de interrupção.

Desbloqueie o aparelho, reabra o app se necessário e verifique a trilha. Use **PARAR GPS EM 2º PLANO** e depois **PARAR E GUARDAR**. Confira que os pontos continuam no aparelho, que a rota não foi enviada automaticamente, que timestamps e precisão estão presentes e que o número de pontos não aumentou depois da parada. Exporte JSON e GPX usando a ação explícita do sistema e inspeccione os arquivos localmente.

## Casos adicionais

Repita em sessões separadas, sem misturar conclusões:

| Caso | Procedimento | O que registrar |
|---|---|---|
| Permissão de localização negada | negar a permissão quando o sistema pedir e tentar iniciar | estado exibido, ausência de pontos falsos e possibilidade de corrigir em Configurações |
| Notificação negada no Android 13+ | negar somente a notificação e observar o comportamento do serviço | mensagem, se o serviço inicia ou falha e qualquer aviso do sistema; não ocultar a ausência de transparência |
| GPS desligado | desativar localização antes ou durante a sessão | estado `ERRO`/`INDISPONÍVEL`, timestamp do último ponto e retorno após reativar |
| Home/Recents | enviar o app para segundo plano e retornar sem forçar encerramento | continuidade, lacunas e estado da notificação |
| Modo avião | preparar a área antes, ativar modo avião e repetir uma sessão curta | pontos locais, exportação e ausência de dependência de rede; não concluir cobertura cartográfica geral |
| Xiaomi/MIUI/HyperOS | repetir sem instruir bypass indiscriminado de proteções | versão do sistema, política de bateria, auto-start configurado pelo usuário e interrupção observada |
| Limpar trilha | iniciar uma sessão com rota ativa e usar `LIMPAR TRILHA` | serviço encerrado, pontos removidos somente após ação explícita e ausência de callback posterior |

O caso de encerramento forçado pelo gerenciador de tarefas deve ser tratado como interrupção deliberada: não se deve esperar que a WebView reidrate pontos não entregues. Registre a lacuna e não a preencha manualmente. O sistema não implementa recuperação de sessão após morte do processo.

## Critérios de interpretação

Considere o teste **inconclusivo** se não houver fixo válido, se a contagem não puder ser conferida, se o horário do dispositivo estiver incorreto ou se o arquivo exportado não puder ser aberto e inspecionado. Considere o background **interrompido** se houver lacuna relevante, mudança para `ERRO`, ausência de notificação esperada, encerramento do serviço ou retomada somente após voltar ao foreground. Nunca transforme uma sessão sem pontos em uma trilha contínua.

Mesmo que uma sessão de 20 minutos funcione, isso demonstra apenas o cenário e o aparelho testados. Não demonstra quatro dias de autonomia, cobertura GPS em todos os terrenos, precisão de prédio, resgate, comunicação ou suporte iOS. A próxima caminhada deve usar bateria externa, planejamento, previsão oficial e comunicação independente.

## Depois do teste

Guarde os arquivos JSON/GPX localmente e, se desejar ajudar o projeto, faça isso somente depois de encerrar a rota. A contribuição é voluntária, manual, com escopo escolhido e confirmação final; prefira relatório agregado/redigido e nunca envie automaticamente coordenadas ou dados brutos ao GitHub. Para esta rodada, não há fluxo de upload, branch pessoal, token no APK ou sincronização Supabase.

Registre o resultado no formulário local com `PASSOU`, `INTERROMPIDO`, `FALHOU` ou `INCONCLUSIVO`, acompanhado de modelo, versão, bateria, permissões, contagem e lacunas. O código continua `EXPERIMENTAL`/`DEVICE DEPENDENT` até que haja evidência suficiente em aparelhos reais.

## Referências

[1]: https://developer.android.com/develop/background-work/services/fgs/service-types#location — Android Developers, “Foreground service types: location”.

[2]: https://developer.apple.com/documentation/corelocation/handling_location_updates_in_the_background — Apple Developer Documentation, “Handling location updates in the background”.

[3]: https://github.com/Cap-go/capacitor-background-geolocation — Capgo, “capacitor-background-geolocation”.
