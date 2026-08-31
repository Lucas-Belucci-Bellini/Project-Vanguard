# ADR-0041 — escuta de ambiente: analisador de frequências que só recebe

- **Status:** Aceita
- **Data:** 2026-08-31
- **Escopo:** `src/engine/escuta.js`, `src/core/escuta-ambiente.js`, tela `#/escuta`

## Contexto

Numa peregrinação com centenas de pessoas em fila numa estrada rural, o aviso
que importa chega pelo ar antes de chegar pelos olhos. Duas situações se
repetem: **um veículo vindo por trás** — caminhão, ônibus, carro — em trecho sem
acostamento, e **uma mensagem gritada de pessoa em pessoa** ("vem caminhão",
"encosta pra direita") que morre no meio da fila.

O pedido do operador foi direto: um analisador de frequências que use o
microfone para perceber isso — *"quase um walk talk, mas eu quero ter mais a
função de escutar"* — e a razão de não transmitir também foi dele: um app que
fala vira brinquedo de quem quer atrapalhar.

## Decisão

### 1. Recepção apenas, e de forma estrutural

O grafo de áudio é `MediaStreamSource → AnalyserNode` e **termina ali**. Não há
`MediaRecorder`, `RTCPeerConnection`, `createMediaStreamDestination`, `WebSocket`,
`fetch`, `localStorage` nem `indexedDB` em `escuta-ambiente.js` ou `escuta.js`, e
a fonte **não é ligada em `destination`**. O que atravessa a fronteira desses
módulos são números: nível por banda, piso do lugar, inclinação.

Isso não é uma promessa de documentação. `test/escuta-ambiente.test.js` lê o
código-fonte dos dois arquivos e falha se qualquer uma dessas APIs aparecer, e
outro teste verifica no grafo falso que a única conexão feita é para o
analisador. Uma futura "melhoria" que transmita áudio quebra o CI antes de
chegar ao aparelho de alguém.

### 2. A antena do celular não entra nisto

Rádio FM, sinal de celular e Wi-Fi **não são acessíveis** a um aplicativo como
receptores: não existe API web nem plugin Capacitor para sintonizar frequências
de rádio, e nos aparelhos com chip FM o acesso passa por app do fabricante e
exige fone com fio como antena. O sensor deste recurso é o **microfone**, e a
tela diz isso em vez de deixar entender outra coisa.

### 3. A matemática fica no motor, sem DOM

`src/engine/escuta.js` recebe um vetor de decibéis por bin e devolve níveis,
pico, inclinação e a decisão. Não toca em `window`, `document` nem npm — pela
regra do repositório, e porque é isso que permite testar oito segundos de
aproximação em vinte e oito milissegundos, com relógio injetado.

### 4. Três bandas, e duas delas não se cruzam

| banda | faixa | por quê |
|---|---|---|
| MOTOR | 30–200 Hz | diesel de caminhão a ~1400 rpm com seis cilindros queima a 70 Hz; grave contorna obstáculo e atravessa distância |
| RODAGEM | 600–1600 Hz | ruído de pneu no asfalto, dominante acima de ~50 km/h; confirma que a máquina está andando |
| VOZ | 300–3400 Hz | banda de telefonia, onde mora um grito |

**MOTOR e VOZ são disjuntas de propósito**: é a comparação entre as duas que
separa "vem vindo um caminhão" de "alguém gritou". Há teste cobrando essa
separação, porque encostá-las tornaria a comparação sem sentido.

### 5. Comparar com o piso do lugar, nunca com um limiar fixo

O mesmo aparelho lê níveis diferentes no bolso, na mão e no vento, e cada modelo
tem ganho próprio: um limiar absoluto em decibéis não significa nada entre dois
celulares. A referência é sempre o **piso de ruído do próprio lugar**, rastreado
por um seguidor que **desce rápido (α=0,25) e sobe devagar (α=0,02)**.

A assimetria é o ponto: um piso que subisse junto com o sinal engoliria
exatamente a subida que denuncia a aproximação, e o alerta nunca dispararia.

### 6. Três defesas contra alarme falso

Um aviso que vibra à toa é pior que nenhum — a pessoa desliga.

1. **Margem sobre o piso.** Alto e constante (parar ao lado de um gerador) vira
   piso, não alerta.
2. **Inclinação por mínimos quadrados** sobre a janela, não diferença
   ponta-a-ponta: um estalo isolado pesa pouco na reta.
3. **Sustentação por mediana de terços.** O terço final da janela precisa
   superar o terço inicial. Um esbarrão no bolso é grave, forte e curto —
   desenha uma reta subindo tão bem quanto um caminhão, e só esta defesa o nega.

