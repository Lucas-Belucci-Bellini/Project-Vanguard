# Changelog

## 1.4.4 — 2026-09-03

**O aparelho passa a se testar sozinho.** Três rodadas mediram a mesma coisa
por fora — build web, bytes do APK, e bytes do APK com o runtime nativo — e as
três disseram que as 13 rotas carregam. O que faltava não era mais medição
aqui: era medição **lá**. Nenhum teste desta máquina alcança a WebView do
sistema do operador.

**Diagnóstico → TESTAR TODAS AS ROTAS** carrega cada rota no aparelho, usando o
mesmo `import()` que a navegação usa, e diz qual falha. Não monta a tela, de
propósito: montar dispararia câmera, GPS e microfone, e uma permissão negada
apareceria como falha do app.

**Diagnóstico → COPIAR RELATÓRIO** põe versão, build, commit, origem, service
worker, autoteste e falhas registradas em texto para colar. Sem coordenada,
trilha, foto nem contato — há teste estrutural cobrando isso, porque o
relatório existe para ser colado num chat.

Verificado nos bytes empacotados, em dois casos: aparelho saudável (13 rotas
carregam) e um chunk que não chega ao pacote — o app apontou `#/noturno` e
classificou `CHUNK_NAO_CARREGOU` sozinho.

**Dois defeitos de estilo que ninguém via.** `--color-ambar` nunca existiu (o
token real é `--color-warning`): o rótulo **ATENÇÃO** do diagnóstico ficava com
a mesma cor do texto normal — um estado de alerta indistinguível de tudo o
mais. E `--color-border` também não existe, deixando as divisórias do grid
transparentes. `var()` sem fallback para token inexistente **descarta a
declaração em silêncio**, sem erro nenhum.

`test/tokens-definidos.test.js` passa a cobrar isso. Ele revelou **34
referências órfãs em 10 folhas**, com as duas grafias `--color-ambar` e
`--color-amber` convivendo. As de `diagnostico.css` foram consertadas; as
outras ficam trancadas por um teto que impede a dívida crescer — consertá-las
é decisão de design (`--color-blue` não tem equivalente em `variables.css`, e
escolher um seria inventar cor no lugar de quem desenha).

**`ROTAS` saiu do `main.js` para `src/core/rotas.js`**, fonte única: o autoteste
precisa da mesma lista, e duas cópias divergiriam justamente em "a rota existe
no menu e o autoteste não sabe dela".

**636 testes** (eram 625).


## 1.4.3 — 2026-09-02

**Quando uma tela falha, o aparelho passa a saber dizer qual e por quê.**
A 1.4.2 provou que a cadeia de build estava intacta e que o sintoma vinha do
certificado de assinatura. Esta versão fecha o que faltava: o caminho que
transforma "essa página não abre no app" em evidência.

**O branco silencioso acabou.** `container.append(resultado.elemento)` estava
fora do `try` no navegador de telas. Uma página com `return` esquecido, ou um
export com nome trocado, lançava um TypeError que ninguém pegava — e como
`navegar` roda sem `await` no `hashchange`, virava rejeição não tratada:
**tela em branco, sem o aviso de erro**. Era o modo de falha mais caro de
diagnosticar à distância, porque é exatamente o que "não funciona no
aplicativo" parece. Agora a montagem confere o contrato e nada escapa.

**Diagnóstico → TELAS.** Falha de carregamento era pintada e esquecida: sumia
na navegação seguinte e nunca chegava ao diagnóstico. Agora fica registrada com
rota, build e causa **classificada** — e a classificação é o ponto:
`MÓDULO NÃO CHEGOU` manda investigar o pacote, `TELA_FALHOU` manda investigar
a página, e o que não dá para separar vira `DESCONHECIDO` em vez de um palpite.
Verificado de ponta a ponta bloqueando o chunk do `#/noturno`: o app mostrou o
aviso certo e registrou "1 rota(s) sem o módulo no pacote" sozinho.

**A guarda de paridade passou a valer para o iOS.** `mobile:sync:ios` não
chamava guarda nenhuma — a cópia do iOS não era conferida por ninguém. Agora
as duas plataformas são comparadas por SHA-256 contra o `dist`.

**Teste que tranca a cadeia rota → módulo → chunk.** Falha se alguém adicionar
rota sem página, página sem o export que a rota consome, ou página que o build
não empacota. A lista de rotas é lida do `src/main.js`, nunca copiada — lista
copiada envelhece em silêncio, que é a própria classe de defeito perseguida
aqui. Os três modos de falha foram verificados quebrando o código de propósito.

**Não é defeito:** os diretórios de assets do Android e do iOS nascerem vazios
num clone limpo. Os dois são gerados e ignorados pelo git; `cap sync` os
preenche.

