---
name: vanguard-field-release-ops
description: Manutenção, teste de campo e release do Vanguard Field/Project-Vanguard. Use quando precisar evoluir o app civil offline-first, validar GPS/MGRS, preparar testes de peregrinação, atualizar documentação, implementar atualização confirmada no PWA/APK, publicar mudanças em main ou preparar a tag v1.0.0 sem confundir build, artifact e release.
---

# Vanguard Field — operações de desenvolvimento e release

## Objetivo

Aplicar um fluxo seguro e reproduzível para evoluir o `Project-Vanguard` como ferramenta civil de navegação offline-first. Preservar a distinção entre código em `main`, build técnico, artifact de teste, release candidate e release publicada. Tratar GPS como posicionamento local e Socorro como preparação/compartilhamento manual, nunca como resgate automático.

## Fluxo obrigatório

1. **Auditar antes de editar.** Executar `git status --short --branch`, `git log -5 --oneline --decorate`, `git fetch origin main` e conferir `git status`. Ler os arquivos diretamente afetados e o contrato em `docs/BUILD-VS-RELEASE.md` e `docs/RELEASE-1.0.0.md`.
2. **Classificar a mudança.** Identificar se é código, documentação, build, artifact, candidate ou release. Não criar tag, release, pagamento, integração externa ou comunicação de emergência sem pedido explícito e sem os gates correspondentes.
3. **Implementar localmente.** Manter lógica geográfica e contratos puros em `src/core/` ou `src/engine/`; manter DOM em `src/pages/`. Atualizar tutorial/README e adicionar testes determinísticos para cada comportamento novo.
4. **Validar.** Executar `npm test`, `npm run build`, `node --check public/sw.js` e `git diff --check`. Se tocar no fluxo móvel ou em arquivos consumidos pelo Capacitor, executar `npm run mobile:android:debug`; chamar o APK de debug/test artifact, nunca de release.
5. **Publicar em main.** Revisar `git diff --stat` e `git diff --check`, criar commit descritivo, executar `git push origin main`, aguardar o CI e confirmar `git status --short --branch` limpo. Não usar `publish_tag` no workflow para mudanças normais.
6. **Relatar com precisão.** Informar commit, CI, testes e limitações. Listar explicitamente o que está implementado, preparado, dependente de fonte/hardware e não simulado.

## GPS, MGRS, bateria e campo

- Mostrar latitude/longitude, precisão, MGRS, rumo, distância e idade do último fixo. Nunca tratar uma posição antiga como atual.
- Usar o perfil econômico em Cidade/pausa e o perfil de maior precisão apenas em rota ativa. `maximumAge` não é intervalo garantido: a frequência efetiva pertence ao sistema operacional.
- Não prometer rastreamento contínuo em background no Android/iOS. Xiaomi/MIUI/HyperOS pode encerrar processos; iOS exige validação em Mac/Xcode e configuração nativa específica.
- Antes de uma caminhada longa, preparar tiles online, testar modo avião com Wi-Fi desligado, fechar e reabrir o app, conferir shell/manual/dados/mapas e medir bateria no aparelho real. Levar powerbank testado e comunicação independente.
- Usar GPX para troca de trilha/waypoints e JSON versionado para backup nativo. Importar somente arquivo conhecido, confirmar a substituição e verificar que a rota fica pausada.

## Atualização do aplicativo

- No PWA, manter o service worker novo em `waiting` até o usuário tocar no botão de atualização e confirmar. Usar mensagem `SKIP_WAITING`, aguardar `controllerchange` e recarregar.
- No APK Capacitor, não alegar auto-instalação: o app deve abrir a página oficial da release, e o sistema operacional deve pedir a confirmação de download/instalação. Não baixar nem executar APK silenciosamente.
- Consultar release oficial somente com rede; se estiver offline, ocultar o botão e manter o uso local. Aceitar apenas URLs HTTPS oficiais do repositório.
- Incrementar a versão da aplicação para hotfix/feature (`v1.0.1`, por exemplo); uma release com a mesma versão não deve ser tratada como atualização nova. Testar o botão com uma release posterior controlada.

## Socorro e simulação

- Testar somente com um fixo real, pacote local e contato previamente avisado ou aplicativo de notas.
- Verificar MGRS, latitude/longitude, precisão e horário; preparar alerta local; abrir compartilhamento; confirmar conteúdo; cancelar o registro.
- Nunca usar número de emergência, canal público, rádio de emergência ou botão SOS real de mensageiro satelital em simulação.
- Repetir em toda documentação: GPS posiciona; não transmite. Compartilhar/copiar não confirma entrega e não aciona equipe.

## Release final

Não criar `v1.0.0` apenas porque o build passou. Exigir hardware real Android/Xiaomi/iPhone, permissões, offline real, cache, bateria, ciclo de vida, acessibilidade, importação/exportação, Socorro manual, assinatura Android e assinatura iOS. A tag final deve apontar para o commit aprovado.

### Assinatura GPG

```bash
git config --local user.signingkey <KEYID_GPG>
git config --local tag.gpgSign true
git config --local gpg.program gpg
git tag -s v1.0.0 -m "Vanguard Field v1.0.0"
git tag -v v1.0.0
git push origin v1.0.0
gh release create v1.0.0 --verify-tag --title "Vanguard Field v1.0.0" --notes-file docs/NOTAS-DE-LANCAMENTO-V1.0.0.md caminho/para/artefato-assinado.aab caminho/para/artefato-assinado.ipa
```

Substituir `<KEYID_GPG>` somente por uma chave local autorizada. Nunca adicionar chave privada, keystore ou senha ao repositório.

### Assinatura SSH

```bash
git config --local gpg.format ssh
git config --local user.signingkey "$HOME/.ssh/id_ed25519.pub"
git config --local tag.gpgSign true
git tag -s v1.0.0 -m "Vanguard Field v1.0.0"
git tag -v v1.0.0
git push origin v1.0.0
```

Usar `gh release create` somente depois da verificação da tag e com artefatos de produção assinados. O workflow móvel padrão pode produzir APK debug e AAB não assinado; isso não é distribuição final.

## Documentos de referência no repositório

- `docs/BUILD-VS-RELEASE.md`: diferença entre build, artifact, candidate e release.
- `docs/RELEASE-1.0.0.md`: gates e bloqueios da versão final.
- `docs/COMANDOS-TAG-V1.0.0.md`: comandos detalhados para assinatura e publicação.
- `docs/CHECKLIST-MOBILE-V1.0.0.md`: validação física Android/iOS.
- `docs/OPERACAO-BATERIA-GPS-4-DIAS.md`: operação de bateria e GPS na caminhada.
- `docs/SIMULACAO-MODO-SOCORRO.md`: simulação sem acionamento real.
- `docs/PLANO-TESTE-PEREGRINACAO-CAMINHOS-DOS-ANJOS-2026-09.md`: teste de campo.
- `presentation-v1.0.0/slide_notes.md`: roteiro falado dos slides.
