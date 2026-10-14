# Auditoria de rotas — 2026-09-02

Auditoria completa das 13 rotas do Vanguard Field, sob uma regra só:

> **Uma rota só deve existir se houver funcionalidade real associada a ela.**

Nada nesta página foi concluído por leitura de código. Cada linha da tabela saiu
de uma medição no Chromium: a rota foi aberta, os botões foram apertados e o
resultado foi comparado com o que a tela promete.

## Como foi medido

| Ferramenta | O que responde |
| --- | --- |
| `npm test` (605 testes) | O motor calcula certo e os contratos valem. **Não** diz que a interface funciona. |
| `scripts/verificar-rotas.mjs` | Cada rota abre, renderiza, não lança exceção e não vaza na horizontal — a 320 e a 390 px. |
| `scripts/verificar-fluxos.mjs` | Nove fluxos de ponta a ponta: apertar o botão faz o que ele diz. |
| Medição de rodapé | Rolar tudo e conferir que nada fica preso embaixo da barra de abas fixa. |

Os dois scripts exigem Playwright e um Chromium, que **não** são dependências
deste repositório — o `postinstall` do Playwright baixaria um navegador em todo
`npm ci`. Eles rodam à mão, e o comando está no cabeçalho de cada arquivo.

## Resultado

| Rota | Página | Abre? | Dados | Ações | Testes | Estado |
| --- | --- | :-: | --- | --- | --- | --- |
| `#/inicio` | `inicio.js` | ✓ | estado local + service worker | GPS, atalhos | unidade + varredura | `IMPLEMENTED` |
| `#/mapa` | `mapa.js` | ✓ | GPS, tiles, IndexedDB | 27 ações reais | unidade + varredura | `IMPLEMENTED` |
| `#/navegacao` | `navegacao.js` | ✓ | GPS contínuo | rumo, conversor MGRS | unidade + fluxos 1–4 | `IMPLEMENTED` ⚠ corrigida |
| `#/bussola` | `bussola.js` | ✓ | sensor + Sol | calibrar, travar, declinação | unidade + fluxos 5–6 | `IMPLEMENTED` ⚠ corrigida |
| `#/socorro` | `socorro.js` | ✓ | GPS alta precisão | preparar pacote local | unidade | `IMPLEMENTED` |
| `#/escuta` | `escuta.js` | ✓ | microfone cru | escutar, sensibilidade | 28 testes | `IMPLEMENTED` |
| `#/noturno` | `noturno.js` | ✓ | câmera + GPS | capturar, paleta, lanterna | 33 testes | `IMPLEMENTED` |
| `#/contexto` | `contexto.js` | ✓ | `ZONAS` no aparelho | CRUD, import, export | unidade | `IMPLEMENTED` ⚠ corrigida |
| `#/sobrevivencia` | `sobrevivencia.js` | ✓ | catálogo v1, 7 guias com fonte | busca, filtro | catálogo versionado | `IMPLEMENTED` |
| `#/sobre` | `sobre.js` | ✓ | versão do `package.json` | — | fluxo 9 | `IMPLEMENTED` ⚠ corrigida |
| `#/diagnostico` | `diagnostico.js` | ✓ | sondas do ambiente | recarregar | unidade | `IMPLEMENTED` ⚠ corrigida |
| `#/doar` | `doar.js` | ✓ | nenhum | nenhuma que cobre | fluxo 7 | `UNAVAILABLE` |
| `#/tiro` | `tiro.js` | ✓ | terrenos de Arma 3 | calcular (simulação) | unidade + `rotas` | `LEGACY` ⚠ corrigida |

Nenhuma rota ficou `BROKEN`, `PARTIAL` ou `CONTENT_REQUIRED`, e nenhuma foi
removida: todas as treze têm finalidade e funcionalidade.

## Os dez defeitos encontrados, e o que era cada um

### 1. Campo vazio virava coordenada (0, 0) — `#/navegacao` · **grave**

Com os dois campos do waypoint **em branco**, a tela exibia
`DISTÂNCIA 5669.71 km em linha reta · RUMO 69.3° E`. `Number('')` é **0**, e 0
passa em `Number.isFinite` e cabe em `[-90, 90]`: a validação aceitava campo
vazio como o Null Island. Num aplicativo cuja função é dizer para onde andar,
isso é rumo para um destino que ninguém informou.

Corrigido com `coordenadaValida()` de `engine/numero-seguro.js` — o módulo que
existe exatamente para esta armadilha, e que esta tela não usava.

### 2. Declinação vazia virava correção medida — `#/bussola` · **grave**

O mesmo `Number('')` = 0: apertar **USAR ESTA DECLINAÇÃO** com o campo vazio
aplicava uma correção de 0°, e a agulha passava a exibir **CORRIGIDO**. É o
oposto do que o ADR-0040 decidiu — a leitura crua só vira azimute verdadeiro
depois de existir uma correção de verdade.

