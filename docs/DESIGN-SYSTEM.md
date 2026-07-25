# 🎨 Design System — Project Vanguard ("Mil-Spec")

> Contrato visual. Toda tela nova sai daqui — nunca cor ou espaçamento "na mão".
> Fonte da verdade: `src/styles/variables.css`.

---

## 1. Princípios

1. **Instrumento, não página.** A referência é o mapa do Arma 3 e o MicroDAGR:
   utilitário, denso, sem ornamento. O fundo some; o dado brilha.
2. **Tokens primeiro.** Cor, espaço, raio, tipografia, transição → sempre via
   variável. Hex solto numa folha de página é bug, não estilo.
3. **Nomes compartilhados com o Baluarte.** `--color-cyan`, `--space-*`,
   `--radius-*` etc. têm **os mesmos nomes** lá e aqui, com valores diferentes.
   Um componente atravessa os dois projetos e assume o tema do destino sozinho.
4. **Legível sob estresse.** Numeral tabular, largura fixa, alto contraste.
   Texto que dança custa leitura, e a leitura aqui é o produto.
5. **Cor tática é reservada.** Azul, vermelho-claro, verde-claro e amarelo têm
   significado normativo (APP-6) e **não** podem ser gastos em decoração.

---

## 2. Cores

### 2.1 Base (modo `tatico`, padrão)

| Papel | Token | HEX |
|---|---|---|
| Fundo | `--color-bg` | `#0c0f0a` |
| Fundo elevado | `--color-bg-elevated` | `#11150e` |
| Superfície | `--color-surface` | `#171c13` |
| Superfície 2 / 3 | `--color-surface-2` / `-3` | `#1e2419` / `#262d20` |
| **Acento 1 — fósforo** | `--color-cyan` (+ `-soft`, `-edge`) | `#8bff3f` |
| **Acento 2 — âmbar** | `--color-magenta` (+ `-soft`, `-edge`) | `#ffb000` |
| Texto (areia) | `--color-text-primary` | `#dcd6c0` |
| Texto secundário | `--color-text-secondary` | `#a29a7f` |
| Texto apagado | `--color-text-muted` | `#6f6a56` |
| Sucesso / Aviso / Perigo | `--color-success` / `-warning` / `-danger` | `#4caf50` / `#ffb000` / `#ff4136` |

> Os nomes `cyan`/`magenta` são herança do Baluarte e **ficam**. Aqui,
> `cyan` = fósforo e `magenta` = âmbar. Renomear quebraria a portabilidade
> de ~80 folhas do outro projeto.

**Contraste:** fósforo sobre fundo ≈ **13:1**; areia sobre fundo ≈ **11:1**
(ambos AAA). `--color-text-muted` fica em ~4,6:1 — AA para corpo, **não** usar
em texto pequeno crítico.

### 2.2 Afiliação APP-6 / MIL-STD-2525 (normativo)

| Afiliação | Token | HEX |
|---|---|---|
| Amigo | `--app6-amigo` | `#80e0ff` |
| Hostil | `--app6-hostil` | `#ff8080` |
| Neutro | `--app6-neutro` | `#aaffaa` |
| Desconhecido | `--app6-desconhecido` | `#ffff80` |

Não são escolha estética: quem lê carta militar espera exatamente estas.
**Uso reservado a marcação tática.**

### 2.3 Regra de uso

Acento 1 = ação e dado primário. Acento 2 = segundo plano de leitura
(elevação, rótulo de grade). Estados só para status real.

Para transparência, **nunca** um `rgba()` novo — usar `-soft`/`-edge`, ou
`color-mix(in srgb, var(--color-cyan) 20%, transparent)`. É isso que faz a
página seguir os três modos de tela sem retoque.

---

## 3. Os três modos de tela

Trocados por `data-modo` no `<html>`; **só variáveis mudam**, nenhum componente
sabe que existem.

| Modo | Fundo | Acento | Quando |
|---|---|---|---|
| `tatico` | `#0c0f0a` | fósforo `#8bff3f` | Padrão |
| `noite` | `#0a0000` | vermelho `#ff3b30` | **Visão noturna** |
| `dia` | `#d8d5c4` | verde-escuro `#1d4d00` | Sol a pino |

