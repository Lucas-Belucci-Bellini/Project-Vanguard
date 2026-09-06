# `#/doar` — Apoiar o projeto

**Estado:** `UNAVAILABLE`

## Objetivo
Explicar como o projeto se sustenta e o que o apoio paga.

## Entrada
Valor pretendido (só para exibição).

## Dados necessários
Nenhum. Não há chamada de rede, não há chave, não há conta configurada.

## Dependências
Nenhuma.

## Ações
- **Escolher valor** — atualiza o resumo na tela, localmente.
- **Botão de checkout** — responde `CHECKOUT NÃO CONFIGURADO` e explica que
  nada é cobrado e nenhum dado é enviado.

## Saídas
Somente texto na tela.

## Estados
- **UNAVAILABLE** — é o estado permanente enquanto não houver serviço de
  pagamento ligado. A tela não abre formulário de cartão, não coleta dado e
  não simula recibo.

## Limitações
Enquanto `UNAVAILABLE`, esta rota é informativa. Quando houver serviço, o botão
abrirá **o checkout oficial do provedor e mais nada** — o aplicativo não
processa pagamento nem guarda dado financeiro.

## Testes
Fluxo 7 de `scripts/verificar-fluxos.mjs`: o botão diz que não está configurado
e não promete cobrança.
