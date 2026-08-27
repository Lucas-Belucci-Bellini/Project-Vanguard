# Comandos para a tag final `v1.0.0`

Este documento é um roteiro operacional. **Não execute os comandos de criação ou publicação da tag enquanto os gates da release não estiverem aprovados.** A tag final deve apontar para o commit exato que foi testado e aprovado, e os segredos de assinatura nunca devem ser commitados no repositório.

## 1. Pré-condições no commit aprovado

No clone local, conferir que não existem alterações e que o commit está sincronizado:

```bash
git switch main
git fetch --prune origin
git pull --ff-only origin main
git status --short --branch
git log -1 --oneline --decorate
```

Executar novamente os gates técnicos antes de marcar o commit:

```bash
npm ci
npm test
npm run build
node --check public/sw.js
npm run mobile:android:debug
```

Confirmar manualmente o checklist de hardware em [`CHECKLIST-MOBILE-V1.0.0.md`](./CHECKLIST-MOBILE-V1.0.0.md), o teste da peregrinação e a assinatura dos artefatos. Um APK debug ou AAB não assinado não pode ser promovido automaticamente a release distribuível.

## 2. Configurar assinatura local

Escolher **uma** das opções abaixo. Os comandos apenas configuram o cliente Git; eles não criam a tag.

### Opção A — assinatura GPG

Substituir `<KEYID_GPG>` por uma chave GPG local cujo certificado público possa ser verificado pelos responsáveis pela release:

```bash
git config --local user.signingkey <KEYID_GPG>
git config --local tag.gpgSign true
git config --local gpg.program gpg
gpg --list-secret-keys --keyid-format=long <KEYID_GPG>
```

### Opção B — assinatura SSH

Usar uma chave privada local protegida e publicar o respectivo `.pub` para verificação:

```bash
git config --local gpg.format ssh
git config --local user.signingkey "$HOME/.ssh/id_ed25519.pub"
git config --local tag.gpgSign true
ssh-keygen -lf "$HOME/.ssh/id_ed25519.pub"
```

A chave privada e qualquer senha devem permanecer fora do repositório, do chat e dos artifacts públicos. Se o ambiente usar um agente SSH, garantir que a chave correta esteja carregada antes da assinatura.

## 3. Criar e verificar a tag assinada

Depois da aprovação formal e com `HEAD` exatamente no commit validado:

```bash
git tag -s v1.0.0 -m "Vanguard Field v1.0.0"
git show --show-signature --stat --oneline v1.0.0
git tag -v v1.0.0
```

Não continue se `git tag -v` não mostrar uma assinatura válida e a identidade esperada. Verificar também que a tag não aponta para um commit diferente do aprovado:

```bash
git rev-parse main
git rev-list -n 1 v1.0.0
```

Os dois hashes devem ser iguais no momento da criação.

## 4. Publicar a tag e a release

Publicar a tag somente após a verificação local:

```bash
git push origin v1.0.0
```

Depois, criar a release usando as notas aprovadas e **somente artefatos assinados de produção**:

```bash
gh release create v1.0.0 \
  --verify-tag \
  --title "Vanguard Field v1.0.0" \
  --notes-file docs/NOTAS-DE-LANCAMENTO-V1.0.0.md \
  caminho/para/vanguard-field-android-release-assinado.aab \
  caminho/para/vanguard-field-ios-assinado.ipa
```

Se o processo de distribuição usar lojas, a publicação da release no GitHub e o envio às lojas continuam sendo etapas distintas. O workflow `mobile-release.yml` gera APK debug e AAB não assinado como artifacts técnicos; ele não configura keystore Android nem assina iOS.

## 5. Verificação pós-publicação

```bash
gh release view v1.0.0
git ls-remote --tags origin 'v1.0.0'
git show --show-signature --oneline v1.0.0
```

Registrar o commit, o fingerprint da assinatura, os hashes dos artefatos, os resultados dos testes físicos e a decisão de publicação. Não apagar a `v1.0.0-rc.2`; ela é um snapshot histórico e não deve ser reescrita.
