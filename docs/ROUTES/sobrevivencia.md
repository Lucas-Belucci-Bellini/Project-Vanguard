# `#/sobrevivencia` — Manual offline

**Estado:** `IMPLEMENTED`

## Objetivo
Sete guias de conduta disponíveis sem rede, cada um com fonte citada e data de
revisão.

## Entrada
Busca por texto; filtro por tema.

## Dados necessários
`src/data/sobrevivencia.js` — catálogo versionado (`VERSAO_SOBREVIVENCIA`),
com `FONTES` (nome, URL, escopo) e `GUIAS` (id, título, etiqueta, resumo, tags,
`fonteIds`, `revisadoEm`, passos).

## Dependências
Nenhuma externa. Conteúdo embutido no bundle; funciona sem rede por construção.

## Ações
Buscar · filtrar por tema · abrir guia · ir para `#/contexto`.

## Saídas
Guias com passos, fonte e data de revisão; contador `n de N guias · catálogo vN`.

## Estados
- **SUCCESS** — guias listados.
- **EMPTY** — busca sem resultado, com o termo ecoado.
- Não há LOADING nem ERROR: o dado é local e estático.

## Limitações
**Não diagnostica, não garante comestibilidade e não ensina manuseio de
explosivos.** Conteúdo conservador e citado — nenhum valor factual é inventado.

## Testes
`test/rotas.test.js` (contrato da rota). O catálogo é dado estático versionado;
o que se verifica é que cada guia tem fonte e data de revisão.
