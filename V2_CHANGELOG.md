# Project Vanguard V2 — changelog de construção

## 2026-08-27 — Hardening de acessibilidade da shell

Implementado link **Pular para o conteúdo principal**, landmark `<main>` focável, foco após troca de rota, `aria-busy`, status global ao vivo e alertas semânticos. O helper DOM agora serializa explicitamente os atalhos ARIA históricos (`ariaLabel`, `ariaHidden`, `ariaCurrent`, `ariaLive` e `ariaBusy`). A ativação do link de salto não interfere no hash-router.

Evidência: `npm test` com 123 testes aprovados, build web, `node --check public/sw.js`, audit de produção sem vulnerabilidades e inspeção DOM/foco no preview. O preview não representa validação completa de TalkBack, VoiceOver, contraste ou uso em hardware real. Referências e decisão em `ADR-0006-acessibilidade-shell.md` e `REFERENCIAS-ACESSIBILIDADE-WCAG-2026-08.md`. Publicado em `main` como `b5a83c9 feat(v2): fortalecer acessibilidade da shell`; CI `33111683598` concluído com sucesso.

## 2026-08-27 — Observabilidade do ciclo de vida

Implementado `src/core/ciclo-vida.js` com `@capacitor/app@8.1.1` para observar `appStateChange` em Android/iOS e fallback `visibilitychange` na Web. A tela `#/diagnostico` agora mostra `FOREGROUND`/`BACKGROUND`, fonte do estado e indisponibilidade sem telemetria. Os listeners são removidos ao desmontar a página.

A integração não habilita GPS em background, serviço contínuo, transmissão, SOS ou permissões adicionais. Android debug foi recompilado e o plugin foi sincronizado no Android e no `Package.swift` do iOS. Resultado local: 122 testes aprovados, build web aprovado, service worker válido, audit de produção com zero vulnerabilidades e APK debug de 8.284.304 bytes. Publicado em `main` como `2bfd797 feat(v2): observar ciclo de vida mobile`; CI `33110246185` concluído com sucesso.

Documentação atualizada: ADR-0005, guia de build mobile, referências de background/lifecycle, mapas de arquitetura, matrizes de teste/funcionalidade, blockers, riscos, status e progresso.

## 2026-08-27 — Fundação de continuidade

A V2 foi iniciada a partir do estado real existente, sem reiniciar nem reescrever a base do Vanguard Field. O prompt-base foi decomposto em escopo civil, regras de evidência, memória persistente, ciclo de auditoria e restrições para o módulo legado.

O estado herdado inclui GPS/GNSS local, MGRS, bússola, mapa MapLibre, destinos, waypoints, trilha, cache offline limitado, armazenamento versionado, JSON/GPX, contextos civis, manual de sobrevivência, preparação de Socorro, atualização confirmada para PWA/APK e documentação de release. A validação reproduzida registra 123 testes, build web, service worker e Android debug aprovados.

A nova memória persistente foi criada em `V2_STATUS.md`, `V2_MASTER_CHECKLIST.md`, `V2_PROGRESS.md`, `V2_BLOCKERS.md`, `V2_DECISIONS.md`, `V2_RISK_REGISTER.md`, `V2_TEST_MATRIX.md`, `V2_FEATURE_MATRIX.md` e `V2_ARCHITECTURE_MAP.md`. O backlog fora do escopo fica em `V3_BACKLOG.md`.

O próximo gargalo escolhido é diagnóstico local observável. Ele deve mostrar estado do aplicativo, rede, GPS, frescor, armazenamento, cache, service worker e bateria quando a API fornecer esse dado, sem coletar telemetria escondida.

## Regra de registro

Cada execução futura deve adicionar uma entrada com data, commit, mudança, testes, documentação, blockers e próximo passo. Nenhuma execução deve marcar a V2 como completa apenas por compilar.
