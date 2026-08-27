# Project Vanguard V2 — bloqueadores

| ID | Bloqueador | Severidade | Evidência atual | Próxima ação | Estado |
|---|---|---:|---|---|---|
| B-001 | Não há validação física completa em Android/Xiaomi/iOS | Alta | Ambiente atual não substitui aparelhos reais | Executar checklist mobile em hardware | BLOCKED |
| B-002 | Background GPS nativo não está comprovado | Alta | Capacitor atual não declara serviço Android foreground nem `UIBackgroundModes` iOS | Decidir e implementar plugin nativo somente após profiling e requisitos de campo | BLOCKED |
| B-003 | APK debug e AAB não assinado não são distribuição final | Alta | Keystore/assinatura não configurados no repositório | Configurar signing fora do Git e validar artefatos | BLOCKED |
| B-004 | iOS exige macOS, Xcode, conta Apple e aparelho | Alta | Projeto gerado, sem build/assinatura no Linux | Executar build e testes físicos em ambiente Apple | BLOCKED |
| B-005 | Cache de tiles não prova cobertura completa nem mede quota real | Média | Limite de 256 URLs/preparação e status informativo | Testar área oficial, quota, repetição e falhas no aparelho real | IN_PROGRESS |
| B-006 | Diagnóstico dedicado ainda não existe | Média | `V2_MASTER_CHECKLIST.md` marca V2-019 `NOT_STARTED` | Implementar página/serviço local de diagnóstico sem telemetria invasiva | IN_PROGRESS |
| B-007 | Atualização do APK abre o download, mas não auto-instala | Baixa | Limite técnico e de segurança documentado | Validar fluxo manual com release posterior | IN_PROGRESS |
| B-008 | Fontes oficiais, comunicação externa e pagamentos não estão conectados | Alta | Contratos e telas preparadas; credenciais/serviços ausentes | Manter como `NOT CONFIGURED` até autorização e integração real | BLOCKED |

## Regra

Nenhum bloqueador deve ser removido por linguagem otimista. Um item só muda para `VERIFIED` quando houver evidência reproduzível, e um item dependente de hardware permanece `PHYSICAL VALIDATION REQUIRED` até o teste real.
