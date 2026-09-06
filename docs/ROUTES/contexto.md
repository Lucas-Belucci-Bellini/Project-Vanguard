# `#/contexto` — Contexto e zonas locais

**Estado:** `IMPLEMENTED`

## Objetivo
Escolher o modo de uso (cidade, trilha, litoral…) e manter as zonas locais de
risco que a própria pessoa cadastrou ou importou.

## Entrada
Modo escolhido à mão; formulário da zona (nome, tipo, lat, lon, raio, fonte,
validade); arquivo JSON de zonas.

## Dados necessários
`estado`: `CONTEXTO`, `ZONAS`, `LOCAL`. Nenhuma base de risco vem embutida —
o app **não traz** zonas de fábrica, de propósito.

## Dependências
`core/contexto.js`, `core/equipamentos.js`, `core/localizacao.js`.

## Ações
Escolher modo · cadastrar zona · remover zona · **EXPORTAR ZONAS JSON** ·
importar arquivo · pedir posição para detectar o contexto automaticamente.

## Saídas
Modo em vigor, aviso de uso, lista de zonas com situação, arquivo JSON.

## Estados
- **SUCCESS** — modo definido e zonas listadas.
- **EMPTY** — `NENHUMA ZONA LOCAL CADASTRADA`, com instrução para cadastrar ou
  importar.
- **ERROR** — arquivo inválido na importação, com o motivo.
- **VENCIDA** — zona fora da validade **continua guardada e visível**, marcada,
  sem ativar modo. Ela nunca é apagada em silêncio.

## Limitações
O app usa ponto e raio como aviso, não como detecção de ameaça. A qualidade do
alerta é a qualidade da fonte que a pessoa cadastrou.

## Testes
`test/contexto.test.js`, `test/equipamentos.test.js`.
