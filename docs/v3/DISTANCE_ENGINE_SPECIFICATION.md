# Motor de distância — especificação

Implementação: [`src/engine/distancia.js`](../../src/engine/distancia.js), sobre
[`odometro.js`](../../src/engine/odometro.js). Testes: `test/distancia.test.js`,
`test/trilhas-douradas.test.js`.

## O que já estava certo, e não foi reescrito

`odometro.js` soma **segmento a segmento** (não primeiro→último), inclui
desnível por Pitágoras e peneira o tremor com limiar **proporcional à precisão
do fixo**. Nada disso mudou — §43 manda reparar antes de reescrever.

## O que faltava: o vão

Medido na 1.6.0: caminhada de 100 m, três minutos sem sinal, a pessoa reaparece
400 m adiante e anda mais 100 m.

```
medirTrilha  → 599 m
```

400 daqueles metros ninguém observou. A reta entre os dois fixos é palpite:
pode ter sido 400 m em linha reta, pode ter sido 900 contornando um
quarteirão. Somar em silêncio inventa distância; não somar e calar esconde que
faltou informação.

```
medirDistancia → 200 m observados · 400 m sem registro em 1 trecho
```

## As três medidas

| medida | o que é | quando serve |
|---|---|---|
| `bruta` | soma sem peneira | teto; a diferença para a filtrada **é** o ruído medido |
| `filtrada` | com a peneira do odômetro | o número da 1.6.0, com o nome certo |
| `casada` | ajustada à malha viária | **`null`** — não existe map matching aqui |

`casada: null` é afirmação, não esquecimento. Um campo devolvendo a filtrada
com nome de "casada" faria a interface anunciar precisão inexistente. Há teste
trancando o `null`.

`observadaM` é o número honesto: distância sobre chão que o aparelho viu.

## Dois cuidados que só apareceram nos testes

- **salto absurdo já recusado não é descontado duas vezes** — ele não está no
  total, e descontá-lo de novo tiraria distância real;
- **trilha migrada da v1 não tem a marca `vao`** nos pontos, então os mesmos
  critérios são aplicados na leitura. A medição funciona igual antes e depois.

## Pausa

Pausar não é assunto deste módulo: ele mede uma lista de pontos. Quem garante
que retomar não reinicia é o Track Store, com teste próprio (10 + pausa + 5 =
15, com o primeiro ponto intacto).

## Resultado nas trilhas de referência

Erro contra a verdade construída: **3,6% → 0,6%** no agregado das oito trilhas.
Mas leia [a estratégia de teste](NAVIGATION_TEST_STRATEGY.md#o-agregado-mente-se-lido-sozinho)
antes de citar esse número.
