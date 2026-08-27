# Validação da prontidão offline — 2026-08

## Ambiente

- URL: `http://localhost:5174/?fresh=20260827-offline-readiness#/inicio`
- Ambiente: preview Vite no Chromium/Linux do sandbox
- Escopo: renderização da tela inicial e contrato textual local; sem GPS físico, rede simulada ou envio externo

## Resultado observado

O cartão **ANTES DE SAIR** exibiu `PREPARE ANTES DE SAIR` e `2/5 itens conferidos. Ainda falta preparar a posição ou os dados locais antes de sair sem internet.`.

| Item | Estado observado |
|---|---|
| Posição local | Pendente: ativar GPS e aguardar fixo local |
| Mapa preparado | Pendente: preparar área visível conectado |
| Dados locais | OK: 0 pontos e 0 waypoints no armazenamento local |
| Manual de referência | OK: conteúdo local disponível |
| Comunicação de emergência | Atenção: nenhum canal externo configurado; GPS não transmite SOS sozinho |

A inspeção DOM confirmou a rota `#/inicio`, cinco itens e a recomendação acima. A regra de código também cobre posição válida sem timestamp, timestamp zero, timestamp futuro e relógio de referência inválido como `atencao`, impedindo que o cartão libere a prontidão local com frescor não verificável.

## Limites

O preview não prova modo avião, persistência após encerramento, quota de tiles, GPS real, comunicação, cobertura, bateria ou segurança do itinerário. A validação em Android, Xiaomi/HyperOS e iPhone continua pendente.
