# Vanguard Field — MOBILE V2 RISK REGISTER

| ID | Risco | Probabilidade | Impacto | Mitigação atual | Evidência necessária |
|---|---|---:|---:|---|---|
| R-001 | Sistema suspende GPS/trilha ao sair do foreground | Alta | Alta | foreground explícito, lifecycle observável e aviso sem garantia contínua | teste em Android, Xiaomi e iPhone com tela bloqueada |
| R-002 | Bateria não suporta quatro dias de uso | Alta | Alta | perfis econômicos, alta precisão somente em trilha/emergência, wake lock opcional | medição de campo conforme plano |
| R-003 | Tiles preparados não cobrem toda a área ou excedem quota | Alta | Alta | planner/SW deduplicados, hosts permitidos e limite de 256 URLs | modo avião e quota real no aparelho |
| R-004 | Bússola ausente, descalibrada ou imprecisa | Média | Média | fallback de rumo GPS; estados de indisponibilidade; sem direção inventada | sensor/calibração em cada modelo |
| R-005 | Diagnóstico exibe estado incorreto da posição | Baixa | Média | suporte a `lat/lon` e shape legado; teste determinístico publicado | inspeção no aparelho e fluxo de fixo |
| R-006 | Update em campo causa instalação ou perda de dados inesperada | Média | Alta | confirmação explícita, origem oficial, instalador nativo e storage local versionado | release posterior controlada e backup/restauração |
| R-007 | APK debug é tratado como distribuição | Média | Alta | documentação e nomenclatura separadas; signing bloqueado | keystore e pipeline deliberados |
| R-008 | Permissões excessivas ou mensagem pouco clara | Baixa | Alta | somente coarse/fine Android e descrições de uso iOS atuais | revisão no prompt nativo em aparelhos |
| R-009 | Falha de rede é confundida com resgate/alerta entregue | Baixa | Crítico | Socorro somente prepara/compartilha; sem telemetria/SOS automático | simulação controlada sem envio |
| R-010 | Dados locais contêm informação pessoal desnecessária | Média | Média | local-first, sem telemetria; exportação sob ação explícita | revisão de arquivos e procedimento de backup |
| R-011 | Build iOS não pode ser concluído no ambiente disponível | Alta | Alta | sync no Linux e checklist para macOS/Xcode | compilação/assinatura em Mac |
| R-012 | Configuração agressiva em Xiaomi reduz estabilidade ou segurança | Média | Alta | não recomendar desativação indiscriminada de proteções | teste MIUI/HyperOS e instruções específicas |

## Critério de risco de release

Qualquer risco crítico sem mitigação observada bloqueia a tag final. Em especial, não é aceitável publicar `v1.0.0` com background GPS, offline físico, bateria, permissões, update, assinatura ou resgate apenas presumidos.
