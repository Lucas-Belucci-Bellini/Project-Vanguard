# 🎯 Mega-Plano — Calculadora Balística (Morteiros e Artilharia)

> Módulo de **Fire Control System**: dados de tiro (elevação em MRAD/Mils,
> azimute e tempo de voo) a partir das posições de peça e alvo. Acoplado ao
> GPS topográfico do Vanguard e ao Projeto Baluarte.
>
> **Estado:** Fases 1 e 2 entregues (`src/engine/ballistics.js`,
> `charges.js`, `fire-mission.js`, tela `#/tiro`, 54 testes).

---

## 1. Arquitetura Lógica (a matemática)

### 1.0 Antes das fórmulas: **Mil ≠ MRAD**

Confundir os dois é o erro clássico que joga a granada centenas de metros fora.

| Sistema | Divisões por volta | Onde aparece |
|---|---|---|
| **MRAD** (milirradiano real) | 2π·1000 ≈ **6283,185** | Retícula de luneta (Mil-Dot, Horus) |
| **Mil NATO** | **6400** | Morteiro e artilharia OTAN; computador do Mk6 no Arma 3 |
| Mil Varsóvia / URSS | 6000 | Doutrina soviética |
| Streck sueco | 6300 | Suécia |

A regra prática "1 mil = 1 m a 1000 m" vale para o **MRAD**; o mil NATO erra
~2 %. Irrelevante para observar tiro, **relevante para calcular elevação**.

**Decisão de projeto:** o motor guarda ângulo **sempre em radianos** e converte
só na borda (`src/engine/angles.js`). Nenhum cálculo interno vê "mil".

---

### 1.1 Solução em vácuo — forma fechada

Trajetória com origem na boca do tubo:

$$y = x\tan\theta - \frac{g\,x^{2}}{2v^{2}\cos^{2}\theta}$$

onde `x` = distância **horizontal**, `y` = diferença de altitude (alvo − peça),
`v` = velocidade inicial, `g` = gravidade.

**Isolando θ.** Usando a identidade $1/\cos^2\theta = 1 + \tan^2\theta$ e
substituindo $T = \tan\theta$, $k = \dfrac{g x^{2}}{2v^{2}}$:

$$y = xT - k(1 + T^{2}) \quad\Longrightarrow\quad kT^{2} - xT + (y + k) = 0$$

Quadrática em `T`. Com $\Delta = x^{2} - 4k(y+k)$:

$$\boxed{\;T = \frac{x \pm \sqrt{\Delta}}{2k}\;,\qquad \theta = \arctan T\;}$$

Leitura das raízes:

| Caso | Significado |
|---|---|
| $\Delta < 0$ | **Fora de alcance** nesta carga — nenhum ângulo resolve |
| raiz **−** | **Tiro tenso** (low angle), trajetória rasante |
| raiz **+** | **Tiro curvo** (high angle) — modo normal do morteiro |
| $\Delta = 0$ | Alcance máximo exato; as duas soluções se fundem |

**Grandezas derivadas:**

$$t_{voo} = \frac{x}{v\cos\theta} \qquad
  y_{apice} = \frac{(v\sin\theta)^{2}}{2g} \qquad
  v_{y,imp} = v\sin\theta - g\,t_{voo}$$

$$v_{imp} = \sqrt{(v\cos\theta)^2 + v_{y,imp}^2} \qquad
  \theta_{imp} = \arctan\!\left(\frac{-v_{y,imp}}{v\cos\theta}\right)$$

**Envelope de alcance** para alvo a altura relativa `y`:

$$\boxed{\;x_{max} = \frac{v}{g}\sqrt{v^{2} - 2gy}\;}$$

Se $v^2 - 2gy \le 0$, o alvo está acima do apogeu vertical: **inalcançável**.

> **Uso real:** este solucionador é exato para o modelo *sem ar* e custa
> microssegundos. Serve para pré-filtrar cargas viáveis e alimentar a UI em
> tempo real. **Não** é o número que vai para a peça — em morteiro de 82 mm a
> 3 km ele superestima o alcance em 15–25 %.

Implementação: `resolverVacuo()` em `src/engine/ballistics.js`.

---

### 1.2 Solução com arrasto — integração numérica

Não existe forma fechada. Modelo de arrasto quadrático:

$$\vec{a} = \mu\,\lVert \vec{v}_{rel} \rVert\, \vec{v}_{rel} \;-\; g\hat{y},
\qquad \vec{v}_{rel} = \vec{v} - \vec{v}_{ar},\qquad \mu < 0$$

Três decisões e o porquê de cada uma:

**① A mesma formulação do Arma 3 e do Baluarte.** `μ` é o `airFriction` da
engine Real Virtuality, idêntico ao usado em `arma3-balistica.js` no Projeto
Baluarte. Coeficiente calibrado num projeto vale no outro.

**② Vento como velocidade DO AR.** O arrasto age sobre $\vec v - \vec v_{ar}$.
Assim vento de cauda/proa alterando alcance e vento de través gerando deriva
saem do **mesmo termo**, sem correção empírica colada por fora.

**③ Integrador do ponto médio (RK2), não Euler.** Erro $O(\Delta t^2)$ em vez de
$O(\Delta t)$. Com Δt = 10 ms, o erro de tempo de voo fica abaixo de 1 ms num
voo de 40 s — barato, e elimina o viés sistemático que o Euler acumularia ao
longo de milhares de passos.

Eixos: `x` alcance · `y` vertical · `z` través (+ direita).

**Encontrar θ.** O alcance em função de θ é unimodal: cresce até um máximo e
decresce. Então:

1. Busca pela **seção áurea** acha $\theta_{max}$ (com ar, fica em ~40–43°, não em 45°).
2. Isso parte o domínio em **dois ramos monótonos**.
3. **Bisseção** no ramo pedido — sem derivada, e sem o risco de Newton divergir
   perto do alcance máximo, onde a derivada vai a zero.

Verificação: `residuoM` = distância entre onde o projétil realmente cruzou a
altura do alvo e onde o alvo está. **Fica em milímetros** (testado).

Implementação: `resolverComArrasto()`.

---

### 1.3 Calibração honesta do arrasto

**O problema:** inventar um `airFriction` é chute com aparência de precisão.

**A solução:** guardar o par **(v₀, alcance máximo publicado)** — dado
verificável de tabela — e **derivar** μ por bisseção:

```js
const mu = calibrarArrasto(268 /* m/s */, 5608 /* m */);  // → −5,707e−5
```

A tabela inteira fica consistente com a fonte. Trocar a fonte por uma tabela de
tiro real recalibra tudo sozinho. Um teste rejeita qualquer par acima de 98 %
do alcance de vácuo — foi assim que um erro real na carga 0 do 2B14 (500 m
declarados contra 499,7 m fisicamente possíveis) foi detectado.

---

### 1.4 Geometria: o que entra como `x` e `y`

| Grandeza | De onde vem | Cuidado |
|---|---|---|
| `x` distância **horizontal** | `gridVector()` no plano UTM | **Não** é a distância inclinada, nem a geodésica |
| `y` diferença de altitude | `alvo.alt − peca.alt` | Altitude do terreno, não do alvo em voo |
| azimute | **de grade**, não verdadeiro | Diferem pela convergência de meridianos: até 3° ⇒ ~160 m a 3 km |

Dois erros que `gridVector()` evita e que quase toda implementação amadora
comete: **(a)** peça e alvo em fusos UTM diferentes (eastings incomparáveis —
erro de centenas de km); **(b)** ignorar o fator de escala do UTM (k₀ = 0,9996).

---

## 2. Estrutura de Dados / API

### 2.1 Pedido — `vanguard.fire-mission/1`

```json
{
  "schema": "vanguard.fire-mission/1",
  "id": "FM-2026-0725-001",
  "peca": {
    "pos": { "tipo": "mgrs", "valor": "23K PQ 83477 60685", "alt": 30 },
    "sistema": "m252_81mm",
    "cargas": [0, 1, 2, 3, 4],
    "erroPosicaoM": 8
  },
  "alvo": {
    "pos": { "tipo": "mgrs", "valor": "23K PQ 86000 63000", "alt": 120 },
    "id": "TGT-ALFA"
  },
  "amigos": [
    { "id": "ALFA-2", "pos": { "tipo": "mgrs", "valor": "23K PQ 85900 62950" } }
  ],
  "ambiente": {
    "ventoVelocidadeMs": 8,
    "ventoDirecaoDeg": 270,
    "declinacaoMagDeg": -21.5,
    "gravidade": 9.80665
  },
  "opcoes": { "modo": "alto", "sistemaMil": "nato", "solver": "arrasto" }
}
```

**`pos` aceita três formatos, e misturar é permitido** (alvo em MGRS, peça em
lat/lon), desde que ambos sejam do mesmo *quadro* (geográfico ou local):

```json
{ "tipo": "latlon", "lat": -22.95, "lon": -43.21, "alt": 30 }
{ "tipo": "mgrs",   "valor": "23K PQ 83477 60685", "alt": 30 }
{ "tipo": "local",  "grid": "123456", "alt": 50 }
```

