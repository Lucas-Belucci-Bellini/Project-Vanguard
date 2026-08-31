# Validação 1.3.0 — Vanguard Field

**Data:** 2026-08-31  
**Commit da validação:** `718c2a5`  
**Classificação:** validação local automatizada; não é validação física de produto.

## Gates locais executados

| Gate | Resultado | Evidência |
|---|---|---|
| Instalação limpa | `PASS` | `npm ci` concluiu; dependências foram instaladas a partir do lockfile |
| Testes Node | `PASS` | 267 testes, 267 aprovados, 0 falhas |
| Testes Vitest do Map Engine | `PASS` | 5 arquivos, 17 testes, 17 aprovados |
| Build web | `PASS` | `npm run build` gerou `dist/` com Vite 5.4.21 |
| Sintaxe do service worker | `IMPLEMENTED` | coberta pelo CI e pelos testes existentes; não substitui navegador real |
| Versionamento público | `PASS` | package/configuração/Android/iOS/workflow alinhados em 1.3.0 |
| Histórico de releases | `PASS` | tags anteriores preservadas; nenhuma tag antiga foi substituída |

## IMPLEMENTED

A release contém a foundation de versão pública, a separação entre catálogo de bases sem credencial e provider CARTO opcional, e um comando de testes que executa cada família com o runner compatível. A auditoria inicial está em `docs/AUDITORIA-V1.3.0.md` e as notas em `docs/RELEASE-1.3.0.md`.

## TESTED

Foram reproduzidos localmente os contratos existentes de localização, trilha, armazenamento, dataset, offline, service worker, diagnóstico, providers, Map Engine, adapter MapLibre, atualização, configuração, import/export, contexto e demais testes presentes no repositório.

## PHYSICAL VALIDATION REQUIRED

Ainda é necessário validar em Android e iOS reais: permissões, GPS/GNSS e idade do fixo, bússola, background geolocation, pausa/retomada ao sair e voltar ao app, rotação, landscape, notch, safe areas, bateria, instalação PWA/APK e leitores TalkBack/VoiceOver.

## BLOCKED

A existência de dataset cartográfico regional/mundial redistribuível aprovado continua bloqueada. Assinatura de produção, publicação em loja, comunicação de socorro e checkout de pagamento não foram configurados nem podem ser declarados prontos.

## NOT CONFIGURED

Não há credencial CARTO versionada ou configurada nesta validação. Isso é intencional: segredos não entram no Git e o provider opcional não é tratado como base pública garantida.

## Decisão atual

A base local está reproduzível para continuar o endurecimento da 1.3.0, mas **não deve ser marcada como production-ready nem publicada como release final** sem completar a revisão funcional restante, validar os artefatos adequados e registrar as limitações acima.

## Gates adicionais de release engineering

- `node --check public/sw.js`: `PASS`.
- `npm audit --omit=dev`: `PASS`, sem vulnerabilidades de produção reportadas nesta execução.
- `package.json`: `1.3.0`; Android: `versionName 1.3.0`, `versionCode 130`; iOS: `MARKETING_VERSION 1.3.0`, `CURRENT_PROJECT_VERSION 130`.
- Checksum observado para `dist/index.html`: `646c0777de962fd90aacd4a68205cba75752d8a87d2240b4630702f842bbe46e`.
