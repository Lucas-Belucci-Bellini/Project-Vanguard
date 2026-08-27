# Vanguard Field — MOBILE V2 DECISIONS

## D-001 — Preservar a base compartilhada

A aplicação permanece em JavaScript ES2022, Vite, MapLibre, PWA e Capacitor. Não haverá migração para React, TypeScript, Kotlin, Swift, Rust ou WASM apenas por preferência. Uma migração somente poderá ocorrer após gargalo medido, justificativa, ADR, migração gradual e testes.

## D-002 — Localização foreground por padrão

O GPS nativo usa `@capacitor/geolocation` somente em foreground e compartilha a política de consumo com o fallback Web/PWA. O app não declara tracking contínuo, `ACCESS_BACKGROUND_LOCATION`, foreground service, `UIBackgroundModes` ou `allowsBackgroundLocationUpdates`. Esses recursos dependem de requisito explícito e validação nativa real.

## D-003 — Diagnóstico deve refletir o contrato persistido

A posição normalizada do produto é `{ lat, lon, accuracy, timestamp }`. Para compatibilidade com entradas legadas, o diagnóstico aceita também `{ latitude, longitude }`. A correção foi implementada no commit `f9da500`; o relógio de referência pode ser injetado nos testes para evitar falsos resultados de frescor.

## D-004 — Capacidades são estados honestos

GPS, bússola, armazenamento, rede, bateria e compartilhamento só podem aparecer como disponíveis quando a API e o fluxo real sustentarem essa afirmação. Quando o ambiente não permite concluir, o rótulo deve permanecer `INDISPONÍVEL`, `BROWSER DEPENDENT` ou `DEVICE DEPENDENT`.

## D-005 — Offline não é sinônimo de solicitação aceita

O fluxo de mapas preparados só pode considerar uma área disponível após o retorno do cache. O planner e o Service Worker têm limite defensivo de 256 URLs por preparação, mas isso não garante cobertura cartográfica, quota disponível ou funcionamento em todos os aparelhos.

## D-006 — Socorro manual e privacidade

O aplicativo pode obter a posição, montar coordenadas e abrir compartilhamento após ação explícita. Ele não transmite automaticamente, não confirma SOS, não confirma entrega, não promete satélite, rádio ou equipe de resgate. Dados de pagamento e integrações externas seguem não configurados.

## D-007 — Separação de ciclo de entrega

`npm run build` e `assembleDebug` são validações técnicas. O APK debug é artifact de teste. Release assinada, tag, publicação em loja e distribuição exigem revisão e autorização deliberadas; nenhuma tag `v1.0.0` é criada automaticamente.

## Referências técnicas

[1]: [Capacitor — Geolocation Plugin API](https://capacitorjs.com/docs/apis/geolocation)
[2]: [Capacitor — App Plugin API](https://capacitorjs.com/docs/apis/app)
[3]: [Android Developers — Access location in the background](https://developer.android.com/develop/sensors-and-location/location/background)
[4]: [Apple Developer — Handling location updates in the background](https://developer.apple.com/documentation/corelocation/handling-location-updates-in-the-background)
