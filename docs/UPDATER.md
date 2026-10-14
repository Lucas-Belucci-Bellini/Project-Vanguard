# Updater — o Vanguard avisa, o GitHub distribui

> **O objetivo:** transformar *"preciso entrar no GitHub para atualizar"* em
> *"o próprio Vanguard me avisou que a 1.5.0 está disponível"*.

O GitHub continua sendo a infraestrutura de release. Ele deixa de ser a
interface.

---

## O defeito que existia: o updater nunca detectou nada

O aplicativo já tinha um verificador de atualização — e ele **nunca funcionou**,
em nenhuma versão publicada.

`compararVersoes` fazia, nesta ordem:

```js
texto.replace(/^v/i, '')   // não casa: a string começa com 'm'
     .split('-', 2)        // corta no primeiro hífen
```

Com as tags reais deste projeto — **`mobile-v1.4.4`** — a base virava
`"mobile"`. Não são três números, então a versão era classificada como
**inválida**, e inválida fica abaixo de tudo:

```
releaseMaisNova({ tag_name: 'mobile-v1.4.4' }, '1.0.0')  →  false
```

Medido, não suposto. **Era por isso que descobrir uma versão nova exigia abrir
o GitHub à mão.** A correção extrai a versão de dentro da tag em vez de assumir
onde ela começa.

---

## Arquitetura

```
src/core/updater/
├── semver.js        precedência SemVer 2.0.0 + prefixo de tag + canais
├── releases.js      consulta da API, normalização, checksum, escolha
├── download.js      download com progresso + verificação SHA-256
├── plataformas.js   o que Android/iOS/Web REALMENTE conseguem fazer
├── preferencias.js  canal, verificar ao iniciar, baixar automaticamente
├── index.js         o contrato — a única porta que a interface conhece
└── app.js           a instância do app (único lugar que toca globais)
```

A tela pergunta ao updater e mostra o que ele responde. Ela não sabe o que é
uma tag, um canal, um checksum ou um `Intent`.

Tudo entra por parâmetro — `fetch`, `crypto`, relógio, armazenamento,
plataforma — para que os cenários de teste rodem sem rede e sem aparelho.

---

## Fonte da versão

| | |
| --- | --- |
| **Versão instalada** | `package.json` → `__APP_VERSION__` (injetado pelo Vite) → `CONFIGURACAO_APLICATIVO.versao`. Fora do build, `0.0.0-sem-build`, que **não finge um número**. |
| **Versão disponível** | API do GitHub: `/repos/<repo>/releases?per_page=20`. |

Nunca: nome de arquivo, texto de interface, cache antigo, número digitado à mão.

### Por que a API e nunca o HTML

O HTML do GitHub muda sem aviso e sem versionamento. Um raspador quebra em
silêncio num dia qualquer e o app volta a não saber de atualização nenhuma —
exatamente o estado do qual estamos saindo.

### Toda URL é conferida

A resposta da API é dado externo. Um `browser_download_url` apontando para
outro host levaria o operador a baixar um APK de origem desconhecida — o ataque
que o updater deveria evitar. Cada URL passa por `urlOficial`: só `https`, só o
host do GitHub, só dentro do caminho deste repositório. Há teste com uma release
maliciosa.

---

## Semver

Precedência conforme SemVer 2.0.0, incluindo os casos que ordem de string erra:

| Comparação | Resultado | Por quê |
| --- | --- | --- |
| `1.0.0-alpha.2` < `1.0.0-alpha.10` | numérico | identificador só de dígitos compara como NÚMERO |
| `1.0.0-alpha.beta` > `1.0.0-alpha.1` | alfanumérico vence | numérico tem precedência MENOR |
| `1.0.0-alpha` < `1.0.0-alpha.1` | mais campos vence | prefixo igual |
| `1.0.0-rc.1` < `1.0.0` | pré-lançamento é menor | |
| `1.4.4+abc` = `1.4.4+zzz` | build metadata ignorado | por especificação |

---

## Canais

`stable` · `beta` · `alpha`. O canal **sai do pré-lançamento da versão**, não de
um campo à parte: `2.0.0-beta.1` é beta por construção, e oferecê-la como
estável seria mentir sobre o que ela é.

- quem assina `stable` recebe só `stable`;
- quem assina `beta` recebe `beta` **e** `stable` — não faria sentido perder
  correções por ter escolhido testar;
- pré-lançamento que não nomeia canal conhecido cai em `alpha`, o mais restrito.

O padrão é `stable`.

---

## Checksum

**Download completo não é download confiável.** Proxy que injeta, CDN que serve
versão errada, disco que corrompe — e o caso que importa, alguém trocando o
arquivo no caminho.

```
download → SHA-256 → comparar com o SHA256SUMS publicado → válido?
```

- **bate** → `OK`, os bytes são entregues;
- **não bate** → `CHECKSUM_INVALIDO`, e **os bytes NÃO são devolvidos**. Quem
  chama não tem como instalar por engano o que reprovou;
- **release sem checksum** → `SEM_CHECKSUM`, que **não** é sucesso. Silenciar a
  ausência da verificação seria mentir sobre o que foi conferido.

O `SHA256SUMS` publicado usa caminhos com prefixo (`mobile-artifacts/…`), então
a comparação é pelo nome do arquivo.

