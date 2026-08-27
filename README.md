# VANGUARD FIELD

**Navegação multiuso para cidade, caminhadas e áreas remotas.** O Vanguard Field combina GPS/GNSS do aparelho, bússola, mapa com grade MGRS, registro local de trilha, destinos urbanos e um protocolo de compartilhamento de coordenadas para situações de emergência.

A interface foi desenhada para uso em celular, com botões grandes, alto contraste, modo noturno vermelho e navegação instalável como PWA em Android, incluindo aparelhos Xiaomi com MIUI ou HyperOS. O projeto também mantém compatibilidade web para testes e evolução rápida.

> O Vanguard Field ajuda a organizar uma navegação e a preparar uma posição para transmissão. **Ele não substitui treinamento de orientação, carta offline, bateria reserva, plano de viagem, equipe de emergência ou um comunicador via satélite.**

## O que já está implementado

| Área | Comportamento |
|---|---|
| **Início** | Painel de campo, ativação explícita do GPS, atalhos e tutorial de primeiro uso. |
| **Mapa** | Mapa MapLibre, bases topográfica/satélite/tática, leitura MGRS, centralização no fixo atual e pontos de referência. Inclui os modos **Trilha / Expedição** e **Cidade / Dia a dia**, com destino por coordenadas ou toque no mapa. O preparo informa estimativa/limite de tiles, consulta o cache e oferece limpeza confirmada. |
| **Trilha** | Registro local do caminho com distância acumulada, pausa, retomada e limpeza manual. Os pontos ficam no aparelho. |
| **Bússola** | Sensor de orientação do dispositivo com fallback para rumo fornecido pelo GPS e instruções de calibração. |
| **Socorro** | Captura da posição, criação de pacote externo validado, preparação local do alerta e compartilhamento manual via recursos do aparelho ou área de transferência, com estados explícitos e sem confirmação de entrega. |
| **Privacidade** | A posição não é enviada automaticamente. O compartilhamento só começa depois de uma ação explícita da pessoa. |
| **Offline parcial** | A shell do app e os dados locais podem ser reabertos sem internet depois do primeiro carregamento. Tiles cartográficos precisam ser preparados para uso offline em uma etapa própria. |
| **Apoiar projeto** | Tela pública em modo preparado para futuras doações via checkout hospedado do Asaas com PIX e cartão, sem cobrança real enquanto as credenciais não forem configuradas. |
| **Contexto** | Modos Cidade, Expedição, Mar, Zona de Desastre, Área Contaminada e Área de Conflito, com zonas locais por fonte, validade opcional, importação/exportação JSON versionada e descarte automático de zonas expiradas. |
| **Sobrevivência** | Manual offline versionado com fonte/data de revisão, busca, filtros por tema, abrigo, água, primeiros socorros, sinalização, alimentação e conduta em áreas com possíveis explosivos. |
| **Mapa de funcionalidades** | Inventário completo da visão do produto, com status, dependências, limites e próximos passos em [`docs/MAPA-DE-FUNCIONALIDADES.md`](docs/MAPA-DE-FUNCIONALIDADES.md). |

## Modo offline-first

Depois do primeiro carregamento, a shell do Vanguard, as telas, a posição, a bússola, as rotas, os pontos, os destinos, as zonas importadas e o manual de sobrevivência podem continuar funcionando sem internet. No mapa, mova-se até a área desejada, escolha a base cartográfica e toque em **Preparar área offline** enquanto ainda estiver conectado. O aplicativo guarda até 256 URLs por preparação da área visível e de níveis próximos, informa quando a estimativa excede esse limite, mostra o status do cache e permite limpar os mapas com confirmação; prepare novamente depois de mover o mapa ou trocar de base.

A internet continua sendo necessária para obter tiles que ainda não foram baixados, receber avisos novos, enviar e-mail, sincronizar eventos, abrir o futuro checkout Asaas e transmitir um SOS por serviço externo. O GPS/GNSS e a bússola podem fornecer dados locais sem rede, mas nenhum dos dois transmite um pedido de socorro sozinho.

## Como usar em uma expedição

Para usar no dia a dia, abra o **Mapa**, selecione **Cidade / Dia a dia**, ative o GPS e defina um destino colando latitude/longitude ou tocando em **Tocar no mapa**. O Vanguard mostra a distância geográfica e o rumo até o destino; ele não depende de uma conta ou de um servidor próprio para guardar essa informação. Para uma caminhada urbana ou expedição, selecione **Trilha / Expedição**, toque em **Iniciar rota** e use **Marcar ponto** em acampamentos, bifurcações, travessias, estacionamentos ou outros locais importantes. A rota é registrada no armazenamento local do aparelho. A alta precisão só é solicitada durante a gravação ativa; ao pausar, o mapa retorna ao perfil econômico. A opção **Manter tela ativa** é voluntária e só fica disponível durante uma rota ativa.

Na tela **Bússola**, toque em **Ativar sensor do aparelho**. A mesma ferramenta pode orientar uma caminhada no bairro, uma corrida ou uma travessia em área remota. Segure o telefone plano e longe de objetos magnéticos; se a leitura parecer errada, calibre o aparelho conforme as instruções do próprio sistema e compare a direção com o deslocamento observado no mapa.

