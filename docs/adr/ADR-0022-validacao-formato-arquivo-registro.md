# ADR-0022 — validação defensiva do formato de arquivo de registro

- **Status:** Aceita
- **Data:** 2026-08-27
- **Escopo:** Mobile V2/Omega, importação local Web/PWA/Capacitor

## Contexto

O seletor do mapa permite JSON, GPX e KML, mas o handler anterior escolhia o parser exclusivamente pela extensão do nome. Em Files/Share Sheet, o sistema pode omitir a extensão, fornecer MIME com parâmetros ou entregar metadados inconsistentes. Isso tornava a escolha do parser pouco explícita e dificultava uma mensagem clara antes da leitura do conteúdo.

## Decisão

Adicionar `src/core/registro-arquivo.js` como módulo puro, pequeno e testável. Ele normaliza extensão e MIME, aceita os MIME específicos de JSON/GPX/KML, permite extensão sem MIME quando o sistema não informa o tipo e permite MIME conhecido sem extensão. Quando extensão e MIME específicos discordam, a importação é rejeitada antes de `arquivo.text()`.

O módulo não abre arquivos, não executa XML, não faz rede e não substitui a validação de conteúdo dos parsers existentes. `registro-offline.js` continua responsável pelos limites, coordenadas, schema e subconjunto seguro de GPX/KML. O mapa continua exigindo confirmação explícita antes de substituir a rota local e deixa a rota pausada após importação.

## Consequências

A decisão melhora a previsibilidade em navegadores e seletores móveis sem adicionar dependência ou alterar o formato de backup. Arquivos renomeados com extensão suportada ainda podem ser lidos quando não há MIME conflitante; portanto, esta é uma validação de metadados, não uma garantia de autenticidade. O conteúdo permanece sujeito ao parser e aos limites locais.

A suíte passou de 159 para 166 testes, incluindo extensão, MIME, parâmetros, aliases, ausência de metadados e conflitos. Build, sintaxe do service worker, auditoria de produção, sync Android/iOS e APK debug foram aprovados nesta unidade. O APK continua sendo apenas artifact de teste.

## Não escopo

Não foi implementada assinatura de arquivos, detecção de malware, suporte a todos os MIME genéricos, parser XML completo, sincronização, importação remota ou distribuição automática. Esses itens exigem outro gargalo, fontes e gates próprios.
