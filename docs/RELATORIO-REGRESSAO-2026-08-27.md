# Relatório de regressão — 2026-08-27

## Resultado executivo

O branch de trabalho `claude/vanguard-gps-app-site-iepcru` está 18 commits à frente de `origin/main` e não possui alterações pendentes. A branch padrão remota confirmada é `main`.

| Gate | Resultado |
|---|---|
| `npm test` | Aprovado: 86 testes, 0 falhas. |
| `npm run build` | Aprovado: bundle de produção Vite gerado em `dist/`. |
| `node --check public/sw.js` | Aprovado. |
| `npm run mobile:android:debug` | Aprovado: `BUILD SUCCESSFUL`. |
| APK debug | Gerado em `android/app/build/outputs/apk/debug/app-debug.apk`, aproximadamente 4,4 MB. |
| Projeto iOS | Projeto Xcode presente em `ios/App/App.xcodeproj`; compilação/assinatura ainda exigem macOS, Xcode e conta Apple. |
| Árvore Git | Limpa no branch de trabalho e sincronizada com o remoto de trabalho. |

## Verificação manual complementar

O preview HTTPS carregou `#/inicio` com tutorial, atalhos e indicador de estado. A rota `#/mapa` renderizou MapLibre com base topográfica, controles de destino, rota, cache offline, limpeza confirmada e vigília de tela. O sandbox não obteve fixo GPS, e a interface exibiu `GPS INDISPONÍVEL` sem inventar posição.

## Pendências que impedem chamar este estado de release final assinado

Ainda faltam testes em aparelhos Android/Xiaomi e iPhone reais, confirmação de operação offline no Chrome DevTools com perda efetiva de rede, revisão de permissões nativas, assinatura Android/iOS e validação do conteúdo com profissionais. Doações Asaas, fontes oficiais sincronizadas, cartas náuticas, sensores externos e mensageiro via satélite permanecem preparados, não conectados.

## Teste real do service worker no preview HTTPS

O service worker foi registrado e ficou ativo no preview. A mensagem `CACHE_STATUS` respondeu com `cache: vanguard-field-tiles-v2`, `tiles: 25` e `type: CACHE_STATUS_DONE`. Isso confirma o protocolo de consulta do cache em navegador HTTPS; não substitui o teste de desligar a rede, preparar área e reabrir em aparelho real.