**`ventoDirecaoDeg` é de ONDE o vento vem** (convenção METAR: vento de 270° =
vento de oeste). É a convenção da carta meteorológica, e a que mais gente erra
ao integrar.

### 2.2 Resposta — `vanguard.fire-solution/1`

```json
{
  "schema": "vanguard.fire-solution/1",
  "ok": true,
  "id": "FM-2026-0725-001",
  "geometria": {
    "quadro": "geo",
    "distanciaHorizontalM": 3424.08,
    "distanciaInclinadaM": 3425.26,
    "deltaAltM": 90,
    "zonaUTM": 23,
    "fatorEscala": 1.00002
  },
  "azimute": {
    "gradeDeg": 47.46, "gradeMil": 843.77,
    "verdadeiroDeg": 46.76, "magneticoDeg": 68.26, "magneticoMil": 1213.58,
    "convergenciaDeg": -0.698
  },
  "vento": { "velocidadeMs": 8, "direcaoDeg": 270,
             "longitudinalMs": 5.89, "travessalMs": 5.41 },
  "solucoes": [
    {
      "carga": 4, "v0": 268, "modo": "alto",
      "elevacaoMil": 1263.9, "elevacaoDeg": 71.10,
      "tempoVooS": 46.9, "apiceM": 2749, "apiceAltitudeM": 2779,
      "derivaVentoM": 43.5, "correcaoDirecaoMil": -12.9,
      "velocidadeImpactoMs": 220, "anguloImpactoDeg": 74,
      "residuoM": 0.0004, "folgaRel": 0.39, "preferida": true,
      "zonaBatida": { "erroProvavelAlcanceM": 31, "erroProvavelDirecaoM": 11,
                      "raioSegurancaM": 124 }
    }
  ],
  "seguranca": { "avaliado": true, "dentroDaZona": false,
                 "maisProximo": { "id": "ALFA-2", "distanciaM": 112 } },
  "avisos": ["carga 0: alvo fora de alcance"],
  "motor": { "versao": "1.0.0", "solver": "arrasto",
             "sistemaMil": "nato", "gravidade": 9.80665 }
}
```

### 2.3 Decisões do contrato

**Todas as cargas, não só a melhor.** O operador precisa ver as alternativas —
carga menor pode ser preferível por assinatura sonora ou desgaste de tubo.

**Ranqueamento doutrinário:** *a menor carga que alcança o alvo com folga ≥ 10 %*.
Carga menor = menos dispersão absoluta, menos desgaste, menos assinatura.
Só se nenhuma tem folga é que se aceita a que está no limite.

**`apiceAltitudeM` (apogeu absoluto), não só relativo.** É o número que
interessa para liberar espaço aéreo e para checar máscara de crista — o apogeu
de um 120 mm passa de 3 km.

**A trajetória NÃO entra na resposta.** A polilinha tem milhares de pontos;
fica disponível em processo (`resolverComArrasto().trajetoria`) para desenhar
o perfil, mas nunca cruza a rede. Coberto por teste.

**`seguranca` é honesta sobre o que não sabe.** "Danger close" é distância do
impacto às **tropas amigas**, não da peça ao alvo. Sem `amigos` informados, o
campo diz explicitamente que só a peça foi considerada — em vez de calar e
deixar parecer que a área está limpa. Um falso-negativo silencioso num alerta
de segurança é pior que nenhum alerta.

### 2.4 Transporte

A **mesma função** resolve nos quatro casos — é o que impede duas
implementações da física de divergirem em silêncio:

```js
// 1. no navegador / no app
import { resolverMissao } from './engine/fire-mission.js';
const solucao = resolverMissao(pedido);

// 2. em Web Worker (não trava a UI durante a integração numérica)
self.onmessage = (e) => self.postMessage(resolverMissao(e.data));

// 3. atrás de HTTP (Vercel / Render)
import { tratarRequisicao } from './engine/fire-mission.js';
const { status, body } = tratarRequisicao(await req.json());
//   200 = solução · 422 = sem solução ou pedido inválido · 400 = malformado

// 4. em frame de WebSocket — mesmo `tratarRequisicao`
```

---

## 3. Design da Interface de Fogo

Implementado em `src/pages/tiro.js`. Princípio: quem opera a peça está sob
estresse, com o rádio no ouvido, e precisa de **dois números**.

