# Operação de bateria e GPS — caminhada de quatro dias

Este guia descreve como preparar e observar o Vanguard Field durante uma caminhada longa. Ele não promete rastreamento contínuo com a tela bloqueada: navegadores, Android, MIUI/HyperOS e iOS podem suspender JavaScript ou localização em segundo plano. A rota oficial, o grupo, a sinalização e um meio independente de comunicação continuam sendo a referência operacional.

## O que o aplicativo faz hoje

| Situação | Política atual |
|---|---|
| **Cidade / dia a dia** | Perfil econômico, com `maximumAge` de 15 segundos e distância mínima configurada. |
| **Trilha ativa** | Perfil de maior precisão, com `maximumAge` de 3 segundos; a frequência real é decidida pelo sistema operacional e não é um intervalo garantido. |
| **Rota pausada ou limpa** | Retorna ao perfil econômico e libera a vigília de tela. |
| **Tela oculta** | A renderização visual do mapa é pausada; isso não garante que o sistema manterá o GPS em segundo plano. |
| **Manter tela ativa** | Opção voluntária, disponível somente com rota ativa; aumenta o consumo e deve ser usada apenas quando necessária. |

## Preparação 48 horas antes

Faça um ciclo curto de teste com o mesmo aparelho, capa, powerbank, brilho e configuração de localização que serão usados na caminhada. Anote a porcentagem de bateria no início, depois de 30 minutos de rota ativa, após 30 minutos com a rota pausada e ao final. Repita com a tela bloqueada para observar se o sistema mantém ou suspende as leituras.

Prepare o mapa online, exporte um JSON e um GPX, faça uma importação controlada e mantenha cópias externas. Instale a versão que será usada antes da saída; não conte com uma atualização de última hora em região remota. Verifique espaço livre, cabo, powerbank, carregador e a abertura dos arquivos exportados.

## Coleta de evidências

No Android com ADB autorizado, a equipe pode registrar uma linha de base e um resultado final sem alterar o aplicativo:

```bash
adb shell dumpsys batterystats --reset
adb shell dumpsys battery
adb shell dumpsys location
# executar a rota controlada por um período conhecido
adb shell dumpsys batterystats > batterystats-vanguard-field.txt
adb shell dumpsys battery > battery-final-vanguard-field.txt
adb shell dumpsys location > location-final-vanguard-field.txt
```

Guardar a hora, o modelo, a versão do sistema, o brilho, o modo de localização e se a tela estava bloqueada junto dos arquivos. No iPhone, usar **Ajustes > Bateria** para comparar o consumo por aplicativo e registrar manualmente os horários; para uma análise de engenharia, usar o Instruments do Xcode no Mac. Esses registros ajudam a comparar aparelhos, mas não produzem uma garantia universal de autonomia.

## Configuração Android e Xiaomi

Conceda a localização quando o aplicativo solicitar. Em um Android comum, observe se a rota ativa continua registrando depois de bloquear a tela e ao trocar temporariamente de aplicativo. Em Xiaomi com MIUI/HyperOS, registre se a otimização de bateria encerra o processo; se isso ocorrer, aplique somente a exceção específica para o Vanguard Field e documente a configuração utilizada. Não desative proteções globais nem autorize acesso irrestrito sem necessidade.

Durante a rota, use **Trilha / Expedição** apenas quando quiser registrar o trecho. Pause em paradas longas, bloqueie a tela quando não precisar consultar o mapa e retorne ao aplicativo em pontos seguros para conferir a idade do fixo. Registre a bateria no início, em cada pausa importante, após retomar e no fim do dia.

## Configuração iPhone

A compilação iOS final ainda depende de macOS, Xcode, conta Apple e assinatura. O projeto atual não declara `UIBackgroundModes` de localização nem permite afirmar rastreamento contínuo com a tela bloqueada. Portanto, teste o comportamento real no iPhone que será usado e trate qualquer interrupção em segundo plano como bloqueio de release ou limitação explícita documentada.

No iPhone, conceda somente a permissão necessária e confirme se o sistema mantém a precisão escolhida. Não mantenha a tela acesa por horas apenas para compensar uma limitação não testada; planeje pausas seguras para conferir a posição e mantenha orientação redundante.

## Protocolo durante os quatro dias

| Momento | Registro mínimo |
|---|---|
| **Saída** | Bateria, modo escolhido, hora, fixo GPS, precisão, MGRS e idade exibida. |
| **A cada pausa segura** | Bateria, rota ativa/pausada, última idade do fixo, funcionamento do mapa preparado e presença do aparelho no grupo. |
| **Retomada** | Confirmar fixo novo, precisão e que o contador de idade volta a avançar de maneira coerente. |
| **Final do dia** | Pausar rota, exportar backup se estiver em local seguro, anotar consumo e carregar os aparelhos. |
| **Antes de uma decisão** | Conferir MGRS, latitude/longitude, precisão e frescor. Se a posição estiver antiga ou incoerente, parar e confirmar com pessoas, sinalização e organização. |

Não faça a caminhada inteira em modo de alta precisão sem medir o consumo. O GPS do telefone pode continuar funcionando sem internet, mas tiles não preparados, avisos novos, sincronização e comunicação externa continuam indisponíveis. Um powerbank deve ser testado e dimensionado para o aparelho real; nenhuma autonomia universal pode ser prometida.

## Critério de interrupção

Interrompa o teste de campo se o aparelho aquecer excessivamente, perder a capacidade de comunicação planejada, ficar sem bateria de reserva, mostrar uma posição antiga sem atualização ou contradizer a sinalização e a orientação do grupo. O Vanguard Field é apoio à navegação; não é uma autorização para continuar em uma rota insegura.
