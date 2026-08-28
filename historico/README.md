# Histórico de Continuação — Project Vanguard

Este diretório é o ponto oficial de memória operacional do desenvolvimento da V2.

## Regra

Antes de iniciar uma nova rodada de desenvolvimento, leia este diretório e o estado atual do `main`. Ao terminar uma rodada, registre aqui o que foi feito, os commits publicados, verificações executadas, limites mantidos e o próximo gargalo verificável.

Não considerar texto de conversa, relatório do Manus ou memória externa como prova de que uma alteração está no repositório. A prova é o conteúdo/commit presente no GitHub.

## Estado conhecido até 2026-08-28

- `main` é a linha de continuidade.
- Governança de fontes cartográficas implementada; nenhuma fonte foi declarada automaticamente autorizada para formar dataset offline redistribuível.
- Manifesto, transação, storage isolado de metadata e ciclo de sync implementados.
- Storage físico de pacote via IndexedDB implementado.
- Integração `dataset-sync` ↔ `dataset-package-storage` implementada.
- Estados físicos `STAGING` e `ACTIVE` explicitados.
- Verificação de integridade com SHA-256 real integrada ao fluxo.
- Recuperação de transações interrompidas implementada em nível lógico.
- `src/core/dataset-sync.js` ainda não baixa da rede: download/streaming real permanece separado e pendente.
- Durabilidade física, power-loss, quota real e comportamento em aparelhos não estão provados pelo código.
- Android/iOS e testes físicos continuam pendentes.
- Signing e release V2 continuam pendentes.

## Próxima sequência prevista

1. Fechar promoção/rollback físico de forma transacional e testável.
2. Implementar adapter de download/streaming separado do `dataset-sync`.
3. Integrar progresso, cancelamento e retomada sem ativar pacote incompleto.
4. Testar recovery e quota em ambientes reais.
5. Só depois avançar para dataset cartográfico concreto, respeitando licença e redistribuição.

## Regra de segurança do histórico

Nunca apagar entradas anteriores. Se uma decisão mudar, adicionar uma nova entrada explicando a mudança. O histórico deve funcionar como diário técnico cumulativo, não como arquivo de estado sobrescrito.
