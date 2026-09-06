# ADR-0044 — visão noturna por intensificação de luz, e as três medidas de 3×

- **Status:** Aceita
- **Data:** 2026-09-02
- **Escopo:** `src/engine/visao-noturna.js`, `src/core/camera-noturna.js`, `src/pages/noturno.js`, `src/engine/rumo-filtro.js`, `src/engine/fixo-medio.js`, bússola e mapa

## Contexto

Dois pedidos, na mesma frase: *"garantir que as funções já existentes sejam
melhoradas em 3 vezes do comum"* e *"tem como vc colocar visão noturna na câmera
ou criar tmb uma câmera no app com visão noturna"*.

O segundo tem uma resposta que precisa vir antes de qualquer código: **visão
noturna por infravermelho não existe em celular.** A câmera traz um filtro
corta-IR colado na frente do sensor, de fábrica, e não há sensor térmico em
telefone comum — nenhum software desfaz nem um nem outro. Aplicativo que promete
"ver no escuro total" está pintando ruído de verde e chamando de imagem.

O que existe, e é o que foi construído, é **intensificação de luz**: tornar
visível o pouco de fóton que o sensor já capta. É a mesma família do
intensificador de imagem, com o ganho vindo de estatística em vez de fotocátodo.

## Decisão

### 1. O ganho vem de empilhar quadros, e o número é 3

O sinal de uma cena escura é estável entre quadros; o ruído do sensor sorteia de
novo a cada um. Somar quadros soma o sinal inteiro e cancela parte do ruído: com
N quadros ele cai por `√N`.

A soma é uma média exponencial, `y = α·x + (1−α)·y`, cuja variância de saída é
`α/(2−α)` vezes a de entrada. Com **α = 0,2** isso é `1/9`, e o desvio padrão
cai a **1/3** — três vezes menos ruído, com um buffer só em vez de nove.

A mesma identidade sustenta o filtro da bússola. `test/visao-noturna.test.js`
cobra que as duas implementações concordem, para nenhuma ser "corrigida" sozinha.

### 2. Só se amplifica na proporção do ruído que se removeu

Esticar o histograma multiplica o contraste **e o ruído junto**. O teto de
esticamento é `amplificacaoBase / fatorRuido`: a pilha cheia (fator 1/3)
autoriza exatamente 3× mais do que a imagem instantânea. Sem essa regra, o modo
escuro vira uma nevasca verde com contraste bonito e nenhuma informação.

### 3. A pilha se desmancha medindo o estrago, não adivinhando o movimento

Empilhar sobre a câmera em movimento borra a imagem. A primeira versão decidiu
isso pela diferença média entre quadros — **e falhou justamente no caso difícil**:
numa cena escura e de pouco contraste, varrer o terreno a 12 px por quadro
produziu diferença *menor que o próprio ruído do sensor*. O detector não via
movimento nenhum e a imagem borrava por meia tela. Isso foi medido, não suposto.

A versão que ficou não mede o movimento — mede **a estrutura que o acumulado
consegue guardar** em relação ao quadro que chega, numa escala grossa (blocos de
8 px, onde a média já diluiu o ruído por 8). Retenção alta libera nove quadros;
retenção caindo encolhe a pilha até a imagem instantânea. A malha se regula
sozinha, e o comportamento medido é monotônico:

| varredura | quadros empilhados em regime |
|---|---|
| parado | 9,0 |
| 2 px/quadro | 6,4 |
| 6 px/quadro | 3,6 |
| 12 px/quadro | 1,8 |
| 24 px/quadro | 1,5 |

### 4. Monocromático de propósito

A saída é uma paleta sobre uma banda de luminância. Em luz baixa a informação de
cor do sensor **é** ruído, e mostrá-la seria pintar o erro. Quatro paletas, e a
escolha não é estética: **vermelho** preserva melhor a adaptação ao escuro,
**fósforo** é o meio-termo, **branco** dá mais detalhe percebido e queima mais a
vista, **cinza** é para julgar a imagem crua.

### 5. Só vê. Nunca transmite.

Mesma regra da escuta (ADR-0041), e aqui ela pesa mais, porque imagem identifica
pessoa e lugar. O caminho do vídeo é um só: `getUserMedia` → `<video>` →
`canvas` → pixels → `canvas` na tela. Não há `MediaRecorder`, `RTCPeerConnection`,
rede ou `toDataURL`. `test/camera-noturna.test.js` lê o código e falha se alguma
delas aparecer. Só vira arquivo quando o operador aperta CAPTURAR, e o arquivo
vai para o armazenamento local que já existe, com a coordenada da captura.

### 6. E quando não há luz, a tela diz que não há

Abaixo de `luzMinimaUtil` o diagnóstico é `ESCURO_DEMAIS` e o aviso é explícito:
*o que aparece é ruído do sensor, não a cena*. É a diferença entre uma
ferramenta e uma promessa.

## As três medidas de 3×

Cada uma tem um teste que mede contra uma verdade conhecida e falha se o número
não aparecer. Nenhuma é afirmação de release note.

| o que melhorou | como se mede | resultado |
|---|---|---|
| **Bússola** (`rumo-filtro.js`) | RMS do rumo filtrado contra verdade de 47° com ruído de 4° | **3,01×** menos tremor |
| **Visão noturna** (`visao-noturna.js`) | ruído da imagem por unidade de amplificação, empilhado vs. instantâneo | **≥3×** menos ruído |
| **Posição parada** (`fixo-medio.js`) | erro real da média contra a coordenada verdadeira, 300 ensaios | **2,73×** menos erro |

O terceiro merece nota. A conta formal daria 3,46× com 12 fixos, e a primeira
versão **anunciava** 2,95× de melhora enquanto o erro real caía 2,73× — ou seja,
mostrava precisão melhor do que a que tinha. O teto do ganho anunciado foi
baixado para 2,5×, e há um teste que compara o anunciado com o erro medido e
falha se o app for otimista. Precisão anunciada melhor que a real é o pior
defeito possível aqui: é o que faz alguém confiar numa posição que não merece.

## Consequências

- A bússola ganhou uma linha de estabilidade que **acusa interferência
  magnética** (ferro, ímã de capa, alto-falante). O discriminador é a retidão:
  girar é um trajeto reto no círculo, interferência anda muito e não sai do
  lugar.
- A foto de parada passa a usar a média de fixos quando ela é melhor que o fixo
  cru — e a tela diz de onde veio a coordenada.
- O filtro trabalha no vetor unitário, nunca em graus: a média de 359° e 1° em
  graus é 180°, o sul exato.
- A tela `#/noturno` entra como secundária. O processamento é limitado a 640 px
  no lado maior; acima disso não cabe em 15 fps num celular.

## Alternativas descartadas

- **Prometer infravermelho.** Não existe. Seria a mentira que o resto do app
  passou meses evitando.
- **Empilhar em RGB.** 3× mais trabalho por quadro para acumular duas bandas que
  em luz baixa são ruído.
- **Ring buffer de 9 quadros.** Nove vezes a memória para o mesmo resultado
  estatístico da média exponencial.
- **Esticar o histograma sem teto.** Contraste bonito, informação nenhuma.
