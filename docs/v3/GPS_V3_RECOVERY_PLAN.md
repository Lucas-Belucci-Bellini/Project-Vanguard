# Recuperação — o que o Vanguard sobrevive, e o que ainda não

## Os cenários do §12, um a um

| cenário | coberto? | por quem |
|---|:---:|---|
| primeiro plano → segundo plano | ✅ | `rastreamento.js` mantém a sessão; background assume |
| perda temporária de sinal | ✅ | erro do provedor não encerra; vão é marcado |
| GPS volta | ✅ | fixo novo reabilita `GRAVANDO` sozinho |
| volta ao primeiro plano | ✅ | as duas fontes alimentam o mesmo gravador |
| **troca de tela** | ✅ | serviço fora das páginas — era o defeito da 1.6.0 |
| app reiniciado | ✅ | `recuperar()` acha a sessão aberta |
| **morte inesperada** | ✅ | ponto vai ao disco na hora; contador é reconciliado |
| aparelho reiniciado | ✅ | mesma via do reinício do app |
| permissão revogada | ⚠️ | o erro é contado e anunciado; **não há** pedido de re-permissão |
| GPS desligado | ⚠️ | vira `SEM_SINAL`; **não há** aviso ativo ao operador |
| precisão baixa | ✅ | ponto guardado e marcado; não soma distância |
| rede indisponível | ✅ | nada aqui depende de rede |

## O caso que mais importa: morte entre checkpoints

O ponto é persistido **imediatamente**; o registro da sessão, a cada 25 pontos.
Uma morte no meio deixa o contador defasado — nunca o ponto perdido.
`recuperar()` relê os pontos gravados e corrige os contadores.

Teste: sessão com 107 pontos, 7 depois do último checkpoint, morta sem
`encerrar()`. Volta com 107, `ultimoSeq` 106 e marca de reconciliação.

## O que este plano NÃO cobre

- **re-permissão**: se o sistema revoga a localização no meio, o serviço conta
  o erro e continua vivo, mas ninguém pede a permissão de volta;
- **aviso ativo de GPS desligado**: o estado vira `SEM_SINAL` e a interface
  pode mostrar, mas não há notificação;
- **a página do mapa ainda usa o caminho antigo** — o serviço existe e está
  testado, mas `src/pages/mapa.js` não foi ligado nele. Até isso acontecer, o
  comportamento em produção continua o da 1.6.0.

Este último item é o mais importante da lista, e está aqui para não ser
confundido com trabalho concluído.
