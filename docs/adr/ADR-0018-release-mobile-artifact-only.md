# ADR-0018 — Teste de release mobile somente com artifacts

- **Status:** Aceita
- **Data:** 2026-08-27
- **Escopo:** Mobile V2 / GitHub Actions / Android

## Contexto

O projeto precisa diferenciar uma compilação remota de uma release pública. O [Projeto-Baluarte](https://github.com/Lucas-Belucci-Bellini/Projeto-Baluarte) foi consultado como referência porque seu workflow mobile separa dispatch/tag, APK debug, AAB não assinado, teste físico, assinatura Android e handoff iOS.

## Decisão

Usar o workflow `Vanguard Mobile Artifacts and Release` com `workflow_dispatch`, `version=1.0.0` e `publish_tag` vazio para testar somente a cadeia de artifacts. O run `33121937373` confirmou:

| Etapa | Resultado |
|---|---|
| Build web + sync Capacitor Android | passou |
| Verificação da versão | passou para `1.0.0` |
| APK debug | gerado e enviado como artifact de teste |
| AAB release | gerado não assinado e enviado como artifact |
| Publicação de release | pulada porque não houve tag/input de publicação |

A publicação só pode ocorrer por uma solicitação explícita de tag/evento de release ou dispatch com `publish_tag`, e ainda exige revisão de versão, notas, artifacts, assinatura e gates. O teste artifact-only não cria tag, não altera a release existente e não promove a V2.

## Evidência

Artifacts baixados do run `33121937373`:

- `vanguard-android-debug-apk/app-debug.apk` — SHA-256 `789196ef2c72d587fed79705abf08e324a0c2020d735ad9a5fbffe9a55718d5c`.
- `vanguard-android-release-aab-unsigned/app-release.aab` — SHA-256 `1328fc47c527b9b545fabd9ccc1e2cdf063081befc20a2082481ec855ded5caa`.

A lista remota continuou somente com `v1.0.0-rc.2`. A evidência é de workflow/artifact; não inclui instalação em aparelho, assinatura, Play Console, iOS, TestFlight ou publicação pública.

## Consequências e limites

O padrão reduz o risco de confundir build com release e permite testar a cadeia Android em Linux. O APK debug não é distribuição. O AAB não assinado não deve ser enviado à loja. iOS continua dependente de macOS/Xcode, assinatura Apple e dispositivo. Nenhuma tag `v1.0.0` deve ser criada automaticamente por este ADR.
