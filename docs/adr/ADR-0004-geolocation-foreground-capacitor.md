# ADR-0004 — Driver Capacitor de localização foreground

**Status:** Aceita para a V2; background ainda pendente
**Data:** 2026-08-27

## Contexto

O Vanguard Field usava `navigator.geolocation` tanto na PWA quanto dentro do WebView Capacitor. Isso preservava o caminho Web, mas não fornecia um contrato nativo explícito de permissões no Android/iOS. A V2 exige app móvel instalável, observável e honesto sobre limitações de plataforma.

A documentação oficial do Capacitor Geolocation informa que o plugin oferece posição, watch e permissões, mas não suporta background geolocation diretamente. Android e iOS possuem políticas e ciclo de vida próprios para localização em segundo plano.

## Decisão

Adicionar `@capacitor/geolocation@8.2.2` como driver nativo opcional. O núcleo mantém uma única política de energia e um contrato interno de posição. Em plataforma nativa, o app tenta o plugin Capacitor; no PWA, ou quando o bridge não responde e o WebView possui geolocalização, usa o fallback Web.

O Android declara somente `ACCESS_COARSE_LOCATION` e `ACCESS_FINE_LOCATION`. O iOS declara as descrições de uso foreground no `Info.plist`. Nenhuma permissão de background ou `UIBackgroundModes=location` é adicionada nesta decisão.

## Consequências

A posição e o acompanhamento foreground ficam preparados para validação nativa, enquanto web e mobile compartilham normalização, frescor, distância, política de energia e persistência local. O app pode reportar a fonte como `CAPACITOR GEOLOCATION · FOREGROUND`, `WEB GEOLOCATION` ou `INDISPONÍVEL`.

O comportamento não deve ser descrito como rastreamento contínuo em segundo plano. A próxima decisão deverá depender de testes reais de lifecycle, consumo, permissões, encerramento e retomada em Android/Xiaomi/iOS. Não adicionar `ACCESS_BACKGROUND_LOCATION`, `UIBackgroundModes` ou biblioteca de background apenas para fazer a interface parecer completa.

## Validação

A validação automatizada inclui testes do contrato de fonte e build Android com o plugin sincronizado. A validação física permanece `PHYSICAL VALIDATION REQUIRED` no Android, Xiaomi/MIUI/HyperOS e iPhone.

## Referências

- [Capacitor Geolocation Plugin API](https://capacitorjs.com/docs/apis/geolocation)
- [Access location in the background — Android Developers](https://developer.android.com/develop/sensors-and-location/location/background)
- [Handling location updates in the background — Apple Developer](https://developer.apple.com/documentation/corelocation/handling-location-updates-in-the-background)
- [CLLocationManager — allowsBackgroundLocationUpdates](https://developer.apple.com/documentation/corelocation/cllocationmanager/allowsbackgroundlocationupdates)
