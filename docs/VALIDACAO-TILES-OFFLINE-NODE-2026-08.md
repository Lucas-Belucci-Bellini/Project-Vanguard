# Validação do planner de tiles offline — 2026-08

## Ambiente

- Ambiente: Node 22 da suíte do projeto
- Escopo: cálculo local das URLs; nenhum tile foi baixado

## Resultado

O planner foi exercitado com os cenários abaixo:

| Cenário | Resultado |
|---|---|
| Área ampla | Lista limitada a `256` URLs e estimativa informa quando a cota é excedida |
| Antimeridiano | Os dois lados da longitude são incluídos |
| Template duplicado | Lista e estimativa são iguais às de um único template |
| Template vazio ou ausente | Não gera URL artificial |

A deduplicação acontece antes da estimativa e da geração da lista. O limite é verificado ao atingir a cota, sem depender somente do recorte final. O planner não testa resposta HTTP, disponibilidade do provedor, quota real do Cache Storage ou cobertura cartográfica.

## Gates executados

- `npm test`: 131 testes aprovados.
- `npm run build`: aprovado.
- `node --check public/sw.js`: aprovado.
- `npm audit --omit=dev`: 0 vulnerabilidades de produção.
- Sync Android/iOS concluído e APK debug compilado.