**`noite` não é enfeite.** O olho adaptado ao escuro é quase cego ao vermelho,
então a tela deixa de destruir a adaptação — requisito real de equipamento de
campo. Em tela OLED, ainda economiza bateria.

**`dia`** inverte para máximo contraste e **zera o glow** (`--shadow-glow-*: none`):
sob sol forte, glow vira borrão.

---

## 4. Tipografia

```css
--font-mono: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular,
             Menlo, Consolas, 'DejaVu Sans Mono', monospace;
```

**Mono em tudo** — `--font-sans` e `--font-display` apontam para o mesmo stack.
Com `font-variant-numeric: tabular-nums` global, a coordenada muda 10×/s sem o
layout pular.

| Token | px | Uso |
|---|---|---|
| `--font-size-xs` | 10 | Rótulo de HUD, legenda |
| `--font-size-sm` | 11 | Tabela, dica |
| `--font-size-base` | 13 | Corpo |
| `--font-size-md` | 15 | Valor de chip |
| `--font-size-2xl` | 28 | Leitura destacada |
| `--font-size-display` | 52 | **Azimute e elevação** |

Títulos: caixa alta, `--tracking-wider` (0,14em), peso 600.
Helpers de formatação em `src/ui/helpers.js`: `mil()` (4 dígitos com zeros à
esquerda), `dist()`, `seg()`, `num()`.

---

## 5. Espaço, raio, movimento

- **Espaço:** escala de 4 px, `--space-2xs` (2) → `--space-3xl` (64).
- **Raio:** `--radius-xs: 0` → `--radius-xl: 6px`. **Deliberadamente pequenos** —
  equipamento militar não tem canto macio. O visual de instrumento vem daqui
  tanto quanto da cor.
- **Transições:** `--transition-fast: 90ms` / `base: 150ms` / `slow: 240ms`.
  Rápidas: numa ferramenta operacional, animação longa é atraso disfarçado.
- `prefers-reduced-motion` é respeitado globalmente em `base.css`.

---

## 6. Componentes

| Classe | O que é |
|---|---|
| `.vg-painel` + `__titulo` + `__corpo` | Bloco padrão. Título em âmbar, caixa alta. |
| `.vg-leitura` (+ `--ambar`, `--grande`) | **O número grande do HUD.** Borda esquerda de 3 px na cor do acento. |
| `.vg-campo` + `label` + `.vg-dica` | Campo de formulário. |
| `.vg-aviso` (+ `--perigo`) | Faixa de aviso. `--perigo` pulsa (1,1 s) e é para DANGER CLOSE. |
| `.vg-tabela` | Dados. Números à direita, primeira coluna à esquerda. `tr.preferida` destaca. |
| `.vg-badge` | Etiqueta curta. |
| `.tiro__chip` | Dado secundário do HUD. |
| `.mapa__hud-bloco` | Leitura flutuante sobre o mapa, com `backdrop-filter`. |

### Regra do "número grande"

Azimute e elevação são **sempre** `.vg-leitura--grande`, **sempre** em cores
diferentes (fósforo × âmbar), **sempre** lado a lado no topo. São dois números
de 4 dígitos na mesma faixa (0000–6400): trocá-los põe a granada em qualquer
lugar menos no alvo, e cor é a defesa mais barata contra isso.

---

## 7. O mapa

A estética **não** vem dos tiles — vem da grade desenhada por cima.

- `--grid-line` / `--grid-line-forte` / `--grid-label` acompanham os três modos.
- Linhas de 10 unidades são mais fortes (1,6 px contra 0,8 px).
- **Rótulos em canvas 2D sobreposto**, não em `symbol` layer do MapLibre: a
  camada de texto exigiria um endpoint de `glyphs` (dependência de rede, fonte
  alheia). No canvas eles saem na fonte Mil-Spec, com halo na cor do fundo,
  funcionam offline e encostam nas bordas como em carta impressa.
- Marcadores: peça = fósforo · alvo = perigo · você = `--app6-amigo`.
  Linha peça→alvo tracejada em vermelho.

---

## 8. Acessibilidade

- Contraste AA/AAA nos pares principais (§2.1).
- Foco visível: `outline: 2px solid var(--color-cyan)` com `outline-offset`.
- `prefers-reduced-motion` global.
- Toda cor de estado vem acompanhada de **texto** — nunca só cor.
- O canvas de rótulos é `pointer-events: none`: não rouba o arrasto do mapa.
