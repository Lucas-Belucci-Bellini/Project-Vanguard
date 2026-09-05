# Project Vanguard V2 — Plano de Remediação: Extração, GPS e Rotas

## Objetivo

Transformar três capacidades atualmente insuficientes em funcionalidades verificáveis de produto:

1. extração de dados realmente funcional;
2. rastreamento de localização em segundo plano realmente suportado nas plataformas alvo;
3. navegação e desenho de rota mais precisos e robustos.

## Estado observado

O projeto é um app JavaScript puro + Vite, com separação entre `src/engine`, `src/core`, `src/pages`, `src/platform` e testes determinísticos. Já existem módulos dedicados a localização, background, mapas, roteamento e pipeline de datasets.

O ponto crítico é que existência de módulo/teste não prova funcionamento end-to-end em dispositivo.

## P0 — Extração de dados

### Objetivo

Eliminar qualquer fluxo em que um botão, tela ou API aparente extrair dados sem produzir um dataset real e validado.

### Pipeline obrigatório

```
Fonte autorizada
  -> descoberta
  -> download/consulta
  -> parsing
  -> normalização
  -> validação
  -> manifesto
  -> checksum/integridade
  -> persistência
  -> registro
  -> consumo pelo mapa/roteamento
```

### Requisitos

- identificar exatamente quais telas chamam a função de extração;
- rastrear a chamada até a fonte;
- distinguir `real`, `fixture/test`, `mock` e `placeholder`;
- remover ou marcar claramente qualquer UI que não execute extração real;
- validar schema antes da ativação;
- registrar tamanho, origem, versão, timestamp e integridade;
- suportar cancelamento, retomada e falha;
- não ativar pacote incompleto;
- testar com fixture pequena reproduzível;
- criar pelo menos um teste de integração do pipeline completo;
- expor diagnóstico quando a extração não puder ser realizada.

### Definition of Done

Uma extração só é considerada funcional quando o dataset resultante pode ser consumido pelo runtime do mapa/roteamento e sua integridade pode ser verificada.

## P0 — GPS em segundo plano

### Objetivo

Separar definitivamente aquisição de localização, armazenamento da trilha e UI.

Arquitetura:

```
Native Location Provider
        |
        v
Background Location Service
        |
        v
Location Normalizer
        |
        +--> Track Store
        |
        +--> Navigation State
        |
        +--> Diagnostics
```

### Requisitos

- plataforma nativa deve possuir implementação real;
- Web/PWA deve declarar claramente suas limitações;
- permissões devem ser solicitadas e verificadas;
- estado deve ser explícito: idle/starting/active/stopped/error/unavailable;
- posição deve continuar sendo recebida quando o WebView estiver suspenso, quando a plataforma permitir;
- a trilha não pode depender da página de navegação permanecer aberta;
- retomada após suspensão/reabertura deve ser suportada;
- timestamps devem ser preservados;
- posições inválidas devem ser rejeitadas;
- accuracy, altitude, speed e heading devem ser preservados quando disponíveis;
- bateria e frequência devem ser configuráveis dentro das capacidades da plataforma;
- falhas nativas devem chegar ao diagnóstico;
- nunca afirmar "GPS em segundo plano ativo" somente porque o botão foi acionado.

### Android

Validar no dispositivo/emulador com lifecycle real, incluindo:

- tela bloqueada;
- aplicativo em segundo plano;
- retorno ao aplicativo;
- perda/restauração de sinal;
- reinício do processo quando aplicável;
- permissões de localização adequadas;
- notificação/foreground service quando exigido pela plataforma.

### iOS

Validar separadamente com as APIs e capacidades de background location suportadas pela plataforma. Não assumir que o comportamento Android é transferível.

### Definition of Done

Uma sessão de trilha continua registrando posições após a UI deixar de estar em primeiro plano, dentro das limitações e permissões reais da plataforma, e a sessão é recuperável após retorno.

## P0 — Precisão de localização

### Objetivo

Não tratar latitude/longitude como posição perfeita.

Criar estado de qualidade:

- accuracy;
- timestamp;
- idade da leitura;
- velocidade;
- heading;
- fonte;
- validade.

### Regras

- leituras muito antigas devem ser marcadas como stale;
- leituras com precisão ruim não devem deslocar agressivamente a navegação;
- mudanças impossíveis devem ser filtradas;
- distância deve usar cálculo geodésico apropriado;
- heading deve considerar velocidade e disponibilidade;
- posição exibida e posição usada pelo roteador devem possuir contratos explícitos.

## P0 — Routing

### Objetivo

Separar cálculo de rota de apresentação da rota.

```
Origin
Destination
Routing Profile
Map Data
    |
    v
Route Engine
    |
    v
Route Geometry
    |
    +--> Map Rendering
    +--> Instructions
    +--> ETA
    +--> Recalculation
```

### Requisitos

