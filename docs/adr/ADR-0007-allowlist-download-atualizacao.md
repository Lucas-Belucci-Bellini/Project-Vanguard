# ADR-0007 — Allowlist do download de atualização

- **Status:** Aceita para V2; teste com release posterior ainda pendente
- **Data:** 2026-08-27
- **Escopo:** Detecção de releases e abertura de APK/Página no PWA e Capacitor

## Contexto

O fluxo de atualização consulta uma release posterior e apresenta um botão somente após confirmação da pessoa. O payload remoto pode conter assets e URLs de página; aceitar qualquer URL HTTPS ou qualquer host GitHub ampliaria desnecessariamente a superfície de redirecionamento e poderia abrir um asset de outro projeto.

A API REST de releases do GitHub documenta que os endpoints de releases fornecem a URL da página e a `browser_download_url` dos assets.[1] O aplicativo deve tratar esses valores como dados não confiáveis e verificar sua origem antes de abrir um navegador ou instalador.

## Decisão

`src/core/atualizacao.js` passa a aceitar como destino apenas URLs com protocolo HTTPS, host `github.com` e caminho iniciado por `/Lucas-Belucci-Bellini/Project-Vanguard/`. Um APK oficial válido é priorizado; se o asset for externo, malformado ou inseguro, o fluxo usa a página de releases oficial como fallback. Se a própria página remota não for oficial, o destino volta à URL fixa de releases.

A detecção continua comparando uma tag semântica maior que `VERSAO_ATUAL` e recusando rascunhos. O botão continua exigindo confirmação explícita. O APK não se auto-instala: o aplicativo apenas abre a origem oficial e deixa o navegador/WebView e o instalador do sistema conduzirem as confirmações seguintes.

## Consequências

A mudança reduz o risco de abrir um asset de projeto, host ou esquema inesperado e mantém o comportamento offline local. URLs com query ou fragmento permanecem permitidas quando estão dentro do caminho oficial, pois a verificação é de origem e caminho, não de uma string fixa. O fluxo ainda depende de uma validação controlada com uma release posterior real; teste unitário não prova instalação, assinatura ou comportamento do sistema operacional.

## Referências

[1]: [GitHub Docs — REST API endpoints for releases](https://docs.github.com/en/rest/releases/releases)
[2]: [GitHub Docs — About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
