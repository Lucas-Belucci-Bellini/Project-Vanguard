# ADR-0016 — Leitura de permissão GPS por plataforma

- **Status:** Aceita
- **Data:** 2026-08-27
- **Escopo:** Mobile V2 / diagnóstico local

## Contexto

O Diagnóstico consultava somente `navigator.permissions` para exibir o estado do GPS. Em um WebView Capacitor, essa API pode não refletir a permissão nativa, e consultar a permissão não deve abrir o prompt nem repetir solicitações fora do fluxo que realmente usa a localização.

## Decisão

Criar `src/platform/permissoes.js` com duas responsabilidades:

| Ambiente | Fonte de leitura | Comportamento |
|---|---|---|
| Capacitor nativo | `@capacitor/geolocation.checkPermissions()` | traduz `granted`, `denied`, `prompt` e estados desconhecidos |
| Web/PWA | `navigator.permissions.query({ name: 'geolocation' })` | traduz `granted`, `denied` e `prompt`; sem API, retorna `BROWSER DEPENDENT` |

`lerPermissaoGps()` é somente leitura. O Diagnóstico não chama `requestPermissions()`, não infere autorização a partir do funcionamento do GPS e não converte erro do bridge em acesso concedido. Quando a API nativa está ausente, falha ou retorna estado desconhecido, a tela mantém um estado indisponível honesto.

## Consequências

A observabilidade no Diagnóstico fica alinhada ao ambiente onde o app está executando. Os fluxos explícitos de posição continuam responsáveis por solicitar acesso quando necessário. Nenhuma permissão nova foi adicionada, e a política de GPS continua foreground; não há `ACCESS_BACKGROUND_LOCATION`, foreground service, `UIBackgroundModes` ou `allowsBackgroundLocationUpdates`.

A distinção entre `CONCEDIDA`, `NEGADA`, `NÃO SOLICITADA`, `INDISPONÍVEL` e `BROWSER DEPENDENT` deve permanecer visível nos limites do produto e não constitui validação de sinal, precisão, ciclo de vida ou funcionamento em segundo plano.

## Evidência

`test/permissoes.test.js` cobre tradução dos estados do plugin, ausência de `requestPermissions()`, Permissions API Web, APIs ausentes, erro de consulta e bridge nativo indisponível. A suíte completa chegou a 150 testes aprovados; build, sync Android/iOS, APK debug e CI devem continuar sendo registrados separadamente da verificação física.
