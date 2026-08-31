# Vanguard Field 1.3.1

## Navigation

A release adiciona `#/navegacao` como centro local de navegação avançada. A tela apresenta posição atual em Latitude/Longitude, UTM e MGRS quando disponíveis, conversão MGRS local e cálculo de rumo, distância, cardinal e direção relativa para um ponto informado.

O novo núcleo `src/core/navegacao-rumo.js` reutiliza `src/engine/geo.js` e `src/engine/angles.js`, com testes determinísticos de normalização, cruzamento 0°/360°, bearing, back bearing, cardinais, direção relativa e segmentos.

## Field Tools e offline

Os cálculos e conversões funcionam localmente e não exigem rede. A página deixa altitude, sensor, declinação e posição como indisponíveis quando não há dados comprovados, sem inventar valores. O Map Engine, trilha, armazenamento e formatos JSON/GPX existentes foram preservados.

## Stability

A suíte completa foi executada com 273 testes Node e 17 testes Vitest aprovados. `npm run build` também foi aprovado. `node --check public/sw.js` e `npm audit --omit=dev` foram executados; a auditoria de produção não reportou vulnerabilidades nesta execução.

## Versionamento

A identidade pública foi atualizada para `1.3.1` em `package.json`, configuração do aplicativo, Android (`versionName 1.3.1`, `versionCode 131`), iOS (`MARKETING_VERSION 1.3.1`, `CURRENT_PROJECT_VERSION 131`) e workflow mobile. Tags antigas não foram alteradas.

## Limitações

Heading, bússola, declinação automática, elevação real, background geolocation, rotação, safe areas, bateria, instalação e leitores de tela exigem validação em aparelhos reais. Não há dataset regional/mundial aprovado, assinatura de produção ou serviço externo de socorro configurado. A release não implementa armamentos, balística, seleção de alvos, perseguição ou rastreamento clandestino.

## Status

A versão está **preparada no código e na documentação**, mas a tag/publicação `v1.3.1` somente deve ser criada após os gates físicos, de assinatura e de distribuição que permanecem explicitamente bloqueados.
