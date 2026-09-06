# ADR-0043 — odômetro em 3D, contagem de passos e resumo do dia na tela bloqueada

- **Status:** Aceita
- **Data:** 2026-09-01
- **Escopo:** `src/engine/odometro.js`, `src/engine/passos.js`, `src/core/passos-sensor.js`, `src/core/notificacao-jornada.js`, trilha e tela de navegação

## Contexto

Relato de campo: *"eu andei na faculdade, subi escada, e ele calculou que eu
estava quase no mesmo lugar"*, com a preocupação que importa — **há um trecho
muito íngreme na peregrinação**, e o app pode não capturá-lo.

Auditando o caminho inteiro, o defeito não era um. Eram **três portões e somas,
todos em 2D**, cada um capaz de esconder a subida sozinho:

| onde | o que fazia |
|---|---|
| `localizacao.js` | só aceitava o fixo a 3 m do anterior, medidos no plano |
| `mapa.js` | só gravava na trilha com 5 m de deslocamento, no plano |
| `trilha.js` | somava `haversine` — e havia uma **segunda** soma 2D na própria página |

Subir escada desloca ~2 m na horizontal e ~10 m na vertical. Para os três, isso
é ficar parado. A altitude **já era capturada** por `normalizarPosicao` e
exportada em GPX/KML — só nunca entrava em conta nenhuma.

E havia um quarto problema, de outra natureza: a tela `#/navegacao` lia a
posição **uma vez** no mount e não assinava atualização (`desmontar` era
`null`). Quem abrisse e saísse andando via o número congelado — em campo isso é
indistinguível de "o app parou no meio".

## Decisão

### 1. Distância com desnível, e três defesas contra inflar o número

Somar cegamente em 3D é trocar um erro por outro: o GPS treme parado, e com
±12 m de precisão uma pessoa sentada acumula centenas de metros por hora. O
odômetro tem:

- **Peneira proporcional à precisão do fixo**, não um número fixo. Dez metros
  significam coisas diferentes com ±3 m e com ±40 m. Duas leituras
  independentes de um aparelho parado com ±A já diferem ~0,7·A entre si; o
  fator 1,0 põe a peneira em 1,41·A, acima do tremor. **Há teste com 720 fixos
  tremendo parados exigindo distância zero** — com fator 0,5 ele acusava 2,6 km.
- **Ganho de elevação com histerese.** A incerteza vertical do GNSS é duas a
  três vezes a horizontal; somar |Δalt| faz caminhada plana "subir" centenas de
  metros. A referência só se move quando a altitude vence a banda de ruído.
- **A âncora não anda para um fixo ruim.** Se andasse, o próximo fixo bom seria
  medido a partir de um ponto sem confiança e o trecho se perderia. Perder
  distância andada é o pior erro possível deste módulo — é a queixa original.

Teto de inclinação em **150 %**, não 100 %: uma escada é ~45° e a trilha "muito
reta" da peregrinação chega perto: cortar em 100 % jogaria fora justamente o
trecho que mais custa subir. Acima de 150 % é glitch de altímetro (esses
produzem milhares por cento), e só o componente vertical cai — o horizontal
continua valendo.

### 2. Gravar generoso, peneirar ao somar

O portão de gravação cai para 2 m **em 3D** e passa a abrir **também por tempo**
(10 s). Subida lenta e parada em mirante deixavam buraco no traçado exatamente
onde o trecho era mais difícil. O odômetro decide o que conta como distância; a
trilha guarda o formato do caminho. São responsabilidades diferentes e agora
estão em lugares diferentes.

### 3. Passos, porque nenhum ajuste de GPS conserta escada dentro de prédio

Ali não há fixo. O acelerômetro sabe que a pessoa está andando e funciona onde
satélite nenhum chega. `engine/passos.js` faz magnitude, remoção da gravidade
por média móvel, pico com histerese e **janela de cadência humana** (30 a 240
passos/min) — é a janela que impede vibração de veículo de virar caminhada
(há teste com 30 s de vibração a 25 Hz).

**A passada é calibrada contra o GPS** nos trechos em que ele está bom, e a
calibração é recusada se der resultado fora da faixa humana (0,35 a 1,1 m) —
deriva de GPS produziria passada de dois metros e estragaria toda a contagem
seguinte. Sem calibração o número existe mas é **declarado estimativa**:
apresentar chute como medida é pior que não mostrar.

