# 🔗 Integração — Project Vanguard ⇄ Projeto Baluarte

> Como os dois projetos conversam. Baseado no que o Baluarte **realmente é**
> hoje (stack inspecionada no repositório), não em suposição.

---

## 1. Sitrep: o que o Baluarte já tem

| Item | Situação no Baluarte | Consequência para o Vanguard |
|---|---|---|
| **Stack** | JS puro ES2022 + Vite 5. Sem framework, **sem TypeScript** (não-negociável, `CLAUDE.md`) | O Vanguard adota a mesma. Código atravessa os dois sem tradução. |
| **UI** | Hyperscript `h()` em `src/utils/helpers.js` | `src/ui/helpers.js` do Vanguard tem **API idêntica** de propósito |
| **Rotas** | Router por hash, uma página por rota, 1 CSS por página | O Vanguard entra como rota(s), sem adaptação |
| **Tokens** | `src/styles/variables.css` (`--color-cyan`, `--space-*`, …) | O Vanguard usa **os mesmos nomes** com valores Mil-Spec |
| **Mapa** | `/mapa` **já usa MapLibre GL** (multi-camada, sem chave) | Mesma biblioteca — zero atrito |
| **Balística** | `src/utils/arma3-balistica.js` com modelo `airFriction` | O Vanguard usa a **mesma formulação de arrasto** |
| **Geo** | `src/utils/geo-tracker.js` (watchPosition + trilha), `triangulation.js` | Reaproveitáveis direto na Fase 2 |
| **Backend** | `api/*.py` serverless (Vercel) + `backend/server.py` (Render) | Onde `POST /api/fire-mission` vai morar |
| **Realtime** | `src/core/realtime.js` — **Supabase Realtime sem SDK**, ~90 linhas | Canal pronto para rastreio de esquadrão |
| **Auth/Dados** | Supabase (`core/supabase.js`, `supabase-auth.js`) | Identidade e persistência já resolvidas |
| **Mobile** | Capacitor Android (`capacitor.config.json`, `android/`) | Publicação mobile já existe |
| **Desktop** | Electron (`desktop/`), ponte `window.baluarte.native` | Gate do que é pesado |
| **Regra #238** | **web = leve · app = completo** | Determina o que vai onde (§3) |

---

## 1.1 O que já está de pé: os terrenos do Arma 3

Antes das vias abaixo (que são plano), esta ponte já funciona nos dois lados —
e é o primeiro pedaço de **dado** compartilhado, não só de código.

| Peça | Onde mora | Papel |
|---|---|---|
| `scripts/arma3/gerar-base-terrenos.py` | **Baluarte** | Gerador. Lê o dump de `CfgWorlds` e escreve **nos dois repos** |
| `src/data/arma3-terrenos.js` | os dois | 31 mundos com a grade medida (offset, passo, dígitos) |
| `public/arma3/terrenos-db.json` | os dois | localidades e aeroportos, carregado sob demanda |
| `src/utils/arma3-grade.js` | Baluarte | conversor grade ⇄ metros |
| `src/engine/arma3-grid.js` | Vanguard | o mesmo conversor + integração com a missão de tiro |

**Por que o gerador escreve nos dois em vez de cada repo ter a sua cópia:** duas
bases mantidas à mão divergem, e a divergência aqui não faz barulho — dá um
azimute plausível e errado. Um gerador, duas saídas, um `git diff` no CI do
Baluarte para provar que o commit bate com o dump.

**A passagem de bastão:** o card de terreno do Baluarte (`src/pages/vanguard.js`)
resolve azimute plano e linka para
`project-vanguard-cyan.vercel.app/#/tiro?terreno=…&peca=…&alvo=…`. O Vanguard lê
os três parâmetros, entra no quadro local no terreno certo e abre já calculado —
com carga, elevação, tempo de voo e vento, que o card do Baluarte não faz
(assumidamente: sem DEM, não há diferença de altitude).

⚠️ **O sinal do passo é a armadilha.** Em 30 dos 31 mundos o northing do Arma
conta do norte para o sul. Os dois conversores leem o sinal do config; nenhum
dos dois assume convenção. Ver `src/engine/arma3-grid.js` para a medição.

---

## 2. As três vias do briefing, avaliadas

O briefing levantou três abordagens. Todas são certas — para partes
**diferentes** do problema. A resposta não é escolher uma; é saber qual
resolve o quê.

### ① Módulo/Widget → **é a via principal**

