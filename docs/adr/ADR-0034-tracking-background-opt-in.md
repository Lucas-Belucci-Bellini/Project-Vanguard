# ADR-0034 — rastreamento GPS experimental em segundo plano com opt-in

- **Status:** Aceita para experimento; suporte físico não verificado
- **Data:** 2026-08-28
- **Escopo:** trilha local do Vanguard Field em Android e preparação iOS

> O Vanguard Field continua sendo um aplicativo civil de navegação. GPS posiciona e registra localmente; não transmite posição, não aciona resgate e não substitui comunicação independente, autoridade local ou profissional qualificado.

## Contexto

A trilha foreground anterior era pausada quando a página ficava oculta. Isso protegia bateria e evitava alegar uma capacidade que a API de Geolocation do navegador não fornece. Para o teste real de caminhada, foi necessário oferecer uma tentativa explícita de manter a coleta com a tela bloqueada por meio de um plugin nativo de background geolocation. O Android exige que um serviço de localização em primeiro plano seja visível ao usuário, tenha o tipo `location` e use as permissões correspondentes [1]. A Apple exige a capability de localização em background, descrições transparentes e validação no comportamento real do sistema [2].

O plugin `@capgo/background-geolocation` v8.4.3 expõe `start(options, callback)` e `stop()`, além de opções para mensagem/notificação, filtro de distância e intervalo mínimo [3]. A dependência foi escolhida porque declara compatibilidade com Capacitor 8. O projeto não configura URL, headers, POST nativo, geofencing ou sincronização remota.

## Decisão

A tela do mapa terá o controle **ATIVAR GPS EM 2º PLANO** somente enquanto houver uma rota ativa e não pausada. O primeiro acionamento exige confirmação visível com as seguintes informações: maior consumo de bateria, notificação persistente no Android, possibilidade de interrupção pelo sistema/fabricante, necessidade de parada manual e ausência de envio para servidor. A sessão não inicia no lançamento do app, em `resume`, ao ocultar a página, por reconexão de rede ou no modo Socorro.

O controlador `src/core/background-localizacao.js` mantém estados observáveis `IDLE`, `STARTING`, `ACTIVE`, `STOPPED`, `ERROR` e `UNAVAILABLE`. O callback nativo normaliza latitude, longitude, precisão, altitude, velocidade, rumo e timestamp e alimenta o mesmo registro local da trilha. Durante uma sessão nativa ativa, o watcher foreground é pausado para evitar pontos duplicados. Ao parar, falhar ou ficar indisponível, o watcher foreground só é restaurado automaticamente quando a página está visível.

O Android usa serviço foreground com `foregroundServiceType="location"`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, localização coarse/fine, `POST_NOTIFICATIONS` e `WAKE_LOCK`, conforme o manifesto mesclado do APK debug desta rodada. O app removeu do manifesto final `RECEIVE_BOOT_COMPLETED` e desabilitou os receivers de geofence fornecidos pelo plugin, pois não há auto-início no boot nem geofencing no escopo. `ACCESS_BACKGROUND_LOCATION` não foi adicionado: a unidade não implementa geofence nem solicita acesso extra por hipótese.

O iOS recebeu `UIBackgroundModes` com `location` e mantém as descrições de localização. Isso é preparação de projeto, não prova de funcionamento. Não há macOS, Xcode, signing, archive, IPA ou iPhone/iPad disponíveis neste ambiente; o suporte iOS permanece `ENVIRONMENT BLOCKED`.

## Privacidade e dados

A trilha continua no armazenamento local do app e pode ser exportada manualmente em JSON, GPX ou KML. Nenhuma opção do controlador contém `url`, `headers`, endpoint ou credencial. A contribuição voluntária escolhida para a opção A continua separada, pós-rota, desabilitada por padrão e dependente de revisão/confirmação final; GitHub não é banco de dados de trajetos pessoais.

O botão **PARAR GPS EM 2º PLANO** e os comandos **PARAR E GUARDAR**, **LIMPAR TRILHA**, importação de registro e desmontagem da página encerram a sessão nativa. Callbacks tardios são ignorados por ciclo de sessão. Se o processo WebView for encerrado sem recuperação implementada, não se deve concluir que todos os pontos foram gravados.

## Limites e riscos conhecidos

A implementação é **EXPERIMENTAL** e **DEVICE DEPENDENT**. Um serviço foreground pode ser limitado por políticas de bateria, fabricante, permissões de notificação, localização desativada, falta de sinal, modo de economia, encerramento forçado ou falhas do sistema. Xiaomi/MIUI/HyperOS precisa de teste próprio; não será instruído nenhum bypass inseguro. O iOS pode suspender ou encerrar o app, e a unidade não promete recuperação após encerramento.

A distância de 5 m e o intervalo mínimo de 5 s são filtros de entrega, não garantia de frequência nem de precisão. Um ponto GPS pode estar deslocado dentro de prédio, sob árvores, em cânion urbano ou durante reflexão de sinal. O sistema não faz snap-to-road, não inventa pontos e deve mostrar precisão, idade do fixo e lacunas observadas.

> **Não há promessa de quatro dias de rastreamento.** A autonomia e a continuidade devem ser medidas no aparelho real, com bateria e comunicação independente. O app não é um sistema de resgate.

## Plano de validação

A execução automatizada cobre contrato, normalização, reentrada, stop, erro, callback tardio, desmontagem e indisponibilidade Web em `test/background-localizacao.test.js`. A validação física permanece pendente nos casos T-021 a T-030 de `MOBILE_V2_TEST_MATRIX.md`: consentimento, notificação, tela bloqueada, Home/Recents, retorno, parada, limpeza, permissões negadas, modo avião, Xiaomi/HyperOS, bateria e iOS.

O APK produzido nesta rodada é somente `app-debug.apk`, com `versionName 1.0.0`, `versionCode 100`, tamanho de 8.816.910 bytes e SHA-256 `0c948c698b833dc4a6389804afe7e6f2826f0c134f8a507de3fa55b07e3541ff`. Esse hash identifica um artefato local de teste; não é assinatura, candidate ou release pública.

## Consequências

A unidade permite um teste real antes da peregrinação, sem alterar a arquitetura JavaScript ES2022/Vite/MapLibre/Capacitor e sem introduzir backend. Em troca, acrescenta permissões e consumo de bateria no Android, exige uma notificação persistente e mantém bloqueios de hardware, fabricante, iOS, signing e distribuição. A capacidade só poderá mudar de `EXPERIMENTAL`/`PENDENTE` para verificada após evidência de campo reproduzível.

A versão de pacote continua `1.0.0`. Esta ADR não cria `0.7.0`, não reduz versões nativas e não cria tag; a decisão de nomenclatura/candidate será registrada separadamente quando o usuário aprovar uma política coerente com a linha V2.

## Referências

[1]: https://developer.android.com/develop/background-work/services/fgs/service-types#location — Android Developers, “Foreground service types: location”.

[2]: https://developer.apple.com/documentation/corelocation/handling_location_updates_in_the_background — Apple Developer Documentation, “Handling location updates in the background”.

[3]: https://github.com/Cap-go/capacitor-background-geolocation — Capgo, “capacitor-background-geolocation”.
