# Vanguard Field — V1.0.0 como baseline de teste real e V2 durante a peregrinação

## Objetivo

A `v1.0.0` será a versão-base de campo. Ela deve ser congelada antes da peregrinação depois que os critérios de validação forem executados e registrados.

A V2 não é necessária para obter os primeiros dados reais. A V2 será desenvolvida posteriormente, durante a fase de campo, justamente para testar atualização do aplicativo enquanto uma rota/trilha já está em andamento.

## Estratégia de versões

```text
v1.0.0-rc.2
    ↓
fechamento da V1
    ↓
TESTES REAIS
    ↓
v1.0.0  ← baseline instalado no aparelho
    ↓
coleta de dados reais
    ↓
V2 em desenvolvimento
    ↓
release de teste posterior (ex.: v2.0.0-rc.1)
```

Não criar `0.7.0` apenas para obter dados de campo. O `package.json` já identifica o projeto como versão `1.0.0`; a tag/release final deve continuar condicionada ao checklist de aceite físico.

## O que a V1 deve medir

- aquisição e idade dos fixes GPS;
- gravação e persistência da trilha;
- comportamento foreground/background observado;
- fechamento e reabertura do aplicativo;
- operação sem conexão;
- exportação da trilha;
- comportamento do mapa com os dados locais disponíveis;
- consumo de bateria observado;
- comportamento de atualização disponível;
- integridade dos dados antes e depois de uma atualização.

## Experimento principal da V2

A V2 deverá ser introduzida sem apagar a V1 instalada como referência de comparação. O experimento deve registrar:

1. versão instalada no início da rota;
2. identificador da rota e horário de início;
3. quantidade de pontos já gravados antes da atualização;
4. atualização disponível;
5. versão escolhida para atualização;
6. momento da atualização;
7. estado da rota imediatamente antes da atualização;
8. estado da rota após a atualização;
9. quantidade de pontos preservados;
10. continuidade ou interrupção da gravação;
11. integridade dos dados exportados;
12. qualquer divergência entre a versão anterior e a posterior.

## Regra de segurança de dados

Uma atualização nunca deve substituir silenciosamente os dados de uma rota em andamento. A trilha do usuário deve permanecer separada do cache técnico e do dataset cartográfico. Uma falha de atualização deve deixar os dados já gravados recuperáveis.

## Critério de sucesso do experimento

O experimento será considerado bem-sucedido quando for possível demonstrar, com registros reais, que:

- uma rota iniciada em uma versão anterior permanece identificável após a atualização;
- os pontos já persistidos não são apagados pela atualização;
- o aplicativo consegue iniciar a nova versão sem corromper os dados locais;
- o comportamento de GPS durante a transição é mensurado, e não presumido;
- qualquer interrupção é registrada como resultado do teste;
- a exportação pós-atualização continua íntegra.

## Limite importante

Este documento define um experimento de atualização e persistência. Ele não transforma testes de laboratório em prova de segurança operacional, nem substitui planejamento de navegação, comunicação ou contingência fora do aplicativo.

## Relação com o checklist mobile

O checklist `docs/CHECKLIST-MOBILE-V1.0.0.md` continua sendo a fonte dos critérios de aceite físico da V1. A release final `v1.0.0` somente deve ser considerada fechada depois desses critérios serem executados e registrados.
