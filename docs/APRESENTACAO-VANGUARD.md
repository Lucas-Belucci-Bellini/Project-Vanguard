# Project Vanguard — apresentação do produto

## Direção visual

Apresentação em português, com estética de campo civil: fundo oliva quase preto, verde fósforo para estado pronto, âmbar para atenção, vermelho reservado para perigo, tipografia monoespaçada e diagramas simples de fluxo. A linguagem deve comunicar preparo e transparência, não militarização.

## Slide 1 — Capa

**Título:** VANGUARD FIELD

**Subtítulo:** Navegação offline, sobrevivência e proteção civil

**Mensagem:** Um navegador multiuso para cidade, caminhada, expedição, mar e situações em que a rede deixa de existir.

**Visual:** Silhueta abstrata de mapa com uma rota contínua ligando cidade, montanha e costa.

## Slide 2 — O problema

**Título:** Quando o sinal some, a orientação precisa continuar

**Conteúdo:** Pessoas usam o mesmo aparelho no dia a dia, em caminhadas e em áreas remotas. O risco não é apenas perder o mapa: é perder a referência, o plano de retorno e a capacidade de explicar onde está.

**Três pontos:** posição local; orientação; preparo para pedir ajuda.

## Slide 3 — Um produto, vários contextos

**Título:** Multiuso por design

**Conteúdo:** O mesmo mapa atende Cidade/Dia a Dia, Trilha/Expedição, Mar/Navegação, Zona de Desastre, Área Contaminada e Área de Conflito.

**Mensagem:** A pessoa escolhe o contexto manualmente, ou uma zona salva no aparelho pode elevar o contexto quando a posição entra em uma área conhecida.

**Visual:** Seis cartões de contexto conectados a um único núcleo de navegação.

## Slide 4 — O que funciona offline

**Título:** Offline-first, não offline de fachada

**Conteúdo:** Depois do primeiro carregamento, a shell, GPS/GNSS, bússola, destinos, trilha, waypoints, MGRS, zonas locais e manual de sobrevivência podem continuar funcionando no aparelho.

**Preparação:** Antes de sair, a pessoa escolhe a base e toca em **Preparar área offline** para guardar os tiles da área visível.

**Limite:** tiles não preparados, alertas novos, e-mail, pagamentos e sincronização precisam de conexão.

## Slide 5 — Sobrevivência

**Título:** Conhecimento quando a rede some

**Conteúdo:** A aba offline organiza primeiros passos, segurança da cena, primeiros socorros básicos, abrigo e temperatura, água, alimentação conservadora, sinalização e retorno.

**Alerta especial:** Em suspeita de mina ou resto explosivo, a regra é parar, não tocar, não investigar, afastar-se apenas por caminho seguro e acionar autoridades ou equipes especializadas.

**Visual:** Cartões expansíveis com níveis de alerta.

## Slide 6 — Contexto e proteção civil

**Título:** Contexto muda a interface; não inventa fatos

**Conteúdo:** Zonas locais guardam nome, tipo, coordenada, raio, fonte e data. O app mostra por que o contexto mudou e conserva o modo manual quando não existem dados confiáveis.

**Exemplos:** área de evacuação; área contaminada publicada; zona marítima com perigo; região com restos explosivos de guerra.

**Princípio:** um alerta precisa de fonte e validade; um ponto no mapa não é um radar.

## Slide 7 — O que exige equipamento externo

**Título:** GPS não é comunicação, radar ou Geiger

**Tabela de mensagem:**

- GPS/GNSS: calcula a posição local.
- Mensageiro via satélite/beacon: transmite SOS fora da rede.
- Contador Geiger/dosímetro: mede radiação.
- Sonar/eco-sonda: mede profundidade observada.
- Fonte oficial/sensor especializado: informa eventos verificados.

**Mensagem:** O Vanguard já possui contratos e estados para essas integrações, mas mostra **não conectado** até existir equipamento ou fonte real.

## Slide 8 — Segurança e privacidade

**Título:** Transparência é uma função do produto

**Conteúdo:** A localização fica no aparelho por padrão. O compartilhamento exige ação explícita. O Modo Socorro distingue mensagem preparada, enfileirada, enviada e confirmada pelo provedor.

**Limites:** o app não confirma drones, tropas, explosões, minas ou radiação por conta própria; não substitui autoridades, treinamento, carta náutica, atendimento médico ou plano de viagem.

## Slide 9 — Doações e auditoria

**Título:** Apoiar o projeto sem criar uma caixa-preta financeira

**Conteúdo:** A tela de doação está preparada para PIX e cartão via checkout hospedado do Asaas, sem armazenar cartão no Vanguard e sem coletar CPF/CNPJ do doador apenas para identificar origem.

**Auditoria:** ID interno, IDs Asaas, evento, método, bruto, tarifas, líquido, status, estorno, chargeback, campanha de origem e histórico mensal.

**Limite:** pagamentos permanecem desativados até conta, domínio, credenciais, webhook e e-mail transacional reais.

## Slide 10 — Caminho móvel e bateria

**Título:** Android e iPhone com energia como requisito

**Conteúdo:** O caminho técnico é empacotar a base web com Capacitor, compartilhar a lógica entre Android e iOS e pedir permissões somente quando necessárias.

**Política:** consulta pontual econômica; cidade com atualizações espaçadas; trilha ativa com alta precisão somente durante gravação; rota pausada reduz ou encerra localização; SOS separado e opt-in.

**Mensagem:** iPhone não é automaticamente “ruim de bateria”. Qualquer aparelho gasta mais com GPS contínuo, tela brilhante, mapa WebGL e localização em segundo plano; por isso o Vanguard evita deixar tudo ligado o tempo todo. A Apple recomenda o serviço mais eficiente que atende ao caso, e o Android alerta que localização em segundo plano pode impactar significativamente a bateria [1] [2].

## Slide 11 — Estado atual e próximos passos

**Título:** O que já existe e o que vem depois

**Implementado:** app web/PWA, mapa, cidade, trilha, bússola, MGRS, contexto, sobrevivência, pré-cache inicial e contratos externos.

**Próximo:** pacotes cartográficos completos, fontes oficiais versionadas, integração com mensageiro satelital/Geiger/sonar, testes em campo, empacotamento nativo e painel de doações com Sandbox Asaas.

**Critério de saída:** nenhum recurso crítico deve ser apresentado como ativo sem fonte, permissão, hardware ou confirmação real.

## Slide 12 — Encerramento

**Título:** Preparar antes. Orientar durante. Explicar os limites.

**Mensagem:** Vanguard Field transforma o celular em um instrumento civil de navegação e preparação — sem prometer que uma tela substitui rede, treinamento, autoridade ou equipamento especializado.

**Rodapé:** Project Vanguard · documentação completa no repositório · 74 testes aprovados no estado atual.

## Referências

[1]: [Apple Developer — Getting the current location of a device](https://developer.apple.com/documentation/corelocation/getting-the-current-location-of-a-device)
[2]: [Android Developers — About background location and battery life](https://developer.android.com/develop/sensors-and-location/location/battery)
[3]: [Centro de Hidrografia da Marinha — Cartas Náuticas](https://www.marinha.mil.br/chm/dados-do-segnav-cartas-nauticas)
[4]: [UNMAS — What We Do](https://unmas.org/en/what-we-do)
[5]: [American Red Cross — 11 Critical Survival Skills That Could Save Your Life](https://www.redcross.org/take-a-class/resources/articles/11-survival-skills-to-know)
