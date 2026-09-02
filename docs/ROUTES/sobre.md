# `#/sobre` — Sobre o aplicativo

**Estado:** `IMPLEMENTED`

## Objetivo
Identidade, versão real, o que o app faz, o que ele **não** faz, e o que ele faz
com os dados de quem usa.

## Entrada
Nenhuma.

## Dados necessários
`core/versao.js` — versão injetada do `package.json` no build (`__APP_VERSION__`).

## Dependências
Nenhuma de runtime. Funciona sem GPS, sem rede e sem sensor.

## Ações
Voltar ao início. Links para a documentação do repositório.

## Saídas
Versão, recursos, limitações, arquitetura, privacidade, origem e licença.

## Estados
- **SUCCESS** — sempre; a tela não depende de hardware.
- **UNAVAILABLE** — fora do build, a versão aparece como
  `VERSÃO INDISPONÍVEL`, nunca como um número inventado.

## Limitações
Nenhuma funcional.

## Testes
Fluxo 9 de `scripts/verificar-fluxos.mjs`: a versão na tela é a versão do
`package.json`.
