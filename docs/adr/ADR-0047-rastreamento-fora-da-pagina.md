# ADR-0047 — o rastreamento sai da página: quem observa não possui

- **Status:** Aceita
- **Data:** 2026-09-05
- **Escopo:** `src/core/rastreamento-app.js`, `src/core/trilha-gravador.js`, `src/core/rastreamento.js`, `src/pages/mapa.js`
- **Relacionada:** [ADR-0043](ADR-0043-odometro-3d-passos-e-jornada.md) (odômetro 3D, passos e jornada) · [`docs/v3/`](../v3/) (a V3 de navegação)

## Contexto

Até a 1.6.0 o rastreamento inteiro morava dentro de `mapaPage()`, em
`src/pages/mapa.js`. O watcher de GPS, o controle de segundo plano, o array da
trilha, o portão que decide se o fixo entra e a escrita no `localStorage` eram
todos **variáveis de uma função de página**.

O `desmontar()` dessa página terminava assim:

```js
configurarWakeLock(false); pararGps();
```

Isso significa uma coisa só, e ela foi medida no navegador: **ir de `#/mapa`
para `#/bussola` encerrava a gravação.** Sem sair do aplicativo, sem aviso e
sem erro. A trilha simplesmente parava de crescer enquanto a pessoa continuava
andando, e voltar ao mapa recomeçava a gravar como se nada tivesse acontecido.

Conferir a bússola no meio de uma caminhada é exatamente o que se faz numa
caminhada. Era exatamente o que apagava o resto do trajeto.

O `npm run verificar:fluxos` rodado contra o código anterior mostra o defeito
em números: **5 pontos gravados, sair do mapa, andar mais três trechos, 5
pontos.** Com a correção, o mesmo roteiro dá **4 → 7**.

Junto com isso vinha um segundo defeito, na mesma linha de código:

```js
trilha = [...trilha, ponto].slice(-12000);
```

`.slice(-12000)` descarta os pontos mais **antigos** — o começo da caminhada —
a partir de ≈24 km, sem contagem, sem aviso e sem registro em lugar nenhum.

## Decisão

**A página observa; não possui.**

O rastreamento passa a ser um serviço do aplicativo, em dois módulos:

| módulo | papel |
|---|---|
| `core/trilha-gravador.js` | a trilha, o portão `deveRegistrar` e o estado da rota |
| `core/rastreamento-app.js` | o dono único do watcher e do controle de segundo plano |

`mapa.js` se inscreve com `rastreio.observar(...)`. O cancelador devolvido tira
a plateia e **não desliga nada** — é essa a diferença entre observar e possuir.
Quem encerra a gravação é `definirRota({ ativa: false })`, e quem apaga é
`limpar()`: as duas são um toque explícito de quem está usando o aplicativo,
nunca efeito colateral de navegar.

### O watcher fica ligado enquanto houver plateia OU rota ativa

Sem os dois ele desliga. Não é para gastar bateria à toa, e "sem plateia e sem
rota" não é gravação a ser encerrada — é gravação que não existe.

### "Aba oculta" só pausa enquanto existe tela viva para estar oculta

A pausa do primeiro plano era decidida pela página (`document.hidden`). Se a
página morresse enquanto oculta, a pausa ficaria presa para sempre. Agora a
regra é do serviço: pausa enquanto o segundo plano cobre **ou** enquanto toda
tela viva está oculta. Tela que morre leva junto a informação de visibilidade.

### O corte deixa de ser silencioso

O teto do espelho em `localStorage` continua existindo — uma chave sem teto
estoura a cota de ~5 MB —, mas cada ponto que sai da janela agora é contado em
`saidosDaJanela()`, e o **registro completo** vai para o Track Store da V3:
IndexedDB, append-only, sem teto.

É escrita dupla, e é aditiva:

| destino | papel | teto |
|---|---|---|
| `vanguard:trilha` (localStorage) | o que a interface lê hoje | janela declarada |
| Track Store da V3 (IndexedDB) | o registro completo | **nenhum** |

A chave v1 continua intacta e continua sendo a fonte da tela. Nada é apagado
para o novo caber — é a política de [`docs/v3/DATA_MIGRATION_POLICY.md`](../v3/DATA_MIGRATION_POLICY.md).

## Consequências

- `src/pages/mapa.js` perde 111 linhas e ganha 87: a página encolhe e passa a
  ler três espelhos (`trilha`, `rotaAtiva`, `rotaPausada`) que ela **nunca
  escreve**. As dezenas de leituras espalhadas pelo arquivo não mudaram.
- Nenhuma funcionalidade da página saiu: rota, pausa, retomada, parada,
  limpeza, importação, exportação, segundo plano, wake lock, passos, jornada,
  foto de parada e trajeto continuam exatamente onde estavam.
- Um serviço singleton implica **um** watcher no aplicativo inteiro. Duas telas
  observando compartilham o mesmo — há teste cobrando que nunca haja dois.
- O espelho da V3 se declara: `espelho()` diz `INDEXEDDB`, `MEMORIA` (aba
  privativa, WebView sem IndexedDB) ou `DESLIGADO`. Supor IndexedDB onde não há
  seria fingir durabilidade.

## Alternativas descartadas

- **Manter o gravador na página e só não parar no `desmontar()`.** O watcher
  seguiria vivo, mas o `registrarPosicao` é uma função da página: sem página,
  ninguém escreve. Consertaria o sintoma visível (GPS ligado) e não o defeito
  (trilha parada).
- **Reescrever `mapa.js` em cima do Track Store da V3.** É a segunda
  arquitetura paralela que a V3 proíbe (§43: reparar, adaptar, migrar — não
  reescrever). A trilha v1 é o que a interface inteira lê; trocá-la de uma vez
  seria uma migração destrutiva disfarçada de limpeza.
- **Tirar o teto do `localStorage`.** A cota de ~5 MB é real. O teto fica; o
  silêncio é que sai.

## Como isto é cobrado

- `test/trilha-gravador.test.js` (20 testes) — o portão, o corte contado, e que
  parar não apaga.
- `test/rastreamento-app.test.js` (20 testes) — entre eles o que leva o nome do
  defeito: observar, parar de observar, e conferir que a trilha continuou
  crescendo sem ninguém olhando.
- `npm run verificar:fluxos` — três fluxos novos no navegador de verdade, com
  o mapa desmontado e a posição andando. Rodados **contra o código anterior**
  para confirmar que o fluxo enxerga o defeito: 5 → 5.
