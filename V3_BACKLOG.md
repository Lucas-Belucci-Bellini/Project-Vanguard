# Vanguard Field — backlog V3

> Itens abaixo não bloqueiam a fundação V2. Só devem entrar após evidência, fonte real, hardware compatível ou uma decisão arquitetural específica.

| ID | Categoria | Item | Dependência | Regra de entrada |
|---|---|---|---|---|
| V3-001 | FEATURE | Pacotes de mapas por polígono, integridade, expiração e múltiplas áreas | Quota, fonte cartográfica e armazenamento | Não prometer cobertura antes de medir |
| V3-002 | FEATURE | KML e mais formatos de interoperabilidade | Schema, segurança e testes | Reutilizar validação de GPX/JSON |
| V3-003 | FEATURE | Diagnóstico avançado e exportação de relatório local | Definição de privacidade | Sem telemetria oculta |
| V3-004 | FEATURE | Plugin Android nativo para tracking prolongado | Foreground service, permissões e bateria | Só após profiling e teste físico |
| V3-005 | FEATURE | Plugin iOS nativo para localização em background | `UIBackgroundModes`, Xcode e revisão Apple | Só após requisito claro e teste físico |
| V3-006 | EXPERIMENT | Motor geográfico Rust/WASM | Gargalo medido e compatibilidade numérica | Manter JS como referência |
| V3-007 | FEATURE | Integração com mensageiro satelital ou beacon real | Hardware, provedor e contrato | Nunca simular; confirmação externa obrigatória |
| V3-008 | FEATURE | Fontes oficiais sincronizadas de proteção civil | API, licença, atualização e cache | Mostrar fonte e idade |
| V3-009 | FEATURE | Cartas náuticas oficiais e marés | Fonte licenciada e requisitos náuticos | Não converter satélite em carta |
| V3-010 | FEATURE | Checkout Asaas e auditoria financeira | Conta, credenciais, webhooks e revisão fiscal | Não ativar sem confirmação |
| V3-011 | RESEARCH | Métricas de campo agregadas e opt-in | Modelo de privacidade e consentimento | Sem localização silenciosa |
| V3-012 | IDEA | Sincronização de equipe/rota compartilhada | Backend, autenticação, segurança e conectividade | Não bloquear offline local |
| V3-013 | EXPERIMENT | Atualização incremental/delta assinada | Manifesto, assinatura e rollback real | Manter fallback para release completa |
| V3-014 | LEGACY-RESTRICTED | Expansão de balística, controle de tiro ou integração de armas | Proibido pelo escopo civil | Não implementar |