**625 testes** (eram 609). Evidência por rota, causa raiz e como diagnosticar
em [`docs/MOBILE_WEB_PARITY.md`](docs/MOBILE_WEB_PARITY.md).

**iOS continua sem prova de motor real:** este ambiente não tem WebKit nem
macOS. Os bytes chegam idênticos e renderizam, mas WKWebView não foi testado —
e a matriz diz isso em vez de marcar ✅.


## 1.4.2 — 2026-09-02

**Paridade web ↔ mobile.** A investigação começou por "as páginas novas não
aparecem no aplicativo" e terminou em quatro defeitos reais — nenhum deles onde
a suspeita apontava.

**A cadeia de build não estava quebrada.** O APK publicado da 1.4.1 foi baixado
e aberto: tem os 44 chunks, incluindo Navegação, Escuta e Noturno, com as
correções da própria 1.4.1. Servido na origem da WebView, mostra as 12 abas.
Uma instalação limpa da 1.4.1 já tinha paridade.

**A causa do sintoma é a assinatura.** Os certificados foram extraídos dos APKs:
1.1.0 assina com `38f995fc…` e 1.4.x com `d0100bfd…`. O Android **recusa**
instalar por cima de um certificado diferente — a instalação falha e o aparelho
continua na versão antiga, cujo bundle tem exatamente as 9 abas relatadas.
Da 1.3.2 em diante toda build assina igual; o caminho é desinstalar uma vez.

Os quatro defeitos encontrados e corrigidos:

- **O service worker nunca registrou dentro do aplicativo.** O registro exigia
  `location.protocol === 'https:'` e a WebView serve em `http://localhost`.
  Consequência medida: "Preparar área offline" **travava para sempre**, sem
  erro — `serviceWorker.ready` não resolve sem registro. Agora o registro usa
  `isSecureContext`, e sem registro a tela **diz** que o preparo está
  indisponível.
- **O cache do service worker nunca era invalidado**: o nome era a constante
  `vanguard-field-shell-v9`, idêntica da 1.1.0 à 1.4.1, com `fetch` cache-first
  até no `index.html`. Agora o cache vem do identificador de build, o HTML nunca
  é cache-first, e o `activate` apaga os caches de builds anteriores. O cache de
  **tiles** continua fora disso, de propósito: é o mapa que a pessoa preparou.
- **A versão do app estava congelada em `1.3.1`** — e `atualizacao.js` usa esse
  valor como "versão instalada". O app anunciava atualização para uma versão
  que ele já era. Agora vem do `package.json` pelo build.
- **Não havia como perguntar ao aparelho que bundle ele roda.** `#/diagnostico`
  ganhou o grupo **BUILD / RUNTIME**: versão, bundle, commit, execução, origem,
  contexto seguro, service worker e WebView.

Guardas novas, que falham no CI em vez de no bolso:

- `npm run verificar:paridade` — compara `dist/` com os assets do Android por
  SHA-256, exige a versão dentro do bundle empacotado, e roda dentro de
  `mobile:sync:android`. Testada: sai com código 1 quando um arquivo diverge.
- `npm run verificar:webview` — abre as 13 rotas nos **bytes do APK**, em
  `http://localhost`, com ida e volta e erros classificados.

Documentação: ADR-0045, `docs/PARIDADE-WEB-MOBILE.md` com a matriz e a origem
de cada evidência, e seis armadilhas novas no CLAUDE.md.

609 testes verdes.

**Publicada e conferida no artefato.** O APK da `mobile-v1.4.2` foi baixado da
release: SHA-256 igual ao `SHA256SUMS` publicado, 44 arquivos empacotados,
identidade `1.4.2+f66fa0739b12.202609021504` dentro do bundle e certificado
`d0100bfd…` — o mesmo desde a 1.3.2, então ela instala por cima de 1.3.2 em
diante. As 13 rotas foram abertas **nos bytes desse APK** em
`http://localhost`, com `service worker: REGISTRADO` e cache
`vanguard-field-shell-1.4.2+f66fa0739b12.202609021504`. Evidência em
[`docs/PARIDADE-WEB-MOBILE.md`](docs/PARIDADE-WEB-MOBILE.md).

## 1.4.1 — 2026-09-02

Auditoria completa das 13 rotas, com uma regra só: **uma rota só existe se
houver funcionalidade real atrás dela**. Nada foi concluído por leitura de
código — cada rota foi aberta num Chromium e cada botão foi apertado.

Três defeitos graves, todos da mesma família (fingir dado que não existe):

- **Navegação**: com os campos do waypoint **vazios**, a tela mostrava
  distância e rumo para a coordenada (0, 0). `Number('')` é 0, e 0 passa em
  `isFinite` e cabe na faixa de latitude. Rumo para um destino que ninguém
  informou, num app cuja função é dizer para onde andar.
