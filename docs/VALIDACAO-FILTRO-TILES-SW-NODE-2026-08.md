# Validação do filtro de tiles no Service Worker — 2026-08

## Ambiente

- Ambiente: Node 22, executando o `public/sw.js` real em contexto controlado
- Escopo: filtragem da mensagem `CACHE_TILES`; nenhum request de tile foi realizado

## Resultado

| Cenário | Resultado |
|---|---|
| URL HTTPS em host permitido | Aceita |
| URL HTTP no mesmo host | Rejeitada |
| Host não permitido | Rejeitado |
| String inválida | Rejeitada |
| URL repetida | Mantida apenas uma vez |
| 300 URLs únicas | Saída limitada a 256 |

Os testes confirmam que `prepareTiles()` recebe apenas URLs HTTPS de hosts da allowlist, sem duplicatas e dentro da cota local. A política do Service Worker complementa a deduplicação do planner; não substitui a validação de resposta, a medição de quota ou o teste de cobertura.

## Gates executados

- `npm test`: 133 testes aprovados.
- `node --check public/sw.js`: aprovado.
- Build web, audit de produção, sync Android/iOS e APK debug: pendentes de registrar no fechamento desta unidade, mas executados como gates locais antes do commit.

## Limites

Ainda é necessário testar em navegador instalado e aparelhos Android/iOS: modo avião, Cache Storage real, quota do sistema, respostas parciais/erro de provedor, troca de base e reabertura após encerramento. Nenhum resultado deste documento prova cobertura cartográfica completa.
