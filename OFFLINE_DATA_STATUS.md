# Vanguard Field — Offline Data Status

> Atualizado em 2026-08-28. Este documento registra o estado real da plataforma de dados locais; não declara cobertura mundial offline.

## Estado atual

O Vanguard Field possui funcionamento local para dados da pessoa, GPS foreground, trilhas, waypoints, rotas locais, manual, preparação de socorro e exportações. O mapa possui um planner de tiles e o Service Worker mantém cache técnico de shell/tiles. Essas capacidades são diferentes de um dataset cartográfico mundial gerenciado.

A primeira camada do Global Offline Data Engine foi criada em `src/core/dataset-manifest.js`. Ela valida e normaliza o contrato mínimo de um manifesto versionado, incluindo identidade, versão, regiões, origem, licença, tamanho, checksum SHA-256, compatibilidade mínima e frescor. A máquina complementar em `src/core/dataset-transacao.js` formaliza a sequência de staging, verificação, ativação e rollback. `src/core/dataset-storage.js` acrescenta um adapter isolado para persistir manifesto ativo e transação em envelopes próprios. `src/data/fontes-dataset.js` acrescenta o gate de governança para impedir que uma camada online seja confundida com fonte de pacote. As peças são injetáveis/testáveis; não tornam o cache técnico um dataset.

| Camada | Estado | Evidência | Limite |
|---|---|---|---|
| Dados do usuário | Implementados localmente | `src/core/estado.js`, envelopes v1, testes existentes | quota, reinstalação e limpeza do SO dependem de aparelho |
| Cache técnico | Implementado | `public/sw.js`, cache de shell/tiles, planner limitado a 256 URLs | cache não é dataset mundial, nem prova de cobertura |
| Manifesto de dataset | Implementado e testado | `src/core/dataset-manifest.js`, `test/dataset-manifest.test.js`, ADR-0030 | ainda não existe pacote cartográfico gerenciado |
| Storage de dataset | Adapter isolado parcial | `src/core/dataset-storage.js`, `test/dataset-storage.test.js`, ADR-0032; chaves próprias para ativo/transação | não é storage atômico de disco, não cobre quota física ou power loss |
| Governança de fontes | Gate imutável parcial | `src/data/fontes-dataset.js`, `test/fontes-dataset.test.js`, ADR-0033; todos os critérios precisam ser confirmados | nenhum provedor atual foi aprovado para pacote offline |
| Dataset mundial | Não implementado | nenhum pacote/manifesto oficial empacotado | fonte, licença, pipeline, formato, armazenamento e distribuição |
| Busca offline de lugares | Não declarada | não há índice local mundial | só pode ser ativada com dataset/index real |
| Sync de dataset | Máquina + adapter local parcial | `src/core/dataset-transacao.js` e `src/core/dataset-storage.js`, testes e ADRs 0031/0032 | sem endpoint, download, checksum de bytes, staging atômico físico ou pacote autorizado |

## Regras de segurança e honestidade

O app não deve baixar grandes áreas dos servidores públicos de tiles OSM nem tratá-los como backend de distribuição offline. O catálogo atual não considera nenhum provedor automaticamente autorizado a redistribuir um dataset mundial; `avaliarCatalogoFontes()` mantém `podeCriarPacote: false`. Licença, redistribuição, uso offline, uso comercial, atribuição, versão, origem, política de atualização, armazenamento e restrições precisam ser confirmados para o pacote concreto antes de incorporar dados.

O manifesto não substitui o hash de um arquivo: ele registra o checksum esperado, enquanto a futura camada de download terá de calcular e comparar o SHA-256 antes de ativar qualquer pacote. Até lá, o cache anterior continua sendo a única base técnica de tiles preparados.

Dados de mapa e dados da pessoa permanecem separados. Nenhum fluxo de atualização de mapa pode remover trilhas, waypoints, rotas, configurações ou preparação de emergência. GPS continua sendo posicionamento local; não transmite dados ao servidor de atualização.

## Próximo bloco

A próxima unidade deve definir fonte autorizada e backend de storage apropriado para um pacote regional controlado. Não deve tratar `localStorage` como atomicidade física, aprovar provedor apenas por renderizar online, criar pacote mundial fictício, fazer scraping de tiles, exigir geocodificação online ou prometer roteamento offline.
