# Project Vanguard — Plano mestre até a 1.0.0

> **Status em 2026-08-27:** a evolução civil/offline-first foi integrada à branch padrão `main` via pull request #2. O branch passou por 86 testes, build web, sintaxe do service worker, preview HTTPS e geração do APK Android debug. A versão declarada do pacote está em `1.0.0`; a tag de release só deve ser criada depois dos gates de dispositivo real, revisão final e confirmação de distribuição.

## 1. Visão da versão 1.0.0

A versão 1.0.0 do **Vanguard Field** será uma aplicação civil, offline-first e multiplataforma para navegação urbana, caminhadas, expedições, mar e preparação para situações de emergência. O objetivo é transformar o celular em um instrumento de referência local, sem apresentar como nativas capacidades que dependem de rede, fonte oficial, assinatura de dados ou hardware dedicado.

A 1.0.0 será considerada pronta quando uma pessoa conseguir preparar uma área, perder a internet, continuar vendo os dados locais, registrar uma rota, consultar orientação e sobrevivência, reconhecer limitações de conectividade e recuperar o fluxo depois da reconexão.

## 2. Escopo incluído

| Domínio | Entrega da 1.0.0 | Critério de aceite |
|---|---|---|
| Navegação urbana | Destino por toque/coordenadas, distância, rumo, pontos e rota local | Funciona sem conta e mantém dados locais sem rede. |
| Expedição | Trilha, waypoints, MGRS, bússola, retorno e preparação de área | Uma rota pode ser iniciada, pausada, retomada e apagada conscientemente. |
| Offline-first | Shell, dados locais, manual e tiles previamente preparados | Recarregar com o navegador offline não apaga o estado local. |
| Contextos | Cidade, Expedição, Mar, Desastre, Contaminação e Conflito | Contexto manual ou zona local com fonte/data; ausência de fonte não gera alerta. |
| Sobrevivência | Primeiros passos, primeiros socorros conservadores, abrigo, água, sinalização e explosivos | Conteúdo é acessível sem rede e contém limites/encaminhamento para ajuda. |
| Socorro | Última posição, precisão, horário, MGRS e compartilhamento manual | O app nunca declara que o resgate foi acionado sem confirmação de canal. |
| Energia | Perfis pontual, cidade, trilha, bússola e emergência | Alta precisão somente durante necessidade explícita; rota pausada reduz/encerra leituras. |
| Android/iOS | Projeto Capacitor, permissões e build de desenvolvimento | Android gera APK debug; iOS abre no Xcode e fica pronto para assinatura em Mac. |
| Auditoria financeira | Tela e contratos de doação preparados | Pagamentos permanecem bloqueados até credenciais, webhook e revisão. |
| Qualidade | Testes unitários, build, teste offline e checklist de acessibilidade | Nenhuma regressão crítica aberta no release candidate. |

## 3. Escopo explicitamente não prometido

A 1.0 não deve afirmar que um celular comum detecta drones, tropas, explosões, minas, radiação ou profundidade. Essas capacidades exigem fonte oficial, sensor externo, rádio, mensageiro satelital, beacon, sonar ou outro equipamento especializado. Também não haverá transmissão de rádio para “todos os cantos” sem hardware e autorização apropriados, nem cobrança real via Asaas antes da configuração e validação do recebedor.

O modo de área contaminada pode exibir zonas publicadas, instruções de afastamento e fonte/data. Ele não mede radiação. O modo de conflito pode exibir áreas de risco e restos explosivos conhecidos. Ele não confirma que uma rota é segura e não substitui autoridades, equipes humanitárias ou orientação local.

## 4. Fases de construção

### Fase A — Fundação e contrato de produto

Fechar os contratos de estado local, localização, contexto, fila offline e equipamentos externos. Registrar critérios de privacidade, conteúdo e linguagem de risco. Manter o módulo balístico legado isolado do fluxo civil.

### Fase B — Núcleo offline

Substituir qualquer persistência frágil por armazenamento local versionado, com validação de dados, migração e limpeza explícita. A fila offline deve guardar somente eventos permitidos, marcar tentativas e impedir envio de pagamentos ou SOS sem conectividade e confirmação.

### Fase C — Cartografia e navegação

Consolidar o cache da shell, preparar áreas por ação explícita, exibir fonte/atualização da base e mostrar quando um tile não foi preparado. Em etapas posteriores, adicionar pacotes cartográficos versionados e cartas náuticas oficiais; o cache inicial não deve ser chamado de carta certificada.

### Fase D — Contextos e segurança civil

Implementar a detecção por zonas locais com prioridade, raio válido, fonte, data e modo manual de fallback. Criar estados claros para informação, atenção e perigo. Não ativar uma zona sem coordenada/raio válidos e não transformar estimativas em alertas.