### 3. Zona vencida era apagada em silêncio — `#/contexto` · **grave**

A tela carregava `zonasAtivas(...)` e regravava essa lista filtrada. Uma zona
que passava da validade sumia da tela com a mensagem *"Nenhuma zona local
cadastrada"* — falsa — e era **destruída em definitivo** na gravação seguinte.
A pessoa tinha digitado a fonte e a data.

Agora todas as zonas ficam guardadas e visíveis, marcadas `ATIVA`, `VENCIDA` ou
`DESLIGADA`. O filtro por validade continua existindo, mas só onde decide o
modo — nunca onde decide o que sobrevive no aparelho.

### 4. Dois botões inalcançáveis — `#/navegacao`, `#/sobrevivencia`

Medido rolando até o fim: **ABRIR NO MAPA** e **ABRIR MODOS DE CONTEXTO** ficavam
presos embaixo da barra de abas fixa. Um botão que existe e não pode ser tocado
é pior que um botão ausente.

### 5. Texto final inalcançável — `#/sobre`, `#/diagnostico`, `#/doar`

Mesma causa. As folhas tinham `padding: 24px` contra ~86 px de barra — e, pior,
uma media query mais abaixo resetava `padding: 16px`, apagando a folga
**exatamente na largura de celular**, que é onde ela importa.

### 6. A tela legada não se declarava legada — `#/tiro`

A calculadora balística do ambiente de testes de **Arma 3** abria por link
direto sem nenhum aviso na tela. Quem chega pela URL não leu a documentação.
Agora a primeira coisa da tela é o aviso de que aquilo é simulação de
videogame, e não tabela de tiro, manual ou orientação real.

### 7. A versão exibida era a palavra "PROTÓTIPO" — `#/sobre`

Num app que se atualiza por APK, a versão na tela é como a pessoa sabe se já
recebeu a correção. Agora vem do `package.json` no build (`__APP_VERSION__`), a
mesma fonte que o `versionName` do Android e o gate do workflow conferem.

### 8. `INDISPONÍVEL` era pintado como `ATENÇÃO` — `#/diagnostico`

O badge era binário. "O navegador não expõe o nível de bateria" aparecia com a
mesma cara de "algo está errado" — e um diagnóstico que trata desconhecido como
problema treina quem lê a ignorá-lo. Agora são três estados.

### 9. Mensagem de checkout escrita para o desenvolvedor — `#/doar`

O botão já não prometia pagamento (correto), mas respondia *"configure
ASAAS_API_KEY, Webhook e domínio público"*. Quem está com o dedo no botão
precisa saber o que houve com o dinheiro dele, não o que falta no servidor.

### 10. Uma tela fora da convenção — `#/navegacao`

`class="pagina navegacao"` — e `.pagina` não existe em folha de estilo nenhuma;
um `<main>` aninhado dentro do `<main>` do shell, com um `id` que nenhum link
aponta; e `--color-panel`, `--color-border`, `--color-accent`, que **não existem**
em `variables.css` e caíam em hexadecimal escrito ao lado. Uma mudança de tema
não alcançava esta tela.

## O que a auditoria NÃO encontrou

Vale registrar, porque procurar e não achar também é resultado:

- Nenhum `TODO`, `FIXME`, `alert()` ou ação só-console nas páginas.
- Nenhum link interno para rota inexistente (agora cobrado por teste).
- Nenhuma página órfã sem rota, e nenhuma rota sem página.
- Nenhum card estático apresentado como dado vivo.
- `#/socorro` já separava corretamente *preparar* de *transmitir*.
- `#/sobrevivencia` já tinha conteúdo real, com fonte, escopo, data de revisão e
  versão de catálogo — nada inventado.
- `#/contexto` já tinha estado vazio e lista de zonas (eu havia concluído o
  contrário numa primeira passagem, por um `grep` que procurava a palavra em
  maiúsculas; a checagem seguinte desmentiu).

## Regressões cobertas por teste

O que foi corrigido agora tem quem cobre:

- `test/rotas.test.js` — módulo existe, exportação existe, hash único, nenhuma
  página órfã, nenhum link fantasma, rota legada marcada e fora do menu, aviso
  de legado na tela, contrato escrito para cada rota.
- `test/viewport-travado.test.js` — item de flex que cresce precisa de
  `min-width: 0` (o lint pegou uma regressão minha durante esta própria auditoria).
- `test/numero-seguro.test.js` — a guarda que as duas telas passaram a usar.
- `scripts/verificar-fluxos.mjs` — os nove fluxos, incluindo os quatro defeitos
  graves acima.
