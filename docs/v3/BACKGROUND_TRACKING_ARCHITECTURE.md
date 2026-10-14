# Rastreamento em segundo plano — arquitetura

Implementação: [`src/core/rastreamento.js`](../../src/core/rastreamento.js).
Teste: `test/rastreamento.test.js`.

## O defeito

Na 1.6.0 o watcher de GPS, o controle de background e o `registrarPosicao` eram
variáveis de `src/pages/mapa.js`. O `desmontar()` da página chamava
`backgroundControle.desmontar()` e `pararGps()`.

**Sair de `#/mapa` para `#/bussola` encerrava o rastreamento** — sem sair do
aplicativo, sem aviso, sem erro. A trilha parava de crescer com a pessoa ainda
andando.

## A regra

> **Página observa, não possui.**

Deixar de observar nunca para a gravação. Só `parar()` para, e `parar()` é
decisão de quem está usando — nunca efeito colateral de navegação.

## Estados

```
PARADO ──iniciar()──> GRAVANDO ──pausar()──> PAUSADO ──retomar()──> GRAVANDO
                          │                                             │
                          └──── 60 s sem fixo ────> SEM_SINAL ──fixo────┘
                          │
                          └──parar()──> PARADO
```

`SEM_SINAL` existe para a interface poder dizer "sem sinal" em vez de mostrar
uma tela parada que parece funcionando.

## Duas fontes, um gravador

Primeiro e segundo plano entregam para o **mesmo** recorder. É o Track Store,
com a classificação de ponto, que decide o que fazer com fixo repetido — por
isso as duas fontes podem se sobrepor na transição sem duplicar a trilha.

## O que não derruba a gravação

| evento | reação |
|---|---|
| página desmontada | continua gravando |
| erro do provedor | conta o erro, mantém a sessão, retoma quando o fixo volta |
| observador lança exceção | ignorado; quem anda não perde a trilha porque uma tela quebrou |
| sem plugin de background (web) | grava em primeiro plano e **declara** que não há background |

## Recuperação

`recuperar()` devolve a sessão aberta e religa os sensores. Cobre: app morto
pelo sistema, aparelho reiniciado, aba recarregada, troca de tela.

## Limites reais da plataforma

O §10 manda **não fingir** que existe background onde a plataforma bloqueia.
Hoje: `@capgo/background-geolocation` só em plataforma nativa; na web o estado é
`UNAVAILABLE`, dito na interface. Isso não é defeito — é a plataforma, declarada.

## Pendente

Ligar `src/pages/mapa.js` ao serviço. O serviço está pronto e testado com
dependências injetadas; a página ainda usa o caminho antigo.