- rota deve ser baseada em geometria de vias quando dados de roteamento existirem;
- não usar linha reta como substituto silencioso de uma rota real;
- distinguir `straight-line bearing` de `road route`;
- representar segmentos, nós/interseções e manobras;
- calcular distância total;
- permitir recálculo;
- detectar saída significativa da rota;
- aplicar snapping/map matching quando houver dados suficientes;
- preservar rota mesmo offline quando os dados necessários estiverem disponíveis;
- declarar claramente quando não houver dados suficientes para routing.

## P0 — Desenho da rota

A rota visual deve:

- seguir a geometria real;
- não atravessar edifícios/áreas não roteáveis quando o dataset suportar essa informação;
- possuir espessura e contraste consistentes;
- atualizar a posição do usuário independentemente da renderização;
- destacar trecho percorrido e restante quando suportado;
- manter viewport estável;
- não redesenhar toda a rota a cada leitura de GPS.

## P1 — Recalculation

Criar máquina de estados:

```
ON_ROUTE
  -> UNCERTAIN
  -> OFF_ROUTE
  -> RECALCULATING
  -> ROUTE_UPDATED
  -> ON_ROUTE
```

Evitar recálculo por pequenos ruídos de GPS.

Usar limiar baseado em:

- precisão;
- distância lateral;
- velocidade;
- geometria da via;
- idade da leitura.

## P1 — Map matching

Quando disponível:

```
GPS fixes
  -> candidate road segments
  -> scoring
  -> selected segment
  -> corrected navigation position
```

O map matching não deve alterar o histórico bruto da trilha. Manter:

- posição bruta;
- posição corrigida para navegação.

## P1 — Offline

Separar:

```
Online routing
Offline routing
Offline map rendering
Offline track recording
```

Não confundir mapa offline com roteamento offline. Ter tiles não significa possuir grafo de ruas.

## P1 — Testes

Adicionar testes para:

- posição válida/inválida;
- posição stale;
- precisão;
- salto impossível;
- heading;
- distância;
- bearing;
- snapping;
- saída da rota;
- recálculo;
- rota curva;
- interseções;
- ida/volta;
- offline;
- perda de sinal;
- retomada de background;
- persistência da trilha.

## P1 — Teste de dispositivo

Criar checklist manual automatizável sempre que possível:

### Android

1. iniciar trilha;
2. bloquear tela;
3. mover dispositivo;
4. aguardar leituras;
5. desbloquear;
6. verificar timestamps;
7. verificar pontos recebidos;
8. comparar trilha;
9. desligar;
10. reabrir;
11. verificar persistência.

### iOS

Repetir fluxo com comportamento e permissões específicos da plataforma.

## P2 — Performance

Não processar o mapa inteiro a cada atualização de GPS.

Separar:

```
location update
!=
route recalculation
!=
map repaint
```

Atualizações de posição podem ser frequentes; recalculação de rota deve ocorrer somente quando necessário.

## P2 — Observabilidade

Cada sessão deve conseguir responder:

- quando começou;
- qual plataforma;
- qual fonte de localização;
- quantas leituras recebeu;
- quantas foram rejeitadas;
- accuracy média/pior;
- última leitura válida;
- última atualização da rota;
- motivo do último recálculo;
- se houve suspensão;
- se houve recuperação.

Não armazenar dados sensíveis desnecessariamente.

## Arquivos-alvo prováveis

Investigar primeiro:

- `src/core/localizacao.js`
- `src/core/background-localizacao.js`
- `src/core/navegacao-rumo.js`
- `src/core/map-engine.js`
- `src/core/map-provider.js`
- `src/core/map-provider-runtime.js`
- `src/core/maplibre-adapter.js`
- `src/core/dataset-download.js`
- módulos de dataset/extraction
- `src/pages/navegacao.js`
- `src/pages/mapa.js`
- adapters nativos Android/iOS
- testes correspondentes.

## Regra contra features de enfeite

Nenhum botão pode comunicar que uma capacidade está funcionando se ela apenas:

- altera estado visual;
- gera fixture;
- calcula uma aproximação;
- simula sucesso;
- depende de uma página aberta quando deveria ser background;
- desenha uma linha quando deveria calcular uma rota.

Se a capacidade ainda não for real, a UI deve dizer isso.

## Ordem de execução

1. Auditar extração end-to-end.
2. Corrigir extração real.
3. Auditar background em Android/iOS.
4. Corrigir lifecycle nativo.
5. Separar posição bruta de posição de navegação.
6. Corrigir routing.
7. Melhorar geometria/desenho da rota.
8. Implementar off-route/recalculation.
9. Implementar/fortalecer map matching.
10. Testar offline.
11. Testar dispositivos.
12. Atualizar documentação e status.
13. Rodar suíte completa.
14. Criar commits pequenos.

## Critério de release

Não marcar V2 como pronta enquanto:

- extração for somente decorativa;
- background GPS só funcionar com a UI ativa;
- rota puder ser uma linha reta sem aviso;
- precisão não for medida;
- recálculo não for testado;
- comportamento real em dispositivo não for verificado.

## Observação

Este documento é um plano de engenharia. Não substitui os contratos existentes do projeto; deve ser reconciliado com eles antes de qualquer alteração incompatível.
