# ADR-0036 — registro de datasets offline instalados

- **Status:** Aceita
- **Data:** 2026-08-29
- **Escopo:** caminho de leitura do dataset offline — o que existe no aparelho e se dá para usar

## Contexto

A fundação do dataset offline já cobria a **escrita**: manifesto (ADR-0030), transação
(ADR-0031), storage isolado (ADR-0032), governança de fontes (ADR-0033) e a costura que
grava tudo na ordem certa (ADR-0035). Recuperação de boot reconcilia artefatos físicos
pendentes.

Faltava a pergunta oposta, que é a única que o mapa precisa fazer: **existe aqui um
dataset que dá para renderizar?** Sem ela, cada chamador futuro — a página do mapa, o
diagnóstico, o provider offline — inventaria sua própria noção de "instalado". A forma
mais provável dessa invenção é a mais perigosa: tratar *o pacote existe* como *o pacote
serve*, que é exatamente o que um dataset truncado ou adulterado faz parecer verdade.

Havia também uma assimetria de estados. O storage sabe dizer se a leitura falhou; a
integridade sabe comparar bytes com um SHA-256; ninguém sabia dizer se a ausência de
dataset é *aparelho novo* ou *dataset destruído*. As duas situações precisam de respostas
opostas na tela e nunca podem ser confundidas.

## Decisão

Criar `src/core/dataset-registry.js` como o caminho de leitura, sem escrever, baixar,
ativar ou apagar nada. A resposta vem de uma escada em que cada degrau é condição do
seguinte:

```
manifesto lido → manifesto presente → pacote lido → pacote presente
   → pacote ATIVO → tamanho igual ao declarado → checksum SHA-256 confere
```

Cada degrau é gravado em `etapas[]` com `ok` e detalhe. A escada **para na primeira
falha**: um pacote com tamanho errado não chega a ser hasheado, e o relatório mostra
onde parou. Corrupção não vira ausência.

### Os quatro estados

| Estado | Significado | Exemplo |
|---|---|---|
| `VALID` | verificado byte a byte contra o manifesto | dataset íntegro |
| `INVALID` | um degrau reprovou, com `motivo` exato | pacote ausente, tamanho divergente, checksum diferente |
| `UNVERIFIED` | estrutura confere, integridade **não provada** | inspeção rápida (`verificarChecksum: false`) ou ambiente sem Web Crypto |
| `ABSENT` | nenhum dataset instalado | aparelho que nunca instalou um pacote |

`UNVERIFIED` existe para não ter que mentir em duas situações reais. Uma inspeção de boot
não pode hashear centenas de MB antes da primeira tela, e um ambiente sem `crypto.subtle`
não consegue provar nada. Nos dois casos o dataset **pode** estar bom — chamar isso de
`INVALID` acusaria um dado íntegro, e chamar de `VALID` afirmaria uma verificação que não
aconteceu. Somente `VALID` sai de um checksum conferido.

Um manifesto ativo **sem** pacote físico é `INVALID` (`PACKAGE_MISSING`), nunca `ABSENT`:
o aparelho declara ter um dataset e não tem, o que é uma instalação quebrada. Só a
ausência dos dois é `ABSENT`.

Um pacote em `STAGING` é `INVALID` (`PACKAGE_NOT_ACTIVE`). Meia instalação não é dataset:
a promoção para `ACTIVE` é o passo que a máquina de transação usa para declarar o pacote
servível, e o registro respeita esse contrato em vez de reinterpretá-lo.

`criarRegistroDatasets()` expõe `inspecionar`, `listar`, `obterValido` e
`existeDatasetUsavel`. `listar()` devolve o dataset corrompido também — a lista é o que a
tela de diagnóstico mostra, e esconder a entrada quebrada esconderia a falha. Só
`obterValido()` filtra.

## Limites

`listar()` devolve no máximo uma entrada porque o storage guarda **um** manifesto ativo.
A lista é o formato de saída para que múltiplos datasets caibam sem trocar a API do
chamador; ela não finge um catálogo que o armazenamento ainda não tem.

A verificação de checksum lê o pacote inteiro através de `lerPacote()`, que carrega todos
os bytes na memória — o único caminho de leitura que o storage físico oferece hoje. Para
o hash isso é inerente (é preciso ler tudo), mas significa que *qualquer* inspeção completa
custa o tamanho do dataset em RAM. Um caminho de leitura por metadados ou por partes
continua pendente e é pré-requisito de quota (fase 10).

O registro responde sobre **existência e integridade**, não sobre **cobertura**. Ele não
sabe dizer se um dataset cobre uma coordenada ou um zoom, porque o manifesto v1 não
declara `bounds`, faixa de zoom, esquema de tiles nem formato. Enquanto esses campos não
existirem, nenhum provider offline consegue decidir se possui um tile — e é esse o próximo
bloqueador da fase 7.

Nada aqui altera a governança de fontes: nenhum pacote pode ser criado ou baixado
enquanto `podeCriarPacote` permanecer `false` (ADR-0033). O registro descreve datasets
instalados por qualquer meio; ele não autoriza a origem de nenhum.

## Evidência

`test/dataset-registry.test.js` cobre os treze casos: ausência, manifesto ilegível,
manifesto sem pacote, pacote ilegível, pacote em staging, tamanho divergente parando antes
do checksum, bytes adulterados com o mesmo tamanho, dataset íntegro com a escada completa,
inspeção sem checksum, ambiente sem SHA-256, composição com o storage real e um backend de
memória, lista vazia sem dataset e dataset corrompido preservado na listagem. Os checksums
são calculados com Web Crypto real sobre bytes reais, não fixados à mão.
