# Simulação Controlada do Modo Socorro

Este documento estabelece o procedimento seguro para testar o **Modo Socorro** do Vanguard Field sem gerar falsos alertas, sem acionar equipes de resgate e sem disparar comunicações automáticas indevidas.

## Princípio da Simulação

O Vanguard Field **não possui envio automático de SOS** e **não se conecta diretamente a serviços de emergência (190, 193, 112, 911, etc.)**. O aplicativo atua apenas como um organizador local de dados. Portanto, o teste consiste em verificar a precisão da coleta, a clareza do pacote de texto gerado e o funcionamento da interface de compartilhamento manual do sistema operacional.

## Procedimento de Teste

| Etapa | Ação | Resultado Esperado |
|---|---|---|
| **1. Obtenção do Fixo** | Na tela inicial, toque em **Modo Socorro →**. Em seguida, toque em **ATUALIZAR GPS**. | O aplicativo deve exibir a latitude/longitude, a conversão para MGRS, a precisão e o horário da leitura. O botão ficará temporariamente desabilitado enquanto busca o sinal. |
| **2. Preparação Local** | Com a posição na tela, toque em **PREPARAR ALERTA LOCAL**. | O status muda para "ALERTA PREPARADO NO APARELHO". Um timestamp de criação do pacote é exibido. Nenhuma mensagem é enviada a terceiros neste momento. |
| **3. Acionamento do Compartilhamento** | Toque em **COMPARTILHAR COORDENADAS**. | O sistema operacional do celular deve abrir a gaveta de compartilhamento (Share Sheet) ou copiar o texto para a área de transferência. O Vanguard atualizará o status interno para indicar que o pacote foi exposto ao sistema. |
| **4. Destino Controlado** | Na gaveta de compartilhamento do celular, escolha um aplicativo de notas, envie um e-mail para si mesmo ou mande uma mensagem para um contato de teste previamente avisado. | O texto colado deve conter a estrutura padronizada: "VANGUARD FIELD", MGRS, LAT/LON, PRECISÃO e HORÁRIO. |
| **5. Cancelamento** | Volte ao Vanguard Field e toque em **CANCELAR**. | O alerta local é descartado. O aplicativo informa que nenhuma mensagem foi enviada por ele. |

## O que NÃO fazer durante o teste

- **Não** envie o pacote para grupos públicos ou contatos que não estejam cientes do teste.
- **Não** utilize canais de rádio VHF/UHF de emergência para ler as coordenadas de teste, a menos que esteja em um exercício simulado autorizado pela autoridade local.
- **Não** acione mensageiros via satélite (como Garmin inReach, Zoleo, Spot) usando a função SOS de hardware; se for testar a digitação do texto, envie apenas uma mensagem comum (check-in) para um familiar.

## Critérios de Aceite para a v1.0.0

A funcionalidade será considerada validada para a release se:
1. O texto gerado for legível e contiver os dados exatos exibidos na tela.
2. A conversão MGRS estiver correta para a latitude/longitude fornecida.
3. O aplicativo deixar claro, em texto visível, que o pacote foi apenas compartilhado com o sistema operacional e que a entrega/acionamento de equipe não está confirmada.
