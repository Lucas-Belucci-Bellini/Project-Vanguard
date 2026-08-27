# Validação da renderização do Mapa — 2026-08

## Ambiente

- URL: `http://localhost:5174/?fresh=20260827-render-grid#/mapa`
- Ambiente: preview Vite no Chromium/Linux do sandbox
- Escopo: renderização da interface e mapa; sem GPS físico e sem telemetria

## Resultado observado

A rota `#/mapa` carregou a base topográfica do MapLibre, os controles de zoom/atribuição, HUD de posição, grade/overlay, modo de uso, destino, registro local, rota e controles offline. O canvas de rótulos continuou sobreposto ao mapa. O console do preview não apresentou saída de erro.

A otimização introduz uma chave local baseada no centro, zoom, bearing, pitch, dimensões do canvas, DPR e versão da grade. Eventos `render` repetidos com o mesmo estado visual são ignorados; mudança de câmera, viewport, DPR ou grade invalida a chave. Não há polling, alteração de frequência do GPS, worker ou telemetria.

## Limites

O preview não mede FPS, tempo de frame, memória total, bateria, suspensão nativa, desempenho em Android/iOS ou comportamento durante uma caminhada. A deduplicação é uma redução de trabalho repetido, não uma alegação de ganho percentual. Profiling físico continua pendente.
