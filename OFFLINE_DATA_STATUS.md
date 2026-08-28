# Vanguard Field — Offline Data Status

> Atualizado em 2026-08-28. Este documento registra o estado real da plataforma de dados locais; não declara cobertura mundial offline.

## Estado atual

O Vanguard Field possui funcionamento local para dados da pessoa, GPS foreground, trilhas, waypoints, rotas locais, manual, preparação de socorro e exportações. O mapa possui um planner de tiles e o Service Worker mantém cache técnico de shell/tiles. Essas capacidades são diferentes de um dataset cartográfico mundial gerenciado.

A primeira camada do Global Offline Data Engine foi criada em `src/core/dataset-manifest.js`. Ela valida e normaliza o contrato mínimo de um manifesto versionado, incluindo identidade, versão, regiões, origem, licença, tamanho, checksum SHA-256, compatibilidade mínima e frescor. A máquina complementar em `src/core/dataset-transacao.js` formaliza a sequência de staging, verificação, ativação e rollback. `src/core/dataset-storage.js` acrescenta um adapter isolado para persistir manifesto ativo e transação em envelopes próprios. `src/data/fontes-dataset.js` acrescenta o gate de governança para impedir que uma camada online seja confundida com fonte de pacote. `src/core/dataset-sync.js` costura as quatro peças num ciclo de vida único, com ordem de gravação definida e reconciliação de partida para atualização interrompida. As peças são injetáveis/testáveis; não tornam o cache técnico um dataset.

| Camada | Estado | Evidência | Limite |
|---|---|---|---|
| Dados do usuário | Implementados localmente | `src/core/estado.js`, envelopes v1, testes existentes | quota, reinstalação e limpeza do SO dependem de aparelho |
| Cache técnico | Implementado | `public/sw.js`, cache de shell/tiles, planner limitado a 256 URLs | cache não é dataset mundial, nem prova de cobertura |
| Manifesto de dataset | Implementado e testado | `src/core/dataset-manifest.js`, `test/dataset-manifest.test.js`, ADR-0030 | ainda não existe pacote cartográfico gerenciado |
| Storage de dataset | Adapter isolado parcial | `src/core/dataset-storage.js`, `test/dataset-storage.test.js`, ADR-0032; chaves próprias para ativo/transação | não é storage atômico de disco, não cobre quota física ou power loss |
| Governança de fontes | Gate imutável parcial | `src/data/fontes-dataset.js`, `test/fontes-dataset.test.js`, ADR-0033; todos os critérios precisam ser confirmados | nenhum provedor atual foi aprovado para pacote offline |
| Ciclo de vida do dataset | Orquestração implementada e testada | `src/core/dataset-sync.js`, `test/dataset-sync.test.js`, ADR-0035; gate na entrada e recuperação de interrupção | não baixa, não calcula hash de bytes e não prova durabilidade física; sem interface |
| Dataset mundial | Não implementado | nenhum pacote/manifesto oficial empacotado | fonte, licença, pipeline, formato, armazenamento e distribuição |
| Busca offline de lugares | Não declarada | não há índice local mundial | só pode ser ativada com dataset/index real |
| Sync de dataset | Máquina, adapter e orquestração locais | `dataset-transacao.js`, `dataset-storage.js` e `dataset-sync.js`, testes e ADRs 0031/0032/0035 | sem endpoint, download, checksum de bytes, staging atômico físico ou pacote autorizado |

## Regras de segurança e honestidade

O app não deve baixar grandes áreas dos servidores públicos de tiles OSM nem tratá-los como backend de distribuição offline. O catálogo atual não considera nenhum provedor automaticamente autorizado a redistribuir um dataset mundial; `avaliarCatalogoFontes()` mantém `podeCriarPacote: false`. Licença, redistribuição, uso offline, uso comercial, atribuição, versão, origem, política de atualização, armazenamento e restrições precisam ser confirmados para o pacote concreto antes de incorporar dados.

O manifesto não substitui o hash de um arquivo: ele registra o checksum esperado, enquanto a futura camada de download terá de calcular e comparar o SHA-256 antes de ativar qualquer pacote. Até lá, o cache anterior continua sendo a única base técnica de tiles preparados.

Dados de mapa e dados da pessoa permanecem separados. Nenhum fluxo de atualização de mapa pode remover trilhas, waypoints, rotas, configurações ou preparação de emergência. GPS continua sendo posicionamento local; não transmite dados ao servidor de atualização.

## Próximo bloco

Com a costura fechada, o gargalo deixou de ser de código e passou a ser de origem: a próxima unidade depende de uma fonte autorizada por contrato e de um backend de storage apropriado para um pacote regional controlado. Enquanto `avaliarCatalogoFontes()` mantiver `podeCriarPacote: false`, `iniciar()` recusa qualquer transação — e nenhuma interface de download deve ser exposta. Não deve tratar `localStorage` como atomicidade física, aprovar provedor apenas por renderizar online, criar pacote mundial fictício, fazer scraping de tiles, exigir geocodificação online ou prometer roteamento offline.


## 2026-08-28 — integridade criptográfica dos bytes do dataset

A fundação de sync foi estendida com `src/core/dataset-integridade.js`, usando Web Crypto SHA-256 sobre os bytes reais recebidos. O orquestrador ganhou `verificarBytes(bytes)`, que calcula o digest antes de chamar a verificação de tamanho/checksum e registra falha na transação quando os bytes não correspondem ao manifesto. Foram adicionados testes para Uint8Array, ArrayBuffer, DataView, checksum válido, divergente e ambiente sem Web Crypto.

Esta unidade **não baixa nem armazena** o pacote e não prova durabilidade física. Ela fecha somente a lacuna de cálculo real de checksum; download, endpoint, staging físico, quota, power-loss recovery e fonte cartográfica licenciada continuam pendentes.



## 2026-08-28 — storage físico de pacote iniciado

Foi criado `src/core/dataset-package-storage.js`, um adapter assíncrono sobre IndexedDB dedicado exclusivamente aos bytes do pacote de dataset. Ele separa o artefato físico do manifesto/transação e dos dados do usuário, oferece salvar/ler/remover/limpar e reporta indisponibilidade e quota. Testes de contrato cobrem ambientes sem IndexedDB, validação de entrada e diagnóstico.

**Limite:** esta unidade não é prova de atomicidade de disco, durabilidade contra power loss, quota física garantida nem teste em aparelho real. A integração final com o orquestrador deve ocorrer depois de validar o contrato físico no runtime alvo.


## 2026-08-28 — integração do pacote físico ao sync

O `dataset-sync` agora aceita um `packageStorage` injetável. A nova operação `armazenarBytes(bytes, metadata)` grava o artefato no storage físico dedicado e só avança para STAGING depois da verificação SHA-256 real. Na ativação, quando o storage físico foi fornecido, o pacote é relido e sua integridade/tamanho são conferidos novamente antes de gravar o manifesto ativo.

Isso fecha a costura lógica entre transação, bytes físicos, integridade e ativação. Não é prova de durabilidade contra power loss nem de quota física em aparelhos reais; esses itens continuam como validação de runtime/hardware.
