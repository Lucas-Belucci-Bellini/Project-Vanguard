# Referências oficiais — localização em segundo plano

Atualizado em 2026-08-27. Este documento registra evidência externa para a decisão do próximo incremento móvel; não significa que o suporte já esteja implementado ou verificado.

## Capacitor Geolocation v8

A documentação do `@capacitor/geolocation` informa que o plugin oferece `getCurrentPosition`, `watchPosition`, permissões e limpeza de watch. Ela também alerta que observar mudanças pode consumir bastante energia e deve ocorrer apenas quando necessário. A própria documentação declara que o plugin não suporta background geolocation diretamente e descreve permissões iOS/Android, além do fato de que `minimumUpdateInterval` e `interval` têm disponibilidade diferente entre Android, iOS e Web.

Fonte: [Capacitor Geolocation Plugin API](https://capacitorjs.com/docs/apis/geolocation).

## Android

A documentação do Android recomenda pedir somente a permissão de localização crítica para a função visível ao usuário. Se o aplicativo exigir localização em segundo plano em Android 10/API 29 ou superior, `ACCESS_BACKGROUND_LOCATION` precisa ser avaliada e justificada; a aprovação da Google Play não é garantida apenas por adotar boas práticas. Em Android 8/API 26 ou superior, o sistema impõe limites de localização em background e pode entregar atualizações apenas algumas vezes por hora.

Fonte: [Access location in the background — Android Developers](https://developer.android.com/develop/sensors-and-location/location/background).

## iOS/Core Location

A Apple documenta que o sistema pode suspender aplicativos em background. Para atualizações mais oportunas, o projeto precisa declarar a capacidade de background de localização e configurar o fluxo Core Location correspondente. A Apple também documenta `allowsBackgroundLocationUpdates`, a exigência da chave `UIBackgroundModes` com o valor `location` e o indicador de uso de localização. O sistema pode terminar o app; serviços e autorização precisam ser restaurados conforme o ciclo de vida.

Fonte: [Handling location updates in the background — Apple Developer](https://developer.apple.com/documentation/corelocation/handling-location-updates-in-the-background).

Fonte: [CLLocationManager — allowsBackgroundLocationUpdates](https://developer.apple.com/documentation/corelocation/cllocationmanager/allowsbackgroundlocationupdates).

## Capacitor App e ciclo de vida

A API oficial `@capacitor/app` expõe eventos de estado do aplicativo, incluindo `appStateChange`, `pause` e `resume`. A documentação descreve que esses eventos refletem o ciclo nativo no iOS/Android e `visibilitychange` na Web. O Vanguard usa apenas essa observação para tornar o estado local diagnosticável; ela não mantém o app executando e não transforma a localização foreground em rastreamento contínuo.

Fonte: [Capacitor App Plugin API](https://capacitorjs.com/docs/apis/app).

## Decisão de implementação

O app agora possui um driver opcional de foreground com `@capacitor/geolocation@8.2.2`, um observador de lifecycle com `@capacitor/app@8.1.1`, permissões Android coarse/fine e descrições de uso no `Info.plist` iOS. O rastreamento contínuo em background continua não garantido: o plugin oficial não oferece background geolocation diretamente, e a próxima etapa exige validação de lifecycle nativa antes de alterar permissões de background. Nenhuma interface pode exibir `TRACKING` ou `BACKGROUND SUPPORTED` sem teste real correspondente.
