# Build móvel do Vanguard Field

## Estado atual

A base web do Vanguard foi empacotada com Capacitor e os projetos nativos foram gerados em `android/` e `ios/`.

| Artefato | Estado |
|---|---|
| PWA/web | Build de produção concluído. |
| Android debug | APK gerado e validado em `android/app/build/outputs/apk/debug/app-debug.apk` após as mudanças de mapas/offline; última recompilação concluída em 2026-08-27. |
| Android release | Ainda requer assinatura própria, keystore e configuração de publicação. |
| iPhone/iOS | Projeto Xcode gerado em `ios/`; a compilação final exige macOS, Xcode, CocoaPods quando necessário, conta Apple e assinatura. |

O arquivo `android/local.properties` é específico do ambiente local e não deve ser versionado. O caminho do SDK deve ser configurado em cada máquina de build.

## Comandos Android

```bash
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug --no-daemon
```

O APK de desenvolvimento é criado em `android/app/build/outputs/apk/debug/app-debug.apk`. Ele serve para testes locais e não é um pacote de distribuição para a Play Store.

Para uma versão de distribuição, configurar keystore e assinatura em um ambiente seguro, revisar o `applicationId`, definir versão, habilitar as regras de release e executar `./gradlew bundleRelease` ou `./gradlew assembleRelease`.

## Comandos iPhone

A geração do projeto iOS já foi feita no Linux:

```bash
npm install
npm run build
npx cap sync ios
```

A compilação e assinatura devem ser concluídas em um Mac com Xcode:

```bash
npx cap open ios
```

No Xcode, selecionar uma equipe Apple, revisar o Bundle Identifier `com.projectvanguard.field`, configurar permissões de localização e executar em um iPhone real. Uma IPA distribuível exige assinatura Apple e o método de distribuição correspondente.

## Política de bateria

O app usa perfis adaptativos: consulta pontual, cidade econômica, trilha ativa, bússola econômica e emergência. Alta precisão só é solicitada quando a pessoa inicia uma trilha ou pede uma posição de emergência. Ao pausar a rota ou sair da função, o acompanhamento deve ser reduzido ou encerrado.

No iOS nativo, a integração futura deve usar o serviço de localização mais econômico que atenda ao caso, `distanceFilter`, precisão mínima suficiente, pausas automáticas e localização em segundo plano somente quando explicitamente necessária. No Android, o acompanhamento em segundo plano também deve ser opt-in e limitado ao período real da trilha. Em aparelhos Xiaomi, a documentação de configuração de bateria e execução em segundo plano precisa ser apresentada ao usuário sem recomendar desativar proteções do sistema de forma indiscriminada.

No mapa web atual, a tela inicia no perfil econômico de cidade; o perfil de alta precisão só entra quando a pessoa inicia a gravação da rota. Pausar ou limpar a rota retorna ao modo econômico. A vigília de tela é opcional, só aparece durante uma rota ativa e é liberada ao sair dela; ocultar a tela interrompe a atualização visual do mapa. A duração da bateria não pode ser garantida: depende do aparelho, temperatura, recepção GNSS, brilho, tela, mapas, rede e sensores. O iPhone não é automaticamente pior; GPS contínuo, mapa renderizado e localização em segundo plano consomem energia em qualquer plataforma.

## Operação offline

Antes de ficar sem conexão, abrir o mapa, selecionar a base e tocar em **Preparar área offline**. O app guarda a shell, os dados locais e até 256 URLs por preparação da área visível e níveis próximos; a tela mostra o status reportado pelo cache, registra metadados da última preparação e oferece limpeza com confirmação. GPS/GNSS, bússola, trilha, waypoints, MGRS, zonas locais e sobrevivência podem continuar disponíveis sem internet. Alertas novos, tiles não preparados, pagamentos, e-mail e sincronização só voltam quando houver conexão.

## Fontes técnicas

[1]: [Apple Developer — Getting the current location of a device](https://developer.apple.com/documentation/corelocation/getting-the-current-location-of-a-device)
[2]: [Android Developers — About background location and battery life](https://developer.android.com/develop/sensors-and-location/location/battery)
[3]: [Capacitor — Getting Started](https://capacitorjs.com/docs/getting-started)
