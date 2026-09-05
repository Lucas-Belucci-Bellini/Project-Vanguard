# `#/noturno` — Visão noturna

**Estado:** `IMPLEMENTED`

## Objetivo
Amplificar a luz que já existe numa cena escura, e dizer quando **não há luz
para amplificar**.

## Entrada
Paleta, ganho manual, empilhamento ligado/desligado, lanterna.

## Dados necessários
Câmera traseira (`getUserMedia`); GPS, quando a imagem for capturada.

## Dependências
`engine/visao-noturna.js`, `core/camera-noturna.js`, `engine/fixo-medio.js`,
`core/foto-parada.js`, `core/foto-storage.js`.

## Ações
- **COMEÇAR / PARAR** — abre e solta a câmera.
- **CAPTURAR** — grava a imagem processada com a coordenada da captura.
- **LANTERNA** — só aparece quando o aparelho expõe `torch`.
- **Paleta e ganho** — mudam o processamento ao vivo.

## Saídas
Imagem intensificada e os números do que foi feito com ela: amplificação,
quadros na pilha, ruído removido, luz da cena.

## Estados
LOADING (permissão) · SUCCESS (ativa) · EMPTY (parada) · ERROR (falhou) ·
UNAVAILABLE (sem câmera) · **ESCURO_DEMAIS** (há câmera, não há luz).

## Limitações
**Não é infravermelho e não é térmico** — o filtro corta-IR é de fábrica e não
existe sensor térmico em telefone comum. Não grava vídeo, não transmite
(teste estrutural). Empilhar quadros custa nitidez quando a câmera se move, e a
pilha encolhe sozinha para limitar o rastro (ADR-0044).

## Testes
`test/visao-noturna.test.js` (21), `test/camera-noturna.test.js` (12).
