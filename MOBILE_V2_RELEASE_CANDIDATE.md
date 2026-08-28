# Vanguard Field — Mobile V2 release candidate

> **Este arquivo é um registro de prontidão. Não cria tag, não publica release e não transforma artifacts em distribuição.** A versão V2 continua `IN PROGRESS`.

## Identificação do snapshot atual

| Campo | Estado factual |
|---|---|
| Produto | Vanguard Field |
| Linha de versão de trabalho | `2.x.x` em construção; o pacote atual ainda declara `1.0.0` |
| Commit avaliado | `6d7c7fb fix(v2): limpar centralizacao ao desmontar mapa` |
| Branch | `main` |
| Tag V2 candidate | Não criada |
| Release pública | Somente `v1.0.0-rc.2`, da linha anterior |
| Status | `NOT READY / BLOCKED` |

O commit indicado é o snapshot documental atual de `main`; ele não deve ser chamado de release candidate publicado. Uma candidate real exigiria decisão explícita, tag própria, artefatos correspondentes, notas e os gates descritos em `MOBILE_V2_RELEASE_STATUS.md`.

## Estado por plataforma

| Plataforma | Estado | Evidência atual | Falta para candidate verificável |
|---|---|---|---|
| Web | Build técnico aprovado | `npm run build`, testes e CI | smoke e revisão da experiência no navegador-alvo |
| PWA | Implementada | shell, Service Worker, update confirmado e cache local | instalação, modo avião, quota e reabertura físicas |
| Android debug | Compilável | `npm run mobile:android:debug`; `BUILD SUCCESSFUL` em ciclos locais | instalar, abrir e validar funções em aparelho real |
| Android release | Não configurada | nenhum signing real | keystore segura, configuração de release, build e inspeção |
| Android AAB | Artifact-only anterior | run `33121937373`, AAB não assinado | signing, inspeção do manifest e critérios de distribuição |
| iOS | Projeto sincronizado | `npm run mobile:sync:ios` no Linux | macOS, Xcode, archive, signing, IPA, instalação e teste |

## Testes e segurança

| Área | Resultado atual | Limite |
|---|---|---|
| Testes automatizados | `npm test`: 176 aprovados, 0 falhas | não substitui aparelho, sensor ou modo avião |
| Build | aprovado no commit avaliado | não é release |
| Service Worker | sintaxe e contratos aprovados | não prova quota/cobertura offline física |
| Auditoria de produção | 0 vulnerabilidades reportadas no último gate | não é auditoria completa de segurança operacional |
| Privacidade | dados locais por padrão, sem telemetria/sincronização automática | revisão física e operacional pendente |
| Escopo civil | GPS, mapa, trilha, MGRS, preparação, compartilhamento manual e cleanup de callbacks do mapa | GPS não transmite; Socorro não confirma entrega/resgate |
| Legado | wiki/ambiente virtual de Arma 3 isolado, somente videogame/testes | não adaptar para ambientes ou operações reais |

## Artifacts conhecidos

O workflow móvel artifact-only já provou a geração, sem publicação, de um APK debug e de um AAB não assinado no run `33121937373`. Os hashes registrados em `MOBILE_V2_RELEASE.md` são evidência daquele run e não devem ser atribuídos automaticamente ao snapshot atual. Nenhum artifact assinado de Android ou iOS está anexado a este registro.

A distinção operacional permanece:

```text
main / build técnico
    ↓
artifact de teste
    ↓
release candidate explicitamente criada
    ↓
signing
    ↓
instalação
    ↓
validação física
    ↓
AAB/IPA distribuível
    ↓
release pública autorizada
```

## Known issues e blockers

Ainda faltam instalação e validação em Android comum, Android recente, Xiaomi/MIUI/HyperOS, iPhone e iPad; teste de GPS externo/interno e T-005A; lifecycle e tela bloqueada; modo avião e quota de Cache Storage; bússola; Files/Share Sheet; bateria de quatro dias; configuração de signing Android; macOS/Xcode, Apple signing e IPA; inspeção de AAB assinado; atualização posterior em aparelho; e autorização de distribuição.

A precisão do GPS continua dependente do sistema, do receptor, do ambiente e do provedor. O botão Centralizar agora pede um fixo manual sem reutilizar posição em cache, mas não garante precisão dentro de prédio. As rotas de peregrinação continuam referências informativas; sem GPX/KML oficial ou autorizado, não há navegação de rota oficial.

## Gates antes de criar uma candidate real

Uma candidate V2 só poderá ser criada depois de confirmar o commit-alvo, a versão e as notas; executar testes/build/auditoria; revisar permissões e privacidade; gerar artifacts identificados; obter signing quando a distribuição for pretendida; executar instalação e validação física conforme `MOBILE_V2_DEVICE_MATRIX.md`; e registrar falhas, hashes e decisão de publicação. A ausência de macOS/Xcode ou de aparelhos reais deve permanecer `BLOCKED`, nunca ser convertida em `VERIFIED`. O cleanup da centralização manual está implementado e coberto por testes locais, mas ainda precisa de validação física de lifecycle, tela bloqueada e Wake Lock.

## Documentos relacionados

- `docs/adr/ADR-0028-cleanup-centralizacao-manual.md` — decisão e limites do cleanup assíncrono.
- `MOBILE_V2_RELEASE_STATUS.md` — estado operacional dos gates.
- `MOBILE_V2_BUILD_MATRIX.md` — build e artifacts.
- `MOBILE_V2_DEVICE_MATRIX.md` — aparelhos e casos físicos.
- `DEVICE_CAPABILITIES.md` — capacidades por plataforma, hardware, permissão e fallback.
- `docs/BUILD-VS-RELEASE.md` — separação entre build, artifact, candidate e release.
- `docs/RELEASE-1.0.0.md` — candidate histórica `v1.0.0-rc.2`, não reutilizada como V2.
