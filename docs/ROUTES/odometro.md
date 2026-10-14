# `#/odometro` — Contador de trajeto

**Estado:** `IMPLEMENTED`

## Objetivo
Responder "quantos metros e quantos quilômetros eu já andei" **sem carregar
mapa**. A mesma pergunta só era respondida dentro de `#/mapa`, que traz o
MapLibre (802 kB), instancia o motor e busca tiles pela rede — caro demais
para uma pergunta que não precisa de mapa nenhum, e impossível numa estrada
sem sinal com bateria curta.

## Entrada
Nenhuma. A tela não tem campo: ela lê o gravador do aplicativo.

## Dados necessários
Fixo do GPS, pelo serviço de rastreamento (`core/rastreamento-app.js`).
**Nenhum tile, nenhuma rede, nenhum armazenamento próprio.**

## Dependências
`core/rastreamento-app.js`, `core/trilha-gravador.js`, `engine/distancia.js`,
`engine/odometro.js`, `ui/formato-trajeto.js`, `core/localizacao.js`.

## Ações
- **INICIAR / PAUSAR / RETOMAR** — a MESMA rota que `#/mapa` controla. Duas
  telas, um gravador; nunca dois números para a mesma caminhada.
- **PARAR E GUARDAR** — encerra a rota **sem apagar** o registro. Apagar é
  decisão explícita e o lugar dela continua sendo `#/mapa`.

## Saídas
Distância (m até 1 km, depois km), tempo decorrido, ritmo em min/km,
velocidade instantânea, subida e descida acumuladas, precisão do fixo atual e
quantidade de pontos no traçado.

## Estados
- **EMPTY** — parado e sem pontos: convida a iniciar.
- **SUCCESS** — contando; a borda da leitura principal acende.
- **PAUSED** — pausado; diz que o medido continua guardado.
- **UNAVAILABLE** — sem fixo, `FIXO` mostra `SEM FIXO`. O tempo continua
  correndo, para a tela não parecer travada.
- **WARNING** — houve perda de sinal: os metros não observados aparecem em
  destaque, **fora** do total.

## Limitações
- **Não faz map matching.** A distância é sobre os fixos, não sobre a rua.
- **Vão de sinal não é somado.** A reta entre dois fixos separados por um
  buraco é palpite; ela é declarada ao lado, nunca somada (ADR-0043,
  `engine/distancia.js`).
- **Ritmo se cala abaixo de 50 m.** Com menos que isso o ruído do GNSS domina,
  e um ritmo inventado na tela é pior que campo vazio.
- **Não conta passos.** O contador de passos acompanha a rota em `#/mapa`;
  duplicá-lo aqui somaria a mesma caminhada duas vezes.
- A precisão anunciada é a que o aparelho informa — `accuracy` é raio de 95 %,
  não desvio padrão.

## Testes
`test/formato-trajeto.test.js` (formatação e os casos em que ela se cala),
`test/odometro-corrente.test.js` (o acumulador é idêntico ao lote, em cada
prefixo), `test/trilha-gravador.test.js` (a distância não encolhe quando a
janela corta), `test/odometro.test.js` e `test/distancia.test.js` (o motor).
