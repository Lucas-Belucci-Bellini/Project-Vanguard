# Armazenamento da trilha — especificação

Implementação: [`src/core/dados/track-store.js`](../../src/core/dados/track-store.js)
(regra) + [`track-store-indexeddb.js`](../../src/core/dados/track-store-indexeddb.js)
(persistência). Testes: `test/track-store.test.js`, `npm run verificar:trilha`.

## O que substituiu

Até a 1.6.0 a trilha era um array em `localStorage`:

```js
trilha = [...trilha, novo].slice(-12000);
estado.set(CHAVES.TRILHA, trilha);
```

Três defeitos, medidos:

| defeito | medida |
|---|---|
| descarte silencioso dos pontos mais antigos | 12 000 pontos ≈ **24 km** na regra de ≥2 m |
| custo O(n) por ponto | 1,53 MB de `JSON.stringify` por fixo, contra ~5 MB de cota |
| escrita tudo-ou-nada | interrupção perde a gravação, não o último ponto |

## Esquema

Banco `vanguard-trilhas` v1. **`onupgradeneeded` só cria; nunca `deleteObjectStore`.**

| store | chave | conteúdo |
|---|---|---|
| `sessoes` | `id` | metadados: estado, contadores, esquema, versão, procedência |
| `pontos` | `['sessaoId', 'seq']` | um registro por ponto |

A chave composta é o que faz ler uma sessão ser barato: o IndexedDB mantém a
ordem da chave, então uma sessão inteira é um intervalo contíguo
(`IDBKeyRange.bound`), sem índice secundário e sem tocar no que é de outra.

## Ponto gravado agora, sessão por checkpoint

O ponto vai para o disco **imediatamente** — é ele o dado que não pode se
perder. A sessão é persistida a cada **25 pontos** ou em transição de estado.

Isso saiu de medição, não de gosto. Gravar ponto **e** regravar a sessão a cada
fixo custava **1,182 ms/ponto** em IndexedDB real; com checkpoint, **0,600
ms/ponto** — 1,97×. Os pontos já eram append-only; era o registro da sessão que
estava sendo reescrito a cada fixo.

**Morrer entre checkpoints não perde ponto.** `recuperar()` reconcilia os
contadores lendo os pontos que estão gravados de verdade: contador defasado é
recuperável, ponto perdido não. Há teste com 107 pontos (7 depois do último
checkpoint) exigindo os 107 de volta.

## Nada é apagado por decisão do sistema

`BAIXA_PRECISAO`, `OUTLIER`, `ANTIGO` e `DUPLICADO` são **gravados com a
marca**. Só `INVALIDO` (sem coordenada) não entra, porque não é posição.
Quem decide o que contar é o consumidor: a distância soma só `VALIDO`, o mapa
desenha todos, a exportação leva tudo.

## Vão

Perda de sinal grava `vao` no ponto que fecha o buraco. Ele viaja **no ponto**,
não numa estrutura paralela: quem lê a trilha em ordem sabe que o segmento
anterior não foi observado, sem precisar cruzar duas listas.

## Verificado em IndexedDB real (20 000 pontos)

```
✓ todos entraram — nenhum teto        ✓ 20 001 registros crus (um por ponto)
✓ o primeiro ponto continua lá        ✓ leitura por faixa devolve só a faixa
✓ precisão e altitude atravessam      ✓ fechar e reabrir não perde nada
✓ sessão recuperada, seq continua     ✓ 0,600 ms por ponto
```
