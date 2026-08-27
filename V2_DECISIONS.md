# Project Vanguard V2 — decisões

| ID | Decisão | Motivo | Consequência |
|---|---|---|---|
| D-001 | Preservar JS ES2022 + Vite + Capacitor durante a V2 inicial | Base já testada, leve para a equipe e compartilhada com a web | Migração para Kotlin/Swift/Rust só após profiling e ADR específico |
| D-002 | Manter o motor puro separado da UI | Permite testes Node e reduz divergência entre hosts | `src/engine` não recebe DOM, browser APIs ou dependências de interface |
| D-003 | GPS é posicionamento, não comunicação | Evita falsa sensação de resgate | Socorro produz pacote local e compartilhamento manual, sem sucesso falso |
| D-004 | Offline exige dados previamente armazenados | Cache de mapa não é cobertura automática | Status informa limite, área e incerteza; mapa oficial completo não é prometido |
| D-005 | Posição antiga deve ser visível | Um fixo histórico pode induzir decisão errada | HUD mostra idade e atenção para dados antigos |
| D-006 | Atualização exige confirmação | Evita troca silenciosa durante navegação | PWA usa service worker aguardando; APK abre página oficial e depende do sistema |
| D-007 | Legacy balístico é `LEGACY-RESTRICTED` | O foco é civil e seguro | Não expandir tiro, armamento, automação ou integração operacional |
| D-008 | Exigir evidência antes de `COMPLETE` | Build não substitui hardware, campo ou distribuição | Gates permanecem explícitos no checklist e blockers |
| D-009 | Não adicionar framework só por preferência | A arquitetura atual é pequena e funcional | Priorizar módulos puros, documentação e testes |
| D-010 | Preferir Kotlin, Swift ou Rust somente quando necessário | Ganho de desempenho precisa ser medido | Nenhuma reescrita antes da V2 demonstrar gargalo real |
