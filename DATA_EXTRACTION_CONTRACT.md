# Project Vanguard — Data Extraction Contract

## Regra
Extração não pode ser uma função decorativa. Toda ação de extrair dados deve produzir um artefato verificável ou retornar erro explícito.

## Pipeline
```text
Source
 -> Fetch
 -> Validate
 -> Normalize
 -> Provenance
 -> Persist
 -> Export
 -> Verification
```

## Cada registro deve preservar
- source
- timestamp
- geographic scope quando aplicável
- source identifier
- raw/normalized distinction
- validation status
- extraction version
- checksum quando aplicável
- error state

## Falhas
Se a fonte não puder ser acessada, o sistema deve informar `UNAVAILABLE`, e não preencher dados fictícios.

## Testes mínimos
- fonte válida
- fonte vazia
- timeout
- resposta inválida
- schema alterado
- duplicação
- dados parciais
- extração repetida
- exportação e reimportação

## Definition of Done
Uma extração só é considerada funcional quando o dado pode ser recuperado posteriormente, validado e auditado sem depender da tela que iniciou a operação.
