# Motor de rota — **decisão pendente**, não especificação fechada

> ⚠️ Este documento existe para uma escolha ser feita, não para descrever algo
> que existe. **Não há motor de rota no Vanguard.** Busca por
> `RouteEngine|calcularRota|routing|OSRM|Valhalla|instrucao` em `src/`: zero
> ocorrências.

## O que existe hoje

[`src/core/navegacao-rumo.js`](../../src/core/navegacao-rumo.js), 58 linhas:
rumo e distância **geodésica em linha reta** até um destino. Serve para
"aponte para lá e ande", que é exatamente o que um mapa de campo precisa em
mata aberta — e é inútil numa cidade, onde entre você e o destino há
quarteirões.

Não há segmentos, geometria de via, instruções, detecção de desvio nem
recálculo.

## A escolha que trava tudo

O §19–21 pede `RouteEngine`, rota dinâmica e recálculo. A arquitetura inteira
depende de uma pergunta que **não é técnica, é de produto**:

### Opção A — roteamento com rede (OSRM, Valhalla, GraphHopper)

| | |
|---|---|
| esforço | baixo: um adaptador HTTP e o contrato |
| qualidade | alta: malha real, instruções, perfis por modo |
| **custo** | **não funciona sem sinal** |

O Vanguard se descreve como **offline-first**. Um motor de rota que exige
internet contradiz a promessa central do aplicativo exatamente na hora em que
ele mais importa — estrada vazia, mata, emergência.

Aceitável **se** a rota for tratada como recurso online declarado, ao lado de
uma degradação honesta para o rumo em linha reta quando não há sinal. O §36
manda a interface mostrar o estado real; aqui isso significa dizer "rota
indisponível sem internet" em vez de fingir.

### Opção B — roteamento offline sobre malha embarcada

| | |
|---|---|
| esforço | alto: importar OSM, construir grafo, indexar, A*/CH, empacotar por região |
| qualidade | boa dentro da área baixada; nula fora dela |
| **custo** | **espaço** |

Ordem de grandeza para calibrar a conversa (não medido neste repositório):
uma malha viária de área metropolitana em formato compacto fica na casa de
**dezenas de MB**; um estado inteiro, centenas. O aplicativo já baixa tiles por
área — o modelo mental existe.

### Opção C — híbrido

Rede quando há, malha embarcada da área preparada quando não há. É o que
casaria com o resto do produto, e é a soma dos dois esforços.

## O que decide

1. **Onde o Vanguard é usado sem sinal?** Se a resposta for "quase sempre", a
   Opção A está fora, por mais barata que seja.
2. **Quanto espaço o aparelho pode gastar por região?** Isso define se B é
   viável antes de qualquer linha de código.
3. **Rota para quem anda ou para quem dirige?** Pedestre em trilha quer rumo e
   desnível; motorista quer via, sentido e conversão. São motores diferentes.

## O que já está pronto para receber qualquer uma das três

- **trilha real, sem teto** — map matching precisa do traçado íntegro, e ele
  agora existe;
- **`casada: null`** no motor de distância — o campo já está reservado e
  declarado vazio, então ligar map matching não muda o contrato;
- **qualidade por ponto** — um casamento com a malha vai querer saber quais
  fixos merecem confiança.

## Enquanto não houver decisão

Nada de motor de rota é construído. Construir o errado custa o motor inteiro, e
o §43 manda perguntar antes de reescrever.
