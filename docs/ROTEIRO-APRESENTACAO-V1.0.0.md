# Roteiro falado — Vanguard Field v1.0.0

Este roteiro acompanha o deck `presentation-v1.0.0` e deve ser usado em uma apresentação técnica de aproximadamente 12 a 15 minutos. A narrativa separa claramente código, build, artifact, release candidate e release final. A versão final ainda depende dos gates físicos e de distribuição descritos no checklist.

| Slide | Mensagem | Tempo |
|---:|---|---:|
| 1 | O produto é uma ferramenta civil offline-first. | 1 min |
| 2 | Build validado e release publicada são estados diferentes. | 1 min |
| 3 | Offline depende de preparação e limites visíveis. | 1,5 min |
| 4 | GPS/MGRS orientam; a idade do fixo evita falsa atualidade. | 1,5 min |
| 5 | JSON e GPX mantêm backup e interoperabilidade locais. | 1 min |
| 6 | Contexto e sobrevivência informam sem inventar sensores. | 1,5 min |
| 7 | Socorro prepara dados, mas não aciona resgate. | 1 min |
| 8 | Mobile exige teste real, assinatura e atualização confirmada. | 1,5 min |
| 9 | A peregrinação valida campo, rede, bateria e backup. | 1,5 min |
| 10 | A tag só nasce depois do checklist completo. | 1 min |

## Slide 1 — Vanguard Field v1.0.0

**Fala:** "Este é o Vanguard Field, uma ferramenta civil de navegação para cidade, caminhada, expedição, mar como referência e proteção civil. A versão 1.0.0 reúne GPS/GNSS, bússola, MGRS, destino, waypoints, trilha, contexto e manual local em uma experiência pensada para continuar útil quando a internet desaparece. A proposta não é transformar o telefone em equipamento militar ou de resgate. A proposta é organizar melhor a informação local e deixar os limites visíveis antes que alguém dependa dela."

**Transição:** "Para interpretar corretamente essa versão, primeiro precisamos separar o que foi compilado do que foi publicado."

## Slide 2 — A tag final ainda depende de gates reais

**Fala:** "O código em `main` pode estar compilando, os testes podem passar e um APK debug pode ser gerado. Nada disso, sozinho, é uma release distribuível. A `v1.0.0-rc.2` é um snapshot histórico. A tag final `v1.0.0` ainda depende de teste em Android, Xiaomi e iPhone, validação de bateria e rede, assinatura dos artefatos e revisão explícita. Esta separação evita que um artifact técnico seja apresentado como produto pronto para loja."

**Transição:** "Com o estado de entrega definido, vamos olhar para o que realmente continua disponível sem internet."

## Slide 3 — Offline-first com transparência operacional

**Fala:** "A shell, o manual, os dados de rota, os waypoints e os destinos ficam no aparelho. O mapa precisa de preparação enquanto há conexão. A área visível e níveis próximos são planejados com limite de 256 URLs por preparação. O status informa quantidade, base, zoom e relação solicitado versus salvo quando esses dados existem, mas esse contador não prova que toda uma região está coberta. Antes da caminhada, é obrigatório preparar o trajeto oficial e testar com modo avião e Wi-Fi desligado. Tiles não preparados, avisos novos, sincronização e transmissão continuam indisponíveis."

**Transição:** "A disponibilidade offline resolve uma parte do problema; a outra é saber se a posição que estamos vendo ainda é atual."

## Slide 4 — GPS e MGRS transformam posição em referência

**Fala:** "O aparelho calcula latitude, longitude, precisão, rumo, distância e MGRS a partir dos sinais GNSS recebidos. O MGRS organiza a referência, mas não envia a posição. A indicação de idade do fixo informa se o dado chegou agora ou se tem minutos, horas ou dias. Quando a posição fica antiga, o HUD entra em atenção. Antes de seguir uma decisão, compare MGRS, precisão, idade, terreno, sinalização e orientação do grupo. Uma coordenada antiga é um dado histórico, não uma garantia de que a pessoa permanece naquele lugar."

**Transição:** "Como a posição e a rota são dados do usuário, a versão também precisa facilitar cópia e restauração sem depender de uma conta."

## Slide 5 — Registros locais continuam interoperáveis

