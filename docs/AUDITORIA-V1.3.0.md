# Auditoria real — Vanguard Field 1.3.0

**Data da auditoria:** 2026-08-31  
**Base:** branch `main`, commit `9deb3dc` (`fix(map): make basemap switching compatible with Map Engine`)  
**Objetivo:** registrar o estado observado antes das alterações da release 1.3.0.

## Método e evidências

A auditoria foi feita sobre o conteúdo efetivamente versionado no repositório, e não apenas sobre o README. Foram consultados o README, CLAUDE.md, os documentos V2 existentes, a configuração do pacote, a árvore de `src/`, os testes, os workflows, os diretórios nativos e os commits/tags recentes. Também foram iniciados `npm test` e `npm run build` no ambiente local.

| Verificação | Evidência observada | Estado |
|---|---|---|
| Versão pública do projeto | `package.json` declara `1.0.0`; documentação ainda referencia 1.0.0/V2 | **PRECISA DE CORREÇÃO** |
| Build web | `npm run build` não iniciou porque `vite` não está instalado no ambiente atual (`sh: 1: vite: not found`) | **BLOQUEADO POR AMBIENTE** |
| Testes | A execução encontrou 282 testes, com 276 aprovados; 6 arquivos falharam: um contrato de fontes cartográficas e cinco arquivos que importam `vitest` ausente | **PRECISA DE CORREÇÃO / AMBIENTE** |
| Map Engine | Existe implementação central em `src/core/map-engine.js`, adapter MapLibre, runtime, registry e testes específicos | **IMPLEMENTADO; REQUER REGRESSÃO/VALIDAÇÃO** |
| Mapa | A página usa o Map Engine e há suporte a múltiplas bases, camadas, destino, posição, trilha e MGRS | **PARCIALMENTE FUNCIONANDO** |
| Offline/PWA | Existe `public/sw.js`, cache da shell, cache de tiles e módulos de planejamento/storage/manifests | **PARCIALMENTE FUNCIONANDO** |
| Dataset cartográfico | Não há evidência de dataset regional/mundial redistribuível aprovado; o próprio estado documental limita a cobertura | **BLOQUEADO POR DATASET/SERVIÇO EXTERNO** |
| GPS/localização | Há normalização, watch web/Capacitor, estados de posição, timestamp/precisão e background separado | **IMPLEMENTADO LOCALMENTE; HARDWARE PENDENTE** |
| Trilha | Há sessões locais, pausa/retomada, resumo, import/export JSON e GPX | **IMPLEMENTADO; REQUER VALIDAÇÃO FÍSICA** |
| Diagnóstico | Existe rota `#/diagnostico` e módulo para estado local de rede, GPS, cache, armazenamento, bateria e sensores | **PARCIALMENTE FUNCIONANDO** |
| Atualização | Há comparação de versões, URL oficial e fluxo PWA/APK documentado | **PARCIALMENTE FUNCIONANDO** |
| Acessibilidade | Há testes e documentos de referência; compatibilidade física com TalkBack/VoiceOver não foi executada | **IMPLEMENTADO/TESTÁVEL; HARDWARE PENDENTE** |
| Capacitor Android/iOS | Diretórios nativos existem; Android ainda contém `versionName "1.0.0"`; iOS usa variáveis de versão do projeto | **PRECISA DE CORREÇÃO** |
| CI | `ci.yml` cobre instalação, testes, sintaxe do SW e build; workflow mobile separa artefatos debug/unsigned, mas a release 1.3.0 ainda não existe | **PARCIALMENTE FUNCIONANDO** |
| Releases | Tags observadas: `v1.0.0-rc.1`, `v1.0.0-rc.2`, `mobile-v1.0.0`, `mobile-v1.1.0`, `mobile-v1.2.0`; não existe `v1.3.0` | **NÃO PUBLICADA** |

## Classificação do estado

### Já funcionando ou implementado

O projeto já possui uma arquitetura única de aplicação web/PWA com módulos civis de mapa, localização, trilha, armazenamento local, importação/exportação, diagnóstico, contexto, sobrevivência e socorro com compartilhamento explícito. O Map Engine e seus adapters estão presentes e cobertos por testes dedicados. A persistência local tem envelopes/versionamento e existem mecanismos de checkpoint, retomada e recuperação para o fluxo de datasets.

### Parcialmente funcionando

Os fluxos de mapa, troca de basemap, offline, diagnóstico, atualização e CI têm implementação e testes locais, mas ainda dependem da instalação correta das dependências, de validação de integração visual e, em alguns casos, de rede/cache reais. A documentação registra limitações e estados V2 que ainda não foram convertidos numa identidade coerente 1.3.0.

### Precisa de correção

A versão pública não está padronizada em 1.3.0. O Android ainda declara `versionName "1.0.0"`. A suíte está inconsistente com o `package.json`: cinco testes importam `vitest`, mas o pacote não o declara, e há uma falha funcional no contrato de fontes cartográficas. A build não é reproduzível no ambiente recém-clonado sem instalar dependências.

### Bloqueado por ambiente

A primeira execução local não tinha `node_modules`; por isso `vite` não foi encontrado e os testes que dependem de `vitest` não carregaram. A instalação de dependências é necessária antes de atribuir falhas ao código.

### Bloqueado por hardware

Não foram executados testes em aparelho Android/iOS real. Permanecem não comprovados sensor de bússola, permissões físicas, precisão/frescor reais do GPS, background geolocation, notch, rotação, safe areas, bateria e compatibilidade física com leitores de tela.

### Bloqueado por serviço externo/licença/dataset

Não há evidência de dataset cartográfico regional ou mundial redistribuível aprovado. Não se deve declarar mapa mundial offline. Comunicação de socorro, checkout de doação, atualização externa e assinaturas de artefatos dependem de serviços, credenciais ou confirmação que não estão presentes nesta auditoria.

## Riscos e pontos para as próximas fases

A prioridade imediata é tornar a base executável e coerente: instalar/verificar dependências, corrigir a suíte sem apagar testes, fechar a falha de fontes HTTPS, padronizar a versão 1.3.0 nos locais públicos e atualizar a documentação. Em seguida devem ser revisados os contratos de troca de basemap/lifecycle, o estado transacional de offline/storage, a cadeia GPS → mapa → trilha → diagnóstico, a acessibilidade determinística e o workflow de release.

Nenhum item dependente de hardware, assinatura, serviço externo ou dataset inexistente foi classificado como `VERIFIED` ou `COMPLETE`.

## Resultado da fase 0

A fotografia inicial está registrada. A base não está pronta para publicar 1.3.0: existem alterações de foundation, uma falha funcional de teste e bloqueios ambientais que precisam ser tratados antes da release.
