# Navegação avançada — 1.3.1

A versão 1.3.1 adiciona a página local `#/navegacao` e o núcleo puro `src/core/navegacao-rumo.js`. A camada é estritamente voltada para posicionamento, orientação, cartografia e planejamento geográfico; não contém capacidades de combate, seleção de alvos, perseguição ou rastreamento remoto.

## Funcionalidades implementadas

| Área | Comportamento | Estado |
|---|---|---|
| Rumo | Normalização de graus, bearing geodésico, back bearing, diferença angular assinada e direção relativa | `IMPLEMENTED` / `TESTED` |
| Distância | Distância geodésica e resumo de segmentos | `IMPLEMENTED` / `TESTED` |
| Cardinais | Conversão para N, NE, E, SE, S, SW, W e NW | `IMPLEMENTED` / `TESTED` |
| Coordenadas | Exibição local de Latitude/Longitude, UTM e MGRS quando há posição válida | `IMPLEMENTED` |
| Conversão | Conversão MGRS para Latitude/Longitude sem rede | `IMPLEMENTED` |
| Navegação até ponto | Entrada de latitude/longitude, distância, rumo e direção relativa | `IMPLEMENTED` |
| Elevação | Exibe indisponibilidade quando não há dado fornecido; não inventa altitude | `IMPLEMENTED` |
| Offline | Cálculos matemáticos e conversão usam módulos locais existentes | `IMPLEMENTED` |
| Waypoints persistentes avançados | O storage e os pontos básicos existentes são preservados; edição avançada integrada ainda é trabalho posterior | `PARTIAL` |
| Grid interativo e cursor | O mapa existente já possui HUD/grade MGRS; integração de preferências e cursor dedicado ainda é parcial | `PARTIAL` |
| Declinação magnética automática | Sem fonte apropriada configurada, o estado permanece indisponível | `NOT CONFIGURED` |
| Heading físico | Depende de sensor e aparelho real; a página não inventa heading | `PHYSICAL VALIDATION REQUIRED` |

## Uso

Abra `#/navegacao`, confira a posição local, informe latitude e longitude de um ponto conhecido e selecione **CALCULAR RUMO**. Para converter uma referência MGRS, informe o texto no conversor. Os resultados são calculados no aparelho e não são enviados automaticamente.

## Limites

A página não confirma comunicação, resgate, cobertura de rede, precisão física, altitude, declinação ou heading sem dados reais. ETA somente deve ser adicionado quando houver velocidade e timestamps suficientes. O mapa, trilha, exportação JSON/GPX e armazenamento existentes continuam sendo as fontes do restante da aplicação.

## Segurança e privacidade

Nenhuma funcionalidade nova faz upload, cria telemetria, envia posição ou exige conta. Medição, waypoints e navegação devem permanecer operações explícitas e locais. A semântica “navegação de inspiração militar” refere-se somente a grade, coordenadas, orientação e cartografia.