Passo **não é posição**. A trilha e o mapa continuam sendo do GPS; a contagem é
segunda opinião, e é ela que impede o dia inteiro de virar zero quando o sinal
some.

### 4. O aviso do dia é uma notificação SEPARADA

O pedido era ver tempo e metros do dia **sem desbloquear a tela**. O
`@capgo/background-geolocation` já mostra uma notificação — mas **não expõe
método para trocar o texto dela depois do `start()`**: a API tem `start`,
`stop`, `updateHeaders` e geofencing, e nada mais. Reiniciar o serviço a cada
atualização de número interromperia o rastreamento; trocar registro de trilha
por texto bonito seria péssimo negócio numa peregrinação.

Por isso os números vão numa notificação própria
(`@capacitor/local-notifications`), publicada sempre com o **mesmo id** para o
Android substituir em vez de empilhar, `ongoing` para ficar na tela bloqueada e
`silent` para não interromper quem está andando. Atualiza a cada 60 s ou quando
o texto muda — piscar a cada fixo gastaria bateria sem acrescentar informação.

O recorte é o **dia local**, não o total da trilha: numa peregrinação de três
dias o acumulado responde a pergunta errada. E o título diz **em marcha** ou
**parado**, porque número subindo com a pessoa sentada há uma hora induz a erro
sobre o próprio esforço do dia.

### 5. O traçado passa a ser legível

Era uma linha verde chapada de 4 px, que some sobre satélite e se confunde com
estrada sobre topográfico, com farpa em cada curva (junta `miter`, ponta
`butt`). Agora: contorno escuro por baixo, núcleo em `round`, **trecho de
veículo em âmbar tracejado numa camada própria** e marca de partida.

Camada própria por necessidade técnica: `line-dasharray` **não aceita expressão
orientada a dado** no MapLibre, e `['case', ...]` nele quebra o estilo em
runtime. A segmentação por modo é lógica pura e mora em `core/trilha.js`, com
teste — cada troca de modo repete o ponto da virada, senão o traçado abre um
vão bem onde a pessoa entrou no ônibus.

## Como isto foi verificado

- **57 testes novos** (536 no total, verdes), incluindo os três casos que o
  código antigo errava: a escada (subida com deslocamento horizontal pequeno
  entra na distância), o GPS tremendo parado (não vira caminhada) e os passos
  curtos e seguidos (acumulam em vez de serem apagados um a um).
- Camadas do traçado montadas em Chromium sobre um estilo **sem rede**: 2
  trechos a pé, 1 de veículo, 3 no contorno e 1 marca de partida renderizados,
  sem erro — o que valida os `filter` e o `line-dasharray` estático.
- Caminho real com GPS simulado: 40 fixos entraram como 41 pontos de trilha
  pelo portão novo.

## Limites assumidos

- **Um lance de escada isolado, dentro de prédio, continua difícil.** A
  incerteza vertical do GNSS é de ±10 a ±15 m onde a horizontal é ±5 m: três
  metros de subida estão abaixo do ruído, e dentro do prédio nem fixo existe.
  Quem responde ali é o contador de passos — que diz *que* se andou e
  aproximadamente *quanto*, nunca *onde*.
- A contagem de passos não distingue subir escada de andar no plano.
- No iOS 13+ o acelerômetro exige permissão pedida dentro de um gesto; por isso
  ela nasce do toque no botão de rota.
- O aviso da jornada depende de `POST_NOTIFICATIONS` no Android 13+; negada a
  permissão, o módulo se declara `NEGADO` em vez de publicar no vazio.
- Neste ambiente de sandbox os tiles são bloqueados e o evento `load` do mapa
  não dispara, então o traçado foi verificado com as camadas isoladas. No
  aparelho, com tiles, o `load` ocorre normalmente.

## Alternativas descartadas

- **Reiniciar o serviço de fundo para trocar o texto da notificação.** Criaria
  buraco no rastreamento. Ver decisão 4.
- **Limiar fixo em metros para aceitar um fixo.** É o que havia, e não
  significa nada entre um fixo de ±3 m e um de ±40 m.
- **Somar |Δalt| para ganho de elevação.** Transforma caminhada plana em
  montanha. Ver decisão 1.
- **Confiar só no GPS e aceitar que dentro de prédio não se mede nada.** Era o
  comportamento anterior, e foi exatamente o que o operador reportou como
  inaceitável.
