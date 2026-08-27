# Validação de acessibilidade da shell no preview — 2026-08-27

## Evidência reproduzida

A rota `http://localhost:5174/?fresh=20260827-accessibility#/inicio` foi aberta após o build web. A tela inicial renderizou normalmente, com o link **Pular para o conteúdo principal** visível no conteúdo textual da página.

A inspeção DOM confirmou:

| Elemento | Resultado |
|---|---|
| Link de salto | `href="#vg-main"`, texto em português |
| Landmark principal | elemento semântico `<main id="vg-main">` |
| Foco após navegação | `vg-main` |
| Foco programático | `tabindex="-1"` e `aria-busy="false"` |
| Navegação | `<nav aria-label="Navegação principal">` |
| Status global | `aria-label` e `aria-live="polite"` |
| Alertas de falha | `role="alert"` na mensagem de carregamento de tela |

O helper `src/ui/helpers.js` passou a mapear explicitamente `ariaLabel`, `ariaHidden`, `ariaCurrent`, `ariaLive` e `ariaBusy` para seus atributos HTML correspondentes.

## Limites

Esta evidência demonstra semântica e foco no Chromium do preview. Não substitui teste físico com TalkBack, VoiceOver, teclado externo, leitor de tela, luz forte ou operação em movimento. Também não valida GPS, suspensão, bateria, cache offline ou distribuição mobile.
