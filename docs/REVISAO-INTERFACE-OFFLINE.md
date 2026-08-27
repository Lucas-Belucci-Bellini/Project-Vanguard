# Revisão visual e roteiro de teste offline

## Estado observado no preview

A tela `#/sobrevivencia` apresenta o título **Conhecimento quando a rede some**, um aviso de preparação antes da saída, cartões expansíveis para primeiro minuto, primeiros socorros, abrigo/temperatura, água, alimentação/plantas, sinalização/retorno e minas/restos explosivos, além de um acesso aos modos de contexto. A hierarquia é de leitura rápida, com alto contraste e etiquetas de risco.

A tela `#/contexto` apresenta seis cartões: Cidade/Dia a Dia, Trilha/Expedição, Mar/Navegação, Zona de Desastre, Área Contaminada e Área de Conflito. O painel informa quando a escolha manual está ativa, permite atualizar o GPS, cadastrar zonas locais com nome, tipo, latitude, longitude, raio e fonte/data e mostra as integrações externas como não conectadas.

## Roteiro manual de teste offline no navegador

1. Abrir o app com conexão e visitar `#/sobrevivencia`, `#/contexto` e `#/mapa`.
2. Abrir todos os cartões de sobrevivência e confirmar que os textos aparecem sem uma nova requisição.
3. No `#/mapa`, centralizar na região desejada, escolher a base e tocar em **Preparar área offline**.
4. Desligar a rede do aparelho ou usar DevTools > Network > Offline.
5. Recarregar o app e verificar se a shell, o manual, os modos, a posição salva, os pontos e os tiles preparados permanecem disponíveis.
6. No `#/mapa`, iniciar e pausar uma rota; confirmar que o registro continua no aparelho e que o modo urbano usa política econômica.
7. No `#/contexto`, verificar que zonas cadastradas continuam ativas offline, exibindo a fonte e a data salvas.
8. Tentar acessar uma área ou tile não preparado; confirmar que o app informa a limitação em vez de inventar mapa.
9. No `#/socorro`, preparar uma posição e verificar que o app não declara que o resgate foi acionado sem canal externo.
10. Reativar a rede e confirmar que funções dependentes de conexão podem ser retomadas sem apagar os dados locais.

## Bateria

A implementação atual usa perfis de localização: consulta pontual, cidade econômica, trilha ativa e bússola econômica. O mapa troca entre `cidade` e `trilha` quando o modo de uso muda; a bússola usa o perfil de menor consumo. A trilha só usa alta precisão enquanto a gravação está ativa.

A orientação de produto é que a versão nativa futura use atualizações em segundo plano somente com autorização explícita, distância mínima, pausas automáticas e interrupção quando a rota estiver pausada. A documentação de referência está em `docs/MOBILE-E-BATERIA.md`.

## Limites do teste

O preview web não comprova ainda a execução nativa em segundo plano, a integração com mensageiro via satélite, contador Geiger, beacon, rádio, sonar, pagamento ou envio de e-mail. Essas capacidades precisam ser validadas com os respectivos aparelhos, provedores, permissões e ambientes reais.
