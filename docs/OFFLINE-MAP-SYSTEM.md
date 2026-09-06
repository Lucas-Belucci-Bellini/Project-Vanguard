# Sistema de mapa offline — estado e arquitetura

> Documento vivo. Ele responde, para uma sessão que chega sem histórico, **o que já
> existe**, **o que falta** e **qual é o próximo bloqueador**. Atualize-o junto com a
> mudança, não depois.

## Arquitetura

```
                          MAPA (src/pages/mapa.js)
                                    │  container + opções de vista
                                    ▼
                       MAP ENGINE (src/core/map-engine.js)
                                    │
                      MapProviderRuntime ── MapProvider (contrato)
                                    │
                          MapLibreAdapter ── maplibre-gl
```

```
   ESCRITA (instalar/atualizar)              LEITURA (usar)
   ────────────────────────────              ──────────────
   dataset-sync ──┬── dataset-manifest       dataset-registry
                  ├── dataset-transacao          │  escada de verificação
                  ├── dataset-storage            │  manifesto → pacote → ATIVO
                  ├── dataset-integridade        │  → tamanho → checksum
                  ├── dataset-package-storage    ▼
                  └── fontes-dataset (gate)   VALID · INVALID · UNVERIFIED · ABSENT
   dataset-download* · dataset-boot-recovery
```

`dataset-sync.js` instala e ativa; `dataset-registry.js` responde se o que está
instalado dá para usar. Nenhum dos dois baixa tiles nem conhece DOM.

## Cache não é dataset

| | Service Worker cache | Dataset offline |
|---|---|---|
| origem | oportunística, o que o usuário navegou | pacote declarado |
| identidade | nenhuma | `datasetId` + `version` |
| verificação | nenhuma | SHA-256 sobre os bytes |
| recuperação | reconstruir navegando | manifesto + transação + recovery |

As duas coisas continuam em módulos separados e não devem ser fundidas. `mapa-offline.js`
(planejador de tiles do viewport) pertence ao lado do **cache**, não ao do dataset.

## Estado por fase

| # | Fase | Estado | Onde |
|---|---|---|---|
| 1 | Auditoria do sistema offline | ✅ | este documento |
| 2 | Contrato do provider | ✅ | `map-provider.js`, `map-provider-registry.js`, `map-provider-runtime.js` |
| 3 | Dataset manifest | ⚠️ parcial | `dataset-manifest.js` (ADR-0030) — falta `bounds`, faixa de zoom, esquema de tiles e formato |
| 4 | Checksum / integridade | ✅ | `dataset-integridade.js` |
| 5 | Dataset storage | ✅ | `dataset-storage.js` (ADR-0032), `dataset-package-storage.js` |
| 6 | Dataset registry | ✅ | `dataset-registry.js` (ADR-0036) |
| 7 | Offline tile provider | ⛔ bloqueado pela fase 3 | — |
| 8 | Integração com o Map Engine | ⏳ engine integrado à página; falta o modo offline | `map-engine.js`, `pages/mapa.js` |
| 9 | Seleção online/offline | ⏳ | — |
| 10 | Quota e gerenciamento | ⏳ | falta leitura por metadados no storage físico |
| 11 | Recovery de datasets | ✅ | `dataset-boot-recovery.js`, `dataset-package-recovery.js` |
| 12 | Download controlado | ✅ mecânica; **bloqueado por licença** | `dataset-download*.js`, gate em `fontes-dataset.js` (ADR-0033) |
| 13–17 | Modo avião, testes sem rede, performance, empacotamento, RC | ⏳ | — |

## Bloqueadores reais

**1. O manifesto v1 não descreve cobertura.** Ele declara identidade, origem, licença,
tamanho e checksum, mas não `bounds`, faixa de zoom, esquema de tiles (`xyz`/`tms`) nem
formato. Um provider offline não consegue responder "eu tenho este tile?" sem esses
campos. É o próximo passo da fase 3 e o pré-requisito da fase 7.

**2. Nenhum pacote pode ser criado ou distribuído.** `podeCriarPacote` é `false` para o
catálogo inteiro (ADR-0033) — nenhuma das fontes atuais teve licença, redistribuição, uso
offline, uso comercial, atribuição, política de atualização, direitos de armazenamento e
restrições do provedor confirmados. Isto é uma decisão de licenciamento, **não** um
problema de código: a mecânica de download existe e está testada. Enquanto não houver uma
fonte aprovada ou infraestrutura própria, o sistema pode ser construído e testado com
pacotes locais, mas não pode buscar nem redistribuir tiles de terceiros.

**3. Leitura física só existe inteira.** `lerPacote()` carrega todos os bytes na memória.
Para checksum isso é inerente; para "existe?" e "quanto ocupa?" não é, e sem um caminho
por metadados a fase 10 (quota) não fecha.

## Estados que o sistema precisa saber informar

`ONLINE` · `OFFLINE` · `OFFLINE DATASET` · `CACHE` · `NO DATA`

Hoje o registro cobre a origem `OFFLINE DATASET` (`VALID`) e a ausência (`ABSENT` →
`NO DATA`). A seleção entre as origens é a fase 9 e ainda não existe. Fallback silencioso
é proibido: um dataset corrompido precisa aparecer como corrompido, não como "sem mapa".
