# Roteiro de apresentação — Vanguard Field v1.0.0

Este documento fornece um roteiro de fala sugerido para acompanhar os slides da futura release `v1.0.0` (projeto `presentation-v1.0.0`). O objetivo é garantir que a audiência compreenda a utilidade da ferramenta sem criar falsas expectativas de resgate automático ou cobertura mágica.

## Slide 1: Capa
**Visual:** Vanguard Field v1.0.0 — Navegação civil offline-first...
**Fala:** "Olá. Vamos repassar o estado atual do Vanguard Field. Esta é a consolidação do escopo da versão 1.0.0, desenhada para ser uma ferramenta civil de apoio à navegação, útil na cidade, em caminhadas, expedições e proteção civil. O foco principal desta versão é garantir autonomia offline sem esconder do usuário as limitações técnicas do próprio celular."

## Slide 2: A tag final ainda depende de gates reais
**Visual:** Build validado / Release candidate / v1.0.0 final
**Fala:** "Antes de detalhar as funcionalidades, é importante deixar claro nosso contrato de entrega. Hoje, temos 107 testes passando, a compilação web e o APK debug funcionam perfeitamente. O código está em `main` e a única release publicada é a `rc.2`. Não vamos criar a tag final `v1.0.0` hoje. Ela depende de testes de campo, validação de bateria e assinatura oficial para Android e iOS. Build técnico não é release."

## Slide 3: Offline-first com transparência operacional
**Visual:** Shell e dados, Trilha, Interoperabilidade, Mapa preparado.
**Fala:** "A principal entrega da v1.0.0 é a capacidade de funcionar sem internet de verdade. Se você abre o app e vai para uma área sem sinal, a interface, a bússola, os seus dados e o manual de sobrevivência continuam lá. O mapa exige preparação prévia: você baixa até 256 áreas por vez. O diferencial aqui é a transparência: o app avisa quantos mapas você tem, mas não mente dizendo que isso garante cobertura do estado inteiro. Acabou a cota, você precisa de internet para baixar mais."

## Slide 4: GPS e MGRS transformam posição em referência
**Visual:** Coordenadas, Grade MGRS, Rumo / Idade do fixo, Limites.
**Fala:** "Na navegação, usamos o GPS do aparelho para calcular distância e rumo até um destino, além de converter a posição para a grade MGRS, que é o padrão de busca e salvamento. Mas a maior novidade é a indicação de 'frescor'. O mapa mostra há quanto tempo o GPS leu aquela posição. Se o fixo for antigo, ele fica amarelo. Isso impede que alguém tome uma decisão crítica achando que está num lugar, quando na verdade o celular perdeu o sinal há cinco minutos."

## Slide 5: Registros locais continuam interoperáveis
**Visual:** JSON Versionado / GPX 1.1 / Validação e Segurança.
**Fala:** "Os dados não ficam presos no Vanguard. Você pode exportar sua trilha e waypoints em GPX para usar em outros apps, ou fazer um backup completo em JSON. O importante é que isso funciona 100% offline. E na hora de importar, o app pede confirmação e deixa a rota pausada. Você não vai sobrescrever seu percurso acidentalmente no meio do mato."

## Slide 6: Contexto civil orienta sem inventar alertas
**Visual:** Zonas Locais, Manual, Modo Mar, Limites de Detecção.
**Fala:** "Nós organizamos a informação através de contextos: Cidade, Expedição, Mar. O manual de sobrevivência é conservador: ensina o básico, mas não manda ninguém comer planta desconhecida ou desarmar explosivo. O Modo Mar deixa claro que imagem de satélite não é carta náutica. E nós removemos qualquer promessa irreal: o app não é radar de drone, não mede radiação e não é sonar. Ele é um organizador de navegação."

## Slide 7: Socorro preparado não é resgate acionado
**Visual:** O que faz (Pacote local) / O que não faz (Limites).
**Fala:** "No Modo Socorro, aplicamos a mesma transparência. O app coleta seu MGRS, latitude, precisão e horário, e monta um texto claro para você compartilhar. Mas ele **não envia** essa mensagem sozinho. Se você não tem sinal de celular, rádio ou mensageiro via satélite, o pacote fica apenas no aparelho. Posicionamento é diferente de comunicação, e o usuário precisa saber disso antes da emergência."

## Slide 8: Build validado não é release publicada
**Visual:** O que temos hoje / O que falta para Release.
**Fala:** "Reiterando nosso processo: temos o código pronto, testado e gerando artefatos de debug. Para transformar isso em uma release distribuível nas lojas, ainda precisamos passar pelos fluxos de assinatura de segurança da Apple e do Google, além dos testes práticos que mencionei."

## Slide 9: Caminhos dos Anjos: teste de campo planejado
**Visual:** O Evento, Objetivo do Teste, Limites e Segurança.
**Fala:** "Para validar tudo isso, planejamos um teste de campo real na peregrinação Caminhos dos Anjos, em setembro de 2026, saindo de Londrina. Vamos testar a perda de rede, a duração da bateria com a tela apagada, a precisão do GPS e a exportação de GPX no meio do trajeto. Mas atenção: o Vanguard será usado como apoio. Ele não substitui a organização do evento, a sinalização ou os guias."

## Slide 10: O caminho até v1.0.0 final
**Visual:** Dispositivos, Teste de Campo, Segurança, Distribuição.
**Fala:** "Para encerrar, este é o nosso checklist até a v1.0.0: 1. Aparelhos físicos (Android/iOS). 2. O teste de campo na peregrinação. 3. A confirmação de que ninguém vai usar o Modo Socorro achando que é um resgate mágico. 4. Assinatura e publicação. Só depois de passar por esses quatro portões é que a tag v1.0.0 será criada no repositório. Obrigado."