O Baluarte é um SPA em JS puro. O motor do Vanguard é **JS puro, zero
dependências, zero DOM**. Ele literalmente copia e cola.

Não precisa de rede, não precisa de servidor, funciona offline, e o custo é de
~12 kB gzip. Pela regra #238, isso é **leve** — vai para a **web**, não fica
preso ao app.

### ② API REST → **para o que precisa persistir**

Cálculo não precisa de servidor. **Histórico de missões, alvos registrados e
compartilhamento entre operadores** precisam. O Baluarte já tem `api/*.py` no
Vercel e Supabase — a infraestrutura existe.

### ③ WebSocket → **para o esquadrão ao vivo**

Rastreio em tempo real (as setinhas dos aliados no mapa, como no multiplayer do
Arma 3). O Baluarte **já tem** `src/core/realtime.js`, um cliente Supabase
Realtime de ~90 linhas sem SDK, com heartbeat e backoff. Não há nada a
construir — há um canal a usar.

---

## 3. Arquitetura recomendada

```
┌──────────────────────── PROJETO BALUARTE (host) ────────────────────────┐
│                                                                          │
│  src/pages/vanguard-mapa.js   ← rota /vanguard-mapa                      │
│  src/pages/vanguard-tiro.js   ← rota /vanguard-tiro                      │
│         │                                                                │
│         ▼                                                                │
│  src/utils/vanguard/          ← MOTOR copiado (zero-dep, ~12 kB gzip)    │
│    angles · geo · mgrs · gridref · ballistics · charges · fire-mission    │
│         │                                                                │
│         ├──→ core/realtime.js   (Supabase Realtime) → esquadrão ao vivo   │
│         ├──→ core/supabase.js   → missões e alvos registrados             │
│         └──→ api/fire-mission.py → cálculo em lote / clientes externos    │
│                                                                          │
│  Gate #238: mapa+tiro = LEVE → web.  Terreno 3D/DEM pesado = app-only.   │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.1 O que vai para a web (leve)

- Motor inteiro (coordenadas, balística, contrato) — matemática pura.
- Tela de tiro — só formulário e números.
- Mapa 2D com grade MGRS — o MapLibre já é usado no `/mapa`.

### 3.2 O que fica app-only (`window.baluarte.native`)

- Perfil de elevação e **máscara de crista** com DEM (dado pesado).
- Pacote de tiles offline por área (armazenamento grande).
- Rastreio contínuo em segundo plano (exige plugin nativo).

---

## 4. Plano de execução

### Passo 1 — Vendorizar o motor

O motor não tem dependências, então "instalar" é copiar:

```bash
# no Projeto Baluarte
mkdir -p src/utils/vanguard
cp ../Project-Vanguard/src/engine/*.js src/utils/vanguard/
cp -r ../Project-Vanguard/test src/utils/vanguard/__test__
```

> **Manutenção:** enquanto o motor estiver em evolução, copiar é mais simples
> que submódulo git. Quando estabilizar, promover a submódulo ou a pacote npm
> privado — aí a cópia vira dívida.

Os 65 testes vêm junto e rodam com `node --test`, sem runner novo.

### Passo 2 — Registrar as rotas

Seguindo os 5 pontos do `CONTRIBUTING.md` do Baluarte:

1. `src/pages/vanguard-tiro.js` — `export function vanguardTiroPage() {…}`
2. `src/main.js` — `router.register('/vanguard-tiro', lazy(() => import('./pages/vanguard-tiro.js'), 'vanguardTiroPage'));`
3. `src/layout/sidebar.js` — item novo. Sugestão: dentro do grupo militar,
   ou um grupo **"Vanguard"** com Mapa Tático e Computador de Tiro.
4. `src/layout/shell.js` — título em `pageTitleForRoute`.
5. `index.html` — `<link>` para o CSS da página.
6. `src/utils/icons.js` — entrada em `iconByPath` (⌖ para o mapa, ◎ para o tiro).

### Passo 3 — Reconciliar os dois modelos balísticos

O Baluarte tem `src/utils/arma3-balistica.js` (queda de bala em armas de tiro
tenso, para a wiki de Arma 3). O Vanguard tem `ballistics.js` (solução de
tiro para morteiro). **Eles não competem** — resolvem problemas inversos:

| | `arma3-balistica.js` (Baluarte) | `ballistics.js` (Vanguard) |
|---|---|---|
| Pergunta | "Dado o ângulo, onde a bala cai?" | "Dado o alvo, qual o ângulo?" |
| Domínio | Tiro tenso, arma de infantaria | Tiro curvo, morteiro |
| Saída | Queda em cm e mils, deriva | Elevação, azimute, tempo de voo |

**Ambos usam a mesma formulação `airFriction`** — decisão deliberada. Um
coeficiente calibrado num vale no outro.

**Recomendação:** manter os dois, e numa fase seguinte extrair o integrador
comum para `vanguard/ballistics.js`, deixando o do Baluarte só com a camada de
zeragem/retícula. Fundir agora seria refatorar código que funciona sem ganho
imediato.

### Passo 4 — Persistência (Supabase)

```sql
create table vanguard_missoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id),
  criado_em timestamptz default now(),
  pedido jsonb not null,     -- vanguard.fire-mission/1
  solucao jsonb,             -- vanguard.fire-solution/1
  esquadrao text
);
alter table vanguard_missoes enable row level security;
create policy "dono lê e escreve" on vanguard_missoes
  for all using (auth.uid() = usuario_id);
```

Guardar **pedido e solução como `jsonb`** é deliberado: o contrato é versionado
(`schema`), então migração futura é possível sem perder histórico, e nenhuma
coluna precisa mudar quando o motor ganhar campos.

### Passo 5 — Esquadrão ao vivo

```js
import { subscribeTable } from '../core/realtime.js';

const sub = subscribeTable(
  { table: 'vanguard_posicoes', event: '*' },
  (linha) => atualizarMarcadorAliado(linha)
);
// ... ao sair da tela:
sub.close();
```

> ⚠️ **Rastreio compartilhado é opt-in explícito por missão.** Posição de
> pessoa é dado sensível; ligar por padrão seria errado, mesmo num app de
> treino.

### Passo 6 — Endpoint (opcional)

`api/fire-mission.py` no Vercel. **Mas atenção:** o motor é JavaScript, e as
funções do Baluarte são Python. Duas saídas, em ordem de preferência:

1. **Não portar.** Manter o cálculo no cliente e usar o endpoint só para
   persistir/consultar missões. Recomendado — evita a segunda implementação
   da física, que é exatamente o que a arquitetura tenta impedir.
2. Se um cliente externo (não-JS) precisar calcular: expor uma função Node no
   Vercel (`api/fire-mission.mjs`) importando o mesmo motor. Uma
   implementação, dois hosts.

**Nunca** reimplementar a física em Python. É a única regra inegociável desta
integração.

---

## 5. Checklist de merge no Baluarte

- [ ] Motor copiado para `src/utils/vanguard/`, testes passando com `node --test`
- [ ] Rotas registradas nos 5 pontos do `CONTRIBUTING.md`
- [ ] CSS das páginas usando **só tokens** de `variables.css` (nenhum hex solto)
- [ ] Feature gate `#238` aplicado ao que for pesado
- [ ] `historico/CHANGELOG.md` atualizado
- [ ] Branch própria → commit → PR draft → merge com **CI verde**
- [ ] Issue guarda-chuva do Vanguard aberta e referenciada em **#240** (roadmap mestre)

---

## 6. O que NÃO fazer

- **Não** trazer React/Vue junto com o widget. O `CLAUDE.md` veta framework, e o
  motor não precisa de nenhum.
- **Não** reimplementar MGRS ou balística no Baluarte. Uma implementação, testada.
- **Não** hardcodar cor Mil-Spec nas páginas do Baluarte — lá o tema é
  "Ouro de Fábula". Usar tokens faz a mesma página ficar certa nos dois.
- **Não** ligar rastreio de posição por padrão.
- **Não** apresentar os dados de armamento como tabela de tiro oficial. Eles são
  referência de modelo — o aviso da tela `#/sobre` acompanha a integração.

---

## Nota de escopo atual — Vanguard Field

Este documento preserva o contrato histórico de integração com o Projeto Baluarte. O produto principal atual é o Vanguard Field civil, offline-first e orientado a navegação, sobrevivência e proteção civil. Recursos de esquadrão, WebSocket e cálculo balístico descritos aqui não fazem parte do fluxo recomendado do aplicativo atual.

Para a visão vigente, consulte `README.md`, `docs/MAPA-DE-FUNCIONALIDADES.md` e `docs/CONTEXTOS-E-SEGURANCA.md`. A integração futura deve priorizar dados civis, fontes oficiais, privacidade, auditoria e confirmação explícita de qualquer transmissão.
