# Mapa de funcionalidades do Vanguard Field

## Objetivo do documento

Este documento transforma a visão do usuário em um contrato de produto verificável. Cada capacidade é classificada como **implementada**, **preparada**, **dependente de fonte ou equipamento externo** ou **não deve ser simulada**. Assim, o projeto não confunde uma interface de mapa com uma capacidade de comunicação, detecção ou resgate que o celular não possui.

## Visão consolidada

O Vanguard Field é um navegador multiuso para cidade, caminhada, expedição, mar e proteção civil. Seu núcleo offline mantém a posição, a orientação, as rotas, os pontos, os destinos e o conteúdo local no aparelho. Quando há uma fonte oficial ou um equipamento compatível, o sistema pode incorporar o dado com origem, data, unidade, confiança e estado de transmissão.

## Cobertura dos requisitos descritos

| Requisito da visão | Estado | O que existe ou será feito | Dependência e limite |
|---|---|---|---|
| GPS para uso urbano no dia a dia | **Implementado** | Destino por coordenadas ou toque no mapa, distância, rumo, pontos e rota local. | O GPS calcula posição; o mapa online depende de tiles disponíveis ou pré-baixados. |
| GPS para caminhadas e montanhas | **Implementado** | Trilha, pausa, retomada, pontos de referência, bússola e grade MGRS. | Deve haver plano de retorno, bateria e conferência de mapa. |
| Ver e exportar fotos de parada | **Implementado** | Visor dentro do app; no APK a foto também vai para a galeria do celular; botão de pacote gera um ZIP com fotos, CSV de coordenadas, registro JSON e GPX pelo menu de compartilhar (ADR-0039). | A gravação na galeria depende do sistema — o app só afirma que salvou quando o sistema confirma. O aplicativo não envia nada sozinho: o destino do pacote é escolha da pessoa. |
| Cronômetro do trajeto | **Implementado** | Início, fim e paradas de descanso/pernoite; total, tempo em marcha e tempo de descanso separados (ADR-0038). | Tempo em marcha é o total menos o descanso, não medição de movimento: ficar parado sem marcar parada continua contando como marcha. |
| Separação a pé × veículo | **Implementado em versão inicial** | A velocidade sugere o modo, a tela pergunta e a confirmação da pessoa vence a inferência (ADR-0038). | O aparelho não sabe que é um ônibus; ele sabe a velocidade. Ônibus parado parece pedestre e ladeira abaixo parece veículo. |
| Alerta de exposição ao sol | **Implementado em versão inicial** | Altura do sol calculada offline e tempo sem parada; vibra em nível alto e crítico (ADR-0038). | **O celular não mede temperatura do ar.** Sem fonte externa recente, o alerta usa só sol e relógio; não é diagnóstico de insolação. |
| Foto de parada com posição | **Implementado** | Botão **Foto da parada** guarda a imagem no aparelho amarrada à coordenada da captura, com MGRS, precisão e horário; a parada vira waypoint nas exportações JSON, GPX e KML (ADR-0037). | Sem fixo de GPS a foto não é gravada; precisão pior que 25 m fica registrada com ressalva visível. A coordenada ainda não é escrita em EXIF dentro da imagem, então uma foto copiada isolada chega sem posição. |
| Operação sem sinal de internet | **Implementado** | Shell PWA, armazenamento local, GPS/GNSS, bússola, trilhas, destinos e manual de sobrevivência. | Internet continua necessária para dados novos, tiles não baixados, e-mail, pagamentos e sincronização. |
| Mapa offline | **Implementado em versão inicial** | Botão **Preparar área offline** guarda tiles da área visível e níveis próximos no cache local; a tela consulta a quantidade já guardada e permite limpar deliberadamente o cache. | A pessoa precisa preparar cada área e base antes de sair; a versão atual não substitui um pacote cartográfico oficial completo nem confirma quota/armazenamento do sistema. |
| Localização por satélites | **Implementado** | O aparelho usa a API de geolocalização e converte a posição para latitude/longitude, UTM e MGRS. | O celular recebe sinais e calcula uma posição; isso não é triangulação de resgate nem envio de mensagem. |
| Equipe de resgate receber coordenadas | **Preparado** | O Modo Socorro prepara mensagem com posição, precisão, horário e referência MGRS para compartilhamento manual. | Para entrega sem rede móvel é necessário mensageiro via satélite, beacon, rádio de dados ou canal equivalente. |
| SOS após queda ou acidente | **Preparado** | A última posição pode permanecer salva e uma mensagem pode ser preparada. | Detecção automática de queda e transmissão automática exigem app nativo, permissões, sensores, regras de cancelamento e canal externo; não devem ser fingidas no PWA. |
| Transmissão de rádio pelo celular | **Dependente de hardware externo** | Existe contrato para rádio de dados e estado explícito de equipamento não conectado. | Um celular comum não transmite para todos os lados nem substitui rádio, antena, frequência, autorização e infraestrutura. |
| Modo Cidade | **Implementado** | Seleção manual no mapa e destino urbano com rumo/distância. | Alertas municipais novos exigem conexão e fonte responsável. |
| Modo Expedição | **Implementado** | Trilha, bússola, MGRS, waypoints e preparação de socorro. | A orientação do app não substitui carta, treinamento e equipamento reserva. |
| Modo Mar | **Preparado** | Contexto específico para carta, profundidade publicada, marés, perigos e avisos. | Deve usar cartas náuticas e avisos oficiais; imagem de satélite não substitui carta náutica atualizada [1]. |
| Profundidade e topografia no mar | **Preparado** | O contrato aceita carta, profundidade publicada e sonar externo. | Batimetria de satélite não é uma autorização de navegação; profundidade medida requer sonar/eco-sounder e validação. |
| Zona de desastre | **Implementado como contexto local** | Zona com fonte, data, validade opcional, centro, raio e prioridade pode mudar o modo e mostrar orientação civil; zonas podem ser exportadas/importadas em JSON versionado offline. | Alertas precisam ser importados de Defesa Civil, bombeiros ou autoridade competente; o app não inventa rota segura. Zonas expiradas são ignoradas automaticamente. |
| Chernobyl e áreas contaminadas | **Implementado como contexto; medição externa preparada** | O modo Área Contaminada pode ser ativado por zona publicada e exibir data, fonte e instrução de afastamento. | O celular não é contador Geiger. Medição requer dosímetro/Geiger externo identificado, unidade e calibração. |
| Radar de drones | **Não deve ser simulado** | O produto pode mostrar um alerta oficial ou relato manual identificado como não confirmado. | GPS, câmera, microfone e magnetômetro não viram radar confiável. Detecção exige sensor e processamento dedicados. |
| Detecção de tropas | **Não deve ser simulada** | O modo Área de Conflito pode mostrar zonas oficiais, rotas humanitárias e avisos civis. | Não realizar identificação, rastreamento ou recomendação operacional de tropas. |
| Detecção de explosões | **Dependente de fonte/equipamento externo** | Eventos verificados podem ser exibidos com horário, fonte e confiança; relatos podem ser registrados como relatos. | Microfone não confirma explosão à distância. O app nunca deve transformar estimativa em fato. |
| Zonas da Primeira/Segunda Guerra e minas | **Preparado para dados oficiais** | Zonas publicadas podem ser cadastradas como alerta geográfico, inclusive áreas com risco de restos explosivos. | Não assumir percentuais sem fonte nem liberar passagem. Ação contra minas envolve levantamento, mapeamento, marcação e equipes especializadas [2]. |
| Conduta diante de mina | **Implementado no manual** | O app orienta parar, não tocar, não investigar, afastar-se apenas por rota segura e acionar autoridades. | Nunca remover, chutar, fotografar de perto ou atravessar uma área suspeita. |
| Aba Sobrevivência | **Implementado** | Cartões offline sobre perigo imediato, primeiros socorros básicos, abrigo, temperatura, água, alimentação, sinalização e explosivos. | Conteúdo educacional não substitui treinamento, atendimento médico ou autoridade local [3]. |
| Fazer fogo | **Documentado com limite** | O manual explica preparação e segurança, incluindo não acender fogo em barraca ou local proibido. | Instruções devem respeitar incêndio, clima e legislação local; não é prioridade em todos os cenários. |
| Ataduras e primeiros socorros | **Documentado em nível inicial** | O manual prioriza segurança da cena, pressão em sangramento e busca de emergência. | Não diagnosticar, não remover objeto cravado e não substituir treinamento ou profissional. |
| Plantas comestíveis | **Limite explícito** | O app alerta para não comer plantas, cogumelos ou animais desconhecidos. | Identificação por foto não é garantia de comestibilidade; o produto não deve incentivar experimento. |
| Doações PIX + cartão | **Preparado, desativado** | Tela de apoio e contrato Asaas com checkout hospedado, auditoria, recibo, Webhook e e-mail futuro. | Sem conta, credenciais, domínio e configuração real, nenhuma cobrança é criada. Dados de cartão ficam no provedor. |
| Origem do dinheiro para auditoria | **Preparado** | Registro previsto de ID interno/Asaas, evento, data, método, bruto, tarifas, líquido, origem, status, estorno e chargeback. | É controle e reconciliação; não é declaração automática à Receita Federal. A natureza tributária deve ser confirmada com contador. |

