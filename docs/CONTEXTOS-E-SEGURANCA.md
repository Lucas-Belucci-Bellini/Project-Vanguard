# Modos de contexto e segurança civil

## Princípio do produto

O Vanguard Field deve adaptar a interface conforme o contexto sem apresentar estimativas como fatos. Um modo automático pode destacar riscos conhecidos, instruções de autoproteção e fontes oficiais disponíveis, mas não substitui autoridades locais, cartas atualizadas, treinamento, sensores dedicados ou equipamentos de comunicação.

## Contextos previstos

| Contexto | Comportamento planejado | Fonte necessária | Limite obrigatório |
|---|---|---|---|
| Cidade | Navegação cotidiana, pontos de encontro, caminhada urbana e avisos locais. | Defesa Civil, órgãos municipais e dados cartográficos. | Dados podem ficar desatualizados; conferir alertas locais. |
| Expedição | Trilha offline, bússola, waypoints, retorno pelo caminho e preparação de SOS. | Mapa topográfico, dados de trilha e plano de viagem. | GPS não transmite pedido de resgate sem canal externo. |
| Mar | Carta náutica, profundidade publicada, perigos, auxílios à navegação, marés e aviso meteorológico. | Serviço Hidrográfico/autoridade marítima competente. | Satélite/topografia não substitui carta náutica atualizada, sonar ou habilitação. |
| Zona de desastre | Avisos de evacuação, áreas interditadas, abrigo e rota de afastamento. | Defesa Civil, bombeiros, autoridades locais e fontes oficiais. | Não sugerir rota quando não houver dados confiáveis. |
| Área contaminada | Isolamento, distância de segurança, abrigo ou saída conforme autoridade competente. | Órgão de emergência, saúde pública e autoridade ambiental/radiológica. | Celular não mede radiação sozinho; sensor externo deve ser identificado e calibrado. |
| Área de conflito | Aviso de área restrita, risco de restos explosivos, rotas humanitárias e contatos de emergência. | Autoridades locais, organizações humanitárias e fontes verificadas. | Não detectar tropas/drones nem recomendar aproximação, observação ou ação ofensiva. |

## Mar e cartas náuticas

O Centro de Hidrografia da Marinha descreve cartas náuticas como documentos base para navegação que representam acidentes terrestres e submarinos e fornecem profundidades, perigos, natureza do fundo, fundeadouros, auxílios à navegação, marés, correntes e magnetismo. O modo Mar deve, portanto, trabalhar com cartas e avisos hidrográficos oficiais quando disponíveis, e não apresentar um mapa terrestre ou uma imagem de satélite como se fosse uma carta náutica.

A mesma fonte informa que cartas raster podem ser baixadas, mas recomenda uso concomitante de cartas em papel atualizadas e adoção do datum WGS-84 no receptor e no programa de visualização. No aplicativo, isso vira um aviso de preparação: baixar a área, conferir data/edição e manter uma alternativa física ou eletrônica oficial antes de navegar.

## Minas e restos explosivos de guerra

O Serviço de Ação contra Minas das Nações Unidas (UNMAS) descreve a ação humanitária contra minas como envolvendo levantamento, mapeamento, marcação, detecção e destruição por equipes especializadas, além de educação para redução de risco. O Vanguard pode exibir uma zona oficial de risco e a instrução de afastamento, mas nunca deve orientar o usuário a investigar, tocar, remover ou atravessar uma área suspeita.

Regra de interface para a Área de Conflito: ao receber um alerta de possível mina ou artefato, mostrar **Pare, não toque, afaste-se pelo mesmo caminho se for seguro e acione as autoridades/serviços locais**. O texto deve ser revisado por especialistas em ação contra minas antes de publicação em produção.

## Radiação e área contaminada

O aplicativo poderá mostrar uma área de exclusão publicada por fonte competente, a data de atualização, o raio ou polígono disponível e a orientação oficial correspondente. Sem sensor externo, o estado deve ser `risco publicado`, não `medição atual`. Um acessório de detecção deverá ser tratado como fonte externa, com fabricante, modelo, unidade, calibração, última leitura e confiança exibidos.

## Detecção especializada e comunicação

GPS, magnetômetro, câmera e microfone não devem ser descritos como radar confiável de drones, tropas ou explosões. Um recurso de alerta pode receber eventos de uma fonte externa verificada ou permitir relato manual com horário, posição e nível de confiança, sem transformar a observação em confirmação automática.

Para SOS, a aplicação deve guardar a última posição local, preparar a mensagem e tentar transmiti-la apenas por canais disponíveis. O envio sem rede móvel requer mensageiro via satélite, beacon, rádio ou outro hardware compatível. O app deve informar claramente se a mensagem foi apenas preparada, colocada em fila ou confirmada pelo provedor.

## Conteúdo offline de sobrevivência

A aba Sobrevivência deve priorizar preparação, primeiros socorros básicos, abrigo, água segura, sinalização e navegação. A Cruz Vermelha Americana organiza habilidades de sobrevivência em primeiros socorros, RCP, tratamento de trauma, segurança na água, abrigo, fogo, coleta de alimentos, purificação de água, navegação, sinalização e nós. O Vanguard deve transformar isso em cartões curtos, com fonte e data de revisão, sem substituir treinamento ou atendimento de emergência.

O conteúdo sobre plantas comestíveis será conservador: sem identificação visual como garantia, sem recomendar experimentar espécies desconhecidas e sempre com orientação para usar alimento e água levados de casa quando possível. As instruções de primeiros socorros devem dizer para acionar o serviço local de emergência e procurar treinamento prático; o aplicativo não diagnostica e não substitui profissionais.

## Referências

1. [Centro de Hidrografia da Marinha — Cartas Náuticas](https://www.marinha.mil.br/chm/dados-do-segnav-cartas-nauticas)
2. [UNMAS — What We Do](https://unmas.org/en/what-we-do)
3. [American Red Cross — 11 Critical Survival Skills That Could Save Your Life](https://www.redcross.org/take-a-class/resources/articles/11-survival-skills-to-know)
