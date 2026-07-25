# 🗺️ Mega-Plano — Project Vanguard (GPS topográfico tático)

> App **mobile + web** de navegação com a estética e a funcionalidade do mapa
> tático do Arma 3, trazidas para o mundo real. Funciona acoplado ao
> [Projeto Baluarte](https://github.com/Lucas-Belucci-Bellini/Projeto-Baluarte).
>
> **Estado:** a Fase 1 deste plano já está entregue neste repositório (motor de
> coordenadas, motor balístico, contrato de integração, design system e as
> telas de mapa e de tiro). O que segue é o plano completo, com o que está
> pronto marcado.

---

## 0. A decisão que muda tudo: onde mora a inteligência

Antes da stack, uma decisão de arquitetura que determina o resto.

O Vanguard tem um **motor** (`src/engine/`) com **zero dependências e zero
DOM**: coordenadas, geodésia, balística e o contrato de missão. Ele roda igual
no navegador, no Node, num Web Worker e numa função serverless.

Isso não é preciosismo. É o que garante que **a física do app, a física do
site e a física da API sejam literalmente o mesmo código**. A alternativa
— reimplementar o cálculo em cada camada — leva ao pior tipo de bug possível
aqui: o app e o servidor discordarem sobre onde a granada cai, sem ninguém
perceber por meses.

Consequência prática: escolher framework de UI vira uma decisão **barata e
reversível**, porque nenhuma regra de negócio mora na UI.

---

## 1. Definição da Tech Stack

### 1.1 Recomendação

| Camada | Escolha | Por quê |
|---|---|---|
| **Motor** | JavaScript puro (ES2022), sem dependências | Roda em qualquer lugar; testável com `node --test`; nunca vira refém de framework |
| **Web** | **Vite 5 + JS puro** (sem framework) | Stack **não-negociável** do Baluarte (`CLAUDE.md`); código atravessa os dois projetos sem tradução |
| **Mobile** | **Capacitor** (mesma base web) | O Baluarte **já publica Android via Capacitor**; reaproveita 100% da web |
| **Mapa** | **MapLibre GL JS** (empacotado, não CDN) | Livre, sem chave, sem teto de uso, camadas customizáveis; já usado no `/mapa` do Baluarte |
| **Tiles** | OpenTopoMap · Esri World Imagery · CARTO Dark | Sem chave de API; topográfico e satélite cru, que é a estética pedida |
| **Altimetria** | Open-Meteo Elevation | Grátis, sem chave; cai para entrada manual se offline |
| **Testes** | `node --test` (nativo) | Sem dependência de runner; o motor é puro, então testa direto |

### 1.2 Três recomendações que contrariam o briefing — e por quê

O briefing sugeria React Native/Flutter e Mapbox. Não é o caminho certo aqui,
e vale explicar em vez de só divergir:

**① React Native / Flutter → NÃO. Capacitor sobre a base web → SIM.**

O `CLAUDE.md` do Baluarte é explícito: *"JS puro (ES2022), sem TypeScript e sem
framework"*, e *"Stack (não negociável)"*. O Baluarte **já tem** `capacitor.config.json`
e a pasta `android/` funcionando. Adotar React Native significaria:
manter duas UIs, dois pipelines de build, e perder o compartilhamento com o
Baluarte — em troca de ganho aproximadamente zero, já que o app é 90 % mapa
(que é WebGL nos dois casos) e 10 % formulário.

O que se perde com Capacitor: acesso a APIs nativas exóticas. O que este app
precisa de nativo — GPS, bússola, wake-lock, armazenamento — o Capacitor
cobre com plugin oficial.

**② Mapbox → NÃO. MapLibre → SIM.**

O MapLibre é o fork livre do Mapbox GL (a partir da v1, antes do Mapbox fechar
a licença). Entrega a **mesma** customização de camadas e câmera. Diferença:
Mapbox exige chave de API e cobra por carregamento de mapa; MapLibre não tem
chave nem teto. Para um app que pode ser aberto por um esquadrão inteiro em
campo, teto de uso é risco operacional, não linha de custo.

**③ CDN → NÃO. Empacotado → SIM.**

Numa ferramenta de campo, depender de CDN significa que a navegação morre
junto com o sinal — e a hora em que se precisa do mapa é exatamente a hora em
que a rede falha. O MapLibre entra como dependência npm, empacotada. O Vite
ainda a isola num chunk que só baixa ao abrir o mapa.

### 1.3 O que **não** entra

- **TypeScript** — vetado pelo Baluarte. O motor compensa com JSDoc e testes.
- **Redux/estado global de framework** — o estado é pequeno e mora em `src/core/estado.js`.
- **Biblioteca de MGRS pronta** (`mgrs`, `proj4`) — a conversão é o coração do
  produto; escrevemos e testamos contra constantes geodésicas publicadas.
  Depender de caixa-preta aqui seria terceirizar justamente o diferencial.

---

## 2. Arquitetura do Sistema

```
┌────────────────────────────────────────────────────────────────┐
│  APRESENTAÇÃO  (src/pages/, src/ui/, src/styles/)              │
│  #/mapa · #/tiro · #/sobre — hyperscript h(), sem framework    │
└───────────────┬────────────────────────────────────────────────┘
                │  só chama funções puras
┌───────────────▼────────────────────────────────────────────────┐
│  MOTOR  (src/engine/) — zero dependências, zero DOM             │
│  angles · geo · mgrs · gridref · ballistics · charges           │
│  fire-mission  ← o contrato                                     │
└───────────────┬────────────────────────────────────────────────┘
                │  o MESMO módulo, em qualquer host
   ┌────────────┼────────────┬──────────────┬───────────────┐
   ▼            ▼            ▼              ▼               ▼
navegador   Web Worker   Node/CLI    função serverless   app Capacitor
```

### 2.1 Fluxo de geolocalização

```
navigator.geolocation.watchPosition
        │  {lat, lon, accuracy, speed, heading}
        ▼
  normalização  →  engine/mgrs.js  →  MGRS + fuso + easting/northing
        │
        ├──→ HUD (leitura ao vivo)
        ├──→ marcador no mapa
        └──→ estado.js (localStorage) → sobrevive a troca de tela e a fechar o app
```

**Decisão:** a posição **nunca** sai do dispositivo por padrão. Rastreio
compartilhado (Fase 3) é opt-in explícito por missão, nunca ligado sozinho.

### 2.2 Fluxo de uma missão de tiro

```
mapa: clique marca PEÇA e ALVO
   → altitude buscada (Open-Meteo) ou digitada
   → estado.js
   → tela de tiro monta `vanguard.fire-mission/1`
   → engine/fire-mission.js → resolverMissao()
        ├─ gridVector()      geometria no plano UTM (azimute DE GRADE)
        ├─ arrastoDaCarga()  μ calibrado por carga
        ├─ resolverComArrasto()  para cada carga
        └─ ranqueamento + segurança
   → `vanguard.fire-solution/1` → HUD
```

### 2.3 Por que o tiro usa o plano da grade (e não distância geodésica)

Detalhe que quase toda implementação amadora erra. A doutrina de artilharia
trabalha em **coordenadas de grade**, então o azimute que vai para a peça tem
de ser o **azimute de grade**, não o azimute verdadeiro. Os dois diferem pela
**convergência de meridianos** — até ~3° na borda de um fuso, o que a 3 km
são **~160 m de erro lateral**.

O motor calcula os dois e informa a convergência (`convergenciaMeridianos()`),
mas o número que aparece grande na tela é o de **grade**.

---

## 3. Design System — "Mil-Spec"

Contrato completo em [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md).
Implementado em `src/styles/variables.css`.

### 3.1 Paleta

| Papel | Token | HEX |
|---|---|---|
| Fundo | `--color-bg` | `#0c0f0a` |
| Fundo elevado | `--color-bg-elevated` | `#11150e` |
| Superfícies | `--color-surface` → `-3` | `#171c13` → `#262d20` |
| **Acento 1 (fósforo)** | `--color-cyan` | `#8bff3f` |
| **Acento 2 (âmbar)** | `--color-magenta` | `#ffb000` |
| Texto (areia) | `--color-text-primary` | `#dcd6c0` |
| Texto secundário | `--color-text-secondary` | `#a29a7f` |
| Perigo | `--color-danger` | `#ff4136` |

**Afiliação APP-6 / MIL-STD-2525** (cores normativas, uso reservado):
amigo `#80e0ff` · hostil `#ff8080` · neutro `#aaffaa` · desconhecido `#ffff80`.

> ⚠️ Os nomes `--color-cyan` / `--color-magenta` são **mantidos de propósito**:
> são os mesmos do Baluarte. Um componente atravessa os dois projetos e assume
> o tema do destino sozinho, sem tradução.

### 3.2 Tipografia

Mono em **tudo**: `JetBrains Mono` → `IBM Plex Mono` → `ui-monospace`.
Não é preciosismo — `font-variant-numeric: tabular-nums` global impede o
layout de dançar quando a coordenada muda 10×/s. Texto que pula custa leitura
sob estresse.

Escala 10 → 52 px. Títulos em caixa alta com `letter-spacing` largo.
**Raios de 0–6 px**: equipamento militar não tem canto macio.

### 3.3 Os três modos de tela

| Modo | Para quê |
|---|---|
| `tatico` | Padrão. Oliva + fósforo. |
| `noite` | Tudo em vermelho profundo. O olho adaptado ao escuro é quase cego ao vermelho, então a tela deixa de destruir a adaptação. **Requisito real de campo.** |
| `dia` | Invertido, alto contraste, sem glow — sol a pino. |

Trocados por `data-modo` no `<html>`; só variáveis mudam, nenhum componente sabe disso.

---

## 4. Roadmap

### ✅ Fase 1 — Fundações (ENTREGUE)

| # | Entrega | Onde |
|---|---|---|
| 1.1 | Motor de coordenadas: lat/lon ⇄ UTM ⇄ MGRS, exceções Noruega/Svalbard | `src/engine/mgrs.js` |
| 1.2 | Geodésia: Vincenty direto/inverso, haversine, vetor de grade | `src/engine/geo.js` |
| 1.3 | Grade local estilo Arma 3 + 8 terrenos | `src/engine/gridref.js` |
| 1.4 | Motor balístico: vácuo (forma fechada) + arrasto com vento | `src/engine/ballistics.js` |
| 1.5 | Tabelas de 6 sistemas, arrasto **derivado** de dado publicado | `src/engine/charges.js` |
| 1.6 | Contrato `vanguard.fire-mission/1` + adaptador HTTP | `src/engine/fire-mission.js` |
| 1.7 | Design system Mil-Spec + 3 modos de tela | `src/styles/variables.css` |
| 1.8 | Mapa tático com grade MGRS sobreposta e rótulos de carta | `src/pages/mapa.js` |
| 1.9 | Computador de tiro | `src/pages/tiro.js` |
| 1.10 | **54 testes** ancorados em constantes geodésicas publicadas | `test/` |

### 🔜 Fase 2 — Navegação de campo (2 sprints)

**Sprint 2.1 — Instrumentos**
- Bússola sobreposta (`DeviceOrientationEvent`) com norte de grade × magnético × verdadeiro.
- Declinação magnética por modelo WMM embarcado (hoje é entrada manual).
- Rosa de rumos e "vire X mils para o waypoint".
- Odômetro e trilha percorrida (portar `geo-tracker.js` do Baluarte).

**Sprint 2.2 — Waypoints e simbologia**
- CRUD de waypoints com **simbologia APP-6/2525** (as 4 afiliações já estão nos tokens).
- Rota multi-perna com azimute e distância por perna.
- Import/export GPX e KML.
- Medição de distância e área no mapa.

### 🔜 Fase 3 — Operação (2 sprints)

**Sprint 3.1 — Offline de verdade**
- Service Worker + PWA (o Baluarte já tem `pwa.js` para portar).
- **Pacote de tiles por área**: seleciona um retângulo, baixa os tiles, opera sem rede.
  É o item que transforma o app de "demo bonita" em ferramenta de campo.
- Fila de missões pendentes com sincronização ao voltar o sinal.

**Sprint 3.2 — Esquadrão**
- Rastreio compartilhado por WebSocket (**opt-in por missão**).
- Marcações táticas sincronizadas entre dispositivos.
- Papéis: observador avançado, peça, comando.

### 🔜 Fase 4 — Terreno e publicação (2 sprints)

**Sprint 4.1 — Terreno**
- Perfil de elevação entre dois pontos (usa o DEM que o Baluarte já consome no `/mapa`).
- **Análise de máscara**: o apogeu limpa a crista? O motor já devolve `apiceAltitudeM` para isso.
- Linha de visada e viewshed simplificado.

**Sprint 4.2 — Publicação**
- Build Capacitor Android (espelhando `mobile:sync` do Baluarte).
- Deploy web no Vercel.
- Integração final com o Baluarte (ver [`INTEGRACAO-BALUARTE.md`](INTEGRACAO-BALUARTE.md)).

---

## 5. Desafios Técnicos e mitigações

### 5.1 Customização dos map tiles ✅ resolvido

**Problema previsto no briefing.** Não se materializou, porque a estética não
vem dos tiles — vem da **grade desenhada por cima** e da paleta. Cada linha da
grade é uma linha real de easting/northing UTM convertida ponto a ponto de
volta para lat/lon, então ela **curva** conforme se afasta do meridiano
central, como numa carta impressa. Sobre isso, o filtro Mil-Spec.

**Ficou pendente:** os rótulos. A camada `symbol` do MapLibre exige um endpoint
de `glyphs` (fontes em PBF) — mais uma dependência de rede, e numa fonte que
não é a nossa. Resolvido desenhando os rótulos num **canvas 2D sobreposto**:
fonte Mil-Spec, funciona offline, e o texto encosta nas bordas como em carta.

### 5.2 Consumo de bateria ⚠️ o maior risco

`watchPosition` com `enableHighAccuracy` + WebGL contínuo drena bateria rápido.
Mitigações, em ordem de implementação:

1. **Filtro de movimento** — só registra ponto se moveu ≥ 2 m (já é o padrão do
   `geo-tracker.js` do Baluarte, a portar).
2. **Modo econômico** — cai para `enableHighAccuracy: false` parado; volta ao alto em movimento.
3. **Pausar o WebGL** — `map.stop()` quando a tela está oculta (`visibilitychange`).
4. **Modo NOITE** — em tela OLED, o vermelho profundo economiza energia de verdade.
5. **Modo bússola** — desliga o mapa e deixa só o instrumento; é o modo de marcha.

### 5.3 Precisão do GPS × precisão da solução ⚠️ risco de segurança

Um GPS de celular dá 3–5 m em dia bom e **20–50 m sob copa de árvore ou em
vale**. O computador de tiro devolve elevação com 4 dígitos — uma precisão
aparente que o dado de entrada não sustenta.

**Mitigação implementada:** `zonaBatida()` soma **em quadratura** a dispersão
balística com um **piso absoluto** (`dispersaoBaseM`) que inclui a incerteza de
posição. Sem esse piso, o modelo diria que a 100 m a dispersão é de
centímetros — falso, e perigoso justamente na situação mais crítica.
A incerteza real do GPS entra via `peca.erroPosicaoM`.

**A fazer (Fase 2):** propagar a precisão do GPS automaticamente para dentro do
cálculo e mostrar a elipse de dispersão desenhada no mapa.

### 5.4 Bordas de fuso UTM ✅ resolvido

Peça e alvo em fusos diferentes têm eastings incomparáveis — erro de
**centenas de quilômetros** se ignorado. `gridVector()` reprojeta o alvo no
fuso **da peça** (é a peça que define a grade de trabalho) e corrige o fator
de escala por Simpson. Coberto por teste.

### 5.5 Confiabilidade dos dados de armamento ⚠️ limitação declarada

As tabelas são **referência de modelo**, não tabela de tiro oficial.

**Mitigação de engenharia:** em vez de inventar coeficiente de arrasto, o
repositório guarda o par **(velocidade inicial, alcance máximo publicado)** —
que é dado verificável — e **deriva** o arrasto com `calibrarArrasto()`. A
tabela inteira fica consistente com a fonte, e trocar a fonte por uma tabela
real recalibra tudo sozinho. Um teste rejeita qualquer par fisicamente
impossível (foi assim que um erro real na carga 0 do 2B14 foi pego).

### 5.6 Limites declarados do modelo físico

Atmosfera uniforme (sem gradiente de densidade/vento com a altitude — relevante
num apogeu de 3 km) · sem Coriolis nem spin drift (irrelevante em morteiro,
relevante acima de ~10 km) · gravidade constante · dispersão é ordem de
grandeza. Tudo listado na tela `#/sobre` — não escondido em rodapé.

---

## 6. Como rodar

```bash
npm install
npm run dev      # http://localhost:5174
npm test         # 54 testes do motor
npm run build    # dist/
```
