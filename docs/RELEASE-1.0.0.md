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

O resumo público das mudanças da futura versão está em [`docs/NOTAS-DE-LANCAMENTO-V1.0.0.md`](./NOTAS-DE-LANCAMENTO-V1.0.0.md). O roteiro falado está em [`docs/ROTEIRO-APRESENTACAO-V1.0.0.md`](./ROTEIRO-APRESENTACAO-V1.0.0.md), o checklist móvel em [`docs/CHECKLIST-MOBILE-V1.0.0.md`](./CHECKLIST-MOBILE-V1.0.0.md), os comandos de tag em [`docs/COMANDOS-TAG-V1.0.0.md`](./COMANDOS-TAG-V1.0.0.md) e a simulação segura em [`docs/SIMULACAO-MODO-SOCORRO.md`](./SIMULACAO-MODO-SOCORRO.md).

A tag `v1.0.0-rc.2` é um snapshot imutável da release candidate. Depois dela, o código de `main` avançou com exportação/importação JSON offline, persistência versionada, exportação/importação GPX, documentação do contrato build versus release, workflow móvel separado, modo Mar responsável, contexto civil no mapa, prontidão offline, resumo da trilha, status detalhado do cache cartográfico e indicação da idade do último fixo GPS. O código de `main` continua avançando depois do snapshot e essas mudanças são publicadas e validadas como código, mas **não alteram nem recriam automaticamente a release `v1.0.0-rc.2`**. O commit exato da futura aprovação deve ser registrado no momento em que todos os gates forem concluídos. Para distribuí-las como nova candidate, seria necessário criar e publicar uma nova tag candidate de forma explícita.

## O que está entregue

O Vanguard Field agora apresenta um fluxo civil e multiuso para cidade, caminhada, expedição, mar e proteção civil. O núcleo local reúne GPS/GNSS, bússola, MGRS, destino, waypoints, trilha, contextos de risco, manual de sobrevivência e preparação responsável de coordenadas para compartilhamento.

O mapa oferece bases com atribuição, cache local de tiles visualizados/preparados, consulta de status, limite seguro de 256 URLs por preparação, tratamento de viewport no antimeridiano, metadados da última preparação e limpeza confirmada. O cache inicial continua sendo uma referência cartográfica local e não uma carta náutica certificada ou pacote oficial completo.

As zonas de proteção civil podem guardar fonte, atualização, validade opcional, centro, raio e contexto. O motor ignora zonas expiradas, recusa coordenadas fora dos limites geográficos e suporta exportação/importação JSON com schema e versão. O manual de sobrevivência é um catálogo local versionado, com fontes, data de revisão, tags, busca e filtros.

O Modo Socorro cria um pacote local validado com MGRS, latitude/longitude, precisão e horário. Compartilhar pelo sistema operacional ou copiar para a área de transferência não é tratado como entrega, confirmação de provedor ou acionamento de resgate. A fila offline permanece bloqueada para pagamentos, SOS, emergência, rádio e mensageiro satelital. O mapa também exporta e importa trilhas GPX localmente; a importação valida pontos e deixa a rota pausada. O HUD do mapa mostra a idade do último fixo e sinaliza posições antigas; isso não confirma que a pessoa ainda está naquele ponto.

## Validação reproduzida

| Verificação | Resultado |
|---|---|
| `npm test` | 112 testes aprovados, 0 falhas no código atual de `main`. A tag `v1.0.0-rc.2` anterior tinha 86 testes. |
| `npm run build` | Aprovado; bundle de produção gerado. |
| `node --check public/sw.js` | Aprovado. |
| `npm run mobile:android:debug` | Aprovado; `BUILD SUCCESSFUL`. |
| APK | `android/app/build/outputs/apk/debug/app-debug.apk`, aproximadamente 4,4 MB. |
| Preview HTTPS | `#/inicio` e `#/mapa` carregaram; MapLibre renderizou base topográfica; nenhum GPS fictício foi criado. |
| Service worker | Registro ativo; `CACHE_STATUS` respondeu com cache `vanguard-field-tiles-v2` e 25 tiles observados no preview. |
| `CI / PR` | CI da `main` deve ser verificado novamente após este conjunto de mudanças; a execução reproduzida anteriormente foi aprovada. |

## Checklist antes da tag final

A tag final `v1.0.0` só deve substituir este candidate depois de confirmar em aparelhos reais: instalação e retorno ao app Android/Xiaomi, permissões GPS, perda e retorno de internet, preparação e limpeza de tiles, persistência da trilha, consumo durante rota ativa e pausa, compartilhamento do pacote de Socorro, acessibilidade por leitor de tela, atualização confirmada e operação em iPhone real. O teste de campo de quatro dias deve registrar bateria, frescor do fixo, comportamento offline e backup GPX/JSON. A compilação/assinatura iOS exige macOS, Xcode e conta Apple; ela não foi declarada como concluída neste ambiente Linux.

Também não devem ser ativadas nesta versão as doações PIX/cartão, checkout Asaas, webhook, e-mail, Supabase de produção, fontes oficiais sincronizadas, cartas náuticas oficiais, Geiger, sonar, beacon, rádio, mensageiro satelital, detecção de queda ou SOS automático. Esses recursos estão documentados/preparados, não conectados.

## Comandos reproduzíveis

```bash
npm ci
npm test
npm run build
node --check public/sw.js
npm run mobile:android:debug
```

A release distribuível Android exige keystore e assinatura. A distribuição iOS exige o fluxo de assinatura da Apple. A versão atual é adequada como candidate técnico para testes e revisão; não deve ser apresentada como resgate automático, radar militar, medidor de radiação de celular ou carta náutica oficial. A atualização confirmada é documentada em [`docs/ATUALIZACAO-CONFIRMADA.md`](./ATUALIZACAO-CONFIRMADA.md) e a operação de quatro dias em [`docs/OPERACAO-BATERIA-GPS-4-DIAS.md`](./OPERACAO-BATERIA-GPS-4-DIAS.md).
