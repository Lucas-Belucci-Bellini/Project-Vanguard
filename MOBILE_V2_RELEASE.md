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
| Tag final | Bloqueada | depende do checklist físico, assinatura e decisão deliberada |

## Gates antes da tag final

A equipe deve executar e registrar os casos de `MOBILE_V2_TEST_MATRIX.md` e `docs/CHECKLIST-MOBILE-V1.0.0.md` em Android comum, Xiaomi/MIUI/HyperOS e iPhone. Os gates mínimos incluem permissões, GPS foreground, frescor, lifecycle, tela bloqueada, offline em modo avião, persistência JSON/GPX, quota/resposta de tiles, sensor de bússola, acessibilidade, update posterior e bateria.

Depois, deve revisar versões e identificadores, gerar artifacts de distribuição em ambiente seguro, assinar, instalar/atualizar em dispositivos de teste e guardar hashes/logs. O APK debug já compilado nesta execução não satisfaz esses gates.

## Política de update

No PWA, um service worker novo permanece aguardando até confirmação explícita. No Android, uma release posterior apenas abre o caminho HTTPS oficial depois da confirmação; o Vanguard Field não instala APK, não ignora o instalador e não envia atualização silenciosa. A operação em estrada exige backup JSON/GPX antes de qualquer atualização.

## Segurança e privacidade

A release não pode afirmar comunicação, satélite, rádio, SOS enviado, resgate, cobertura cartográfica completa ou tracking em background sem integração e evidência. Pagamentos, Asaas, Supabase, e-mail e integrações fiscais permanecem `NOT_CONFIGURED`.

## Fontes do processo

Consulte [`docs/BUILD-MOBILE.md`](docs/BUILD-MOBILE.md), [`docs/COMANDOS-TAG-V1.0.0.md`](docs/COMANDOS-TAG-V1.0.0.md), [`docs/ATUALIZACAO-CONFIRMADA.md`](docs/ATUALIZACAO-CONFIRMADA.md) e [`V2_BLOCKERS.md`](V2_BLOCKERS.md).
