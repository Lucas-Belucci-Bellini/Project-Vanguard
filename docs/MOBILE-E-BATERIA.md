# Builds móveis e consumo de bateria

## Apple — orientação registrada

A documentação oficial da Apple recomenda escolher o serviço de localização mais eficiente que atenda ao caso de uso. O serviço de visitas é o mais econômico; o de mudanças significativas tem baixo consumo e usa rádios celular/Wi‑Fi; o serviço padrão oferece maior precisão e regularidade, mas consome mais energia e deve ficar reservado para navegação contínua ou quando a frequência/precisão for necessária.

A mesma orientação recomenda desligar a localização quando não houver necessidade de novas leituras, escolher o maior `distanceFilter` aceitável, usar a menor `desiredAccuracy` que atenda ao recurso, permitir pausas automáticas e deixar `allowsBackgroundLocationUpdates` desativado quando o app não precisar continuar em segundo plano. A Apple também documenta `NSLocationDefaultAccuracyReduced` para casos em que precisão menor é suficiente.

No Vanguard, a consequência será separar claramente três estados: consulta pontual, caminhada/uso urbano econômico e trilha ativa. A trilha ativa pode usar localização mais precisa enquanto a pessoa explicitamente grava a rota; ao pausar, sair da tela ou parar de se mover, o app deve reduzir ou interromper leituras. A transmissão de SOS, se existir, será uma função separada e opt-in.

Fonte: [Apple Developer — Getting the current location of a device](https://developer.apple.com/documentation/corelocation/getting-the-current-location-of-a-device)

## Android — orientação registrada

A documentação oficial do Android informa que a localização em segundo plano pode afetar significativamente a bateria. As limitações do sistema reduzem a frequência de coleta e tornam geofencing menos responsivo para economizar energia. O Vanguard deve pedir localização em segundo plano somente quando a pessoa iniciar explicitamente uma rota que realmente precise disso.

No Android e em aparelhos Xiaomi, o produto deve oferecer modo econômico com menor precisão quando a pessoa estiver parada, atualizações espaçadas quando estiver em caminhada urbana, alta precisão somente durante uma trilha ativa e pausa imediata quando a rota for pausada. A interface deve explicar que o usuário pode precisar autorizar a execução em segundo plano para uma trilha contínua, mas não deve pedir essa permissão no primeiro carregamento.

Fonte: [Android Developers — About background location and battery life](https://developer.android.com/develop/sensors-and-location/location/battery)

## Política comum de energia

| Estado | Localização | Mapa e sensores | Transmissão |
|---|---|---|---|
| Consulta pontual | Uma leitura e encerra | Interface normal | Nenhuma |
| Cidade | Precisão equilibrada e atualizações espaçadas | Sem renderização contínua quando parado | Nenhuma |
| Trilha ativa | Precisão alta somente com rota iniciada | Mapa ativo; registrar apenas deslocamentos relevantes | Somente se o usuário confirmar e houver canal |
| Rota pausada | Interrompida ou reduzida | Mapa pode ser pausado | Nenhuma |
| Emergência | Preserva última posição local | Mostra pacote preparado | Tenta canal externo apenas com confirmação |

No mapa atual, a tela inicia o acompanhamento no perfil `cidade`, mesmo que o contexto escolhido seja Trilha/Expedição. O perfil `trilha` só é ativado quando a pessoa toca em **INICIAR ROTA** e retorna ao perfil econômico ao pausar ou limpar a rota. A vigília de tela é opcional, fica disponível apenas durante rota ativa e é liberada ao terminar; quando o mapa fica oculto, as atualizações visuais são interrompidas e retomadas ao voltar para a tela.

Esses estados são uma decisão de produto, não uma promessa de duração de bateria. A autonomia final varia conforme aparelho, temperatura, recepção GNSS, brilho, mapa, rede, sensores e otimizações do sistema.
