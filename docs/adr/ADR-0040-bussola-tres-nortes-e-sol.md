# ADR-0040 — bússola: os três nortes e a conferência pelo Sol

- **Status:** Aceita
- **Data:** 2026-08-31
- **Escopo:** tela de bússola do Vanguard Field

## Contexto

A bússola mostrava só a leitura do sensor. Faltava o que a pessoa precisa numa
estrada rural — para que lado andar — e faltava responder se aquele número quer
dizer alguma coisa.

Um celular não tem "uma" direção. Existem três nortes em jogo:

| Norte | O que é | De onde vem |
|---|---|---|
| magnético | para onde a agulha aponta | sensor do aparelho |
| verdadeiro | o eixo da Terra | magnético + declinação |
| de grade | o norte do MGRS/UTM do mapa | verdadeiro − convergência |

Pior: **a referência do sensor depende do modelo**. Em uns aparelhos
`webkitCompassHeading`/`alpha` entrega norte magnético; em outros o sistema já
corrige para verdadeiro. Tratar os três nortes como um só erra dezenas de graus,
e dezenas de graus numa estrada rural são quilômetros no lugar errado.

## Decisão

### A leitura crua é chamada do que ela é

O número do sensor aparece como leitura do aparelho, **sem correção**, e os
campos de azimute verdadeiro e de grade ficam vazios com o motivo dito. Eles só
aparecem depois de existir uma correção medida. Mostrar um azimute "verdadeiro"
derivado de uma referência desconhecida seria dar confiança a um número que não
a merece.

### A correção vem do Sol

O azimute do Sol é geometria (`engine/sol.js`, ADR-0038): dado onde e quando,
é conhecido **sem rede, sem sensor e sem depender de fabricante**. Apontar o
aparelho para o Sol e registrar a leitura mede, de uma vez, a declinação
magnética do lugar **e** o erro do próprio sensor.

É a ideia de conferir o instrumento contra algo que não depende dele. Guardas:
Sol abaixo de 5° não serve (refração e horizonte), e acima de 70° também não
(quase a pino, o azimute muda rápido demais). Quem já sabe a declinação da
região informa direto, num campo próprio.

### Grade sai da convergência que o motor já tinha

`convergenciaMeridianos()` e a convenção `verdadeiro = grade + convergência`
já existiam para o cálculo de tiro. A bússola reusa as duas em vez de criar uma
segunda implementação que poderia divergir em silêncio.

### Destino e rumo travado

O destino marcado no mapa vira rumo, distância, rumo de volta e desvio com lado.
Sem correção, o desvio fica vazio com "calibre para saber o lado" — apontar um
lado que pode estar errado é pior do que não apontar.

O rumo travado é a exceção útil: ele funciona **mesmo sem correção**, porque o
desvio é a diferença entre duas leituras do mesmo sensor e o erro comum se
cancela. A tela diz que aquele número é relativo, não azimute verdadeiro.

## Limites

Não há modelo magnético embarcado. O app **não** calcula a declinação a partir
da posição: ou ela é medida pelo Sol, ou é informada por quem sabe. Embutir uma
tabela de coeficientes que eu não pudesse verificar seria inventar precisão.

A correção medida vale para o lugar e o momento em que foi medida. Declinação
muda com a região e, devagar, com os anos; o erro do sensor muda com capa,
veículo, estrutura metálica e linha de energia. Refazer a conferência ao mudar
de região é parte do uso.

Bússola de celular é sensível a metal e a campos próximos. A conferência pelo
Sol detecta um desvio constante, não a oscilação instantânea de uma leitura
perturbada.

## Evidência

`test/bussola-leitura.test.js` (14 casos): a ausência de correção mantendo
verdadeiro e grade nulos, a correção aplicada batendo com a convergência do
motor, a calibração solar medindo exatamente o desvio injetado, as recusas com
Sol baixo e a pino, o destino com lado e tolerância, o rumo travado relativo ao
sensor e a ausência de posição não virando zero.

Verificação no navegador com posição e destino simulados: leitura de 030° com
declinação −20,5° virou verdadeiro 010° e grade 009°; o destino ao norte passou
a indicar "9° vire à esquerda"; correção e rumo travado sobreviveram no
armazenamento local.
