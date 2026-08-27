# Project Vanguard V2 — registro de riscos

| ID | Risco | Probabilidade | Impacto | Mitigação | Evidência/estado |
|---|---|---:|---:|---|---|
| R-001 | Usuário interpreta GPS como canal de socorro | Média | Crítico | Textos explícitos, Socorro manual e sem confirmação falsa | Mitigado/documentado |
| R-002 | Fixo antigo tratado como posição atual | Média | Alto | Idade do fixo no HUD, estado `STALE` e conferência antes de agir | Implementado; hardware pendente |
| R-003 | Mapa parcialmente preparado parece completo ou cota é inflada por URLs repetidas | Alta | Alto | Limite de 256 URLs, status solicitado/salvo, data, aviso de cobertura não garantida e deduplicação de templates | Mitigado no planner; resposta do provedor, quota e campo pendentes |
| R-004 | Sistema operacional encerra rastreamento em background | Alta | Alto | Perfis econômicos, pausa, documentação e checklist Android/iOS | Não resolvido; PHYSICAL VALIDATION REQUIRED |
| R-005 | Bateria insuficiente durante quatro dias | Alta | Alto | Medição no aparelho real, powerbank testado e plano de recarga | Não resolvido; campo pendente |
| R-006 | Atualização quebra app ou interrompe navegação | Média | Alto | Service worker em `waiting`, confirmação, recarga após `controllerchange`, fallback APK oficial | Implementado; teste posterior pendente |
| R-007 | APK malicioso ou origem de download falsa | Baixa | Crítico | HTTPS oficial, URL allowlist, confirmação do sistema e sem auto-instalação | Mitigado; distribuição pendente |
| R-008 | Importação corrompe trilha ou estado | Média | Alto | JSON/GPX validados, confirmação e rota pausada | Testado localmente |
| R-009 | Sensor/precisão de dispositivo inadequados | Média | Alto | Exibir precisão/frescor, fallback explícito e validação física | Parcial |
| R-010 | Legacy balístico volta a receber capacidade operacional | Baixa | Crítico | Tag `LEGACY-RESTRICTED`, revisão de escopo e bloqueio de expansão | Controlado |
| R-011 | Dependência externa fica indisponível | Média | Médio | Dados essenciais locais, status `UNAVAILABLE` e não simular integração | Mitigado parcialmente |
| R-012 | Telemetria ou sincronização silenciosa expõe localização | Baixa | Crítico | Armazenamento local por padrão e ação explícita para compartilhar | Mitigado/documentado |
| R-013 | Dependências de desenvolvimento reportam vulnerabilidades no audit completo | Média | Médio | `npm audit --omit=dev` sem vulnerabilidades de produção; revisar audit completo antes de release e não aplicar `--force` sem análise | Audit de produção: 0; audit completo requer acompanhamento |
| R-014 | Lifecycle observável é confundido com GPS ou processo contínuo em background | Média | Alto | Rótulos `CAPACITOR APP`/`VISIBILITY API`, texto explícito no Diagnóstico, ADR-0005 e nenhum serviço/permissão de background | Mitigado no código; validação física pendente |
| R-015 | Semântica de foco/ARIA no preview é confundida com acessibilidade completa em leitores de tela | Média | Alto | Link de salto, foco visível, landmark e atributos ARIA explícitos; teste DOM; manter TalkBack/VoiceOver/contraste como bloqueios físicos | Mitigado parcialmente; validação de assistência e contraste pendente |
| R-016 | Payload de release direciona para asset ou página fora da origem oficial | Baixa | Crítico | Allowlist de HTTPS + host/caminho do repositório, fallback fixo e confirmação explícita; ADR-0007 | Mitigado no núcleo; release posterior e instalação continuam pendentes |
| R-017 | Prontidão offline otimista com posição de frescor não verificável | Média | Alto | Exigir timestamp positivo, não futuro e com até 24 horas; estado `atencao` para idade ausente/inválida; ADR-0010 | Mitigado no núcleo; validação de campo e relógio do aparelho pendentes |

## Critério

Riscos de impacto crítico ou alto que dependem de hardware, rede ou distribuição não podem ser encerrados por teste unitário. Devem permanecer no checklist até existir evidência no ambiente real.
