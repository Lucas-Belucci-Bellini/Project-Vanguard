# Vanguard Field — MOBILE V2 RELEASE

## Estado atual

A branch `main` contém o código compartilhado e os projetos Capacitor. A release pública existente continua sendo `v1.0.0-rc.2`. A tag final `v1.0.0` **não existe** e não será criada automaticamente por este ciclo.

| Camada | Estado | Observação |
|---|---|---|
| Build web | Aprovado | validação técnica, não release |
| PWA | Em validação | service worker e update confirmado; instalação/modo avião físicos pendentes |
| APK debug | Aprovado | `android/app/build/outputs/apk/debug/app-debug.apk`; artifact de teste, não distribuição |
| APK/AAB release | Bloqueado | requer keystore, configuração de assinatura e revisão de publicação |
| iOS debug/release | Bloqueado no ambiente atual | requer macOS/Xcode, equipe Apple, assinatura e dispositivo |
| Update APK | Em validação | app abre origem oficial após confirmação; instalador nativo controla instalação |
| **Tag final** | Bloqueada | depende do checklist físico, assinatura e decisão deliberada |

## Teste de artifacts mobile — 2026-08-27

Foi executado o workflow manual `Vanguard Mobile Artifacts and Release` sobre `main`, com `version=1.0.0` e **sem** `publish_tag`, no run [`33121937373`](https://github.com/Lucas-Belucci-Bellini/Project-Vanguard/actions/runs/33121937373). O job Android concluiu com sucesso e a etapa **Publicar release explicitamente solicitada** foi pulada.

| Artifact | Resultado | SHA-256 |
|---|---|---|
| `vanguard-android-debug-apk/app-debug.apk` | Android package; artifact de teste | `789196ef2c72d587fed79705abf08e324a0c2020d735ad9a5fbffe9a55718d5c` |
| `vanguard-android-release-aab-unsigned/app-release.aab` | AAB não assinado; não apto para distribuição | `1328fc47c527b9b545fabd9ccc1e2cdf063081befc20a2082481ec855ded5caa` |

A lista do GitHub permaneceu somente com a pré-release `v1.0.0-rc.2`. O teste prova geração remota e upload de artifacts, não instalação em aparelho, assinatura, publicação de loja, iOS ou release pública. O padrão foi conferido contra o workflow mobile do [Projeto-Baluarte](https://github.com/Lucas-Belucci-Bellini/Projeto-Baluarte/blob/main/.github/workflows/mobile-release.yml) e seu handoff local; a adaptação do Vanguard mantém o mesmo princípio, mas preserva seus identificadores e limites.

## Gates antes da tag final

A equipe deve executar e registrar os casos de `MOBILE_V2_TEST_MATRIX.md` e `docs/CHECKLIST-MOBILE-V1.0.0.md` em Android comum, Xiaomi/MIUI/HyperOS e iPhone. Os gates mínimos incluem permissões, GPS foreground, frescor, lifecycle, tela bloqueada, offline em modo avião, persistência JSON/GPX, quota/resposta de tiles, sensor de bússola, acessibilidade, update posterior e bateria.

Depois, deve revisar versões e identificadores, gerar artifacts de distribuição em ambiente seguro, assinar, instalar/atualizar em dispositivos de teste e guardar hashes/logs. O APK debug já compilado nesta execução não satisfaz esses gates.

## Política de update

No PWA, um service worker novo permanece aguardando até confirmação explícita. No Android, uma release posterior apenas abre o caminho HTTPS oficial depois da confirmação; o Vanguard Field não instala APK, não ignora o instalador e não envia atualização silenciosa. A operação em estrada exige backup JSON/GPX antes de qualquer atualização.

## Segurança e privacidade

A release não pode afirmar comunicação, satélite, rádio, SOS enviado, resgate, cobertura cartográfica completa ou tracking em background sem integração e evidência. Pagamentos, Asaas, Supabase, e-mail e integrações fiscais permanecem `NOT_CONFIGURED`.

## Fontes do processo

Consulte [`docs/BUILD-MOBILE.md`](docs/BUILD-MOBILE.md), [`docs/COMANDOS-TAG-V1.0.0.md`](docs/COMANDOS-TAG-V1.0.0.md), [`docs/ATUALIZACAO-CONFIRMADA.md`](docs/ATUALIZACAO-CONFIRMADA.md) e [`V2_BLOCKERS.md`](V2_BLOCKERS.md).
