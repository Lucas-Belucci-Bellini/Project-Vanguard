# ADR-0023 — separação entre mapas reais e terrenos virtuais de Arma 3

- **Status:** Aceita
- **Data:** 2026-08-27
- **Escopo:** Documentação, arquitetura e segurança do repositório

## Contexto

O repositório passou por uma fase em que os mapas/terrenos do Arma 3 ainda não estavam disponíveis. Durante esse período, o fluxo de construção do Claude Code colocou uma API de imagens de satélite do mundo real na camada de mapa como substituição provisória. O resultado mostrava o planeta real como um mapa comum.

Essa contingência histórica podia ser lida de maneira incorreta, como se o mapa de GPS real tivesse sido solicitado para o simulador ou como se a API representasse um mapa do jogo. Essa interpretação não corresponde ao escopo pedido pelo usuário.

## Decisão

Registrar explicitamente que a API de satélite foi uma decisão provisória do processo de construção, tomada para preencher a ausência temporária dos mapas do jogo. Não foi uma solicitação do usuário, não representava um terreno do Arma 3 e não deve ser mantida como substituto silencioso da base virtual do jogo.

As camadas do mundo real pertencem ao Vanguard Field civil, onde podem apoiar navegação física quando provedor, atribuição, rede e quota estiverem disponíveis. A wiki/ambiente de testes de Arma 3 deve usar a base própria de terrenos virtuais e suas convenções. O mapa real e o mapa do jogo têm finalidades, fontes e contextos diferentes.

## Consequências

A documentação passa a explicar a origem da inconsistência sem atribuí-la ao usuário. O histórico permanece auditável, mas a separação fica normativa para novas alterações. Qualquer nova camada cartográfica deve declarar seu contexto, fonte, disponibilidade e limites; não se deve usar uma API real para preencher silenciosamente uma lacuna de cenário virtual.

Os módulos balísticos continuam `LEGACY-RESTRICTED`: pertencem ao contexto separado da wiki de Arma 3 e foram criados somente para testes e simulação no videogame. Nunca foram destinados a ambientes, equipamentos, treinamento ou operações reais.

## Não escopo

Este ADR não altera provedores, não remove dados do mundo real do Vanguard Field civil, não cria mapas novos do Arma 3 e não modifica os módulos balísticos. É uma correção de documentação e delimitação de contexto.
