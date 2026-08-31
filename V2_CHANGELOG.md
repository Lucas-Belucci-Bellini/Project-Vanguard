# Project Vanguard V2 — changelog de construção

## 2026-08-27 — Service Worker filtra tiles antes do cache

A fronteira `CACHE_TILES` do Service Worker agora aceita somente URLs HTTPS nos hosts permitidos, remove URLs duplicadas e limita a lista a 256 entradas antes de buscar ou gravar no Cache Storage. A política complementa a deduplicação do planner e não amplia cobertura nem confirma resposta de provedor.

Evidência local: `npm test` com 133 testes aprovados, `node --check public/sw.js`, build web, audit de produção sem vulnerabilidades, sync Android/iOS e APK debug. O teste executa o script real do Service Worker em contexto controlado com URLs permitidas, HTTP, host externo, entradas repetidas e 300 URLs. Modo avião, quota real e cobertura continuam pendentes. Decisão em `ADR-0012-filtro-tiles-service-worker.md`; validação em `VALIDACAO-FILTRO-TILES-SW-NODE-2026-08.md`. Publicado em `main` como `bddc6b6 security(v2): filtrar tiles no service worker`; CI `33118348438` concluído com sucesso.

## 2026-08-27 — Planner de tiles offline sem duplicação

O planner de mapas offline agora normaliza `base.tiles`, remove templates vazios e deduplica templates repetidos antes de calcular `totalEstimado` e gerar URLs. O loop para ao alcançar a cota de 256 URLs. Antimeridiano, limite Web Mercator e níveis de zoom existentes foram preservados.

Evidência local: `npm test` com 131 testes aprovados, build web, service worker válido, audit de produção sem vulnerabilidades, sync Android/iOS e APK debug. O teste compara template único e duplicado, além de manter os cenários de limite e antimeridiano. A função não testa resposta do provedor, quota real, cobertura ou modo avião. Decisão em `ADR-0011-planejador-tiles-deduplicado.md`; validação em `VALIDACAO-TILES-OFFLINE-NODE-2026-08.md`. Publicado em `main` como `1b1fb50 perf(v2): deduplicar planner de tiles offline`; CI `33117511617` concluído com sucesso.

## 2026-08-27 — Prontidão offline exige frescor verificável

A avaliação local da Home agora classifica como `atencao` uma posição geograficamente válida sem `createdAt`/`timestamp`, com timestamp zero, futuro ou referência temporal inválida. Somente um fixo positivo, não futuro e com no máximo 24 horas contribui para liberar a base local. A comunicação de emergência continua em atenção: GPS não transmite SOS sozinho.

Evidência local: `npm test` com 130 testes aprovados, build web, service worker válido, audit de produção sem vulnerabilidades, sync Android/iOS, APK debug e preview `#/inicio` com cartão `ANTES DE SAIR` em `2/5` itens conferidos. Decisão em `ADR-0010-prontidao-offline-frescor.md`; validação em `VALIDACAO-PRONTIDAO-OFFLINE-PREVIEW-2026-08.md`. Publicado em `main` como `cc076bb fix(v2): exigir frescor na prontidao offline`; CI `33116563282` concluído com sucesso.

## 2026-08-27 — Deduplicação do render do Mapa

O canvas sobreposto dos rótulos da grade agora evita redesenhar quando eventos `render` repetidos mantêm a mesma câmera, viewport, DPR e versão da grade. Mudanças visuais invalidam a chave; a função é pura e testada. GPS, MapLibre, cache, wake lock e frequência de localização não foram alterados.

Evidência local: `npm test` com 129 testes aprovados, build web, preview `#/mapa` com base/controles/overlay carregados e console sem erro, audit de produção, sync Android/iOS e APK debug. A mudança não declara ganho percentual; FPS, bateria, memória total e suspensão nativa continuam dependentes de profiling físico. Decisão em `ADR-0009-deduplicacao-render-mapa.md`; validação em `VALIDACAO-MAPA-RENDER-PREVIEW-2026-08.md`. Publicado em `main` como `8706485 perf(v2): deduplicar render do mapa`; CI `33115313412` concluído com sucesso.

## 2026-08-27 — Diagnóstico de performance local

O Diagnóstico passou a mostrar `Startup DOM`, `Carga completa` e `Memória JS` quando as APIs locais fornecem dados. A implementação usa Navigation Timing sem polling e trata `performance.memory` como opcional; nenhuma métrica é persistida ou enviada. Foram adicionados testes para valores válidos, API ausente, lista array-like e exceção.

Evidência local: `npm test` com 126 testes aprovados, build web, service worker válido, audit de produção sem vulnerabilidades, sync Android/iOS, APK debug e preview HTTPS do grupo `DESEMPENHO`. Isso não mede FPS, bateria, memória total, suspensão nativa ou operação de quatro dias. Decisão em `ADR-0008-diagnostico-performance-local.md`; referências em `REFERENCIAS-PERFORMANCE-V2-2026-08.md`. Publicado em `main` como `3d171e8 perf(v2): expor diagnostico de performance`; CI `33114175983` concluído com sucesso.

## 2026-08-27 — Update confirmado com destino seguro

O núcleo de atualização agora aceita somente assets e páginas HTTPS no caminho oficial `github.com/Lucas-Belucci-Bellini/Project-Vanguard/`; payloads externos, esquemas inseguros ou caminhos parecidos voltam à página fixa de releases. O fluxo PWA waiting foi coberto com teste determinístico para detecção, negar, confirmar, `SKIP_WAITING`, `controllerchange`, reload e remoção de listeners. O APK continua sem auto-instalação e nenhuma release foi criada nesta unidade.

Evidência local: `npm test` com 124 testes aprovados, build web, service worker válido, audit de produção sem vulnerabilidades, sync Android/iOS e APK debug compilado. Decisão e limites em `ADR-0007-allowlist-download-atualizacao.md`. Publicado em `main` como `e0e632b security(v2): restringir destinos de atualizacao`; CI `33112962807` concluído com sucesso.

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

## 2026-08-31 — Foundation 1.3.0

- Auditoria real criada em `docs/AUDITORIA-V1.3.0.md`.
- Versão pública alinhada em `1.3.0` para web, configuração, Android, iOS e workflow mobile.
- Provider CARTO mantido opcional no runtime e removido do catálogo público sem credencial.
- Suite de testes corrigida para executar 267 testes Node e 17 testes Vitest com runners compatíveis.
- `docs/RELEASE-1.3.0.md` e `docs/VALIDACAO-1.3.0.md` adicionados.
- Gates locais reproduzidos: `npm ci`, `npm test` e `npm run build` aprovados.
- Limites mantidos: sem validação física, assinatura de produção, dataset regional/mundial aprovado ou publicação de release.
- Commits: `718c2a5`, `cb76817`.

## 2026-08-31 — Navegação avançada 1.3.1

Implementado o núcleo local de rumo e a página `#/navegacao`, com reutilização de MGRS/UTM e geodesia existente. Foram adicionados testes para normalização, diferença angular, cardinais, bearing, back bearing, direção relativa e segmentos. A suíte final registra 273 testes Node e 17 testes Vitest aprovados, e a build web foi aprovada. Heading físico, declinação automática, elevação real, assinatura e dataset permanecem bloqueados ou dependentes de validação.

## 2026-08-31 — Publicação GitHub v1.3.1

Release `Vanguard Field 1.3.1` publicada em https://github.com/Lucas-Belucci-Bellini/Project-Vanguard/releases/tag/v1.3.1 com APK debug, AAB unsigned, manifesto e checksums. Nenhum artefato foi classificado como produção-ready.