- **Bússola**: campo de declinação vazio aplicava 0° como correção medida, e a
  agulha passava a exibir CORRIGIDO — o oposto do ADR-0040.
- **Contexto**: zona vencida sumia da tela com a mensagem "nenhuma zona
  cadastrada" (falsa) e era **apagada em definitivo** na gravação seguinte.
  Agora fica guardada e visível, marcada VENCIDA.

Mais sete correções:

- Dois **botões inalcançáveis** por baixo da barra de abas (ABRIR NO MAPA e
  ABRIR MODOS DE CONTEXTO) e o texto final de três telas. A folga era apagada
  por um `padding` de media query, justo na largura de celular.
- A **tela legada `#/tiro`** passa a se declarar legada na própria tela:
  simulação do videogame Arma 3, não tabela de tiro nem orientação real.
- **Sobre** mostra a versão real do app, vinda do `package.json`, no lugar da
  palavra "PROTÓTIPO".
- **Diagnóstico** ganha um terceiro estado: INDISPONÍVEL deixa de ser pintado
  como ATENÇÃO.
- **Apoiar** responde CHECKOUT NÃO CONFIGURADO em linguagem de quem usa, sem
  citar variável de ambiente.
- **Navegação** volta para a convenção do resto do app: `vg-pagina`, sem
  `<main>` aninhado, e com tokens que existem de verdade.

Novo: `test/rotas.test.js` (módulo existe, exportação existe, sem página órfã,
sem link fantasma, rota legada marcada, contrato escrito por rota),
`npm run verificar:rotas` e `npm run verificar:fluxos`, e a documentação em
`docs/ROUTE-AUDIT.md`, `docs/ROUTE-MATRIX.md` e `docs/ROUTES/`.

605 testes verdes.

## 1.4.0 — 2026-09-02

- **Visão noturna** (`#/noturno`): intensificação de luz por empilhamento de quadros.
  Não é infravermelho nem térmico — o celular tem filtro corta-IR de fábrica e
  nenhum software o desfaz; a tela avisa quando não há luz para amplificar.
  Parado, a pilha chega a nove quadros e o ruído cai 3×; varrendo, ela encolhe
  sozinha medindo a estrutura que perde. Quatro paletas, exposição longa onde o
  aparelho permite, lanterna onde existe. **Só vê**: não grava, não guarda e não
  transmite, com teste estrutural cobrando a lista de APIs proibidas.
- A captura da visão noturna reaproveita a foto de parada: fica no aparelho, com
  a coordenada de onde foi feita e o quanto foi amplificada.
- **Bússola 3,01× mais estável**: o rumo passa por filtro circular no vetor
  unitário (média em graus quebraria no norte). Nova linha de estabilidade que
  acusa interferência magnética, separando "girando" de "tem ferro por perto"
  pela retidão da leitura.
- **Coordenada da parada 2,73× mais precisa**: a foto de parada usa a média
  ponderada dos fixos recentes quando ela é melhor que o fixo cru. A melhora
  anunciada (2,5×) é menor que a medida, de propósito — erro de GNSS é
  correlacionado no tempo, e precisão anunciada melhor que a real é o pior
  defeito possível aqui.
- Corrigido estouro horizontal de texto em linha flex sem `min-width: 0`, com
  lint cobrindo todas as folhas de estilo.
- ADR-0044 registra as decisões, os limites físicos e as três medições.

## 1.3.5 — 2026-09-01

- Odômetro em 3D: a distância passa a somar o desnível e a peneirar o tremor do
  GPS pela precisão do fixo. Subir escada deixa de contar como ficar parado.
- Contagem de passos pelo acelerômetro, para onde o GPS não enxerga.
- Traçado da rota legível, com o trecho de veículo em camada própria.
- Resumo do dia (tempo e distância) na tela bloqueada, sem desbloquear o aparelho.
- ADR-0043.

## 1.3.2 — 2026-09-01

- Chave de assinatura do APK fixa e versionada: sem ela o Gradle inventava uma
  chave por runner de CI e o Android recusava a atualização por conflito de
  assinatura.
- Identidade visual própria: ícone e splash gerados por `android/logo/icone.mjs`.
- ADR-0042.

## 1.3.1 — 2026-08-31

- Adicionada a página local `#/navegacao`.
- Adicionado núcleo determinístico de rumo, bearing, back bearing, cardinais e segmentos.
- Exibição local de Latitude/Longitude, UTM e MGRS, com conversão MGRS.
- Mantida a separação entre dados implementados, indisponíveis e dependentes de validação física.
- Versões web, Android, iOS e workflow alinhadas em 1.3.1.

## 1.3.0 — 2026-08-31

- Padronização da identidade pública da release 1.3.0.
- Catálogo público de bases cartográficas sem CARTO/API key; provider CARTO permanece opcional no runtime.
- Execução da suíte corrigida para separar testes Node e testes Vitest.
