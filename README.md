# VANGUARD FIELD

**Navegação multiuso para cidade, caminhadas e áreas remotas.** O Vanguard Field combina GPS/GNSS do aparelho, bússola, mapa com grade MGRS, registro local de trilha, destinos urbanos e um protocolo de compartilhamento de coordenadas para situações de emergência.

A interface foi desenhada para uso em celular, com botões grandes, alto contraste, modo noturno vermelho e navegação instalável como PWA em Android, incluindo aparelhos Xiaomi com MIUI ou HyperOS. O projeto também mantém compatibilidade web para testes e evolução rápida.

> O Vanguard Field ajuda a organizar uma navegação e a preparar uma posição para transmissão. **Ele não substitui treinamento de orientação, carta offline, bateria reserva, plano de viagem, equipe de emergência ou um comunicador via satélite.**

## O que já está implementado

| Área | Comportamento |
|---|---|
| **Início** | Painel de campo, ativação explícita do GPS, atalhos, tutorial de primeiro uso e cartão local de prontidão offline. |
| **Mapa** | Mapa MapLibre, bases topográfica/satélite/tática, leitura MGRS, centralização no fixo atual e pontos de referência. Inclui os modos **Trilha / Expedição**, **Cidade / Dia a dia** e **Mar / Referência**, com destino por coordenadas ou toque no mapa. O mapa mostra o contexto civil e a zona local ativa, quando houver, com fonte e validade. O HUD exibe a idade do último fixo e marca posições antigas como atenção; isso não melhora a precisão nem confirma que o aparelho ainda está naquele ponto. O preparo informa estimativa/limite de tiles, consulta o cache e oferece limpeza confirmada. O status detalhado mostra o total agregado no aparelho e, quando disponível, a última base, área, zoom e relação de tiles solicitados/salvos. |
| **Trilha** | Registro local do caminho com distância acumulada, pausa, retomada, limpeza manual e resumo de pontos, tempo registrado e velocidade média quando os horários existem. Os pontos ficam no aparelho. O registro de rota, waypoints e destino pode ser exportado/importado como JSON versionado e a trilha pode ser exportada em GPX 1.1, sempre sem sincronização automática. A persistência local usa envelopes versionados e fallback seguro para versões futuras. |
| **Bússola** | Sensor de orientação do dispositivo com fallback para rumo fornecido pelo GPS e instruções de calibração. |
| **Socorro** | Captura da posição, criação de pacote externo validado, preparação local do alerta e compartilhamento manual via recursos do aparelho ou área de transferência, com estados explícitos e sem confirmação de entrega. |
| **Privacidade** | A posição não é enviada automaticamente. O compartilhamento só começa depois de uma ação explícita da pessoa. |
| **Offline parcial** | A shell do app e os dados locais podem ser reabertos sem internet depois do primeiro carregamento. Tiles cartográficos precisam ser preparados para uso offline em uma etapa própria. O modo Mar é apenas referência: não fornece profundidade segura nem substitui carta oficial. |
| **Apoiar projeto** | Tela pública em modo preparado para futuras doações via checkout hospedado do Asaas com PIX e cartão, sem cobrança real enquanto as credenciais não forem configuradas. |
| **Contexto** | Modos Cidade, Expedição, Mar, Zona de Desastre, Área Contaminada e Área de Conflito, com zonas locais por fonte, validade opcional, importação/exportação JSON versionada e descarte automático de zonas expiradas. |
| **Sobrevivência** | Manual offline versionado com fonte/data de revisão, busca, filtros por tema, abrigo, água, primeiros socorros, sinalização, alimentação e conduta em áreas com possíveis explosivos. |
| **Mapa de funcionalidades** | Inventário completo da visão do produto, com status, dependências, limites e próximos passos em [`docs/MAPA-DE-FUNCIONALIDADES.md`](docs/MAPA-DE-FUNCIONALIDADES.md). |
| **Notas de lançamento** | Resumo da futura `v1.0.0`, mudanças desde a `v1.0.0-rc.2`, validações reproduzidas e gates restantes em [`docs/NOTAS-DE-LANCAMENTO-V1.0.0.md`](docs/NOTAS-DE-LANCAMENTO-V1.0.0.md). |
| **Roteiro e validação** | Roteiro falado, checklist mobile e simulação segura de Socorro em [`docs/ROTEIRO-APRESENTACAO-V1.0.0.md`](docs/ROTEIRO-APRESENTACAO-V1.0.0.md), [`docs/CHECKLIST-MOBILE-V1.0.0.md`](docs/CHECKLIST-MOBILE-V1.0.0.md) e [`docs/SIMULACAO-MODO-SOCORRO.md`](docs/SIMULACAO-MODO-SOCORRO.md). |
| **Teste de campo** | Procedimento de backup GPX/JSON, teste offline, bateria e preparação para a peregrinação em [`docs/PLANO-TESTE-PEREGRINACAO-CAMINHOS-DOS-ANJOS-2026-09.md`](docs/PLANO-TESTE-PEREGRINACAO-CAMINHOS-DOS-ANJOS-2026-09.md). |
| **Atualização** | Quando houver uma versão nova, o botão **ATUALIZAÇÃO PRONTA** pede confirmação. No PWA, ativa o service worker aguardando; no APK, abre a página oficial e deixa a instalação para a confirmação do sistema. O fluxo completo está em [`docs/ATUALIZACAO-CONFIRMADA.md`](docs/ATUALIZACAO-CONFIRMADA.md). |
| **Bateria e GPS** | Operação de quatro dias, perfis de localização, medição em campo e limitações de background em [`docs/OPERACAO-BATERIA-GPS-4-DIAS.md`](docs/OPERACAO-BATERIA-GPS-4-DIAS.md). |
| **Tag final** | Comandos seguros para revisar, assinar, verificar e publicar a futura `v1.0.0` em [`docs/COMANDOS-TAG-V1.0.0.md`](docs/COMANDOS-TAG-V1.0.0.md). |
| **Performance futura** | Direção para linguagens leves, profiling e camadas nativas somente quando justificadas em [`docs/MEGA-PLANO.md`](docs/MEGA-PLANO.md#7-direção-futura-de-performance-e-linguagens-leves). |
| **Diagnóstico** | Estado local de versão, rede, GPS, frescor, cache, armazenamento, bateria e sensores em `#/diagnostico`; a validação de aparelhos permanece pendente. |

## Estado da construção V2

O prompt contínuo da V2 é executado sobre o estado real sem reiniciar o projeto. A memória persistente está em [`V2_STATUS.md`](V2_STATUS.md), [`V2_MASTER_CHECKLIST.md`](V2_MASTER_CHECKLIST.md), [`V2_PROGRESS.md`](V2_PROGRESS.md), [`V2_BLOCKERS.md`](V2_BLOCKERS.md), [`V2_DECISIONS.md`](V2_DECISIONS.md), [`V2_CHANGELOG.md`](V2_CHANGELOG.md), [`V2_RISK_REGISTER.md`](V2_RISK_REGISTER.md), [`V2_TEST_MATRIX.md`](V2_TEST_MATRIX.md), [`V2_FEATURE_MATRIX.md`](V2_FEATURE_MATRIX.md) e [`V2_ARCHITECTURE_MAP.md`](V2_ARCHITECTURE_MAP.md). Itens não necessários para a V2 ficam em [`V3_BACKLOG.md`](V3_BACKLOG.md). O estado atual é **V2 IN PROGRESS**; o próximo gargalo civil escolhido é um diagnóstico local observável, sem telemetria escondida.

A stack atual permanece JavaScript ES2022, Vite, Capacitor e MapLibre até que profiling real justifique Kotlin, Swift ou Rust/WASM. O módulo legado balístico é `LEGACY-RESTRICTED` e não recebe novas capacidades operacionais.

## Modo offline-first

Depois do primeiro carregamento, a shell do Vanguard, as telas, a posição, a bússola, as rotas, os pontos, os destinos, as zonas importadas e o manual de sobrevivência podem continuar funcionando sem internet. No HUD do mapa, `agora` significa que o último fixo tem menos de 10 segundos; depois disso a idade é mostrada em minutos, horas ou dias. Um fixo antigo é apenas um dado histórico e deve ser confirmado antes de tomar decisões de navegação ou socorro. Na tela inicial, o cartão **Prontidão offline** resume posição, mapa preparado, dados locais, manual e comunicação independente; ele é uma conferência local, não um teste de cobertura nem uma confirmação de SOS. No mapa, mova-se até a área desejada, escolha a base cartográfica e toque em **Preparar área offline** enquanto ainda estiver conectado. O aplicativo guarda até 256 URLs por preparação da área visível e de níveis próximos, informa quando a estimativa excede esse limite, mostra o status do cache e permite limpar os mapas com confirmação. O total é agregado ao aparelho e os metadados da última tentativa não garantem cobertura completa da área; prepare novamente depois de mover o mapa ou trocar de base.

A internet continua sendo necessária para obter tiles que ainda não foram baixados, receber avisos novos, enviar e-mail, sincronizar eventos, abrir o futuro checkout Asaas e transmitir um SOS por serviço externo. O modo Mar não transforma imagem de satélite em carta náutica nem estima profundidade; use produtos oficiais e informações atualizadas das autoridades. O backup JSON de rota, waypoints e destino é criado e lido localmente, sem conta ou rede. Arquivos GPX também podem ser importados localmente; pontos de trilha e waypoints são validados e a rota importada fica pausada. O GPS/GNSS e a bússola podem fornecer dados locais sem rede, mas nenhum dos dois transmite um pedido de socorro sozinho.

## Como usar em uma expedição

Para usar no dia a dia, abra o **Mapa**, selecione **Cidade / Dia a dia**, ative o GPS e defina um destino colando latitude/longitude ou tocando em **Tocar no mapa**. O cartão **Contexto civil** informa o contexto padrão e, quando aplicável, a zona local ativa, sua fonte e validade; isso é uma referência local e não um alerta oficial automático. O Vanguard mostra a distância geográfica e o rumo até o destino; ele não depende de uma conta ou de um servidor próprio para guardar essa informação. Para uma caminhada urbana ou expedição, selecione **Trilha / Expedição**, toque em **Iniciar rota** e use **Marcar ponto** em acampamentos, bifurcações, travessias, estacionamentos ou outros locais importantes. A rota é registrada no armazenamento local do aparelho. O cartão da rota mostra a distância e, quando os horários dos pontos permitem, o tempo registrado e a velocidade média; quando não permitem, informa que o dado está indisponível em vez de estimá-lo. No modo **Mar / Referência**, confirme sempre a carta náutica oficial e os avisos aplicáveis antes de navegar. Em **Dados locais**, use **Exportar JSON** para backup completo, **Exportar GPX** para abrir a trilha em outro aplicativo compatível, ou **Importar JSON/GPX** para restaurar um backup ou trazer uma trilha compatível; a importação substitui os dados atuais somente após confirmação e deixa a rota pausada. A alta precisão só é solicitada durante a gravação ativa; ao pausar, o mapa retorna ao perfil econômico. A opção **Manter tela ativa** é voluntária e só fica disponível durante uma rota ativa.

Na tela **Bússola**, toque em **Ativar sensor do aparelho**. A mesma ferramenta pode orientar uma caminhada no bairro, uma corrida ou uma travessia em área remota. Segure o telefone plano e longe de objetos magnéticos; se a leitura parecer errada, calibre o aparelho conforme as instruções do próprio sistema e compare a direção com o deslocamento observado no mapa.

Antes de entrar em uma região sem sinal, confira na tela inicial a **Prontidão offline**, ative o GPS, prepare a área do mapa, abra **Sobrevivência** e avise alguém do itinerário. Depois, abra **Modo socorro**, atualize a posição e prepare o alerta local. Isso cria um pacote de coordenadas no aparelho, mas **não contata uma equipe**. Quando houver rede móvel, Wi-Fi, rádio com dados ou um mensageiro via satélite compatível, toque em **Compartilhar coordenadas** e confirme o destinatário.

## GPS, satélite e resgate: o que o celular consegue fazer

O GPS/GNSS é um sistema de **posicionamento**: o aparelho recebe sinais de satélites e calcula uma posição. Essa etapa pode continuar funcionando sem internet, embora relevo, cobertura do céu, interferência, bateria e qualidade do receptor alterem a precisão.

Um celular comum não transforma automaticamente essa posição em um pedido de resgate via satélite. **Posicionamento e comunicação são funções diferentes.** Para que uma equipe receba sua localização fora da rede móvel, é necessário um meio de transmissão compatível, como um comunicador via satélite ou rádio com dados. O aplicativo deixa essa distinção visível para evitar uma falsa sensação de segurança.

## Rodar localmente

```bash
npm install
npm run dev       # http://localhost:5174
npm test          # 112 testes do motor geográfico e contratos civis
npm run build     # gera dist/
```

Node.js 22 ou superior é recomendado.

Para testar no Android ou em um Xiaomi, abra a versão publicada em um navegador compatível e use **Adicionar à tela inicial**. A permissão de localização deve ser concedida ao navegador ou ao atalho instalado. O projeto também já possui os diretórios nativos `android/` e `ios/` gerados pelo Capacitor; veja [`docs/BUILD-MOBILE.md`](docs/BUILD-MOBILE.md) para os comandos e as limitações de assinatura. Para o roteiro de teste sem internet, consulte [`docs/REVISAO-INTERFACE-OFFLINE.md`](docs/REVISAO-INTERFACE-OFFLINE.md).

## Estrutura principal

```text
src/
  core/
    estado.js          persistência local versionada e chaves compartilhadas
    localizacao.js     normalização do GPS, ciclo de acompanhamento e idade do fixo
    contexto.js        detecção por zonas, validade e JSON versionado
    mapa-offline.js    planejamento seguro de tiles e antimeridiano
    registro-offline.js backup JSON e exportação GPX local
    atualizacao.js     comparação de versões e URL oficial de atualização
    diagnostico.js     estado local de versão, rede, GPS, cache e bateria
    trilha.js          resumo de distância, tempo e velocidade local
    fila-offline.js    fila local para sincronização posterior
  engine/
    geo.js             distância e azimute geodésicos
    mgrs.js            conversões UTM/MGRS
    ...                motor geográfico e módulos legados
  pages/
    inicio.js          painel inicial, tutorial e prontidão offline
    mapa.js            mapa, trilha e pontos de referência
    bussola.js         sensor de orientação e fallback de rumo
    socorro.js         coordenadas e compartilhamento manual
    doar.js            apoio, transparência e modo preparado de pagamento
    contexto.js        modos e zonas de proteção civil
    sobrevivencia.js   manual versionado, busca e filtros offline
  data/
    sobrevivencia.js   catálogo local com fontes e revisão
  styles/              identidade visual mobile-first
public/
  manifest.webmanifest instalação como PWA
  sw.js                cache da shell e pré-cache de tiles
  icons/vanguard.svg   ícone instalável

docs/
  ASAAS-INTEGRACAO.md  contrato, auditoria, webhook e ativação futura
  CONTEXTOS-E-SEGURANCA.md fontes e limites de proteção civil
  MAPA-DE-FUNCIONALIDADES.md inventário completo da visão e do estado do produto
  BUILD-MOBILE.md       builds Android/iOS, Capacitor e política de bateria
  MOBILE-E-BATERIA.md   referências de energia da Apple e Android
  OPERACAO-BATERIA-GPS-4-DIAS.md operação de quatro dias e monitoramento em campo
  REVISAO-INTERFACE-OFFLINE.md roteiro de teste offline e revisão visual
  ATUALIZACAO-CONFIRMADA.md atualização manual no PWA/APK
  BUILD-VS-RELEASE.md  separação entre compilação, artefato e release
  RELEASE-1.0.0.md     checklist da release candidate e gates finais
  COMANDOS-TAG-V1.0.0.md comandos para assinatura e publicação futura
  CHECKLIST-MOBILE-V1.0.0.md validação final em Android/iOS
  SIMULACAO-MODO-SOCORRO.md simulação sem acionamento real
  SECURITY-RESPONSE.md resposta a incidentes de segurança
  V2_*.md              memória persistente da construção V2
  LIMITATIONS.md       limites de GPS, offline, sensores e comunicação
  SECURITY.md          política de segurança do repositório
  V3_BACKLOG.md        ideias e dependências fora do escopo V2
  FONTES-MODO-MAR-2026-08.md fontes oficiais para o modo Mar

test/                  testes determinísticos do motor
```

## Build, artefato e release

`npm run build` é uma **compilação técnica** e gera `dist/`; `npm run mobile:android:debug` gera um **APK de teste**. Nenhum desses comandos publica uma versão oficial. A release exige tag, notas, checks e decisão explícita de distribuição. O contrato operacional está em [`docs/BUILD-VS-RELEASE.md`](docs/BUILD-VS-RELEASE.md). Para uma versão posterior publicada, o botão de atualização aparece somente após detecção de release oficial ou service worker pendente; ele sempre pede confirmação. O APK não se auto-instala: abre o download oficial e depende do instalador do sistema.

## Doações e auditoria financeira

A tela `#/doar` está em **modo preparado**. Ela não abre checkout, não cria cobrança, não simula pagamento aprovado e não usa credenciais fictícias. Quando a conta Asaas existir, a integração deverá usar checkout hospedado com `PIX` e `CREDIT_CARD`, mantendo os dados do cartão fora do Vanguard.

Cada transação futura deverá ser vinculada a uma referência interna e aos identificadores retornados pelo Asaas. O registro previsto inclui origem da campanha ou botão, valor bruto, tarifas, líquido, método, status, horários, estornos, chargebacks, recibo e evento de Webhook. Um resumo operacional será enviado para `lucasbb2007@gmail.com` depois do processamento. O sistema não solicitará CPF/CNPJ do doador apenas para identificar a origem financeira.

O histórico e o CSV são instrumentos de organização e auditoria. Eles não constituem declaração automática à Receita Federal nem determinam o tratamento tributário da pessoa física; essa classificação deve ser conferida com um contador antes da ativação em produção. O contrato técnico completo está em [`docs/ASAAS-INTEGRACAO.md`](docs/ASAAS-INTEGRACAO.md).

## Decisões de segurança do protótipo

A localização permanece no dispositivo por padrão. O modo Socorro não chama serviços externos e não simula uma confirmação de recebimento. O pacote local inclui coordenadas MGRS, latitude/longitude, precisão e horário; o estado pode registrar que o sistema operacional abriu o compartilhamento, mas isso não prova entrega nem acionamento de resgate.

O mapa online usa fontes públicas com atribuição. A versão atual permite preparar, consultar e limpar tiles da área visível por cache local, mas isso não equivale a um pacote cartográfico oficial completo; permanecem futuras a seleção por polígono, integridade/expiração de pacotes, fontes oficiais sincronizadas e cartas náuticas oficiais. Também permanece futura uma integração opt-in com um provedor real de mensagens via satélite.

## Observação sobre o código legado

O repositório original continha um computador de tiro e um motor balístico. Esses módulos foram preservados para não quebrar o histórico e os testes do projeto, mas **não fazem parte da nova navegação civil nem do fluxo recomendado para o usuário**. A interface principal agora prioriza orientação, retorno pela trilha e preparação responsável de coordenadas para socorro.
