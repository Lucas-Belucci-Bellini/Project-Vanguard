# `#/atualizacoes` — Atualizações

**Estado:** `IMPLEMENTED`

## Objetivo

Substituir "abrir o navegador → GitHub → Releases → procurar a versão → baixar
o arquivo" por uma função do próprio aplicativo. O GitHub continua sendo a
infraestrutura de distribuição; ele deixa de ser a interface.

## Entrada

Nenhuma entrada do usuário é obrigatória. As preferências (canal, verificar ao
iniciar, baixar automaticamente) são lidas de `vanguard:updater-preferencias`.

## Dados necessários

| Dado | Origem | Sem ele |
| --- | --- | --- |
| Versão instalada | `CONFIGURACAO_APLICATIVO.versao`, do `package.json` pelo build | `0.0.0-sem-build`, que não finge um número |
| Releases publicadas | API do GitHub (`/releases?per_page=20`), **nunca** HTML | estado `SEM_INTERNET` ou `ERRO`; a tela continua mostrando a versão instalada |
| Checksum | asset `SHA256SUMS` da release | resultado `SEM_CHECKSUM` — não é tratado como sucesso |

## Dependências

`src/core/updater/` (semver, releases, download, plataformas, preferências).
Nenhuma dependência nova de npm.

## Ações

| Ação | O que faz |
| --- | --- |
| VERIFICAR AGORA | consulta as releases e atualiza o estado |
| BAIXAR `<versão>` | baixa com progresso e **verifica o SHA-256** antes de declarar sucesso |
| CANCELAR | aborta o download em andamento; nada é instalado |
| VER NOTAS DA VERSÃO | abre a página oficial da release |
| Canal / Verificar ao iniciar / Baixar automaticamente | preferências, com padrão conservador |

## Saídas

Estado (`ATUALIZADO`, `NOVA VERSÃO DISPONÍVEL`, `SEM INTERNET`, `ERRO AO
CONSULTAR`, `NUNCA VERIFICADO`), versão instalada e disponível, última
verificação, histórico de releases, e o resultado do download.

## Estados

- **LOADING** — `VERIFICANDO…` enquanto a consulta corre; a tela já mostra o
  que sabe, e a abertura nunca espera a rede.
- **SUCCESS** — estado e histórico preenchidos.
- **EMPTY** — "Nenhuma release conhecida ainda", com o caminho para verificar.
- **ERROR** — `ERRO AO CONSULTAR`, com o detalhe do erro na tabela.
- **UNAVAILABLE** — a seção "O QUE ESTA PLATAFORMA AINDA NÃO FAZ" lista as
  limitações reais em vez de oferecer um botão que falharia.

## Limitações

- **O aplicativo não instala o APK.** Falta `REQUEST_INSTALL_PACKAGES`, um
  `FileProvider` e um plugin nativo de instalação; e a pipeline publica APK
  debug e AAB não assinado, que não são artefatos de produção. A tela diz isso.
- **iOS não baixa artefato**: a distribuição passa por App Store/TestFlight, e
  o fluxo de APK não se aplica.
- **Web não tenta instalar APK**: ali a atualização é do service worker.
- **Nada é instalado sem confirmação** e nada baixa sozinho por padrão.

## Testes

`test/updater-semver.test.js` (9), `test/updater.test.js` (23) e
`test/updater-preferencias.test.js`. Cobrem versão igual/menor/maior, beta,
erro de rede, checksum inválido, release sem APK, release indisponível,
rascunho, URL fora do repositório oficial e as três plataformas.
