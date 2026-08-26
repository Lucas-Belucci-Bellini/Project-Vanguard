# Integração preparada com Asaas

> Este documento descreve a integração planejada. Nenhuma cobrança real deve ser criada até que uma conta Asaas verificada, as URLs públicas do aplicativo e as credenciais seguras sejam configuradas.

## Escopo confirmado

O Vanguard deverá aceitar uma doação única com **PIX e cartão** por meio de um checkout hospedado pelo Asaas. O checkout hospedado é preferível neste primeiro estágio porque o Asaas coleta os dados do cartão em sua própria página; o Vanguard não deve receber nem armazenar número, validade ou código de segurança de cartão.

O recebedor será a conta Asaas de pessoa física do responsável pelo projeto. O e-mail `lucasbb2007@gmail.com` será o endereço operacional para notificações internas do Vanguard, não um destino direto do dinheiro. O valor será liquidado conforme as regras e verificações da conta Asaas.

Os doadores não terão CPF/CNPJ solicitado pelo Vanguard. O sistema deve registrar a origem da operação e os identificadores financeiros disponíveis, sem coletar documento pessoal quando ele não for necessário ao fluxo.

## Fluxo técnico planejado

1. O doador escolhe um valor e, opcionalmente, uma campanha ou origem interna, como `vanguard_home`, `vanguard_trilha` ou `vanguard_sobre`.
2. O backend cria uma transação interna com um identificador próprio e estado `pending`.
3. O backend cria um checkout Asaas com `billingTypes: ["PIX", "CREDIT_CARD"]`, `chargeTypes: ["DETACHED"]`, `minutesToExpire` entre 10 e 1440, itens com nome/quantidade/valor e `externalReference` igual ao identificador interno.
4. O backend salva o `checkout_id`, o link retornado, a referência externa, o valor solicitado, a origem e a data de expiração.
5. O doador é redirecionado para o link hospedado do Asaas.
6. A URL de retorno melhora a navegação, mas **não confirma o pagamento**. A confirmação financeira deve vir do Webhook.
7. O endpoint de Webhook valida o header `asaas-access-token`, registra o `event_id` antes de aplicar efeitos e atualiza a transação de forma idempotente.
8. Depois da atualização, o sistema prepara um recibo interno e envia para `lucasbb2007@gmail.com` um resumo contendo o ID interno, IDs do Asaas, status, método, valores bruto/líquido, tarifas, origem e horário.

## Estados e reconciliação

A tabela de transações deverá guardar, no mínimo, os campos abaixo. Os nomes finais podem ser ajustados ao estilo do banco já existente, mas os dados não devem ser descartados.

| Campo | Finalidade |
|---|---|
| `id` | Identificador interno imutável da doação. |
| `external_reference` | Referência enviada ao Asaas para reconciliação. |
| `asaas_checkout_id` | Identificador do checkout hospedado. |
| `asaas_payment_id` | Identificador do pagamento criado pelo checkout. |
| `asaas_event_id` | Identificador do evento recebido; chave contra duplicidade. |
| `status` | Estado interno normalizado, como `pending`, `confirmed`, `received`, `refunded`, `chargeback`, `canceled` e `expired`. |
| `billing_type` | Método reportado pelo Asaas, como `PIX` ou `CREDIT_CARD`. |
| `gross_value` | Valor bruto da cobrança. |
| `asaas_fee` | Tarifa calculada a partir de bruto menos líquido quando os dados estiverem disponíveis. |
| `net_value` | Valor líquido informado pelo Asaas. |
| `source` | Origem interna verdadeira, como tela, campanha ou botão. |
| `description` | Descrição pública e não enganosa da doação. |
| `created_at`, `paid_at`, `updated_at` | Linha do tempo operacional. |
| `raw_event` | Payload recebido, com retenção e acesso restritos, sem dados de cartão. |

Eventos que devem ser tratados incluem `PAYMENT_CREATED`, `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_REFUNDED`, `PAYMENT_PARTIALLY_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED`, `PAYMENT_CHARGEBACK_DISPUTE`, `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED` e `PAYMENT_RESTORED`. O estado `PAYMENT_CONFIRMED` não deve ser tratado como valor definitivamente disponível em todos os casos; a disponibilidade deve ser reconciliada com o fluxo recebido pelo Asaas.

## Segurança e privacidade

A chave `access_token` do Asaas deve existir somente no backend ou em uma Edge Function protegida. Ela nunca deve ser enviada ao navegador, incluída no bundle, salva em tabela pública ou colocada em commit.

O Webhook deve aceitar somente requisições com o token configurado no Asaas e deve responder rapidamente com HTTP 2xx. Como a entrega é pelo menos uma vez, a aplicação deve ignorar eventos já processados pelo mesmo `asaas_event_id`. A resposta de sucesso não deve depender da emissão do e-mail; a notificação pode ser processada de forma assíncrona.

O payload bruto deve ser usado para auditoria e reconciliação, mas o painel público não deve expor esse JSON nem dados do pagador. O painel administrativo deve exigir autenticação e autorização, registrar quem exportou dados e proteger a exportação CSV.

## Relatório para organização financeira

O relatório mensal deve apresentar o total bruto, tarifas, total líquido, quantidade de pagamentos por método, transações confirmadas/recebidas, reembolsos, chargebacks e origem interna. Também deve manter o vínculo entre o relatório, o extrato do Asaas e o extrato bancário.

Esse relatório é uma ferramenta de organização e auditoria; ele não é uma declaração automática à Receita Federal e não determina sozinho o tratamento tributário da pessoa física. A classificação das doações e a eventual declaração devem ser confirmadas com um contador.

## Ambiente e ativação

O desenvolvimento deve usar o Sandbox do Asaas. Só depois de validar criação do checkout, redirecionamento, Webhook idempotente, atualização de status, recibo e exportação será possível trocar a base para produção.

Variáveis planejadas, nunca com valores reais no repositório:

```env
ASAAS_ENV=sandbox
ASAAS_API_KEY=configure-no-backend
ASAAS_WEBHOOK_TOKEN=configure-no-asaas
DONATION_RECEIPT_EMAIL=lucasbb2007@gmail.com
PUBLIC_APP_URL=https://configure-domain
SUPABASE_URL=configure-project-url
SUPABASE_SERVICE_ROLE_KEY=configure-only-in-edge-function
```

## Fontes oficiais consultadas

- [Asaas — Introdução](https://docs.asaas.com/docs/visao-geral)
- [Asaas — Payments overview](https://docs.asaas.com/docs/payments-overview)
- [Asaas — Webhooks](https://docs.asaas.com/docs/sobre-os-webhooks)
- [Asaas — Eventos para cobranças](https://docs.asaas.com/docs/payment-events)
- [Asaas — Checkout](https://docs.asaas.com/docs/asaas-checkout)
- [Asaas — Introduction to Checkout](https://docs.asaas.com/docs/introduction-1)
- [Asaas — Create new checkout](https://docs.asaas.com/reference/create-new-checkout)
- [Asaas — Create new payment](https://docs.asaas.com/reference/create-new-payment)
