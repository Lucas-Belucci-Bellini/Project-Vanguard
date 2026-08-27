# Plano de teste em campo — Caminhos dos Anjos, setembro de 2026

## Dados confirmados na fonte oficial

A página oficial de inscrição informa a **Peregrinação Caminhos dos Anjos — Setembro 2026**, de **04 a 07 de setembro de 2026**, com saída de **Londrina às 23h00 no dia 04/09**, rumo ao **Santuário São Miguel Arcanjo**. A organização identificada é a Associação de Peregrinos e Amigos dos Caminhos de São Miguel Arcanjo (APACSMA). A página oficial de informações informa que detalhes adicionais ainda serão publicados e orienta contato com a equipe.

Fonte da inscrição: <https://caminhosdosanjos.com.br/inscricao/>. Fonte de informações e contatos: <https://caminhosdosanjos.com.br/informacoes/>.

> Este documento não inventa distância, trajeto, pontos de apoio, horários intermediários, abrigo, cobertura de telefonia ou arquivo GPX. Esses dados precisam ser confirmados com a organização antes da saída.

## Objetivo do teste

O objetivo é avaliar o Vanguard Field como ferramenta **civil de apoio à navegação local e registro offline**, não como substituto da organização da peregrinação, de um guia, da sinalização do percurso, de comunicação de emergência ou de uma carta oficial. O teste deve verificar se a pessoa consegue abrir o aplicativo, confirmar um fixo GPS, ler MGRS, preparar uma área de mapa, registrar uma trilha e exportar os dados sem internet.

## Antes da saída de Londrina

| Etapa | Conferência | Critério de aprovação |
|---|---|---|
| Versão | Confirmar que o aplicativo usado é o build/teste escolhido e registrar seu commit | Não chamar APK debug de release; anotar a versão e o commit |
| Permissões | Conceder localização e verificar se o sistema mostra o indicador correspondente | O mapa recebe um fixo real; nenhum GPS fictício é aceito |
| Posição | Abrir o mapa em local conhecido e conferir latitude/longitude, precisão e MGRS | A posição é plausível e o HUD mostra a idade do último fixo |
| Frescor | Aguardar alguns minutos sem novo fixo ou interromper temporariamente a leitura | A idade avança; um fixo antigo fica identificado como atenção |
| Mapas | Enquanto houver internet, preparar as áreas realmente necessárias conforme o trajeto oficial | O status mostra base, zoom, relação solicitado/salvo e metadados; isso não prova cobertura completa |
| Offline | Ativar modo avião ou desligar dados após a preparação e reabrir as telas | Shell, dados locais, mapa preparado e manual continuam acessíveis; tiles não preparados podem falhar |
| Registro | Iniciar uma rota curta de teste, marcar um waypoint e pausá-la | O ponto fica local; ao pausar, a política retorna ao perfil econômico |
| Socorro | Preparar o pacote local e verificar o conteúdo sem simular envio | O pacote contém coordenadas, MGRS, precisão e hora; não há alegação de entrega ou resgate |
| Backup | Exportar JSON e GPX de teste e confirmar que os arquivos podem ser lidos localmente | Arquivos são criados; a rota importada fica pausada |

Levar bateria reserva e um meio independente de comunicação. Confirmar com a organização o trajeto oficial, pontos de encontro, rede de apoio, contatos de emergência, horário de retorno, regras de acompanhamento e se existe um arquivo GPX ou mapa oficial para importação. O aplicativo não deve ser usado para criar uma rota inventada quando a organização ainda não publicou o percurso.

## Durante os dias 04 a 07 de setembro

Usar **Trilha / Expedição** para registrar o caminho. Iniciar a rota somente quando começar o trecho que deve ser registrado, marcar pontos úteis como saída, encontro, pausa e retorno, e pausar a rota durante longas paradas. A alta precisão é reservada à gravação ativa; a tela ativa é opcional e deve ser usada apenas quando necessária, porque a autonomia real depende do aparelho, sinal, brilho, temperatura e bateria externa.

Observar o HUD antes de tomar qualquer decisão: conferir o MGRS, a latitude/longitude, a precisão e a **idade do fixo**. Se a idade indicar um dado antigo, se a precisão estiver indisponível ou se a posição parecer incompatível com o local, parar e confirmar a situação usando a organização, a sinalização, o grupo e outras referências. Uma tela com mapa não confirma sozinha a posição física da pessoa.

O modo offline não faz sincronização automática. A rota, os waypoints e o destino permanecem no aparelho. Exportar um backup somente em momentos seguros, sem interromper a caminhada em local de risco. Não apagar a única cópia durante o percurso.

## Preparação de socorro

O Modo Socorro pode deixar um pacote local pronto para compartilhamento manual. Ele não envia rádio, SMS, e-mail ou satélite sozinho, não confirma entrega e não aciona uma equipe. Em uma situação real, priorizar o procedimento oficial da peregrinação e os serviços de emergência disponíveis no local; compartilhar o pacote apenas por um canal funcional e depois de confirmar o destinatário. Não fazer um “teste” que possa ser interpretado como pedido real de resgate.

Se não houver rede ou hardware de comunicação, o pacote permanece apenas no aparelho. O Vanguard Field não transforma GPS/GNSS em comunicação e não deve ser tratado como único plano de segurança.

## Depois do percurso

Em local seguro, pausar a rota, exportar o JSON completo e o GPX, conferir o resumo de distância e tempo e manter uma cópia fora do aparelho. Registrar falhas de GPS, perda de tiles, consumo de bateria, permissões, travamentos, legibilidade da tela e comportamento durante a alternância entre online e offline. Esses resultados serão evidência de teste de campo, não autorização automática para criar a tag final.

## O que ainda precisa ser confirmado pela organização

A página oficial de informações consultada ainda diz que mais informações serão publicadas. Antes da peregrinação, confirmar diretamente com a APACSMA o trajeto oficial, a distância e os trechos de estrada ou trilha, os pontos de apoio e água, a logística de transporte, o protocolo de emergência, os contatos de apoio, a cobertura esperada, o mapa/GPX oficial e qualquer alteração de data ou horário.

## Fontes

- [Inscrição — Caminhos dos Anjos](https://caminhosdosanjos.com.br/inscricao/).
- [Informações — Caminhos dos Anjos](https://caminhosdosanjos.com.br/informacoes/).
- [`README.md`](../README.md) — tutorial e limitações do aplicativo.
- [`docs/NOTAS-DE-LANCAMENTO-V1.0.0.md`](./NOTAS-DE-LANCAMENTO-V1.0.0.md) — escopo e gates da futura v1.0.0.
