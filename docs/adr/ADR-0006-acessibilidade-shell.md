# ADR-0006 — Acessibilidade semântica da shell

- **Status:** Aceita para V2; validação física pendente
- **Data:** 2026-08-27
- **Escopo:** Shell compartilhada do Vanguard Field PWA/Capacitor

## Contexto

A shell é repetida em todas as telas e precisa continuar operável com teclado, leitor de tela e navegação por foco. O app já usa botões e landmarks, mas faltava um caminho curto para ultrapassar a navegação repetida e uma forma consistente de mover o foco ao conteúdo carregado por hash.

O WCAG 2.2 é aplicável a conteúdo em dispositivos móveis e desktop e define critérios testáveis para acessibilidade.[1] O critério **2.4.1 Bypass Blocks** pede um mecanismo para ultrapassar blocos repetidos; o **2.4.7 Focus Visible** exige indicador de foco visível; e o **4.1.3 Status Messages** trata da comunicação de mudanças de estado para tecnologia assistiva.[1] [2] [3] [4]

## Decisão

A shell passa a inserir, antes do cabeçalho, o link **Pular para o conteúdo principal**, apontando para `<main id="vg-main">`. O link fica visualmente discreto até receber foco. O `<main>` recebe `tabindex="-1"`, `aria-label="Conteúdo principal"` e foco programático após cada mudança de rota; durante o carregamento, `aria-busy` indica o estado e volta a `false` ao finalizar.

O status global de conectividade/localização mantém `aria-live="polite"` e rótulo explícito. Falhas de carregamento de tela recebem `role="alert"`. O helper DOM passa a converter explicitamente os atalhos históricos `ariaLabel`, `ariaHidden`, `ariaCurrent`, `ariaLive` e `ariaBusy` para seus nomes de atributo HTML, evitando depender de propriedades específicas do navegador.

## Limites e validação pendente

Esta decisão melhora a semântica e o foco da WebView, mas não declara conformidade WCAG completa. Ainda são necessários testes com teclado externo, TalkBack, VoiceOver, contraste, redimensionamento, operação com uma mão, luz forte e aparelhos Android/iOS reais. A mudança não altera permissões, localização, ciclo de vida, armazenamento, sincronização ou transmissão de dados.

## Referências

[1]: [W3C — Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/)
[2]: [W3C — Technique G1: Adding a link at the top of each page that goes directly to the main content area](https://www.w3.org/WAI/WCAG22/Techniques/general/G1)
[3]: [W3C — Understanding Success Criterion 2.4.7: Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)
[4]: [W3C — ARIA22: Using role=status to present status messages](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22)
