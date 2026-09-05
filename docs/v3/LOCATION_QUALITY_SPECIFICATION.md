# Qualidade de posição — especificação

Implementação: [`src/engine/trilha-ponto.js`](../../src/engine/trilha-ponto.js).
Teste: `test/trilha-ponto.test.js`.

## Duas regras

**Não descartar precisão.** O ponto guarda `accuracy`, `altitude`,
`altitudeAccuracy`, `speed`, `heading`, `provider` e o modo. Campo ausente fica
**ausente**, nunca vira zero: `Number(null)` é `0`, e uma altitude 0 inventada é
indistinguível do nível do mar, enquanto uma `accuracy` 0 inventada mente
dizendo "fixo perfeito" para todo mundo que ler depois.

**Classificar não é filtrar.** O ponto suspeito é marcado, nunca apagado.

## As seis classes

| classe | o que significa | soma distância? | é guardado? |
|---|---|:---:|:---:|
| `VALIDO` | coerente com o anterior | ✅ | ✅ |
| `BAIXA_PRECISAO` | raio > 50 m: não sustenta medição | ❌ | ✅ |
| `OUTLIER` | exigiria velocidade impossível | ❌ | ✅ |
| `DUPLICADO` | mesmo lugar e mesmo instante | ❌ | ✅ |
| `ANTIGO` | chegou fora de ordem | ❌ | ✅ |
| `INVALIDO` | não é posição | ❌ | ❌ |

Toda classificação vem com **motivo legível**. Ponto marcado sem explicação
vira decisão que ninguém consegue auditar depois.

## O teste de salto não é um limiar em metros

É velocidade implícita contra o tempo decorrido, com folga proporcional à
incerteza dos **dois** fixos, e teto por modo:

```
excedente = distância − (accuracy_anterior + accuracy_atual)
velocidade = excedente / Δt
```

| modo | teto |
|---|---|
| a pé | 12 m/s |
| bicicleta | 25 m/s |
| veículo | 70 m/s |
| desconhecido | 90 m/s |

Três consequências que um limiar fixo não alcança, todas com teste:

- **300 m em 10 s** são salto a pé (30 m/s) e normais de carro;
- os **mesmos 300 m em 2 s** são salto com fixos de 3 m e **não** são com fixos
  de 100 m — ali 200 dos 300 metros podem ser o ruído dos dois se somando;
- **na dúvida, marca de menos.** Marcação errada tira trecho real da distância.

## Vão

Acima de **120 s** ou **500 m** entre pontos consecutivos, os dois **não** são
um segmento. Ligá-los desenharia uma reta por onde ninguém passou e somaria à
distância um trecho que ninguém observou.

## O polo geográfico não é o polo magnético

Não vale para posição, mas vale como lembrete de método: teste de caso extremo
cobra **continuidade e finitude**, não um valor "óbvio" que a intuição chuta.