## O que funciona sem internet

| Recurso | Sem internet? | Observação |
|---|---:|---|
| GPS/GNSS do aparelho | Sim, quando o aparelho consegue obter sinal | A precisão depende do receptor, céu, ambiente e bateria. |
| Bússola | Sim | O sensor pode exigir calibração e sofre interferência magnética. |
| Trilha e waypoints | Sim | Permanecem no armazenamento local até eventual exportação ou sincronização. |
| Destino por coordenadas | Sim | Distância e rumo podem ser calculados localmente. |
| Coordenadas MGRS | Sim | A conversão é feita pelo motor local. |
| Manual de sobrevivência | Sim | Conteúdo fica no bundle do aplicativo. |
| Zonas cadastradas localmente | Sim | Funcionam com a última versão salva; zonas expiradas ou com pacote incompatível são ignoradas/recusadas. O JSON versionado pode ser transportado manualmente. |
| Tiles preparados | Sim | Apenas áreas e níveis já guardados no cache. |
| Alertas novos de autoridades | Não | Precisam de conexão ou pacote atualizado previamente. |
| Pedido de resgate | Não por si só | Requer rede móvel, internet, mensageiro satelital, beacon ou rádio externo. |
| E-mail de transação | Não | Fica pendente até haver conectividade e serviço autorizado. |
| PIX/cartão | Não | O checkout precisa de conexão e conta Asaas ativa. |

