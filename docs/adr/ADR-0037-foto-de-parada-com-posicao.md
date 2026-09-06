# ADR-0037 — foto de parada com posição de captura

- **Status:** Aceita
- **Data:** 2026-08-30
- **Escopo:** registro de paradas com imagem no Vanguard Field

> GPS posiciona e registra localmente. Nada aqui transmite foto, posição ou
> qualquer outro dado para fora do aparelho.

## Contexto

Numa peregrinação a pessoa para, fotografa o lugar e segue. A foto sozinha não
diz onde foi tirada, e a trilha sozinha não diz o que havia ali. O pedido do
operador é explícito: a foto precisa sair **junto** com a posição da captura,
com precisão de **25 m ou melhor**, para que depois seja possível identificar
onde ela estava.

Três coisas tornam isso menos trivial do que parece. A precisão do GPS não é
escolha do aplicativo — ela varia com céu aberto, prédio, árvore e reflexão de
sinal. O último fixo conhecido pode ser de minutos atrás e de outro lugar. E o
arquivo devolvido pela câmera de parte dos Android chega com `type` vazio.

## Decisão

Três camadas, cada uma com uma responsabilidade:

| Módulo | Papel |
|---|---|
| `src/core/foto-parada.js` | contrato puro: julga o fixo e monta o registro |
| `src/core/foto-storage.js` | IndexedDB próprio das fotos |
| `src/pages/mapa.js` | câmera, marcador, lista e status |

### Sem posição real não existe foto de parada

Uma imagem sem fixo válido **não** vira registro com coordenada zerada, herdada
do último ponto ou estimada. Ela é recusada e a tela explica por quê. `null`,
`''` e `[]` viram `0` em JavaScript, e `lon: null` aceito como longitude 0
apontaria para o golfo da Guiné — dizer onde a pessoa estava sem saber é o erro
que este contrato existe para impedir, então só número e string numérica passam
pela normalização.

### Qualidade ruim não apaga a foto

Com 60 m em vez de 25 m o registro é criado assim mesmo, com a precisão real
gravada, `dentroDoLimite: false` e a ressalva visível na lista e no status.
Perder a foto de uma parada que não se repete é pior do que guardá-la com a
ressalva; o que nunca acontece é a ressalva sumir. Fixo mais velho que um minuto
é sinalizado mesmo com precisão ótima — ele não descreve mais onde a pessoa
parou.

### O fixo é pedido para a parada

Antes de abrir a câmera e de novo ao gravar, a página pede uma posição em modo
`manual` (alta precisão, `maximumAge: 0`). É um gesto explícito da pessoa, não
rastreamento contínuo, e segue a política de energia do ADR-0027.

### A foto viaja com a coordenada

As paradas entram como waypoints nas exportações JSON, GPX e KML que já
existiam, com nome, precisão, horário, MGRS na descrição e o nome do arquivo da
imagem. A ida e volta pelo GPX é coberta por teste: a coordenada da captura
sobrevive ao formato.

### Banco próprio

As fotos ficam em `vanguard-fotos-parada`, separado do storage de dataset: foto
é dado da pessoa, dataset é material distribuído, e limpar um nunca pode apagar
o outro. Metadado e bytes moram em stores diferentes para que listar as paradas
não carregue as imagens na memória.

## Limites

A posição gravada é a que o aparelho informou, com a precisão que ele declarou.
Nenhum dos dois é verificado contra outra fonte, e nenhum ponto é corrigido,
suavizado ou encaixado em via. Um fixo de 9 m dentro de um cânion urbano pode
estar mais longe do que os 9 m dizem.

**A coordenada ainda não é escrita em EXIF dentro do JPEG.** Ela vive no
registro do aplicativo e nas exportações. Uma foto copiada isolada para outro
aparelho, sem o arquivo de registro ao lado, chega lá sem a posição. Escrever
GPS em EXIF sem destruir a orientação e os demais campos da câmera é a próxima
unidade, e não foi feita agora para não entregar meio caminho.

Não há compressão nem limite de tamanho por foto além da quota do navegador:
uma sequência longa de imagens grandes pode encher o armazenamento, e o aviso
de quota chega do próprio storage, não de uma previsão do aplicativo.

## Evidência

`test/foto-parada.test.js` (15 casos) cobre o limite inclusivo de 25 m, precisão
ausente que não passa por boa, fixo velho, recusa sem coordenada — incluindo o
caso `lon: null` —, foto preservada com precisão ruim, higienização do nome do
arquivo e a ida e volta pelo GPX. `test/foto-storage.test.js` (11 casos) cobre
gravação conjunta de metadado e imagem, listagem sem bytes, ordem por captura,
remoção dos dois stores, quota e ambiente sem IndexedDB.

Verificação no navegador com posição simulada: fixo de 9 m gravou
`22K DV 83354 22120` e os bytes do JPEG no IndexedDB; fixo de 90 m gravou
marcado como fora do limite; sem permissão de GPS nada foi gravado e a tela
explicou o motivo.