Antes de entrar em uma região sem sinal, abra **Modo socorro**, atualize a posição e prepare o alerta local. Isso cria um pacote de coordenadas no aparelho, mas **não contata uma equipe**. Quando houver rede móvel, Wi-Fi, rádio com dados ou um mensageiro via satélite compatível, toque em **Compartilhar coordenadas** e confirme o destinatário.

## GPS, satélite e resgate: o que o celular consegue fazer

O GPS/GNSS é um sistema de **posicionamento**: o aparelho recebe sinais de satélites e calcula uma posição. Essa etapa pode continuar funcionando sem internet, embora relevo, cobertura do céu, interferência, bateria e qualidade do receptor alterem a precisão.

Um celular comum não transforma automaticamente essa posição em um pedido de resgate via satélite. **Posicionamento e comunicação são funções diferentes.** Para que uma equipe receba sua localização fora da rede móvel, é necessário um meio de transmissão compatível, como um comunicador via satélite ou rádio com dados. O aplicativo deixa essa distinção visível para evitar uma falsa sensação de segurança.

## Rodar localmente

```bash
npm install
npm run dev       # http://localhost:5174
npm test          # 86 testes do motor geográfico e contratos civis
npm run build     # gera dist/
```

Node.js 22 ou superior é recomendado.

Para testar no Android ou em um Xiaomi, abra a versão publicada em um navegador compatível e use **Adicionar à tela inicial**. A permissão de localização deve ser concedida ao navegador ou ao atalho instalado. O projeto também já possui os diretórios nativos `android/` e `ios/` gerados pelo Capacitor; veja [`docs/BUILD-MOBILE.md`](docs/BUILD-MOBILE.md) para os comandos e as limitações de assinatura. Para o roteiro de teste sem internet, consulte [`docs/REVISAO-INTERFACE-OFFLINE.md`](docs/REVISAO-INTERFACE-OFFLINE.md).

## Estrutura principal

```text
src/
  core/
    estado.js          persistência local e chaves compartilhadas
    localizacao.js     normalização do GPS e ciclo de acompanhamento
    contexto.js        detecção por zonas, validade e JSON versionado
    mapa-offline.js    planejamento seguro de tiles e antimeridiano
    fila-offline.js    fila local para sincronização posterior
  engine/
    geo.js             distância e azimute geodésicos
    mgrs.js            conversões UTM/MGRS
    ...                motor geográfico e módulos legados
  pages/
    inicio.js          painel inicial e tutorial
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
  REVISAO-INTERFACE-OFFLINE.md roteiro de teste offline e revisão visual

test/                  testes determinísticos do motor
```

## Doações e auditoria financeira

A tela `#/doar` está em **modo preparado**. Ela não abre checkout, não cria cobrança, não simula pagamento aprovado e não usa credenciais fictícias. Quando a conta Asaas existir, a integração deverá usar checkout hospedado com `PIX` e `CREDIT_CARD`, mantendo os dados do cartão fora do Vanguard.

Cada transação futura deverá ser vinculada a uma referência interna e aos identificadores retornados pelo Asaas. O registro previsto inclui origem da campanha ou botão, valor bruto, tarifas, líquido, método, status, horários, estornos, chargebacks, recibo e evento de Webhook. Um resumo operacional será enviado para `lucasbb2007@gmail.com` depois do processamento. O sistema não solicitará CPF/CNPJ do doador apenas para identificar a origem financeira.

O histórico e o CSV são instrumentos de organização e auditoria. Eles não constituem declaração automática à Receita Federal nem determinam o tratamento tributário da pessoa física; essa classificação deve ser conferida com um contador antes da ativação em produção. O contrato técnico completo está em [`docs/ASAAS-INTEGRACAO.md`](docs/ASAAS-INTEGRACAO.md).

## Decisões de segurança do protótipo

A localização permanece no dispositivo por padrão. O modo Socorro não chama serviços externos e não simula uma confirmação de recebimento. O pacote local inclui coordenadas MGRS, latitude/longitude, precisão e horário; o estado pode registrar que o sistema operacional abriu o compartilhamento, mas isso não prova entrega nem acionamento de resgate.

O mapa online usa fontes públicas com atribuição. A versão atual permite preparar, consultar e limpar tiles da área visível por cache local, mas isso não equivale a um pacote cartográfico oficial completo; permanecem futuras a seleção por polígono, integridade/expiração de pacotes, fontes oficiais sincronizadas e cartas náuticas oficiais. Também permanece futura uma integração opt-in com um provedor real de mensagens via satélite.

## Observação sobre o código legado

O repositório original continha um computador de tiro e um motor balístico. Esses módulos foram preservados para não quebrar o histórico e os testes do projeto, mas **não fazem parte da nova navegação civil nem do fluxo recomendado para o usuário**. A interface principal agora prioriza orientação, retorno pela trilha e preparação responsável de coordenadas para socorro.