## Modelo de dados para zonas de alerta

Cada zona deve guardar, no mínimo, `id`, `nome`, `contexto`, `geometria` ou centro/raio, `fonte`, `publicadoEm`, `expiraEm`, `nivel`, `instrução`, `versão` e `importadoEm`. No contrato atual do Vanguard Field, `id`, `nome`, contexto, centro/raio, `fonte`, `atualizadoEm`, `validadeEm` e `ativo` são normalizados; `publicadoEm`, nível detalhado, instrução e geometria poligonal permanecem extensão futura. Uma zona sem fonte ou data pode ser exibida como informação local, mas não deve ser apresentada como alerta oficial.

O contexto automático deve respeitar esta ordem: primeiro verificar validade temporal e fonte; depois verificar se a posição está na geometria; então escolher a zona de maior prioridade; por fim mostrar o motivo da mudança. A pessoa deve poder retornar ao modo manual e ver qual zona causou a alteração.

## Modelo de integração externa

A integração de um equipamento externo deve informar fabricante, modelo, identificador, unidade, última leitura, horário, calibração e confiança. Para mensagens, deve distinguir `preparada`, `enfileirada`, `enviada`, `aceita pelo provedor`, `confirmada` e `falha`. O Vanguard não deve exibir “resgate acionado” quando só preparou uma mensagem.

## Decisões de produto

A experiência civil e de proteção deve ser o caminho principal. O código balístico legado permanece isolado por compatibilidade histórica e não representa o escopo do Vanguard Field. Os modos de conflito e contaminação servem para reduzir exposição e orientar busca de ajuda, não para fornecer vigilância ofensiva, seleção de alvos ou instruções de combate.

## Próximas etapas recomendadas

A sequência recomendada é validar o conteúdo com profissionais de primeiros socorros, ação contra minas, navegação marítima e proteção radiológica; conectar apenas fontes oficiais versionadas; transformar o cache de tiles em pacotes cartográficos selecionáveis; empacotar o PWA com permissões nativas apenas quando houver política clara para queda e SOS; e testar todos os fluxos sem rede em aparelhos Android e Xiaomi reais.

## Referências

1. [Centro de Hidrografia da Marinha — Cartas Náuticas](https://www.marinha.mil.br/chm/dados-do-segnav-cartas-nauticas)
2. [UNMAS — What We Do](https://unmas.org/en/what-we-do)
3. [American Red Cross — 11 Critical Survival Skills That Could Save Your Life](https://www.redcross.org/take-a-class/resources/articles/11-survival-skills-to-know)
