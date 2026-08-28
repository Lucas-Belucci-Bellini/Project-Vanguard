# Vanguard Field — Mobile V2 Build Matrix

> Matriz de build e artifacts atualizada em 2026-08-28. Um build aprovado não é uma release; um artifact baixável não é um artifact assinado ou distribuível.

| Target | Comando/processo | Estado | Evidência atual | Limite |
|---|---|---|---|---|
| Web | `npm run build` | Aprovado | build local e CI; manifesto/transação/storage/governança de fontes são lógica compartilhada sem dataset empacotado | não prova instalação PWA nem aparelho |
| Service Worker | `node --check public/sw.js` + testes VM | Aprovado | CI/local | não prova quota nem modo avião |
| Tests | `npm test` | Aprovado | 200 testes; inclui manifesto, transação, storage isolado e governança de fontes, localização manual, catálogo de rotas e cleanups assíncronos | não substitui validação física |
| Android sync | `npm run mobile:sync:android` | Aprovado | projeto atualizado | não prova execução em Android |
| iOS sync | `npm run mobile:sync:ios` | Aprovado no Linux | projeto atualizado | não substitui macOS/Xcode |
| Android debug | `npm run mobile:android:debug` | Aprovado | não necessário nesta unidade pura; gate anterior gerou APK debug de teste; tamanho/hash devem ser registrados por execução | não é release nem distribuição |
| Android release/AAB | workflow manual artifact-only | Aprovado como geração | AAB não assinado do run `33121937373` | requer signing e revisão |
| Android signed | keystore/credencial real | Bloqueado | nenhuma assinatura configurada | autorização e ambiente seguro |
| iOS debug | Xcode em macOS | Bloqueado | apenas sync Linux | Mac, Xcode, conta/equipe Apple |
| iOS archive/IPA | Xcode + signing | Bloqueado | nenhum IPA | assinatura e dispositivo |
| Device install | Android/iOS real | Bloqueado | nenhum aparelho validado nesta execução; consultar `DEVICE_CAPABILITIES.md` e `MOBILE_V2_DEVICE_MATRIX.md` | logs, permissões e matriz física |
| Store ready | Play/App Store | Bloqueado | nenhuma publicação | política, revisão e autorização explícita |

## Regras de reprodutibilidade

Cada execução deve registrar commit, comando, resultado, tamanho/hash do artifact quando existir e ambiente. Artifacts de debug devem ser nomeados como teste. Nenhum segredo, keystore, certificado ou token deve entrar no repositório.

## Release gate

O workflow `Vanguard Mobile Artifacts and Release` só deve publicar quando `publish_tag` for explicitamente informado em uma execução deliberada. O teste artifact-only deixou esse campo vazio e não criou nova release; a release pública continua `v1.0.0-rc.2`.