---

## Plataformas — capacidade declarada, não fingida

| | Android | iOS | Web |
| --- | :-: | :-: | :-: |
| Baixar | ✅ | ❌ | ❌ |
| Verificar checksum | ✅ | ❌ | ❌ |
| **Instalar** | ❌ | ❌ | ❌ |
| Abrir página da release | ✅ | ✅ | ✅ |

### Por que o Android ainda não instala

Três coisas faltam, e **nenhuma é contornável** (item 12 do pedido: *"Não criar
workaround para ignorar isso"*):

1. `AndroidManifest.xml` **não declara `REQUEST_INSTALL_PACKAGES`** — sem ela o
   Android não deixa um app iniciar a instalação de outro;
2. não há **`FileProvider`** nem plugin de sistema de arquivos, então o app não
   tem onde gravar o APK de modo que o instalador do sistema o leia;
3. a pipeline publica **APK debug** e **AAB não assinado** — nenhum é artefato
   de produção, e a atualização precisa manter a continuidade de assinatura
   exigida pelo Android.

Fingir que instala e falhar no aparelho seria pior que não oferecer: o operador
ficaria sem saber se atualizou. A tela `#/atualizacoes` lista essas limitações,
e o Diagnóstico as repete.

**Quando isso for habilitado**, basta `updaterAndroid({ podeInstalarNativamente: true })`
— a interface passa a oferecer o passo sem que o resto do updater mude.

### iOS e Web

iOS: distribuição por App Store/TestFlight; o fluxo de APK não se aplica, e
este repositório ainda não publica artefato iOS. Web: a atualização é do
service worker, que é outro caminho e já existe — **nunca** se tenta instalar
APK ali.

---

## Comportamento offline

O updater é **opcional** e nunca é requisito para o app abrir.

- sem rede → estado `SEM_INTERNET`, sem sequer tentar a requisição;
- GitHub fora do ar → estado `ERRO`, com o detalhe;
- release removida → `ERRO`;
- toda falha vira **estado**, nunca exceção que suba.

Mapa, GPS, bússola, trilhas e modo offline continuam funcionando em todos esses
casos.

---

## Nada é instalado sem consentimento

Padrão conservador (item 20 e item 15):

| Preferência | Padrão |
| --- | --- |
| Verificar ao iniciar | ligado (é barato) |
| Baixar automaticamente | **nunca** |
| Canal | **estável** |

`somente wi-fi` só libera quando a plataforma **afirma** que a conexão não é
celular. Sem essa informação a resposta é não — `effectiveType` mede
velocidade, não meio físico, e usá-lo mandaria baixar em dados móveis.

---

## Metadata da release

Cada release publica, além do APK e do AAB:

| Arquivo | Para quem |
| --- | --- |
| `SHA256SUMS` | verificação de integridade (gerado por último, cobrindo todos os artefatos) |
| `BUILD-MANIFEST.txt` | leitura humana |
| `release-metadata.json` | **o updater** — estruturado de propósito |

```json
{
  "product": "Vanguard Field",
  "version": "1.5.0",
  "tag": "mobile-v1.5.0",
  "channel": "stable",
  "commit": "…",
  "platforms": {
    "android": { "artifact": "…", "sha256": "…", "bytes": 0,
                 "signing_cert_sha256": "…", "build_type": "debug",
                 "production_signed": false },
    "ios": { "artifact": null, "reason": "…" }
  }
}
```

O `channel` sai do pré-lançamento da versão — a mesma regra do
`updater/semver.js`, para os dois não divergirem.

A convenção de tags **`mobile-v*` foi preservada**: a pipeline, os artefatos,
o checksum e o manifesto continuam como estavam.

---

## Diagnóstico

**Diagnóstico → ATUALIZAÇÃO** responde "por que o app não me avisou": versão
instalada, última vista, estado, canal, última verificação, meio de conexão, e
o que a plataforma consegue fazer. Sem isso, *"não apareceu atualização"* é
indistinguível de *"não há atualização"*.

---

## Testes

| Arquivo | Cobre |
| --- | --- |
| `test/updater-semver.test.js` | a tag real do projeto, precedência da especificação, canais |
| `test/updater.test.js` | versão igual/menor/maior, beta, sem internet, erro de rede, 404, release sem APK, rascunho, checksum válido/inválido/ausente, URL maliciosa, as três plataformas, histórico |
| `test/updater-preferencias.test.js` | padrão conservador, valor inválido, persistência, corrupção, wi-fi desconhecido |

**Downgrade nunca é proposto automaticamente**: uma release mais antiga que a
instalada não é atualização, e oferecer "atualizar" para trás é como se perde
uma correção já aplicada. Ela continua no histórico, para baixar de propósito.

---

## Limitações

- **A instalação no Android não está implementada** (ver acima). O fluxo vai
  até *baixado e verificado*.
- **Não há rollback automático.** Reinstalar uma versão anterior é manual, pelo
  histórico, e esbarra na continuidade de assinatura do Android.
- **iOS não tem artefato** neste repositório.
- **Nenhum teste desta máquina prova o comportamento no aparelho.** O que
  responde por lá é o Diagnóstico do próprio app.
