# Changelog

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
