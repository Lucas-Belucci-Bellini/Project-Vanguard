# Estratégia de teste da navegação

## As quatro camadas, e o que cada uma prova

| camada | comando | prova |
|---|---|---|
| unidade | `npm test` | que o motor calcula certo |
| trilhas de referência | `npm test` | que ele calcula certo em caminho **sujo** |
| navegador | `npm run verificar:trilha` | que o IndexedDB honra a regra |
| medição | `npm run benchmark:navegacao` | quanto melhorou, e onde **não** melhorou |

Nenhuma delas prova que funciona no aparelho do operador. Para isso continua
valendo o autoteste dentro do app (**Diagnóstico → TESTAR TODAS AS ROTAS**).

## A verdade vem da construção, não do código

Cada trilha de referência é gerada a partir de uma geometria conhecida — reta
de 1 000 m, quarteirão de 4 × 200 m, ladeira com 120 m de subida — e a
distância verdadeira é a soma dos segmentos **dessa geometria**, calculada
antes de existir qualquer ruído. Só depois o caminho recebe tremor, salto, vão
e pausa.

Uma trilha de referência cuja distância esperada saiu de rodar o motor não
prova nada: ela registra o que o motor fazia no dia em que foi escrita, e passa
a concordar com qualquer defeito que ele já tivesse.

## As oito trilhas

| id | o que exercita |
|---|---|
| `reta-limpa` | o caso fácil: a soma básica não erra |
| `quarteirao-fechado` | volta fechada — primeiro→último daria zero |
| `ladeira` | desnível de 120 m que o haversine não vê |
| `rodovia` | fixos a 125 m entre si, 90 km/h |
| `parado-com-ruido` | uma hora sentado: a verdade é **zero** |
| `perda-de-sinal` | vão de 400 m sem observação |
| `salto-do-sensor` | um fixo 40 km fora do lugar |
| `pausa-longa` | uma hora parado no meio |

Nenhuma é um caminho perfeito. Caminho perfeito só prova que a soma funciona
quando nada dá errado — que é quando ninguém precisa de medição confiável.

## A regressão que fica

Para **cada** trilha: o erro da V3 contra a verdade tem de ser **≤** o erro da
1.6.0. Sem exceção, com folga de 1 m para arredondamento.

## O agregado mente se lido sozinho

`benchmark:navegacao` reporta **6,39×** de redução de erro. O próprio relatório
imprime a ressalva:

> 1 de 8 trilhas melhoraram; 7 medem **exatamente igual** à 1.6.0.
> `perda-de-sinal` sozinha responde por **100%** da redução.

O odômetro da 1.6.0 já era bom. O que a V3 acrescenta é o vão — então onde não
há perda de sinal, as duas medidas coincidem, e é isso que se espera. Citar
"6,39×" sem essa frase é vender como ganho geral o que é ganho de um caso.

## Onde a meta de 3× NÃO foi atingida

**Custo de gravação por ponto: 1,97×.** Agrupar pontos em lote passaria de 3×,
ao custo de perder o último lote numa morte súbita. Não foi feito: perder ponto
é pior que ser lento. Está marcado ✗ no relatório de propósito.
