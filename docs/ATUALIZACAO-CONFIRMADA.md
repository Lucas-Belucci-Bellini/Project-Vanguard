# Atualização confirmada do Vanguard Field

O Vanguard Field possui um aviso de atualização que aparece somente quando uma versão nova é detectada. A atualização nunca é silenciosa: a pessoa precisa tocar no botão e confirmar a ação.

## O que acontece no PWA

Quando um novo service worker termina de baixar, ele permanece aguardando. O cabeçalho mostra **ATUALIZAÇÃO PRONTA**. Ao tocar no botão, o aplicativo pergunta se a pessoa deseja atualizar. Depois da confirmação, o service worker pendente recebe o comando de ativação e a página é recarregada após o novo controlador assumir.

Esse fluxo evita trocar a versão enquanto alguém está usando o mapa ou conferindo uma posição sem ter escolhido a atualização. Se a pessoa estiver offline, o aviso não aparece e a versão já instalada continua operando com os dados locais disponíveis.

## O que acontece no APK Capacitor

Um APK não pode instalar uma nova versão de si próprio de forma segura dentro da página web. Quando uma release oficial posterior está disponível e há conexão, o botão **ATUALIZAÇÃO · vX.Y.Z** pede confirmação e abre somente a página ou o asset HTTPS do caminho oficial `github.com/Lucas-Belucci-Bellini/Project-Vanguard/`. Se o payload trouxer um asset fora dessa origem, o app usa a página fixa de releases como fallback. O navegador/WebView e o instalador do Android continuam responsáveis por baixar, verificar e pedir a confirmação de instalação.

Portanto, o botão não é um sistema de atualização silenciosa, não baixa APK em segundo plano e não promete atualizar em uma área sem internet. Para corrigir ou substituir um APK distribuído fora da loja, a nova release precisa ter uma versão maior, como `v1.0.1`, e o usuário precisa concluir o fluxo do sistema operacional.

## Teste controlado

| Etapa | Resultado esperado |
|---|---|
| Publicar uma versão de teste posterior em ambiente controlado | A versão usa uma tag maior que a instalada, por exemplo `v1.0.1`. |
| Abrir a versão instalada com internet | O botão de atualização aparece somente após a API/release oficial ser encontrada ou o service worker novo estar aguardando. |
| Tocar no botão e negar | A versão atual permanece funcionando e nenhum download é iniciado. |
| Tocar novamente e confirmar | No PWA, a aplicação recarrega com o service worker novo. No APK, a página oficial é aberta e o sistema solicita as próximas confirmações. |
| Repetir em modo avião | Nenhum botão de release remota aparece e o uso offline não é bloqueado. |

Antes de uma caminhada de quatro dias, instalar e testar a versão desejada ainda online. Não depender do botão de atualização para corrigir o aplicativo depois que a rede desaparecer. Levar uma cópia conhecida do instalador quando a distribuição permitir, além de manter o plano de navegação e comunicação redundante.

## Para desenvolvedores

O fluxo oficial deve sempre publicar artefatos por HTTPS e usar uma versão semântica maior que a instalada. O código compara a tag da release, recusa rascunhos, aceita downloads apenas dentro da allowlist HTTPS do repositório oficial e abre a página oficial como fallback. A tag final `v1.0.0` continua deliberadamente separada de builds debug; hotfixes posteriores devem usar uma versão nova, e não sobrescrever uma tag existente.
