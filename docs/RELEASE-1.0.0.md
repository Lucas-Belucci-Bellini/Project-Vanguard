# Vanguard Field 1.0.0 — Release candidate

## Identificação

| Campo | Valor |
|---|---|
| Produto | Vanguard Field |
| Versão do pacote | `1.0.0` |
| Branch padrão | `main` |
| Commit de `main` no momento da primeira preparação | `f69d53d03ec9c00d7465f0cc202c39e0c0e9a233eb` |
| Release candidate publicada | `v1.0.0-rc.2` sobre o commit `11b3ccd` |
| Pull request integrada | [#2 — Vanguard Field: base offline-first para release 1.0.0](https://github.com/Lucas-Belucci-Bellini/Project-Vanguard/pull/2) |

## Estado do snapshot e do código atual

A tag `v1.0.0-rc.2` é um snapshot imutável da release candidate. Depois dela, o código de `main` avançou com a melhoria de exportação/importação JSON offline no commit `d390d55`, a documentação de build versus release no commit `15942f8`, o workflow móvel separado no commit `47aefaa` e a persistência versionada no commit `d5802a7`. Esses commits foram publicados em `main` e validados como código, mas **não alteram nem recriam automaticamente a release `v1.0.0-rc.2`**. Para distribuir essas mudanças como nova candidate, seria necessário criar e publicar uma nova tag candidate de forma explícita.

## O que está entregue

O Vanguard Field agora apresenta um fluxo civil e multiuso para cidade, caminhada, expedição, mar e proteção civil. O núcleo local reúne GPS/GNSS, bússola, MGRS, destino, waypoints, trilha, contextos de risco, manual de sobrevivência e preparação responsável de coordenadas para compartilhamento.

O mapa oferece bases com atribuição, cache local de tiles visualizados/preparados, consulta de status, limite seguro de 256 URLs por preparação, tratamento de viewport no antimeridiano, metadados da última preparação e limpeza confirmada. O cache inicial continua sendo uma referência cartográfica local e não uma carta náutica certificada ou pacote oficial completo.

As zonas de proteção civil podem guardar fonte, atualização, validade opcional, centro, raio e contexto. O motor ignora zonas expiradas, recusa coordenadas fora dos limites geográficos e suporta exportação/importação JSON com schema e versão. O manual de sobrevivência é um catálogo local versionado, com fontes, data de revisão, tags, busca e filtros.

O Modo Socorro cria um pacote local validado com MGRS, latitude/longitude, precisão e horário. Compartilhar pelo sistema operacional ou copiar para a área de transferência não é tratado como entrega, confirmação de provedor ou acionamento de resgate. A fila offline permanece bloqueada para pagamentos, SOS, emergência, rádio e mensageiro satelital.

## Validação reproduzida

| Verificação | Resultado |
|---|---|
| `npm test` | 96 testes aprovados, 0 falhas no código atual de `main`. A tag `v1.0.0-rc.2` anterior tinha 86 testes. |
| `npm run build` | Aprovado; bundle de produção gerado. |
| `node --check public/sw.js` | Aprovado. |
| `npm run mobile:android:debug` | Aprovado; `BUILD SUCCESSFUL`. |
| APK | `android/app/build/outputs/apk/debug/app-debug.apk`, aproximadamente 4,4 MB. |
| Preview HTTPS | `#/inicio` e `#/mapa` carregaram; MapLibre renderizou base topográfica; nenhum GPS fictício foi criado. |
| Service worker | Registro ativo; `CACHE_STATUS` respondeu com cache `vanguard-field-tiles-v2` e 25 tiles observados no preview. |
| `CI / PR` | Checks automáticos aprovados nos commits publicados em `main`, incluindo a persistência versionada. |

## Checklist antes da tag final

A tag final `v1.0.0` só deve substituir este candidate depois de confirmar em aparelhos reais: instalação e retorno ao app Android/Xiaomi, permissões GPS, perda e retorno de internet, preparação e limpeza de tiles, persistência da trilha, consumo durante rota ativa e pausa, compartilhamento do pacote de Socorro, acessibilidade por leitor de tela e operação em iPhone real. A compilação/assinatura iOS exige macOS, Xcode e conta Apple; ela não foi declarada como concluída neste ambiente Linux.

Também não devem ser ativadas nesta versão as doações PIX/cartão, checkout Asaas, webhook, e-mail, Supabase de produção, fontes oficiais sincronizadas, cartas náuticas oficiais, Geiger, sonar, beacon, rádio, mensageiro satelital, detecção de queda ou SOS automático. Esses recursos estão documentados/preparados, não conectados.

## Comandos reproduzíveis

```bash
npm ci
npm test
npm run build
node --check public/sw.js
npm run mobile:android:debug
```

A release distribuível Android exige keystore e assinatura. A distribuição iOS exige o fluxo de assinatura da Apple. A versão atual é adequada como candidate técnico para testes e revisão; não deve ser apresentada como resgate automático, radar militar, medidor de radiação de celular ou carta náutica oficial.
