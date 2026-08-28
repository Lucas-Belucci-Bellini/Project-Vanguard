# Vanguard Field — Mobile V2 Release Status

> Atualizado em 2026-08-28. Este documento separa build, artifact, signing, instalação, validação e release pública. O registro detalhado do snapshot candidate está em `MOBILE_V2_RELEASE_CANDIDATE.md`.

| Gate | Estado | Evidência | Próximo requisito |
|---|---|---|---|
| Código em `main` | Aprovado | `main` publicada no commit funcional `4b3855b`; CI `33134403140` concluído com sucesso; inclui tracking background experimental | continuar gates sem regressão e teste físico |
| Web/PWA build | Aprovado | `npm run build`, `npm test` (206), `node --check public/sw.js` e CI `33134403140`; background não carrega plugin no Web | instalação/modo avião/update posterior físicos |
| Android debug | Aprovado | `assembleDebug`; `android/app/build/outputs/apk/debug/app-debug.apk`, 8.816.910 bytes, SHA-256 `afbf0c0091e9b8e02fcdfff2e31c48f0b969a3dea508afd1ea6b7be04fc96db5`; artefato experimental de teste | instalar em Android real e executar T-021–T-029 |
| Android release/AAB | Artifact-only aprovado | run `33121937373`, AAB não assinado e hash registrado | keystore e signing deliberado |
| Android signed | Bloqueado | nenhuma keystore configurada | autorização, keystore e ambiente seguro |
| Android installed | Bloqueado | nenhum aparelho validado | instalar APK assinado/de teste e registrar log |
| iOS sync | Aprovado no Linux | `mobile:sync:ios`; plugin sincronizado e `UIBackgroundModes=location` preparado | macOS/Xcode e dispositivo Apple |
| iOS build/archive/IPA | Bloqueado | nenhum IPA | conta/equipe Apple, signing e Mac |
| Physical validation | Bloqueado | nenhum ciclo de campo concluído; background permanece `EXPERIMENTAL`/`DEVICE DEPENDENT` | executar T-021–T-030, registrar permissões, lacunas e bateria |
| Store readiness | Bloqueado | nenhuma publicação | revisão, signing, política e autorização |
| Candidate V2 documental | `NOT READY / BLOCKED` | `MOBILE_V2_RELEASE_CANDIDATE.md` continua factual; `4b3855b` é código em main, não candidate publicada | não chamar o documento de release publicada |
| Public release | `v1.0.0-rc.2` existente | única release listada no GitHub | não criar `v1.0.0` automaticamente |

## Política de publicação

A execução artifact-only com `publish_tag` vazio é o comportamento padrão de teste. A publicação exige tag e `publish_tag` explícitos, revisão do commit e dos hashes, signing válido e autorização deliberada. A existência de um AAB não assinado não indica prontidão para Play Store; sync iOS não indica IPA ou App Store.

## Nota operacional

Não há integração de pagamento, Asaas, Supabase, e-mail fiscal, SOS automático ou comunicação externa configurada. Esses temas permanecem fora do gate de release até setup real e autorização específica.