Para o chamado de voz há uma quarta: a voz precisa ter subido **6 dB a mais que
o grave**. Uma pancada no corpo do aparelho acopla direto no microfone e sobe em
toda a faixa de uma vez; uma pessoa gritando a vinte metros sobe na voz e quase
nada no grave, porque grave irradia mal de uma boca.

### 7. O microfone é pedido cru

`echoCancellation`, `noiseSuppression` e `autoGainControl` são pedidos
**desligados**. O ganho automático existe para manter a voz num volume
constante — ou seja, para apagar a subida de nível que este detector mede.
O navegador pode recusar o pedido, e por isso a tela mostra um aviso quando o
ganho automático veio ligado: a leitura fica menos confiável e quem lê precisa
saber antes de culpar o detector.

### 8. Os limiares são ponto de partida, e a tela admite isso

Os números de `LIMIARES_PADRAO` saíram do raciocínio acima, **não de gravações
em estrada**. Chamar isso de calibração seria mentira. Por isso são parâmetros,
a tela mostra nível, piso e inclinação ao vivo, e há três réguas de
sensibilidade. Calibrar é trabalho de campo; a tela existe para tornar esse
trabalho possível.

### 9. Vocabulário tátil próprio

Dois ritmos novos em `alertas-tateis.js`, distintos de todos os existentes:

| aviso | ritmo | como se reconhece |
|---|---|---|
| veículo se aproximando | `[450, 120, 120]` | um pesado e dois leves — "vem vindo, sai" |
| chamado de voz | `[140, 300, 140]` | curto-longo-curto, simétrico, como um apito |

O intervalo entre repetições é de **30 s e 20 s**, não os 10–20 minutos dos
avisos de clima: um veículo leva de dez a vinte segundos entre ser ouvido e
passar, e um aviso represado por minutos chegaria depois dele.

## Como isto foi verificado

- 20 testes de unidade no motor, ancorados em propriedades verificáveis: a
  largura de bin sai da definição da FFT (48000/2048 = 23,4375 Hz), a média de
  potência de metade dos bins em silêncio dá exatamente 10·log₁₀(0,5) = −3,01 dB,
  e a inclinação de pontos colineares devolve o próprio coeficiente da reta.
- 8 testes no módulo de ambiente, incluindo os dois estruturais de "não
  transmite" e a soltura do microfone ao parar.
- **Conferência contra a FFT real do navegador**: tons de 120 Hz e 1000 Hz
  gerados por `OscillatorNode` num `OfflineAudioContext` e lidos pelo motor. Os
  picos voltaram em 129 Hz e 991 Hz — **9 Hz de erro, com meio bin valendo
  10,8 Hz**, ou seja dentro da resolução da própria FFT. A separação de banda
  ficou em 84 dB e 93 dB. Isto valida que a conta de bin do motor bate com a que
  a Web Audio API realmente usa, que é o que teste com espectro sintético não
  alcança.
- Caminho completo na tela, em Chromium a 412×915: piso aprendido em −70,0 dB,
  aproximação levando o grave a −47,8 dB com o piso ainda em −58,2 dB (o
  seguidor lento funcionando), inclinação de +2,50 dB/s, alerta na tela e
  `navigator.vibrate` chamado com `[450,140,120,140,120,420,450,140,120,140,120]`
  — o ritmo do tipo, repetido duas vezes por ser gravidade ALTO.

## Limites assumidos

- **Não diz de que lado vem.** Direção exigiria dois microfones separados por
  distância conhecida; o navegador entrega um canal.
- **Não identifica o veículo nem entende palavra falada.** Mede energia por
  faixa, não conteúdo.
- **Com a tela apagada o sistema pode suspender o processamento de áudio.** A
  tela avisa que, no trecho em que a escuta importa, a tela precisa ficar ligada.
- **Ocupa o microfone e gasta bateria.** Uma chamada ou outra gravação
  interrompe a escuta.

## Alternativas descartadas

- **Transmitir (walkie-talkie).** Recusada pelo operador, e a recusa está no
  código, não só na documentação. Ver decisão 1.
- **Amplificar o ambiente no fone.** Vira aparelho auditivo, com realimentação,
  e não foi o que se pediu.
- **Classificador treinado de sons.** Precisaria de modelo embarcado e de base
  de gravações que não existe. As três defesas acima são explicáveis, ajustáveis
  e cabem em um arquivo que se lê inteiro.
- **Limiar absoluto em decibéis.** Não significa nada entre dois modelos de
  celular. Ver decisão 5.
