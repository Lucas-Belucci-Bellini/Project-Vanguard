# Caminhos dos Anjos — fonte de cidades e rota

## Estado da informação

Este documento registra a fonte consultada para preparar uma futura camada local do Caminhos dos Anjos no Vanguard Field. A informação é uma referência de turismo religioso e não substitui sinalização da organização, orientação das autoridades, condições reais das estradas ou um arquivo GPX/KML oficial da edição da peregrinação.

A página de cidades da própria Associação de Peregrinos e Amigos dos Caminhos de São Miguel Arcanjo (APACSMA) lista atualmente os seguintes pontos: **Londrina, Ibiporã, Jataizinho, Cruzeiro do Norte, Uraí, Congonhas, Cornélio Procópio e Bandeirantes** [1]. A página identifica Cruzeiro do Norte como distrito localizado no município de Uraí, portanto ele não deve ser contado como município separado sem uma regra explícita [1].

A associação também publica três documentos de reconhecimento: a lei estadual do Paraná, a lei municipal de Cornélio Procópio e a lei municipal de Bandeirantes [2]. O texto publicado da Lei Estadual do Paraná nº 22.530/2025 descreve a rota entre Londrina e o Santuário São Miguel Arcanjo, em Bandeirantes, passando por Londrina, Ibiporã, Jataizinho, Uraí, Cornélio Procópio — Distrito de Congonhas — e Bandeirantes [3]. Isso confirma o contexto legal da rota, mas não fornece por si só uma geometria navegável de cada estrada rural.

Uma página legislativa municipal de Ibiporã informa que o trecho local vai da divisa com Londrina até a divisa com Jataizinho e menciona o Projeto de Lei Ordinária nº 017/2025 [4]. Uma notícia da Câmara de Cambé, publicada em julho de 2026, relata a aprovação de uma proposta para incluir Cambé no roteiro e menciona saída de Rolândia; essa informação é posterior à lista publicada na página de cidades da associação e deve ser tratada como **atualização municipal a confirmar**, não incorporada automaticamente ao traçado principal [5].

## Regra para o aplicativo

O Vanguard Field deve separar três coisas:

| Camada | Conteúdo permitido | Estado |
|---|---|---|
| **Cidades de referência** | Nomes e municípios/distritos publicados pela associação, com fonte e data de consulta | Pode ser exibida como referência local após implementação e testes |
| **Rota navegável** | Linha derivada de GPX/KML oficial ou de dados explicitamente fornecidos/autorizados pela organização | Não disponível no repositório atual; não desenhar uma linha aproximada ligando centros urbanos |
| **Posição do usuário** | Fixos GPS/GNSS do aparelho, com precisão e idade visíveis | Já implementada; precisão física continua dependente do aparelho, céu, ambiente e permissões |

Sem um arquivo de rota autorizado, mostrar cidades não significa mostrar o caminho exato. A UI deve rotular a camada como `CIDADES DE REFERÊNCIA` e manter a rota real como `NÃO CONFIGURADA` ou `ARQUIVO LOCAL NECESSÁRIO`, em vez de transformar pontos aproximados em trilha oficial.

## Relação com o bug observado

As capturas recebidas mostram uma base de satélite/topografia sem uma camada confiável de nomes em algumas seleções e uma base CARTO escura com o texto `API KEY REQUIRED`. O código atual também inicializa o MapLibre somente com a base selecionada; embora exista um catálogo de overlays em `src/data/camadas-mapa.js`, o `mapaPage` não adiciona a camada de rótulos ao estilo inicial. Isso explica a ausência de cidades no mapa sem significar que a posição GPS tenha sido perdida.

O ponto GPS deslocado dentro de um prédio é um problema diferente. O GPS/GNSS pode apresentar erro maior em ambientes internos por bloqueio e reflexão de sinais. O aplicativo deve mostrar `±N m`, idade do fixo e estado de frescor, rejeitar fixos inválidos e evitar vender uma correção de software como precisão garantida. Uma futura unidade de filtragem só deve ser implementada depois de definir critérios testáveis, para não esconder um fixo ruim nem atrasar a trilha.

## Fontes

[1]: https://caminhosdosanjos.com.br/cidades/ "Caminhos dos Anjos — Cidades"

[2]: https://caminhosdosanjos.com.br/portal-da-transparencia/leis-de-reconhecimento/ "Caminhos dos Anjos — Leis de Reconhecimento"

[3]: https://caminhosdosanjos.com.br/wp-content/uploads/2025/09/01.-Lei-Caminhos-dos-Anjos-Estadual.pdf "Lei Estadual do Paraná nº 22.530/2025 — cópia publicada pela associação"

[4]: https://www.cmibipora.pr.gov.br/imprensa/noticias/Noticias/18/2026/2922 "Câmara Municipal de Ibiporã — inclusão na rota de peregrinação"

[5]: https://www.cambe.pr.leg.br/cambe-entra-na-rota-religiosa-do-caminho-dos-anjos "Câmara Municipal de Cambé — inclusão na rota religiosa"
