# `#/trilhas` — O que cada um andou

**Estado:** `IMPLEMENTED`

## Objetivo
Comparar o que **cada pessoa** realmente caminhou. Numa peregrinação, dez
pessoas saem do mesmo lugar e chegam no mesmo lugar e nenhuma anda a mesma
coisa: uma corta por dentro, outra erra a saída e volta, outra faz a variante
por outra cidade.

E, a partir dessas trilhas, dizer **o que elas contam sobre o guia** — porque
um traçado de referência envelhece, e quem o corrige é quem caminha.

## Entrada
Arquivos GPX, KML ou o JSON do próprio app, um por pessoa. Ou uma cópia da
trilha que este aparelho gravou.

## Dados necessários
Nenhuma rede. O acervo é um banco IndexedDB **próprio**
(`vanguard-acervo`), separado de `vanguard:trilha` e do Track Store da V3 —
importar a trilha de dez peregrinos não encosta no que o aparelho está
gravando agora.

## Dependências
`engine/comparar-trilhas.js`, `core/dados/acervo-trilhas.js`,
`engine/distancia.js`, `core/registro-offline.js`, `ui/formato-trajeto.js`.

## Ações
- **IMPORTAR GPX / KML / JSON** — guarda a trilha com um nome. Pergunta o nome
  em vez de adivinhar: a comparação é lida por pessoa.
- **GUARDAR A TRILHA DESTE APARELHO** — **copia** a trilha em gravação para o
  acervo. A gravação em andamento não é interrompida nem alterada.
- **Escolher a referência** — qualquer trilha do acervo. A referência não é
  verdade: é a linha contra a qual as outras são medidas.
- **APAGAR** — exige digitar o **nome exato**. Lista é fácil de tocar por
  engano, e a caminhada de alguém não volta.

## Saídas
Por pessoa: distância andada (pelo odômetro, com vão de sinal declarado),
fração dos fixos dentro de 60 m da referência, e o maior afastamento.

E o quadro do guia, em três evidências contadas:
- **CONFIRMADO** — trechos da referência com 3+ pessoas passando;
- **SEM MOVIMENTO** — trechos com menos que isso;
- **CAMINHO NOVO** — lugares fora da referência com 3+ pessoas passando, com
  coordenada, para dar para ir conferir.

## Estados
- **EMPTY** — acervo vazio, ou só a referência guardada: diz o que falta.
- **SUCCESS** — tabela por pessoa, com a linha divergente marcada.
- **ERROR** — arquivo ilegível, ou referência com menos de dois pontos.

## Limitações
- **A referência pode estar velha.** Quatro pessoas fora dela no mesmo lugar
  provavelmente significa que o caminho mudou, não que quatro erraram. A tela
  nunca escreve "errou".
- **O aplicativo NÃO gera traçado novo.** A média entre duas variantes
  legítimas passa pelo meio do mato, entre as duas. Ele conta quem passou por
  onde; a decisão de atualizar o guia é de quem organiza a caminhada.
- **A faixa de 60 m é escolha declarada**, não natural: o erro do GNSS nas duas
  trilhas soma ~28 m em quadratura, e 60 m cobre isso mais a largura de uma
  estrada rural. Abaixo de ~40 m a medida vira contagem de erro de GPS.
- **A contagem é por trilha distinta**, nunca por ponto: quem parou para
  almoçar deixa duzentos fixos no mesmo lugar.
- **Sem map matching.** A comparação é entre trilhas, não contra a malha viária.

## Testes
`test/comparar-trilhas.test.js` (17 testes: o defeito do `Infinity` corrigido,
grade espacial conferida contra distância conhecida, cobertura ≠ "no caminho",
contagem por trilha e não por ponto, custo por ponto que não explode),
`test/acervo-trilhas.test.js` (7 testes: guardar várias sem sobrescrever,
apagar exigindo nome exato).
