# ADR-0026 — catálogo de rotas de peregrinação sem geometria inventada

- **Status:** Aceita
- **Data:** 2026-08-27
- **Escopo:** rotas de peregrinação, turismo religioso e referências de planejamento

## Contexto

O usuário solicitou outras rotas de peregrinação além dos Caminhos dos Anjos e mencionou a possível Rota do Carvalho. A pesquisa mostrou que o nome Rota do Carvalho não possui, nas fontes consultadas, confirmação suficiente como peregrinação oficial. Uma referência educacional encontrada menciona uma trilha com esse nome ligada ao Marco Zero do Saneamento no Paraná, mas o documento não estava acessível o bastante para classificar a rota com segurança.

Também foram encontradas páginas institucionais do Caminho da Fé, da Rota do Rosário e do Caminho Sagrado. Elas descrevem rotas, peregrinações, cidades, santuários ou planejamento, mas a presença de uma página institucional não é, por si só, autorização para copiar uma geometria ou prometer navegação offline.

## Decisão

O Vanguard Field passa a manter um catálogo local e imutável de referências em `src/data/rotas-peregrinacao.js`. Cada item possui nome, tipo, região, fontes, cidades quando publicadas, estado de evidência e o campo explícito `navegacaoDisponivel`.

O mapa exibe um seletor de **Rota de referência**. O seletor apresenta a descrição e o estado da fonte, mas não desenha uma linha nem substitui a trilha local do usuário. As quatro rotas com fonte institucional são referências para investigação posterior; a Rota do Carvalho aparece como `NÃO CONFIRMADA · FORA DA NAVEGAÇÃO`.

Uma rota só poderá ser promovida a navegação quando existir GPX/KML oficial ou explicitamente autorizado, com fonte, versão/data, cobertura e validação física documentadas. Cidades, santuários e nomes de municípios não devem ser ligados por uma linha aproximada.

## Catálogo inicial

| Rota | Classificação no catálogo | Estado |
|---|---|---|
| Caminhos dos Anjos | Peregrinação religiosa/turismo religioso | Referência confirmada; geometria oficial pendente |
| Caminho da Fé | Peregrinação/rota religiosa | Referência confirmada; geometria oficial pendente |
| Rota do Rosário | Roteiro religioso e turístico | Referência confirmada; geometria oficial pendente |
| Caminho Sagrado | Rota de peregrinação e circuito de trekking/bike | Referência confirmada; geometria oficial pendente |
| Rota do Carvalho | Não classificada | Não confirmada; fora da navegação |

## Consequências

O produto pode reconhecer e organizar rotas úteis sem inventar dados de caminho. A pessoa poderá usar a rota local gravada, importar um GPX/KML fornecido por uma organização ou consultar as fontes oficiais antes da saída. O catálogo não geocodifica cidades, não calcula uma rota automática e não afirma que a informação institucional esteja atualizada para cada edição do evento.

A funcionalidade é civil, local-first e separada da wiki virtual de Arma 3 e de seus módulos balísticos legados.

## Fontes

As fontes consultadas e suas limitações estão registradas em [`docs/ROTAS-PEREGRINACAO-REFERENCIAS.md`](../ROTAS-PEREGRINACAO-REFERENCIAS.md). O catálogo não substitui as orientações dos organizadores, sinalização local, autoridades, condições meteorológicas ou avaliação da pessoa durante a caminhada.
