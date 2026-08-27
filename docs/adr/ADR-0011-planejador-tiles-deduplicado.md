# ADR-0011 — Planejador de tiles offline sem duplicação

- **Status:** Aceita para V2; cobertura, quota e conectividade real ainda pendentes
- **Data:** 2026-08-27
- **Escopo:** `src/core/mapa-offline.js`

## Contexto

O preparo offline recebe uma ou mais URLs de template de uma base cartográfica. Templates repetidos não acrescentam cobertura, mas podiam inflar a estimativa e consumir a cota local de 256 URLs. O planejador também precisa parar no limite sem adicionar uma URL além do limite antes de recortar a lista.

## Decisão

Normalizar `base.tiles` como lista, remover templates vazios e deduplicá-los antes de calcular `totalEstimado` e gerar URLs. O loop deixa de continuar quando a coleção alcança `LIMITE_TILES_OFFLINE`; a lista final continua limitada a 256 URLs e `limitado` indica quando a estimativa excede a cota.

A função preserva a normalização de longitude, o tratamento do antimeridiano, a limitação Web Mercator e os níveis de zoom existentes. Não afirma que os tiles respondem, que a área tem cobertura completa, que a fonte é oficial ou que o cache será preservado pelo sistema.

## Consequências

Bases com templates duplicados produzem a mesma lista e estimativa que a base com template único. Isso reduz trabalho e evita uma estimativa artificialmente alta. O planejador permanece puro e testável no Node; a preparação efetiva continua dependente do Service Worker, da rede, da quota do aparelho e da validação de campo.

## Evidência

- `npm test`: 131 testes aprovados.
- Teste determinístico compara templates único e duplicado.
- Testes existentes mantêm cobertura de limite de 256 URLs e antimeridiano.
- Nenhum tile é inventado nem baixado por esta função.
