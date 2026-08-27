# Validação de preview — Diagnóstico local — 2026-08-27

## Observação

O preview HTTPS carregou o shell do Vanguard Field em `#/diagnostico` sem erros registrados no console. A tela Início exibiu o novo atalho **Diagnóstico — estado local e bateria**, confirmando que o bundle e a inserção do atalho chegaram ao navegador.

A troca automática para a rota `#/diagnostico` não foi confirmada nesta sessão de navegador: a URL continha o hash, mas o conteúdo permaneceu em **Início**, e o clique do atalho não alterou o conteúdo observado. Não há console error. Esta pendência deve ser investigada antes de marcar a rota como `VERIFIED`; por enquanto, a matriz mantém o diagnóstico como `IN_PROGRESS`.

## Limite da observação

O ambiente de preview não fornece um GPS real e não prova permissões, bateria, sensores, suspensão de WebView ou comportamento em Android/iOS. A revisão visual confirma apenas o shell, o atalho e a ausência de erro aparente no carregamento inicial.

## Reprodução adicional

Em 2026-08-27, definir `location.hash = '#/diagnostico'` pelo console também manteve a tela Início, embora a URL permanecesse com o hash correto e não surgissem erros no console. O comportamento indica que a atualização do listener de `hashchange` ou o estado do app precisa ser investigado; a melhoria não deve ser marcada como verificada até a rota abrir corretamente.

## Reprodução após troca explícita

Após retornar para `#/inicio`, o clique no atalho **Diagnóstico** alterou a URL para `#/diagnostico`, mas o conteúdo permaneceu em Início. A reprodução ocorreu sem erro de console observado. O problema de roteamento é, portanto, uma pendência real de validação da implementação e deve ser corrigido antes do commit da funcionalidade.

## Resultado do evento manual

O disparo manual de `HashChangeEvent` também manteve a tela Início com `#/diagnostico`. O console continuou sem erros aparentes. O diagnóstico está implementado e testado no núcleo, mas a navegação da interface permanece bloqueada até corrigir a montagem de rota no preview.

## Validação com cache-busting

Com uma URL de preview contendo `?fresh=1#/diagnostico`, a página carregou como **VANGUARD · Diagnóstico** e exibiu versão, plataforma, rede, GPS, frescor, service worker, armazenamento, bateria, bússola e tiles em cache. O botão **ATUALIZAR DIAGNÓSTICO** manteve o painel responsivo. O GPS apareceu como `NEGADA · UNAVAILABLE` no sandbox, e a bússola como `BROWSER DEPENDENT`; esses estados são coerentes com as limitações do ambiente.

A falha observada anteriormente foi classificada como comportamento de cache/boot do preview sem cache-busting; a rota funciona no carregamento limpo. A validação física por plataforma continua pendente.
