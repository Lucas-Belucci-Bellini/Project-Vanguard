# ADR-0038 — trajeto cronometrado, modo de deslocamento e alerta de exposição

- **Status:** Aceita
- **Data:** 2026-08-30
- **Escopo:** caminhada em grupo — tempo, trechos de veículo e exposição ao sol

> GPS posiciona e registra localmente. Nada aqui transmite dados, aciona
> socorro ou substitui julgamento de quem está na estrada.

## Contexto

Três necessidades vieram do uso real numa peregrinação: saber quando a
caminhada começou e terminou, separar o trecho feito de ônibus do trecho
andado, e ser avisado quando continuar no sol fica arriscado.

## Decisão

### Trajeto: total e marcha são números diferentes

`src/core/trajeto.js` guarda início, fim e paradas. Descansar três horas ao
longo do dia não deixa a caminhada mais lenta — aumenta o total. Misturar as
duas medidas esconde as duas, então o resumo devolve `duracaoTotalMs`,
`tempoDescansandoMs` e `tempoEmMarchaMs` separados.

A parada tem começo e fim explícitos e nunca é fechada por adivinhação. Uma
parada aberta é contada até agora; encerrar o trajeto fecha a parada no mesmo
instante, senão o descanso cresceria para sempre depois do fim.

`tempoEmMarchaMs` é o total menos o descanso — **não** uma medição de
movimento. Ficar parado sem marcar parada continua contando como marcha, e é
por isso que a parada é um gesto da pessoa.

### Veículo: inferência que pergunta, não detecção que decide

`src/core/deslocamento.js` separa a trilha por velocidade: até 8 km/h é
caminhada, a partir de 12 km/h a hipótese de veículo se sustenta, e o meio fica
`INDEFINIDO` em vez de escolher um lado. Trecho rápido curto demais não vira
ônibus, e salto acima de 200 km/h entre dois fixos é descartado como erro de
GPS em vez de virar quilometragem.

**O celular não sabe que você está num ônibus.** Ele sabe a que velocidade a
posição mudou. Ônibus parado no trânsito parece pedestre; ladeira abaixo parece
veículo; reflexão de sinal em cidade inventa velocidade. Por isso o resultado é
sugestão com nível de confiança, a tela **pergunta**, e a confirmação da pessoa
vence a inferência nos pontos que ela cobre.

### Exposição: o que o aparelho sabe e o que ele não sabe

**Um celular comum não mede temperatura do ar.** Os sensores térmicos que ele
tem medem bateria e processador, e não são expostos por API web nem pelo
Capacitor. Sem rede, nenhum aplicativo de celular sabe quantos graus fazem
naquela estrada. Inventar esse número seria pior do que não ter: a pessoa
decidiria se continua andando no sol com base nele.

`src/core/exposicao.js` usa então os dois fatores que existem offline:

| Fator | Origem | Disponível sem rede |
|---|---|---|
| Altura do sol | `engine/sol.js`, geometria NOAA | sim |
| Tempo desde a última parada | relógio do trajeto | sim |
| Temperatura do ar | fonte externa com valor, fonte e horário | **não** |

Sol acima de 60° é `ALTO`; duas horas sem parada é `ALTO`; os dois juntos viram
`CRITICO`. Temperatura entra apenas quando recebida com valor, fonte e horário
recente — leitura velha ou sem origem é ignorada **com o motivo declarado na
tela**, em vez de virar alerta baseado no clima de horas atrás.

A vibração acontece em `ALTO` e `CRITICO`, no máximo uma vez a cada quinze
minutos. `navigator.vibrate` funciona no Android e é ignorado pelo iOS; o aviso
em texto é o canal que funciona nos dois.

### Vibração: um ritmo por tipo de aviso

Se todo aviso vibrar igual, a pessoa tira o aparelho do bolso para descobrir o
que era — justamente o que o aviso tátil deveria evitar. `alertas-tateis.js`
dá a cada tipo um ritmo próprio e reserva a gravidade para a repetição, de modo
que o tipo continue reconhecível quando aperta. O intervalo entre avisos é por
tipo: sol não cala tempestade.

Chuva, tempestade e frio já têm ritmo e **não têm gatilho**: não existe sensor
de chuva no celular, e o barômetro, quando o aparelho tem, não é exposto ao
aplicativo. Eles ficam marcados com `gatilhoDisponivel: false` até existir uma
fonte com origem e horário, para a tela nunca prometer um aviso que não chega.

## Limites

O alerta é um lembrete calculado, **não** um diagnóstico. Ele não mede
temperatura, umidade, vento, sombra da via, condição física de ninguém nem
sinais de insolação. Estrada de terra sem árvore e estrada sombreada produzem
o mesmo número, porque o aplicativo não tem dado de cobertura do solo.

A separação por modo não corrige a trilha nem apaga pontos: ela classifica. Um
trecho `INDEFINIDO` continua contado na distância total e separado no resumo.

Nada disso substitui água, chapéu, sombra, ritmo do grupo e a decisão de quem
está lá.

## Evidência

`test/trajeto.test.js` (15 casos), `test/deslocamento.test.js` (16),
`test/exposicao.test.js` (12) e `test/sol.test.js` (9), este último ancorado em
identidades verificáveis: obliquidade de 23,44° nos solstícios, declinação zero
nos equinócios, elevação máxima igual a 90 − |lat − δ|, simetria em torno do
meio-dia solar e sol da meia-noite no círculo polar.

Verificação no navegador: com uma parada de 3 s no meio, o total foi a 8 s
enquanto a marcha ficou em 5 s; encerrar congelou os três números; o trajeto
sobreviveu no armazenamento local.
