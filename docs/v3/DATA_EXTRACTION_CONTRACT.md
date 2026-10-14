# Contrato de extração

Implementação: [`src/core/registro-offline.js`](../../src/core/registro-offline.js).
Teste: `test/registro-offline.test.js`.

## O defeito que fazia a extração parecer quebrada

Medido na 1.6.0:

```
4 000 pontos → exporta 0,89 MB
4 001 pontos → "Trilha inválida ou acima do limite local"
```

O armazenamento cortava só em 12 000. Entre 4 001 e 12 000 pontos o registro
existia no aparelho e **não tinha como sair** — nem JSON, nem GPX, nem KML. E
não era truncamento: era recusa inteira. Quem tentasse salvar uma caminhada
longa não salvava nada.

## A causa: um limite só, usado nas duas pontas

`validarArray` bounded faz sentido na **importação** — arquivo de fora não é
confiável, e um JSON hostil de milhões de pontos trava o aparelho antes de
qualquer validação adiantar.

Na **exportação** ele não protege ninguém: o dado já está no aparelho, é do
operador, e negar a saída dele é prender, não proteger.

| direção | limite | por quê |
|---|---|---|
| exportação | **nenhum** | o dado é do operador; cada ponto continua validado |
| importação | **100 000 pontos** | entrada não confiável precisa de teto |

O teto de importação subiu de 4 000 para 100 000 porque **backup que não volta
não é backup**: com a exportação liberada, 4 000 na entrada faria o operador
exportar um arquivo que o próprio aplicativo recusaria a restaurar.

100 000 é medido: **325 ms** de validação (≈1–1,6 s num celular) contra
**1 514 ms** em 250 000, que já seria trava. São mais de 8 dias de gravação
contínua na regra de ≥2 m.

## Custo medido da exportação

| pontos | JSON | GPX |
|---:|---:|---:|
| 4 001 | 0,89 MB | 0,43 MB |
| 12 000 | 2,68 MB | 1,30 MB |
| 50 000 | 11,25 MB | 5,40 MB |

## Sem teto não é sem validação

Coordenada fora de faixa continua recusada, `lat`/`lon` ausentes continuam
recusados, entrada que não é array continua recusada. O que acabou foi a
recusa **por quantidade**.

## Ida e volta

Teste com 12 000 pontos exigindo primeira e última coordenada, altitude e
precisão do fixo idênticas depois de exportar e reimportar.

## O que a extração ainda não faz

- **não há `ExtractionResult` com `status`/`checksum`/`recordsRejected`** no
  formato do §7. O contrato atual lança exceção com mensagem, e a interface
  mostra a mensagem. Melhorar isso é trabalho aberto, não algo já feito.