```
┌───────────────┬────────────────────────────────────────────────────┐
│               │  ┌──────────────────┐  ┌──────────────────┐        │
│   ENTRADA     │  │ AZIMUTE (GRADE)  │  │ ELEVAÇÃO         │        │
│   (esquerda)  │  │      0844        │  │      1264        │        │
│               │  │ 47.46° · NATO    │  │ 71.10° · CARGA 4 │        │
│   PEÇA        │  └── FÓSFORO ───────┘  └── ÂMBAR ─────────┘        │
│   ALVO        │  ┌────────┬────────┬────────┬────────┬────────┐    │
│   AMBIENTE    │  │T. VOO  │DISTÂNC.│Δ ALT   │APOGEU  │IMPACTO │    │
│   OPÇÕES      │  └────────┴────────┴────────┴────────┴────────┘    │
│               │  ┌── SOLUÇÕES POR CARGA ────────────────────────┐  │
│  [CALCULAR]   │  │ 4 · 268 m/s · 1264 · 46.9 s ····· PREFERIDA │  │
│               │  │ 3 · 225 m/s · 1011 · 34.3 s                  │  │
└───────────────┴──└──────────────────────────────────────────────┘──┘
```

**As quatro decisões de segurança do layout:**

1. **Azimute e elevação em cores diferentes** (fósforo × âmbar). São dois
   números de 4 dígitos na mesma faixa (0000–6400); trocá-los põe a granada em
   qualquer lugar menos no alvo. Cor é a defesa mais barata contra isso.
2. **Entrada à esquerda, saída à direita, sempre.** O olho nunca procura onde o
   resultado apareceu.
3. **Avisos ANTES dos números.** Um DANGER CLOSE renderiza no topo, em
   vermelho pulsante, antes da solução — nunca depois.
4. **Numeral tabular e largura fixa** (`mil()` preenche com zeros à esquerda).
   Número que muda de largura faz o HUD dançar, e HUD que dança custa leitura.

O **pacote JSON fica visível** num `<details>` ao pé da tela. Não é debug: é o
que permite copiar a missão para o rádio digital, para a API ou para um teste.

---

## 4. Roadmap de Integração

### ✅ Fase 1 — O motor de cálculo (ENTREGUE)

- `ballistics.js`: vácuo em forma fechada + arrasto com vento 3D.
- `charges.js`: 6 sistemas, arrasto **derivado** de dado publicado.
- `angles.js`: 4 sistemas de mil, sem confundir MRAD com mil NATO.
- **Testes**: solução do vácuo recolocada na equação da trajetória; resíduo do
  solver com arrasto em milímetros; conservação de energia sem arrasto;
  monotonicidade dos dois ramos; simetria do vento.

### ✅ Fase 2 — A interface (ENTREGUE)

- Tela `#/tiro` com o layout acima, nos 3 modos (tático/noite/dia).
- Contrato `fire-mission` + validação com erros estruturados.
- Ponte com o mapa: marcar peça e alvo leva os dois preenchidos para o tiro.

### 🔜 Fase 3 — Integração plena

**3.1 — Do observador à peça**
- Correção de tiro pelo observador avançado ("100 à direita, 200 além") aplicada
  sobre a linha observador→alvo, não peça→alvo. É o fluxo real de ajuste.
- Registro de missões e repetição de fogo em alvo já registrado.

**3.2 — Terreno**
- **Máscara de crista**: o apogeu limpa o terreno no caminho? Já existe
  `apiceAltitudeM`; falta cruzar com o perfil de elevação.
- Alcance mínimo por obstáculo à frente da peça.
- Elipse de dispersão desenhada no mapa, sobre o alvo.

**3.3 — Serviço**
- `POST /api/fire-mission` (Vercel, espelhando `api/*.py` do Baluarte).
- Web Worker para a integração numérica não travar a UI em cálculo de lote.
- Sincronização de missões pelo WebSocket do esquadrão.

**3.4 — Precisão**
- Gradiente de densidade do ar com a altitude (hoje: atmosfera uniforme).
- Temperatura do propelente afetando v₀ (efeito real e mensurável).
- Coeficiente balístico G1/G7 opcional, no espírito do ACE Advanced Ballistics.
- Calibração contra tabela de tiro real, substituindo os valores de referência.

---

## 5. Limites declarados

O módulo cospe números de 4 dígitos com aparência de autoridade. Onde ele para:

- Atmosfera **uniforme** — sem gradiente de densidade, temperatura ou vento com
  a altitude. Num apogeu de 3 km, é simplificação real.
- **Sem Coriolis nem spin drift.** Irrelevante em morteiro; relevante acima de ~10 km.
- Gravidade constante e Terra plana no alcance — válido abaixo de 10 km.
- **Dispersão é ordem de grandeza**, não tabela de tiro.
- As tabelas de armamento são **referência de modelo**, compiladas de fontes
  públicas. **Não são tabela de tiro oficial e não substituem uma.**

Ferramenta de **treino e simulação**. Tudo isto aparece na tela `#/sobre` do
app — não escondido em rodapé.
