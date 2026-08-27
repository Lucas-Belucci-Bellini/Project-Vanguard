# Vanguard Field — Mobile V2 Omega Execution Log

> Log resumido e append-only das execuções relevantes. Atualizado em 2026-08-27.

## 2026-08-27 — auditoria Omega e estado inicial

- **Branch:** `main`.
- **Estado Git:** limpa e alinhada com `origin/main` antes da unidade.
- **HEAD auditado:** `d3175a0 docs(v2): registrar suporte kml`.
- **CI recente:** `33124273565` concluído com sucesso.
- **Release pública:** somente `v1.0.0-rc.2`; nenhuma `v1.0.0` final.
- **Memória Omega ausente:** `MOBILE_V2_MASTER_CHECKLIST.md`, `MOBILE_V2_FEATURE_MATRIX.md`, `MOBILE_V2_BUILD_MATRIX.md`, `MOBILE_V2_RELEASE_STATUS.md`, `MOBILE_V2_DEVICE_MATRIX.md`, `MOBILE_V2_EXECUTION_LOG.md`.
- **Auditoria de marcadores:** apenas placeholders de campos de interface e comentário de compatibilidade foram encontrados nos escopos auditados; não foram tratados como implementação faltante sem evidência de defeito.
- **Decisão:** criar a memória Omega faltante antes de iniciar nova migração estrutural.

## Unidades publicadas anteriores

| Commit | Unidade | Evidência |
|---|---|---|
| `f9da500` | diagnóstico compatível com `lat/lon` | testes e CI |
| `4f8e20a` | capacidades observáveis | testes e CI |
| `2bb3e74` | compartilhamento explícito | testes e CI |
| `15f9bac` | leitura de permissão GPS sem prompt automático | testes e CI |
| `cd47a0c` | persistência observável | testes e CI |
| `3d859f6` | tracking local Start/Pause/Resume/Stop | 156 testes e CI |
| `431449e` | importação/exportação KML 2.2 local | 159 testes e CI |

## Regra de continuidade

Toda nova entrada deve registrar data, estado de Git, commit, comandos, resultado, CI e limitações. Falhas devem ser registradas antes da correção; nenhum sucesso deve ser presumido por histórico anterior.

## 2026-08-27 — publicação da memória Omega e gates locais

- **Commit:** `ddd2e86 docs(v2): consolidar memoria omega`.
- **Push:** `origin/main` atualizado com sucesso; `main` ficou alinhada.
- **CI:** run de push `3312455...` listado como concluído com sucesso; confirmar ID completo no GitHub se necessário.
- **`npm test`:** 159 aprovados, 0 falhas.
- **`npm run build`:** aprovado; Vite produziu `dist/`.
- **`node --check public/sw.js`:** aprovado.
- **`git diff --check`:** aprovado.
- **`npm audit --omit=dev --audit-level=high`:** 0 vulnerabilidades.
- **Release:** não executada; `v1.0.0` não criada; `v1.0.0-rc.2` continua a única release pública.
- **Limitação:** esta unidade foi documental; não prova instalação, sensor, bateria, modo avião, assinatura, loja ou iOS IPA.

## 2026-08-27 — unidade nova: validação defensiva de formato de registro

- **Commit:** `1e0da64 feat(v2): validar formato de registros`.
- **CI:** run `33124902546` concluído com sucesso.
- **Escopo:** `src/core/registro-arquivo.js`, integração do handler em `src/pages/mapa.js` e `test/registro-arquivo.test.js`.
- **Comportamento:** normaliza extensão/MIME, aceita JSON/GPX/KML conhecidos, aceita um único sinal quando o outro é omitido e rejeita conflito específico antes de `arquivo.text()`.
- **Segurança preservada:** o módulo não abre arquivo, não executa XML, não faz rede e não substitui a validação geométrica/schema dos parsers existentes. A substituição continua confirmada e a rota importada continua pausada.
- **`npm test`:** 166 aprovados, 0 falhas.
- **`npm run build`:** aprovado.
- **`node --check public/sw.js`:** aprovado.
- **`git diff --check`:** aprovado.
- **`npm audit --omit=dev --audit-level=high`:** 0 vulnerabilidades.
- **`npm run mobile:sync:android`:** aprovado; plugins Capacitor presentes.
- **`npm run mobile:sync:ios`:** concluído dentro do gate composto; nenhum arquivo nativo versionado mudou.
- **`npm run mobile:android:debug`:** `BUILD SUCCESSFUL`; artifact de teste, não release.
- **Limitação:** MIME/extensão não autenticam conteúdo; validação física em Android/Xiaomi/iPhone, Files/Share Sheet, modo avião, bateria, signing e loja continuam pendentes.