### Fase E — Sobrevivência

Manter o conteúdo local, conservador e revisável. Cada cartão deve ter fonte, data de revisão e alerta para procurar ajuda profissional. O conteúdo de alimentação não deve classificar automaticamente plantas ou cogumelos como comestíveis.

### Fase F — Socorro e hardware externo

Definir o pacote de última posição e os estados preparado/enfileirado/enviado/confirmado. Criar adaptadores somente para dispositivos identificados, com consentimento e logs. Um adaptador indisponível deve aparecer como não conectado, nunca como sensor simulado.

### Fase G — Cidades, mar e energia

Preservar a mesma navegação para cidade e trilha. Para o mar, exibir dados publicados como referência e enfatizar a necessidade de carta náutica adequada. A política de energia deve seguir o princípio de menor precisão/frequência suficiente: a Apple recomenda escolher o serviço de localização mais eficiente para o caso [1], e o Android alerta que localização em segundo plano pode afetar significativamente a bateria [2].

### Fase H — Doações preparadas

Manter checkout hospedado e sem armazenamento de cartão no Vanguard. Registrar referência interna, IDs do provedor, evento, bruto, tarifas, líquido, método, status, estorno e chargeback. O e-mail de auditoria para `lucasbb2007@gmail.com` só deve ser enviado depois de evento confirmado e conexão disponível. O sistema produz controle e exportação; não declara impostos automaticamente.

### Fase I — Empacotamento móvel

Manter uma base web compartilhada e projetos Capacitor separados para Android e iOS. Android terá APK debug para testes e depois release assinado. iOS terá projeto Xcode e configuração de permissões, mas a IPA exige Mac, Xcode, conta Apple e assinatura.

### Fase J — Release candidate e 1.0.0

Executar testes unitários, build web, build Android, abertura no Xcode, teste offline real, teste de permissões, teste de perda/retorno de rede, revisão de acessibilidade, revisão de conteúdo e checklist de privacidade. Somente então criar a tag `v1.0.0`.

## 5. Matriz de testes obrigatória

| Cenário | Resultado esperado |
|---|---|
| Primeiro carregamento online | Shell, mapa e telas carregam; preparação offline é visível. |
| Recarregamento sem internet | Shell, sobrevivência, contexto e dados locais continuam acessíveis. |
| Tile fora do cache | App explica que a área não foi preparada; não exibe mapa inventado. |
| GPS sem internet | Posição local pode ser lida; nenhuma transmissão é presumida. |
| Rota iniciada/pausada | Alta precisão apenas na gravação; pausa reduz o consumo. |
| Zona inválida | Não ativa contexto e não cria alerta. |
| Zona válida sem internet | Mantém fonte/data e contexto salvo no aparelho. |
| Modo Socorro sem canal | Prepara pacote e informa que nenhum resgate foi acionado. |
| Fila offline | Eventos permitidos ficam pendentes; pagamentos não são enviados offline. |
| Reconexão | Eventos compatíveis podem sincronizar com idempotência e registro de resultado. |
| Permissão negada | Interface explica a limitação e preserva as funções locais disponíveis. |
| Android Xiaomi | Testar permissões, otimização de bateria e retorno ao app sem perder rota. |
| iPhone | Testar precisão reduzida, pausa, background opt-in e consumo em dispositivo real. |
| Acessibilidade | Teclado, foco, contraste, labels, toque e leitura por tecnologia assistiva. |

## 6. Gates de lançamento

A 1.0 não será liberada se houver perda de rota ao recarregar offline, alerta sem fonte/data, transmissão sem confirmação, pedido automático de permissão sensível, cobrança real sem configuração explícita, armazenamento de cartão, build nativo não reproduzível, conteúdo de sobrevivência sem revisão ou linguagem que atribua ao telefone uma capacidade militar inexistente. No estado atual, os gates automatizados estão verdes; ainda bloqueiam o fechamento final os testes em aparelhos Android/Xiaomi e iPhone reais, a confirmação de operação offline com rede desligada e a assinatura de distribuição.

## 7. Roadmap pós-1.0

Depois da 1.0, as prioridades serão pacotes cartográficos completos e versionados, fontes oficiais sincronizadas por região, integração certificada com mensageiro satelital e beacons, suporte a sensores Geiger e sonar, sincronização autenticada, painel Asaas em Sandbox/produção, testes de campo com usuários e métricas de bateria por dispositivo. Cada integração terá um contrato próprio, estado de conexão, data da última leitura e política de falha segura.

## Referências

[1]: [Apple Developer — Getting the current location of a device](https://developer.apple.com/documentation/corelocation/getting-the-current-location-of-a-device)
[2]: [Android Developers — About background location and battery life](https://developer.android.com/develop/sensors-and-location/location/battery)
