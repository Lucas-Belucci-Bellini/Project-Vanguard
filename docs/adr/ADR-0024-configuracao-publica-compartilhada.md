# ADR-0024 — configuração pública compartilhada

- **Status:** Aceita
- **Data:** 2026-08-27
- **Escopo:** identidade do app e atualização PWA/Capacitor

## Contexto

A versão atual e as URLs oficiais de atualização estavam declaradas diretamente no módulo de atualização. O diagnóstico também montava o nome e a versão do aplicativo em uma string própria. Essa duplicação poderia fazer uma tela indicar uma identidade diferente da usada pelo fluxo de atualização.

## Decisão

Criar `src/core/configuracao.js` como contrato público, pequeno e imutável. Ele concentra nome, application ID, versão, repositório e URLs oficiais de release. `src/core/atualizacao.js` passa a consumir o contrato, mas preserva as exportações `VERSAO_ATUAL`, `URL_RELEASES` e `URL_RELEASE_MAIS_RECENTE` para não quebrar consumidores existentes. O diagnóstico passa a usar o mesmo nome e a mesma versão.

A configuração contém somente valores públicos e não é um local para API keys, tokens, credenciais, keystore, certificados ou segredos de ambiente. Os identificadores nativos de Capacitor continuam nos arquivos nativos e só devem ser alterados por decisão formal; esta unidade não tenta substituir a configuração Android/iOS.

A validação de URLs continua restrita a HTTPS, ao host GitHub oficial e ao caminho do repositório oficial. A configuração central não transforma a atualização em instalação automática: o PWA continua exigindo confirmação e o APK continua abrindo a página oficial para a confirmação do sistema.

## Consequências

A identidade pública usada pelo diagnóstico e pela atualização passa a ter uma fonte compartilhada e testável. O contrato fica disponível para Web/PWA/Capacitor sem dependência de DOM, rede ou framework. A versão do `package.json` e os valores nativos permanecem gates separados, pois a sincronização desses valores exige uma unidade de release própria.

`test/configuracao.test.js` cobre conteúdo, imutabilidade, ausência de campos de segredo e compatibilidade com as exportações do módulo de atualização. A suíte total passa a 168 testes.

## Não escopo

Não foram alterados application IDs, bundle IDs, versionCode, versionName, providers de mapa, endpoints de tile, signing, release ou workflow de publicação. Nenhum segredo foi criado ou adicionado ao repositório.
