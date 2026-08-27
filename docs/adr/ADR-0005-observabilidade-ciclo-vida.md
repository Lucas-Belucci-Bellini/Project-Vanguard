# ADR-0005 — Observabilidade local do ciclo de vida do aplicativo

- **Status:** Aceita para V2; validação física pendente
- **Data:** 2026-08-27
- **Escopo:** Vanguard Field mobile-first, PWA e Capacitor

## Contexto

O diagnóstico precisava distinguir quando a interface está em primeiro plano ou deixou de estar ativa, especialmente durante a validação do posicionamento foreground. Sem essa distinção, uma pessoa poderia interpretar a permanência de dados antigos como prova de que o GPS continuou executando enquanto o sistema suspendeu o aplicativo.

O projeto também precisa preservar a separação entre observabilidade de ciclo de vida e rastreamento de localização. O plugin oficial `@capacitor/geolocation` usado pelo Vanguard não é uma implementação de geolocalização em background. Adicionar uma leitura de lifecycle não deve criar uma promessa de execução contínua, serviço foreground ou recuperação automática.

## Decisão

Usar `@capacitor/app@8.1.1` apenas para observar o evento nativo `appStateChange` quando o app está rodando em Android ou iOS via Capacitor. O adaptador `src/core/ciclo-vida.js` normaliza o resultado para `FOREGROUND` ou `BACKGROUND`, registra a fonte `CAPACITOR APP` e expõe limpeza de listeners.

Na Web/PWA, usar `document.visibilitychange` como fallback local, com fonte `VISIBILITY API`. Em ambientes sem `document` ou ponte nativa, reportar `UNAVAILABLE · INDISPONÍVEL`. A tela `#/diagnostico` exibe o estado e atualiza o painel localmente; nenhuma amostra é enviada para servidor.

## Não decidido / fora do escopo

Esta decisão não habilita localização em background, `ACCESS_BACKGROUND_LOCATION`, `UIBackgroundModes`, `allowsBackgroundLocationUpdates`, foreground service, tarefa agendada, beacon, transmissão, SOS ou telemetria. Também não define que o sistema manterá um processo ativo após suspensão. Qualquer futura proposta de background GPS deverá ter requisito explícito, política de privacidade, implementação nativa específica, medição de bateria e validação em aparelhos reais antes de alterar o estado do projeto.

## Consequências

O diagnóstico passa a mostrar uma evidência local útil para testes de troca entre apps, bloqueio de tela e retorno. O fallback Web é honesto, mas não é equivalente a uma garantia de execução nativa. Testes Node cobrem a normalização e o estado indisponível; Android, Xiaomi/MIUI/HyperOS e iPhone continuam necessários para validar o comportamento real do sistema operacional.

## Referências

- [Capacitor App Plugin API](https://capacitorjs.com/docs/apis/app), incluindo `appStateChange`, `pause` e `resume`.
- [Capacitor Geolocation Plugin API](https://capacitorjs.com/docs/apis/geolocation), usada no projeto para posicionamento foreground.
- [Android — Request location permissions](https://developer.android.com/develop/sensors-and-location/location/permissions), para a distinção entre permissões foreground e background.
- [Apple — Handling location updates in the background](https://developer.apple.com/documentation/corelocation/handling-location-updates-in-the-background), para os requisitos de execução em background no iOS.
