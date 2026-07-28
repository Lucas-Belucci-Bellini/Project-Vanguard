<div align="center">

# ⌖ PROJECT VANGUARD

**GPS topográfico tático + computador de tiro**
Estética e funcionalidade do mapa do Arma 3, trazidas para o mundo real.

Parte do ecossistema [**Projeto Baluarte**](https://github.com/Lucas-Belucci-Bellini/Projeto-Baluarte)

`JavaScript puro (ES2022)` · `Vite 5` · `MapLibre GL` · `zero dependências no motor`

</div>

---

## O que é

Duas ferramentas que compartilham um motor:

**🗺️ Mapa tático** — mapa topográfico ou satélite com **grade MGRS sobreposta**,
leitura de coordenadas ao vivo, marcação de peça e alvo, azimute de grade e
distância. A grade não é um quadriculado decorativo: cada linha é uma linha
real de easting/northing UTM convertida ponto a ponto de volta para lat/lon, e
por isso **curva** conforme se afasta do meridiano central — como numa carta
impressa.

**🎯 Computador de tiro** — elevação, azimute e tempo de voo para morteiro, a
partir das posições e altitudes, com vento, seleção de carga e aviso de
segurança. Solução exata em vácuo (forma fechada) e solução com arrasto
quadrático por integração numérica.

**🗺️ Terrenos do Arma 3** — o mesmo computador de tiro aceita a grade lida na
carta do jogo, em **31 mundos** cuja grade foi medida do `CfgWorlds` de cada
um. Dá para escolher o alvo pelo nome do lugar (Kavala, Athira, …) em vez de
decorar seis dígitos.

> A grade de cada mundo traz **offset e SINAL do passo**, e o sinal importa: em
> 30 dos 31 mundos o rótulo de northing cresce para o **sul**, ao contrário de
> toda carta MGRS. Assumir a convenção MGRS espelha o eixo N-S e joga o azimute
> 180° fora. Por isso o quadro "terreno do Arma 3" é explícito na tela, e não
> um palpite — ver `src/engine/arma3-grid.js`.

---

## Rodar

```bash
npm install
npm run dev      # http://localhost:5174
npm test         # 65 testes do motor
npm run build    # dist/
```

Node ≥ 22.

---

## Estrutura

```
src/
  engine/          ← MOTOR: zero dependências, zero DOM
    angles.js        conversão de ângulos (mil NATO ≠ MRAD!)
    geo.js           WGS84, Vincenty direto/inverso, haversine
    mgrs.js          lat/lon ⇄ UTM ⇄ MGRS + vetor de tiro na grade
    gridref.js       grade local genérica (MGRS sobre um quadro local)
    arma3-grid.js    grade REAL de cada mundo do Arma 3 (offset + sinal do passo)
    ballistics.js    solucionadores de vácuo e de arrasto
    charges.js       6 sistemas de armas, arrasto DERIVADO de dado publicado
    fire-mission.js  o contrato GPS ⇄ computador de tiro
  data/
    arma3-terrenos.js   ⚠️ GERADO no Projeto Baluarte — não editar à mão
  pages/           telas (#/mapa, #/tiro, #/sobre)
  ui/ core/ styles/
public/arma3/      localidades e aeroportos por terreno (carregado sob demanda)
test/              65 testes (node --test)
docs/              MEGA-PLANO · BALISTICA · DESIGN-SYSTEM · INTEGRACAO-BALUARTE
```

O motor roda **igual** no navegador, no Node, num Web Worker e numa função
serverless. É o que garante que a física do app, do site e da API seja
literalmente o mesmo código — em vez de três implementações que divergem em
silêncio.

---

## Documentação

| Documento | O que tem |
|---|---|
| [`docs/MEGA-PLANO.md`](docs/MEGA-PLANO.md) | Stack, arquitetura, design system, roadmap em 4 fases, desafios técnicos |
| [`docs/BALISTICA.md`](docs/BALISTICA.md) | A matemática completa, o contrato JSON, o design da interface de fogo |
| [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) | Contrato visual Mil-Spec: tokens, componentes, os 3 modos de tela |
| [`docs/INTEGRACAO-BALUARTE.md`](docs/INTEGRACAO-BALUARTE.md) | Como acoplar ao Baluarte: módulo, REST e WebSocket |

---

## Exemplo — o motor em 6 linhas

```js
import { resolverMissao } from './src/engine/fire-mission.js';

const solucao = resolverMissao({
  peca: { pos: { tipo: 'mgrs', valor: '23K PQ 83477 60685', alt: 30 },
          sistema: 'm252_81mm' },
  alvo: { pos: { tipo: 'mgrs', valor: '23K PQ 86000 63000', alt: 120 } },
  ambiente: { ventoVelocidadeMs: 8, ventoDirecaoDeg: 270 }
});

// → azimute de grade 844 mil · elevação 1264 mil · carga 4 · voo 46,9 s
```

---

## Decisões que valem explicar

**JS puro + Capacitor, não React Native.** O Baluarte proíbe framework e já
publica Android via Capacitor. Adotar RN significaria duas UIs e dois builds em
troca de ganho ~zero, já que o app é 90 % mapa (WebGL nos dois casos).

**MapLibre, não Mapbox.** Mesma customização, sem chave de API e sem teto de
uso. Para um app que um esquadrão inteiro pode abrir em campo, teto de uso é
risco operacional. O Baluarte já usa MapLibre no `/mapa`.

**Empacotado, não CDN.** Numa ferramenta de campo, depender de CDN significa
que a navegação morre junto com o sinal — e a hora em que se precisa do mapa é
exatamente a hora em que a rede falha.

**Azimute de GRADE, não verdadeiro.** A doutrina de artilharia trabalha em
coordenadas de grade. Os dois diferem pela convergência de meridianos: até 3°,
que a 3 km são ~160 m de erro lateral.

**Arrasto derivado, não inventado.** As tabelas guardam o par
(velocidade inicial, alcance máximo publicado) — dado verificável — e o motor
**deriva** o coeficiente. Um teste rejeita pares fisicamente impossíveis; foi
assim que um erro real na carga 0 do 2B14 foi detectado.

---

## ⚠️ Aviso

Ferramenta de **treino e simulação**. Os dados de armamento são **valores de
referência de modelo** compilados de fontes públicas — **não são tabela de tiro
oficial e não substituem uma**. O modelo assume atmosfera uniforme, ignora
Coriolis e spin drift, e trata a dispersão como ordem de grandeza.
Os limites completos estão na tela `#/sobre` do app. **Não usar para emprego
real de armamento.**
