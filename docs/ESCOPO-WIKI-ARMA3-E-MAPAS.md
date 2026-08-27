# Separação de escopo — Vanguard Field, wiki de Arma 3 e mapas

## Objetivo

Este documento elimina uma ambiguidade histórica do repositório. Existem dois contextos diferentes: o **Vanguard Field**, aplicativo civil de navegação, e a **wiki/ambiente de testes de Arma 3**, preservada separadamente para simulação de videogame.

| Contexto | Dados cartográficos | Finalidade | Pode usar mapa do mundo real? |
|---|---|---|---|
| **Vanguard Field** | GPS/GNSS local, MGRS, bases cartográficas, tiles e zonas civis | Navegação real, caminhada, cidade, expedição e proteção civil | Sim, quando a camada estiver configurada, atribuída e disponível; isso continua dependente de rede, provedor e quota |
| **Wiki/ambiente Arma 3** | Terrenos e grades virtuais do jogo, incluindo a base específica de terrenos do Arma 3 | Testes e simulação dentro do videogame | Não como substituto dos terrenos do jogo; uma imagem real pode mostrar o planeta, mas não representa um mapa ou cenário do Arma 3 |

## Registro da decisão histórica

Na época em que os mapas/terrenos do Arma 3 ainda não estavam disponíveis no fluxo de construção, o Claude Code inseriu uma API de imagens de satélite do mundo real como contingência provisória. O resultado mostrava o nosso mundo real em uma camada cartográfica comum. Essa foi uma decisão técnica tomada pelo processo de construção para preencher uma lacuna temporária; **não foi uma solicitação do usuário e não significava que o usuário tivesse pedido um mapa GPS real dentro do simulador/wiki de Arma 3**.

A contingência não deve ser reinterpretada como requisito do simulador. A camada real é responsabilidade do Vanguard Field civil. A wiki de Arma 3 deve identificar de forma própria os seus terrenos virtuais e não deve apresentar uma API de satélite real como se fosse mapa do jogo.

## Legado balístico

Os módulos balísticos e a tela histórica de tiro pertencem ao mesmo contexto separado da wiki de Arma 3. Foram criados somente para testes e simulação dentro do videogame. Não fazem parte do fluxo civil do Vanguard Field e nunca foram destinados a ambientes, equipamentos, treinamento ou operações reais. A classificação é `LEGACY-RESTRICTED`.

## Regra para futuras alterações

Toda alteração cartográfica deve declarar o contexto a que pertence. Uma camada de tiles do mundo real deve ser descrita como **mapa real do Vanguard Field**, com provedor, atribuição, disponibilidade e limites. Um terreno do Arma 3 deve ser descrito como **dado virtual do jogo**, com sua base e convenção próprias. Não preencher a ausência de um terreno virtual com uma API de satélite sem registrar explicitamente que se trata de uma contingência temporária e fora do escopo do simulador.

Para a política normativa, consulte [`SECURITY.md`](../SECURITY.md). Para a visão atual do produto, consulte [`README.md`](../README.md). Para a descrição histórica de integração, consulte [`INTEGRACAO-BALUARTE.md`](INTEGRACAO-BALUARTE.md) e [`BALISTICA.md`](BALISTICA.md).
