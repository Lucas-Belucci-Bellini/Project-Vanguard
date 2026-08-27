# Build não é release

## Regra do Vanguard Field

No Vanguard Field, **build** é a compilação técnica de um estado do código. Ele serve para verificar testes, gerar `dist/`, produzir um APK debug ou um AAB não assinado e permitir instalação/teste interno. Um build pode existir sem ser distribuído publicamente e não deve ser tratado como uma versão oficial do produto.

**Release** é uma publicação intencional de uma versão identificada. Ela precisa de uma tag apropriada, notas de versão, artefatos selecionados, validação dos gates e decisão explícita de distribuição. A existência de um APK debug, de um preview Vercel ou de um workflow verde não cria por si só uma release.

## Padrão observado no Baluarte

O Baluarte separa a validação contínua dos workflows de CI dos workflows de publicação. O fluxo móvel gera APK debug e AAB release não assinado, envia esses arquivos como artefatos e só anexa arquivos a uma Release quando uma tag `mobile-v*` ou uma ação manual com `publish_tag` solicita essa publicação. O fluxo desktop também verifica a versão do pacote contra a tag antes de publicar instaladores.

Esse padrão será aplicado ao Vanguard sem copiar nomes ou comandos desnecessários. O CI continuará validando testes e build. Um workflow móvel independente poderá gerar artefatos de teste sem publicar release. Outro workflow, disparado por tag de release móvel ou por ação manual explícita, fará a publicação pré-release e verificará a versão antes de anexar arquivos.

## Estados e nomes

| Estado | Exemplo | Pode ser chamado de release? |
|---|---|---|
| Código integrado | `main` | Não. |
| Build web | `npm run build` e diretório `dist/` | Não. |
| APK debug | `app-debug.apk` | Não; é artefato de teste. |
| AAB não assinado | `app-release.aab` | Não; precisa de assinatura antes da loja. |
| Release candidate | `mobile-v1.0.0-rc.1` | Sim, como pré-release explicitamente rotulada. |
| Release final | `mobile-v1.0.0` | Sim, somente após os gates de distribuição. |

## Contrato operacional

Toda mudança de código deve ser validada e publicada em `main` por commit ou pull request. Isso não deve criar uma release automaticamente. Uma release só deve ser criada quando o usuário ou o processo de lançamento solicitar uma tag de release, os checks estiverem verdes e os artefatos forem identificados como debug, não assinado ou distribuível.

O APK debug atual continua disponível para testes locais. O iOS permanece dependente de macOS, Xcode, conta Apple e assinatura; gerar o projeto Capacitor ou executar build web não equivale a publicar uma IPA.

## Prova operacional em `main`

Em 2026-08-27, a execução manual [33030058663](https://github.com/Lucas-Belucci-Bellini/Project-Vanguard/actions/runs/33030058663) foi disparada sobre `main` com `version=1.0.0` e sem `publish_tag`. O workflow terminou com sucesso, gerando os artifacts `vanguard-android-debug-apk` e `vanguard-android-release-aab-unsigned`. A etapa **Publicar release explicitamente solicitada** foi pulada, e a lista do GitHub continuou contendo apenas a pré-release `v1.0.0-rc.2`. Esta é a separação operacional desejada: build/artifacts podem ser produzidos sem criar uma release.
