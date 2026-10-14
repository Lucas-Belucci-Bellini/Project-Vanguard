# `#/clima` — Tempestade

**Estado:** `IMPLEMENTED`

## Objetivo
Responder, numa estrada à noite, a duas perguntas diferentes: **a que distância
está o raio que acabei de ver** (sem rede) e **o que vem nas próximas horas**
(com rede).

A ordem na tela é deliberada: o cronômetro do trovão vem em cima porque a rede
é a primeira coisa a sumir num temporal, e a medida que decide procurar abrigo
é justamente a que não depende dela.

## Entrada
Dois toques: um no clarão, outro no trovão. Nada digitado.

## Dados necessários
Nenhum para a metade offline. Para as condições: posição (do serviço de
rastreamento ou do último fixo guardado) e internet.

## Dependências
`engine/tempestade.js`, `core/clima.js`, `core/rastreamento-app.js`,
`ui/formato-trajeto.js`. Fonte de dados: **Open-Meteo, sem chave de API** —
token dentro de um APK é extraível.

## Ações
- **VI O CLARÃO / OUVI O TROVÃO** — cronometra e converte em distância, com a
  incerteza junto. Vibra ao fechar a medida; padrão diferente quando o
  resultado é ABRIGO AGORA.
- **CANCELAR** — descarta uma cronometragem começada por engano.
- **ATUALIZAR COM INTERNET** — busca condições e previsão. Também roda sozinho
  ao abrir a tela.

## Saídas
Distância do raio ± incerteza, velocidade do som usada e se a temperatura foi
medida ou suposta; veredito da regra 30/30; tendência (vindo, indo, estável);
contagem regressiva dos 30 minutos após o último trovão; condições atuais
(céu, temperatura, sensação, chuva, vento, rajada, umidade, pressão) e oito
horas de previsão com probabilidade de chuva e rajada.

## Estados
- **EMPTY** — sem medida: `SEM MEDIDA`, e o texto diz que ausência de medida
  **não é** ausência de risco.
- **SUCCESS** — medida válida, veredito colorido conforme o risco.
- **WARNING** — trovoada na previsão: faixa em destaque com a hora de início.
- **UNAVAILABLE** — sem rede: a leitura guardada continua na tela, com a idade
  dita. Sem leitura guardada, o cronômetro continua funcionando.
- **ERROR** — intervalo acima de ~25 km é recusado: não é o mesmo raio.

## Limitações
- **O aplicativo não detecta raio.** Celular não tem sensor para isso. Quem vê
  e ouve é a pessoa; o app cronometra e faz a conta.
- **A distância é até o ponto mais próximo do canal**, que tem quilômetros de
  comprimento — não até onde o clarão pareceu estar.
- **A previsão é de modelo numérico regional**, não observação do ponto exato.
  Envelhece, e a idade aparece ao lado do número de propósito.
- **Não substitui alerta oficial.** Defesa Civil (199) e avisos do INMET vêm
  antes, sempre.
- **Não existe rótulo de "seguro".** A escala vai até `DISTANTE` e para ali:
  descargas atingem o solo a 10–15 km da chuva, sob céu que parece limpo.

## Testes
`test/tempestade.test.js` (13 testes: fórmula do som conferida em três pontos,
os ~10 km da regra 30/30, incerteza sempre presente, tendência, espera dos 30
min, códigos WMO), `test/clima.test.js` (11 testes: URL sem chave, falha de
rede **preserva** a leitura guardada, resposta inválida não sobrescreve, sem
posição não se inventa coordenada); fluxos de `scripts/verificar-fluxos.mjs`.
