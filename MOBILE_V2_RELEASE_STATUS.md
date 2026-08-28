# Vanguard Field — Mobile V2 Release Status

> Atualizado em 2026-08-28. Este documento separa build, artifact, signing, instalação, validação e release pública. O registro detalhado do snapshot candidate está em `MOBILE_V2_RELEASE_CANDIDATE.md`.

| Gate | Estado | Evidência | Próximo requisito |
|---|---|---|---|
| Código em `main` | Aprovado | `main` publicada no commit funcional `6d7c7fb`; CI desta rodada pendente | continuar gates sem regressão |
| Web/PWA build | Aprovado | `npm run build` e CI | instalação/modo avião físicos |
| Android debug | Aprovado | `assembleDebug` e APK de teste | instalar em Android real |
| Android release/AAB | Artifact-only aprovado | run `33121937373`, AAB não assinado e hash registrado | keystore e signing deliberado |
| Android signed | Bloqueado | nenhuma keystore configurada | autorização, keystore e ambiente seguro |
| Android installed | Bloqueado | nenhum aparelho validado | instalar APK assinado/de teste e registrar log |
| iOS sync | Aprovado no Linux | `mobile:sync:ios` | macOS/Xcode |
| iOS build/archive/IPA | Bloqueado | nenhum IPA | conta/equipe Apple, signing e Mac |
| Physical validation | Bloqueado | nenhum ciclo de campo concluído | matriz Android/Xiaomi/iPhone |
| Store readiness | Bloqueado | nenhuma publicação | revisão, signing, política e autorização |
| Candidate V2 documental | `NOT READY / BLOCKED` | `MOBILE_V2_RELEASE_CANDIDATE.md` registra o snapshot funcional `6d7c7fb`; nenhuma tag candidate V2 | não chamar o documento de release publicada |
| Public release | `v1.0.0-rc.2` existente | única release listada no GitHub | não criar `v1.0.0` automaticamente |

## Política de publicação

A execução artifact-only com `publish_tag` vazio é o comportamento padrão de teste. A publicação exige tag e `publish_tag` explícitos, revisão do commit e dos hashes, signing válido e autorização deliberada. A existência de um AAB não assinado não indica prontidão para Play Store; sync iOS não indica IPA ou App Store.

## Nota operacional

Não há integração de pagamento, Asaas, Supabase, e-mail fiscal, SOS automático ou comunicação externa configurada. Esses temas permanecem fora do gate de release até setup real e autorização específica.
