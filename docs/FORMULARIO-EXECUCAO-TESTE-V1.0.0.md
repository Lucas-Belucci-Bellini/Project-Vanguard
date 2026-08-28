# Vanguard Field — Formulário de execução do teste real V1.0.0

> Este arquivo é um formulário de campo. Ele não transforma resultados planejados em evidência e não deve ser preenchido com dados inventados.

## Identificação

- Data/hora de início:
- Data/hora de término:
- Versão do aplicativo:
- Commit:
- Plataforma:
- Modelo do aparelho:
- Versão do sistema:
- Rede no início:
- Bateria inicial:
- Bateria final:

## Sessão

- ID da sessão:
- Rota/trilha de teste (nome curto, sem dados pessoais):
- Modo utilizado: `Cidade` / `Trilha` / outro
- GPS solicitado explicitamente: `SIM` / `NÃO`
- Permissão concedida: `SIM` / `NÃO`

## Resultados

| ID | Resultado | Evidência | Observação |
|---|---|---|---|
| T-001 | PENDENTE | | |
| T-002 | PENDENTE | | |
| T-003 | PENDENTE | | |
| T-004 | PENDENTE | | |
| T-005 | PENDENTE | | |
| T-006 | PENDENTE | | |
| T-007 | PENDENTE | | |
| T-009 | PENDENTE | | |
| T-011 | PENDENTE | | |
| T-012 | PENDENTE | | |
| T-013 | PENDENTE | | |
| T-015 | PENDENTE | | |
| T-017 | PENDENTE | | |
| T-018 | PENDENTE | | |
| T-019 | PENDENTE | | |
| T-020 | PENDENTE | | |

## Integridade da trilha

- Pontos antes de fechar/reabrir:
- Pontos depois de fechar/reabrir:
- Primeira timestamp observada:
- Última timestamp observada:
- Houve lacunas percebidas? `SIM` / `NÃO`
- Exportação realizada: `JSON` / `GPX` / ambas / nenhuma
- Arquivo exportado foi reaberto e validado: `SIM` / `NÃO`

## Offline

- Modo avião utilizado: `SIM` / `NÃO`
- Wi-Fi desligado: `SIM` / `NÃO`
- Aplicativo fechado totalmente antes de reabrir: `SIM` / `NÃO`
- Shell carregou: `SIM` / `NÃO`
- Dados locais acessíveis: `SIM` / `NÃO`
- Tiles preparados acessíveis: `SIM` / `NÃO`

## Atualização

> A atualização em rota é experimento da V2. Na V1, registrar somente a disponibilidade/comportamento do mecanismo de atualização; não iniciar uma atualização durante uma rota real sem protocolo específico e plano de recuperação.

- Atualização detectada: `SIM` / `NÃO`
- Confirmação explícita apresentada: `SIM` / `NÃO`
- Versão oferecida:
- Atualização executada: `SIM` / `NÃO`
- Observação:

## Bateria e lifecycle

- Estado observado antes de minimizar:
- Estado observado após minimizar:
- Estado observado ao retornar:
- Tela bloqueada durante o teste: `SIM` / `NÃO`
- Duração aproximada com tela bloqueada:
- Houve interrupção do tracking: `SIM` / `NÃO` / `NÃO FOI POSSÍVEL DETERMINAR`
- Evidência:

## Decisão

- `PASS`
- `PASS COM LIMITAÇÃO DOCUMENTADA`
- `FAIL`
- `BLOCKED — HARDWARE/AMBIENTE`

### Motivo

Descrever o fato observado. Não converter ausência de evidência em aprovação.

## Privacidade

Não registrar CPF, endereço residencial, credenciais, contatos ou coordenadas pessoais no documento compartilhado. Se uma coordenada for indispensável para depuração, manter o dado bruto somente no aparelho/artefato privado de teste e registrar aqui apenas um identificador técnico.
