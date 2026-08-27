# ADR-0009 — Deduplicação do render de rótulos do mapa

- **Status:** Aceita para V2; ganho quantitativo ainda requer profiling físico
- **Data:** 2026-08-27
- **Escopo:** Canvas sobreposto de rótulos da grade MGRS no Mapa

## Contexto

O Mapa mantém um canvas sobreposto para rótulos da grade. O MapLibre pode emitir vários eventos `render` enquanto a câmera, o viewport ou os tiles estabilizam. Reexecutar projeção, limpeza e pintura quando o estado visual não mudou desperdiça trabalho, especialmente em aparelhos móveis.

## Decisão

Adicionar `src/core/chave-renderizacao.js` com `chaveDesenhoGrade()`, uma função pura que normaliza centro, zoom, bearing, pitch, dimensões, DPR e versão da grade. `src/pages/mapa.js` guarda a última chave e ignora eventos `render` idênticos. A versão da grade aumenta quando os limites/zoom regeneram a grade; dimensão, DPR e câmera invalidam a chave naturalmente.

A mudança não altera a fonte cartográfica, o cálculo geográfico, o GPS, o registro da trilha, o wake lock, o cache ou a frequência de eventos de localização. Não adiciona polling, worker ou dependência nova.

## Consequências

Eventos de renderização repetidos deixam de redesenhar o canvas quando nada visual mudou. A lógica é determinística e possui testes para estabilidade e invalidação por câmera, viewport, DPR e grade. O comportamento visual permanece compatível com a decisão anterior de usar canvas para evitar dependência de glyphs.

Essa decisão não declara um ganho percentual e não encerra o item de performance. FPS, tempo de frame, memória total, consumo de bateria, suspensão e comportamento Android/iOS continuam exigindo profiling físico comparativo antes/depois.

## Evidência

- `npm test`: 129 testes aprovados.
- `npm run build`: aprovado.
- Preview `#/mapa`: base, controles e overlay carregaram; console sem erro.
- Android debug: recompilado com sucesso; é artefato de teste, não release.
