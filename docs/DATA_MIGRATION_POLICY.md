# Política de dados do Vanguard — migrar, nunca destruir

> Esta política vale para toda mudança que toque em dado guardado no aparelho.
> Ela existe porque o Vanguard é usado em campo: a trilha de uma peregrinação
> de três dias não tem cópia em servidor nenhum. Se sumir daqui, sumiu.

## A regra

```
dado antigo → preservar → copiar/migrar → esquema novo → validar → sistema novo
```

Nunca:

```
dado antigo → apagar → dado novo
```

## As cinco classes, e por que a classe é o campo que decide tudo

Declaradas em [`src/core/dados/catalogo.js`](../src/core/dados/catalogo.js).

| classe | o que é | pode ser descartado? |
|---|---|---|
| `CRITICO` | trabalho do operador; nenhuma outra fonte reconstrói | **nunca** |
| `IMPORTANTE` | configuração e contexto; refazer custa tempo | não, sem backup |
| `DERIVADO` | calculado de outro dado | só se recomputável |
| `CACHE` | volta da rede sozinho | sim |
| `TEMPORARIO` | vive dentro de uma operação | sim |
| `DESCONHECIDO` | **está no aparelho e não está no catálogo** | **nunca — investigue** |

`DESCONHECIDO` não se declara: ele é atribuído em execução pelo inventário a
toda chave que o aparelho tem e o catálogo não conhece. É o dado de uma versão
anterior, ou de um recurso removido cujo valor ficou. É exatamente esse que uma
"limpeza" leva sem ninguém notar.

Hoje são **4 chaves `CRITICO`**: `trilha`, `waypoints`, `trajeto` e `contatos`.
E o banco `vanguard-fotos-parada`, cuja imagem só existe ali.

## A ordem obrigatória

```
BACKUP → INVENTÁRIO → VALIDAÇÃO → PLANO → IMPLEMENTAÇÃO → VALIDAÇÃO
```

Nenhuma etapa pode ser pulada porque "é só um campo novo".

## O inventário só lê

[`src/core/dados/inventario.js`](../src/core/dados/inventario.js) não escreve,
não apaga e não normaliza. Ele roda **antes** e **depois** de qualquer migração,
e é a única prova de que nada se perdeu — um inventário que altera o que mede
deixa de ser prova. `test/dados-inventario.test.js` cobra isso com um
armazenamento falso que **lança exceção** se alguém tentar escrever.

Pelo mesmo motivo o inventário abre o IndexedDB **com a versão declarada e
aborta em `onupgradeneeded`**: abrir sem versão faria o navegador criar o banco
que ele foi medir.

## Quando a migração não pode começar

`inventariarTudo()` devolve `seguroParaMigrar: false` e o motivo, em três casos:

1. **leitura parcial** — existe dado que não pôde ser lido. Migrar às cegas
   apagaria o que não foi visto;
2. **conteúdo ilegível** — a chave existe e não é JSON válido. Preserve o
   original; nunca converta por cima;
3. **chave desconhecida** — investigue antes.

Ambiente **sem** um backend (Node sem IndexedDB) é `INDISPONIVEL`, e isso **não**
bloqueia: é ambiente diferente, não dado perdido. `PARCIAL` fica reservado ao
caso perigoso.

## Contagem antes e depois

Toda migração compara, por chave:

```
registros_antes == registros_depois
```

E guarda o **SHA-256** do conteúdo original. Se a contagem divergir, a migração
**falha e não conclui** — ela não "resolve" a diferença.

Coleção vazia conta `0`; o que não é coleção conta `null`. Confundir os dois faz
a comparação acusar perda onde não houve — ou calar onde houve.

## Registro que não migra

```
preservar original + marcar MIGRACAO_PENDENTE
```

Nunca `delete`.

## Migração aditiva

Preferir **campo novo, store novo, versão nova** a `drop`, `truncate` ou `reset`.

Mudança destrutiva só com: backup, motivo escrito, reversão quando possível,
contagem conferida, integridade verificada, operação registrada — nesta ordem.

## Cache não é fonte de verdade

Tile de mapa e shell se reconstroem. Trilha, waypoints, contatos e fotos não.
Limpar cache nunca pode tocar em nenhum dos dois grupos de baixo.

## Falha de rede não apaga nada

API indisponível preserva o estado local e sincroniza depois. Nunca o contrário.

## Antes de escrever `delete`, `clear`, `reset`, `truncate` ou `drop`

**Pare.** Backup → inspecionar → explicar → migrar → validar.

Há hoje um caminho que apaga sem backup: `limparTrilha()` em
`src/pages/mapa.js`, que zera trilha e waypoints a pedido do operador. Está
listado aqui porque a V3 precisa dar a ele um backup antes do apagamento — e
não porque a ação em si seja indevida.

## Defeitos de perda de dado já medidos (v1.6.0)

| defeito | medida | onde |
|---|---|---|
| `.slice(-12000)` descarta os pontos mais antigos **em silêncio** | 12 000 pontos ≈ 24 km na regra de ≥2 m entre pontos | `src/pages/mapa.js` |
| exportação **recusa** acima de 4 000 pontos | 4 000 → 0,89 MB; 4 001 → erro | `src/core/registro-offline.js` |
| array inteiro reescrito a cada ponto | 1,53 MB de `JSON.stringify` com 12 000 pontos, contra ~5 MB de cota | `src/pages/mapa.js` |

Os três são tratados pela V3 — o segundo é o que faz a extração parecer
quebrada: ela funciona até 4 000 pontos e falha inteira depois.
