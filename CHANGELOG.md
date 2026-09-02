# Changelog

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
