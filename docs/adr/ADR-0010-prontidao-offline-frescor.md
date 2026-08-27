# ADR-0010 — Frescor obrigatório na prontidão offline

- **Status:** Aceita para V2
- **Data:** 2026-08-27
- **Escopo:** Avaliação local exibida na tela Início antes de sair sem internet

## Contexto

A tela Início apresenta uma conferência local de posição, mapa, dados, manual e comunicação. Uma coordenada dentro dos limites geográficos não é necessariamente um fixo atual: sem timestamp confiável, o usuário não consegue saber há quanto tempo a posição foi obtida. Um timestamp no futuro também não permite afirmar frescor.

## Decisão

`src/core/prontidao-offline.js` passa a classificar como `atencao` qualquer posição geograficamente válida cujo `createdAt`/`timestamp` seja ausente, zero, não numérico, futuro ou cuja referência `agora` seja inválida. Somente um timestamp positivo, não futuro e com no máximo 24 horas pode contribuir como item `ok` para a prontidão local. Posições antigas continuam em `atencao` e coordenadas geograficamente inválidas continuam `pendente`.

A comunicação de emergência permanece sempre em `atencao`: GPS é posicionamento local, não canal de transmissão, e a prontidão não confirma comunicação ou resgate.

## Consequências

A interface pode exigir uma nova leitura do GPS antes de declarar a base local pronta, reduzindo o risco de uso de uma posição salva sem idade verificável. O comportamento é determinístico e testado com posição ausente, zero, futuro, relógio inválido, antiga e válida.

A regra não verifica precisão, cobertura de rede, validade oficial de mapas, autonomia ou segurança do itinerário. Esses limites continuam visíveis e dependem de validação de campo.

## Evidência

- `npm test`: 130 testes aprovados.
- Teste de prontidão offline cobre timestamp ausente, zero, futuro e relógio inválido.
- Contrato operacional da peregrinação continua exigindo conferência do fixo e do frescor antes da largada.
