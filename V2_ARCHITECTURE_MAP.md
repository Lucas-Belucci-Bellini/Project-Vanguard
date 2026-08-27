# Project Vanguard V2 — mapa arquitetural

## Regra de camadas

```text
UI (src/pages, src/ui, src/styles)
        ↓
APPLICATION / ciclo de tela (src/main.js)
        ↓
CORE (estado, localização, trilha, contexto, registros, atualização)
        ↓
ENGINE (geo, MGRS, ângulos e cálculos puros)
        ↓
DATA (manual, fontes e configuração local)
        ↓
INTEGRAÇÕES OPCIONAIS (MapLibre, service worker, APIs do dispositivo)
```

A estrutura existente tem prioridade. A criação de uma pasta nova exige uma função clara e uma decisão registrada.

## Caminhos críticos

| Caminho | Fluxo | Estado/limite |
|---|---|---|
| GPS → HUD | `@capacitor/geolocation` foreground nativo ou `navigator.geolocation` → `src/core/localizacao.js` → normalização → `engine/mgrs.js` → mapa/HUD | Posição local; fonte, precisão e idade devem ser visíveis |
| GPS → trilha | posição normalizada → filtro de distância/tempo → `estado.js` → resumo `trilha.js` | Alta precisão somente em rota ativa; sistema operacional define frequência |
| Mapa → destino | toque/coordenadas → validação → distância/azimute `engine/geo.js` → HUD | Não é roteamento viário completo |
| Mapa → tiles | MapLibre → HTTPS permitido → `public/sw.js`/Cache Storage | Pré-cache limitado; cache parcial não prova cobertura |
| Rota → backup | `estado.js` → `registro-offline.js` → JSON/GPX → download local | Importação confirma, valida e pausa a rota |
| Contexto → mapa | zonas JSON → `core/contexto.js` → validade/prioridade → cartão local | Não é alerta oficial automático |
| Manual → sobrevivência | catálogo local → filtros/busca → tela | Disponível offline; fontes e revisão visíveis |
| Socorro → compartilhamento | posição → pacote local → Share/clipboard do sistema | Compartilhamento não confirma entrega |
| SW → atualização PWA | registro → SW `waiting` → botão → confirmação → `SKIP_WAITING` → `controllerchange` | Sem atualização silenciosa |
| Release → APK | GitHub release HTTPS → botão → instalador do sistema | APK não se auto-instala; nova versão deve ser maior |
| Lifecycle → diagnóstico | `@capacitor/app` `appStateChange` ou `visibilitychange` → `ciclo-vida.js` → diagnóstico | Mede foreground/background; não garante execução nem GPS contínuo |
| Diagnóstico → observabilidade | APIs locais → `src/core/diagnostico.js`/`src/core/ciclo-vida.js` → `src/pages/diagnostico.js` → estado local | Sem telemetria oculta; bateria, sensores e lifecycle podem estar indisponíveis |

## Armazenamento

`localStorage` mantém envelopes versionados sob namespace Vanguard. Cache de shell e cache de tiles são separados no Cache Storage. Nenhum dado de posição é transmitido automaticamente. Integrações externas e hardware devem declarar `NOT CONFIGURED`, `NOT CONNECTED` ou `UNAVAILABLE` quando aplicável.

## Mobile

O Capacitor encapsula a base web. `@capacitor/geolocation@8.2.2` é o driver opcional de foreground e `@capacitor/app@8.1.1` observa lifecycle; Android declara coarse/fine e iOS declara descrições de uso. Android e iOS recebem a mesma UI, mas permissões, suspensão, bateria, sensores, instalação e atualização precisam de validação específica. Background GPS prolongado não deve ser afirmado a partir de um teste de navegador ou do driver foreground.

## Legacy

O módulo balístico legado permanece fora do fluxo civil. Qualquer pedido de nova capacidade operacional de armamento deve ser marcado `LEGACY-RESTRICTED` e não implementado.