**Fala:** "No mapa, **Exportar JSON** cria o backup nativo com trilha, waypoints e destino. **Exportar GPX** cria a trilha e seus waypoints para uso em outros aplicativos compatíveis; altitude e horário entram quando são válidos. Antes da largada, exporte os dois, copie para um local seguro e faça uma importação de teste. A importação valida pontos, pede confirmação antes de substituir o estado atual e deixa a rota pausada. Isso reduz o risco de sobrescrever ou iniciar uma gravação acidentalmente."

**Transição:** "Os registros ajudam a preservar o caminho; o contexto ajuda a interpretar o ambiente sem criar falsas capacidades."

## Slide 6 — Contexto civil orienta sem inventar alertas

**Fala:** "Os modos Cidade, Expedição, Mar, Desastre, Contaminada e Conflito organizam a interface e as zonas locais. Cada zona pode ter fonte, raio e validade, mas isso não a transforma em alerta oficial automático. O manual de sobrevivência é conservador: abrigo, água, primeiros socorros e sinalização, sem ensinar identificação perigosa de alimentos ou manipulação de explosivos. O modo Mar é referência visual; não fornece profundidade segura, carta náutica oficial, sonar ou julgamento local. Também não há radar de drones, Geiger ou detecção autônoma de tropas."

**Transição:** "Quando o assunto é emergência, a diferença entre informação e comunicação precisa ficar ainda mais explícita."

## Slide 7 — Socorro preparado não é resgate acionado

**Fala:** "O Modo Socorro reúne MGRS, latitude/longitude, precisão e horário em um pacote local. A pessoa pode abrir o compartilhamento do sistema operacional ou copiar o texto para um canal que realmente exista. O Vanguard não envia SOS sozinho, não confirma entrega e não chama uma equipe. A simulação segura usa um aplicativo de notas, um e-mail para si mesmo ou um contato previamente avisado. Não usamos números de emergência, grupos públicos, canais de rádio de emergência ou a função SOS real de um mensageiro satelital."

**Transição:** "Além do conteúdo, a versão precisa sobreviver a atualizações sem interromper o usuário ou instalar algo de forma silenciosa."

## Slide 8 — Build validado não é release publicada

**Fala:** "No PWA, um service worker novo pode baixar e ficar aguardando. O cabeçalho mostra **ATUALIZAÇÃO PRONTA** e só depois da confirmação ativa o novo código e recarrega a aplicação. No APK, o botão pode abrir a página oficial de uma versão posterior, mas o telefone não instala um APK sozinho: download, verificação e instalação continuam sob confirmação do sistema. Sem rede, o aviso não bloqueia o uso local. O APK debug continua sendo artifact de teste. A distribuição final exige assinatura Android, fluxo Apple e validação em aparelhos reais."

**Transição:** "O teste de campo coloca todas essas regras sob as condições que importam: movimento, rede irregular e bateria limitada."

## Slide 9 — Caminhos dos Anjos: teste de campo planejado

**Fala:** "A peregrinação Caminhos dos Anjos, prevista de 04 a 07 de setembro de 2026, com saída de Londrina às 23h de 04/09, pode servir como contexto de validação, usando apenas trajeto oficial e orientações da organização. Antes da largada, preparamos mapas, exportamos JSON e GPX e fazemos o teste offline. Durante a caminhada, anotamos bateria, idade do fixo, perda e retorno de rede, pausa e retomada da rota e comportamento com a tela bloqueada. A alta precisão é solicitada apenas na rota ativa; o sistema operacional ainda define a frequência real. Powerbank e comunicação independente são obrigatórios."

**Transição:** "Os resultados do campo entram no checklist final, que define se a versão pode ser marcada."

## Slide 10 — O caminho até v1.0.0 final

**Fala:** "O checklist final combina Android comum, Xiaomi/MIUI/HyperOS e iPhone real; permissões; ciclo de vida; GPS/MGRS; frescor do fixo; cache; offline real; bateria; acessibilidade; importação e exportação; Socorro manual; e atualização confirmada. Depois vêm os artefatos de produção assinados e a validação de distribuição. Com o commit aprovado, usamos os comandos documentados para criar uma tag GPG ou SSH, verificar a assinatura e publicar a release com `gh`. Até todos esses passos serem aprovados, `main` continua sendo código em evolução e a `rc.2` continua sendo a única release pública."

**Encerramento:** "O Vanguard Field pretende ser útil porque é explícito: posicionamento não é comunicação, mapa preparado não é cobertura completa, build não é release e uma tela de Socorro não é resgate confirmado."
