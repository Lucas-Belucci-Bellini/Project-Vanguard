# ADR-0042 — assinatura fixa do APK e identidade visual do aplicativo

- **Status:** Aceita
- **Data:** 2026-08-31
- **Escopo:** `android/keystore/`, `android/app/build.gradle`, ícones e splash, workflow de release

## Contexto

A 1.2.0 não instalou por cima da 1.1.0: o Android recusou por **conflito de
assinatura**. Não foi hipótese — os dois APKs publicados foram baixados e o
certificado de cada um foi extraído do APK Signing Block (esquema v2):

| versão | SHA-256 do certificado |
|---|---|
| 1.1.0 | `53:B4:AE:35:2F:BF:F8:A0…` |
| 1.2.0 | `1E:AE:00:81:F8:26:0A:72…` |

A causa: `android/app/build.gradle` **não tinha bloco `signingConfigs`**. Sem
ele, o Gradle assina o build de debug com `~/.android/debug.keystore` — e como
esse arquivo não existe num runner efêmero do GitHub Actions, o Gradle **cria
uma chave nova em cada execução**. Toda release saiu assinada por uma chave
diferente, e o Android trata mudança de assinatura como aplicativo diferente
tentando se passar pelo instalado.

O modo de falha era invisível: a build ficava verde, o APK ficava íntegro, e o
problema só aparecia no aparelho de quem tentava atualizar.

## Decisão

### 1. Uma chave de debug fixa, versionada no repositório

`android/keystore/vanguard-debug.keystore`, alias `androiddebugkey`, senha
`android` — as credenciais padrão do Android —, válida até 2056, com impressão
`D0:10:0B:FD:DF:7C:3E:85…`. O `signingConfigs.debug` aponta para ela e o tipo
`debug` passa a usá-la.

**Sim, a chave é pública, e o repositório também.** O que isso permite: alguém
pode assinar um APK que o Android aceitaria como atualização de
`com.projectvanguard.field`. O que isso não permite: nada na Play Store — a
loja **recusa** qualquer artefato assinado com chave de debug, então esta chave
não tem como virar a de produção por descuido.

A alternativa segura seria um segredo do GitHub com a chave em base64. Ela foi
descartada **para esta versão** por um motivo de prazo, não de engenharia: o
teste de campo é em três dias e o segredo depende de uma ação manual do
operador. Quando houver publicação de verdade, a chave de release será um
segredo e este arquivo continua sendo só o que ele diz ser.

**Consequência que não dá para evitar:** a 1.3.2 ainda é a primeira com a chave
nova, então **ela exige uma desinstalação**. É a última: da 1.3.2 em diante toda
build deste repositório assina igual e atualiza por cima.

### 2. O AAB continua não assinado

Ele existe para publicação futura, e publicação usa chave própria. Assiná-lo
com a chave de debug transformaria um artefato de loja em algo que a loja
recusa — pior que não assinar, porque parece pronto.

### 3. A impressão da assinatura entra no manifesto da build

O workflow extrai o certificado do APK com `apksigner` e grava
`apk_signing_cert_sha256=…` no `BUILD-MANIFEST.txt` publicado junto da release.
"Esta versão instala por cima da anterior?" passa a ser uma pergunta que se
responde comparando dois arquivos de texto, sem precisar do aparelho.

O campo `signed_android` deixa de ser `false` e passa a `debug-key-fixa` — era
`false` quando a chave era descartável, e continuar assim seria mentira em outra
direção.

### 4. Identidade visual própria

O ícone e a splash eram os padrões do Capacitor: um X azul, e a splash sobre
**fundo branco** — um flash de tela branca antes de um aplicativo escuro abrir,
exatamente o oposto do que serve numa estrada à noite.

O ícone novo é a marca do próprio app: o **V** de Vanguard dentro de um bezel de
bússola com os quatro pontos cardeais, sobre a grade e o verde-fósforo de
`src/styles/variables.css` (`--color-bg: #0c0f0a`, `--color-cyan: #8bff3f`) —
os mesmos tokens da interface, para o ícone e a tela serem a mesma coisa.

Gerado por `android/logo/icone.mjs` a partir de um desenho vetorial único, em
todas as densidades: camadas do ícone adaptativo (108 dp), ícones legados
(48–192 px), `monochrome` para o ícone temático do Android 13+, splash retrato e
paisagem, e um PNG de 512 px para loja. Regenerar é `node android/logo/icone.mjs`.

**A regra que o desenho respeita:** o ícone adaptativo tem 108 dp de camada, mas
só o círculo central de **66 dp** é garantido — o resto é cortado por máscaras
que variam por launcher. A primeira versão do desenho passava disso: os traços
cardeais tinham ponta arredondada, e meia espessura de traço somada ao raio
levava o conteúdo a **33,88 dp**, além do limite. Foi medido lendo os pixels do
PNG, não olhando: o desenho final fica em **32,38 dp**.

## Como isto foi verificado

- Certificados dos APKs 1.1.0 e 1.2.0 extraídos do APK Signing Block por um
  parser próprio do formato (o APK moderno não guarda `.RSA` em `META-INF`), o
  que **confirmou a causa** em vez de supô-la.
- Raio máximo do conteúdo do ícone medido pixel a pixel: 32,38 dp contra os 33
  do círculo seguro.
- Ícone renderizado sob as quatro máscaras que os launchers aplicam — círculo,
  squircle, quadrado arredondado e quadrado — e conferido a 48 px, o tamanho
  real na gaveta de aplicativos.
- A conferência que **só a build fecha**: o certificado do APK 1.3.2 publicado
  precisa bater com `D0:10:0B:FD:DF:7C:3E:85…`. Este ambiente não tem SDK
  Android, então o APK é montado no CI e a conferência é feita sobre o artefato
  publicado.

## Limites assumidos

- A chave de debug é pública. Ver decisão 1.
- A 1.3.2 ainda exige uma desinstalação; o benefício começa na próxima.
- Um `cap sync` não regenera ícones (isso é `@capacitor/assets`, que o projeto
  não usa), então os arquivos gerados sobrevivem à sincronização — mas quem
  rodar `@capacitor/assets` um dia vai sobrescrevê-los. A fonte é
  `android/logo/`.
