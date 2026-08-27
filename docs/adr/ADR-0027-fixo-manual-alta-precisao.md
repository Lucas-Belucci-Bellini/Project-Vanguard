# ADR-0027 — fixo manual de maior precisão

- **Status:** Aceita
- **Data:** 2026-08-27
- **Escopo:** localização local, centralização manual e política de energia

## Contexto

As capturas de teste mostraram o ponto de localização deslocado dentro de um prédio, com precisão informada de aproximadamente `±136–195 m`. Esse comportamento pode ocorrer quando a leitura depende de Wi-Fi, rede, GNSS parcialmente bloqueado, navegador ou provedor do sistema. O aplicativo não deve corrigir visualmente a posição, descartar a incerteza ou desenhar o ponto em um local presumido.

O mapa também utilizava o modo de cidade, econômico, para o watcher contínuo. Esse perfil é apropriado para consumo menor, mas não é uma solicitação explícita de um novo fixo de maior precisão quando a pessoa toca em **Centrar**.

## Decisão

Foi criado o perfil `manual` em `src/core/localizacao.js` com `enableHighAccuracy: true`, `maximumAge: 0` e timeout de 20 segundos. O botão **Centrar** agora solicita explicitamente um novo fixo usando esse perfil, atualiza o HUD, os marcadores, a linha até o destino e a câmera quando a leitura chega, e mostra a precisão recebida.

O watcher de cidade continua com `enableHighAccuracy: false`, `maximumAge: 15000` e distância mínima de 12 m. O watcher de trilha continua usando alta precisão enquanto a rota está ativa. O novo perfil manual não transforma GPS interno em precisão de edifício, não combina leituras, não aplica snap-to-road e não esconde `accuracy`.

## Consequências

A ação manual tende a evitar uma posição antiga e pede ao sistema uma leitura atual de maior precisão, mas o resultado continua dependente do aparelho, do navegador, da visibilidade do céu, de permissões e do ambiente. Em prédio, a posição pode continuar deslocada. A precisão exibida deve ser usada como critério de confiança da pessoa, não como garantia de acerto.

A centralização pode consumir mais energia durante a solicitação, mas o perfil é acionado somente por ação explícita e não altera a política contínua de baixo consumo. Após uma leitura manual, o watcher de cidade permanece econômico.

## Procedimento de teste físico

Para validar a melhoria, comparar o mesmo aparelho em área externa aberta e dentro do prédio. Tocar em **Centrar**, aguardar o novo fixo, registrar horário, latitude/longitude e `±N m`, repetir após alguns minutos e não considerar uma leitura com raio de incerteza maior que a necessidade da atividade como precisa. Esse teste exige aparelho real e não é substituído por `npm test`, build, sync ou APK debug.

A funcionalidade continua civil, local-first e foreground-only. GPS posiciona; não transmite. Nenhum dado de localização é enviado automaticamente.
