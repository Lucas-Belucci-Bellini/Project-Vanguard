# ADR-0030 — manifesto versionado de dataset offline

- **Status:** Aceita
- **Data:** 2026-08-28
- **Escopo:** primeira camada do Global Offline Data Engine

## Contexto

O Vanguard Field já possui um fluxo offline real, porém limitado e honesto: o `src/core/mapa-offline.js` planeja até 256 URLs raster da janela visível e o `public/sw.js` mantém um cache técnico de shell e tiles. Esse fluxo não possui identidade de dataset, versão, regiões, checksum, compatibilidade com o aplicativo, staging, ativação atômica ou rollback.

O novo objetivo exige uma arquitetura incremental para dados cartográficos locais. Entretanto, o repositório ainda não contém um dataset mundial versionado, pipeline de processamento, infraestrutura própria de distribuição nem comprovação de licença para redistribuição offline das fontes atuais. Não seria correto transformar o cache de tiles em “mapa mundial offline” ou baixar grandes áreas de servidores públicos de tiles.

## Decisão

Criar `src/core/dataset-manifest.js` como contrato puro para validar e normalizar um manifesto de dataset. A versão inicial exige:

| Campo | Regra |
|---|---|
| `schema` e `manifestVersion` | identificam o contrato suportado |
| `datasetId` e `version` | identificam o dataset sem aceitar identificadores arbitrários |
| `formatVersion` | controla compatibilidade do formato de dados |
| `createdAt` e `updatedAt` | datas UTC canônicas e consistentes |
| `source` e `license` | origem e situação de licença explícitas |
| `checksum` | SHA-256 hexadecimal de 64 caracteres |
| `minimumAppVersion` | compatibilidade mínima com o app |
| `regions` | regiões sem IDs repetidos, tamanho não negativo e checksum próprio |

O mesmo módulo classifica o frescor como `CURRENT`, `STALE` ou `UNKNOWN`. Versão diferente, idade acima do limite ou data futura não são ocultadas. Manifestos inválidos retornam `UNKNOWN` e não podem ser ativados.

A decisão é deliberadamente limitada. O módulo não faz rede, não lê ou grava `localStorage`, não baixa pacotes, não calcula hash de arquivo, não altera o Service Worker e não instala um segundo sistema de offline. Essas responsabilidades só devem ser adicionadas após fonte, licença, formato, armazenamento e backend aprovados.

## Separação de responsabilidades

O cache técnico atual continua sendo tratado pelo Service Worker. Dados do usuário continuam no store oficial de `src/core/estado.js`, sob envelopes versionados. Um futuro dataset gerenciado deve ocupar uma camada separada, com manifestos, regiões, staging e histórico próprios; atualizar mapa não pode apagar trilhas, waypoints, rotas, configurações ou preparação de emergência.

A fonte pública de camadas em `src/data/camadas-mapa.js` continua sendo um catálogo de provedores raster/overlay para renderização. Ela não é declaração de direito de redistribuição offline, não é manifesto e não prova cobertura mundial.

## Evidência e limites

`test/dataset-manifest.test.js` cobre manifesto válido, schema/campos inválidos, regiões duplicadas, tamanho negativo, datas invertidas, normalização sem mutação e classificação de frescor. Os testes provam validação determinística do contrato, não a existência de um dataset mundial, a licença de uma fonte, a integridade de um arquivo baixado ou a disponibilidade offline em dispositivo.

O próximo bloco independente deve ser escolhido somente após auditar armazenamento, fonte/licença e estratégia de pacote. Nenhum estado `WORLD MAP OFFLINE READY`, `DATASET VERIFIED` ou equivalente deve ser exibido com base neste ADR ou no cache atual.
