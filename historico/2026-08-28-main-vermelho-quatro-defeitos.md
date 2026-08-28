# 2026-08-28 — `main` vermelho: quatro defeitos na fundação do dataset

## Ponto de partida

Retomada de sessão depois do merge do PR #3 (orquestração do ciclo de vida do dataset). O `main` tinha avançado muito desde então — checksum SHA-256 real, storage físico via IndexedDB, download em streaming, retomada HTTP por Range, checkpoints e recovery no boot.

A primeira verificação não foi escrever código novo: foi rodar `npm test` no `main` atual. Ele estava **vermelho** — quatro arquivos de teste falhando, `242 pass / 3 fail` mais dois testes cancelados.

Isso vale como aviso de método: o volume de commits em sequência rápida (vários com mensagem repetida) passou por CI sem que o vermelho fosse notado. **Rodar a suíte antes de continuar é parte da rodada, não uma formalidade.**

## Os quatro defeitos

### 1. `test/dataset-sync.test.js` não era executado

`SyntaxError: Invalid or unexpected token` na linha 318: um `\n` **literal** solto entre o último teste antigo e o primeiro teste novo — acidente de escape na emenda do arquivo.

O efeito era o pior possível: o arquivo inteiro falhava ao carregar, então as **21 provas do orquestrador — incluindo os quatro pontos de interrupção da ativação — não rodavam há commits**, sem que nada apontasse para elas especificamente. Uma varredura por `^\\[nrt]+$` em `src/` e `test/` confirmou que era a única ocorrência no repositório.

Removida a linha, o arquivo passou a carregar e revelou duas regressões reais escondidas atrás dela:

- `ativar()` virou assíncrono (`10d597e`, integração com o package storage) e dois testes ainda o chamavam de forma síncrona, lendo `.ok` de uma `Promise` — `undefined`. Corrigidos com `async`/`await`.
- o fixture de `verificarBytes` usava um checksum de **65** caracteres. A intenção do teste é um hash de formato válido e valor errado; com 65 caracteres o manifesto era rejeitado antes, por `MANIFESTO_INVALIDO`, e o teste media outra coisa. Ajustado para 64.

### 2. `dataset-package-storage.js` reportava o erro errado sem backend

O teste `rejeita datasetId vazio e bytes inválidos antes do backend` esperava `DATASET_ID_INVALIDO` e recebia `PACKAGE_STORAGE_UNAVAILABLE`.

Este era defeito **de código**, não de teste. Sem IndexedDB, a fábrica devolvia um stub cujos métodos respondiam indisponibilidade para tudo — inclusive para argumento inválido. Mas validação de argumento é função pura do argumento: um `datasetId` vazio é inválido com ou sem IndexedDB, e o chamador precisa distinguir "meu argumento está errado" de "este ambiente não tem storage físico".

A implementação real já validava na ordem certa; só o stub divergia. Os validadores foram extraídos (`validarDatasetId`, `validarBytes`) e passaram a ser compartilhados pelas duas versões da API, para que não possam divergir de novo.

### 3. `test/dataset-package-storage-resume.test.js` travava o event loop

`Promise resolution is still pending but the event loop has already resolved`, com os dois testes cancelados.

O fake do IndexedDB disparava `onsuccess` apenas em `get`. Em `put`, `delete` e `clear` devolvia a requisição sem nunca chamar o callback — e o adapter resolve a promessa **dentro** desse callback. Qualquer escrita ficava pendente para sempre. O fake ganhou um helper único que dispara `onsuccess` para toda requisição.

### 4. `test/dataset-download-resume-real.test.js` afirmava o contrato errado

`chamada.headers.get is not a function`. `criarRangeRetomada()` devolve um **objeto simples** — contrato explícito e já coberto por `dataset-download-resume.test.js`, e aceito por `fetch` como está. O teste novo assumiu uma instância de `Headers`. Corrigida a asserção, não o módulo.

## Verificações

| Verificação | Antes | Depois |
|---|---|---|
| `npm test` | 242 pass / 3 fail / 2 cancelled | **267 pass / 0 fail** |
| `npm run build` | — | aprovado |
| `node --check public/sw.js` | — | aprovado |
| `git diff --check` | — | aprovado |
| `npm audit --omit=dev --audit-level=high` | — | 0 vulnerabilidades |

Os 25 testes a mais não são cobertura nova: são os testes que já existiam e não estavam rodando.

## Limite desta rodada

Nenhuma funcionalidade foi adicionada. Um único defeito de código foi corrigido (ordem de validação no `package storage`); os outros três eram testes que não exerciam o que diziam exercer.

Nada aqui altera o estado dos bloqueios: continua sem fonte licenciada para redistribuição, sem pacote real, sem prova de durabilidade física, sem validação em aparelho, sem signing e sem release.

## Próximo gargalo

Antes de mais código: entender por que o `main` ficou vermelho sem ninguém ver. O CI roda e reporta, mas o vermelho não interrompeu a sequência de commits. Vale checar se o workflow está falhando o job corretamente em push de agente e se há alguma proteção de branch a configurar.

Depois disso, a fila anterior continua válida: promoção/rollback físico transacional, e só então dataset cartográfico concreto com licença resolvida.
