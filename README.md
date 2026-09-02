# VANGUARD FIELD

**Navegação multiuso para cidade, caminhadas e áreas remotas.** O Vanguard Field combina GPS/GNSS do aparelho, bússola, mapa com grade MGRS, registro local de trilha, destinos urbanos e um protocolo de compartilhamento de coordenadas para situações de emergência.

A interface foi desenhada para uso em celular, com botões grandes, alto contraste, modo noturno vermelho e navegação instalável como PWA em Android, incluindo aparelhos Xiaomi com MIUI ou HyperOS. O projeto também mantém compatibilidade web para testes e evolução rápida.

> O Vanguard Field ajuda a organizar uma navegação e a preparar uma posição para transmissão. **Ele não substitui treinamento de orientação, carta offline, bateria reserva, plano de viagem, equipe de emergência ou um comunicador via satélite.**

## O que já está implementado

Uma linha por **rota do aplicativo**, com o estado que a auditoria de
2026-09-02 mediu. Estado, dados, dependências e teste de cada uma estão em
[`docs/ROUTE-MATRIX.md`](docs/ROUTE-MATRIX.md); o contrato completo, em
[`docs/ROUTES/`](docs/ROUTES/); e o que foi encontrado e corrigido, em
[`docs/ROUTE-AUDIT.md`](docs/ROUTE-AUDIT.md).

Esta tabela lista funcionalidade, não arquivo: uma rota só aparece aqui se
abrir, tiver dado real, e os botões fizerem o que dizem.

| Rota | O que a pessoa consegue fazer | Estado |
| --- | --- | --- |
| `#/inicio` | Ver se o aparelho está pronto para sair andando: posição, mapa preparado, trilha em curso, dados locais. | `IMPLEMENTED` |
| `#/mapa` | Ver onde está, gravar a trilha (com desnível), marcar waypoints e destino, fotografar a parada com a coordenada da captura, exportar JSON/GPX/KML e montar o pacote da caminhada. | `IMPLEMENTED` |
| `#/navegacao` | Ler a posição em latitude/longitude, MGRS e UTM; calcular distância e rumo até um waypoint; converter MGRS localmente. | `IMPLEMENTED` |
| `#/bussola` | Rumo do sensor com filtro circular, azimute verdadeiro e de grade **somente com correção medida**, calibração pelo Sol, rumo travado e aviso de interferência magnética. | `IMPLEMENTED` |
| `#/socorro` | Preparar um registro da própria posição para entregar por um canal externo — o app **não chama resgate**. | `IMPLEMENTED` |
| `#/escuta` | Ser avisado por vibração quando o grave sobe como sobe um veículo se aproximando, ou quando alguém grita. Só recebe. | `IMPLEMENTED` |
| `#/noturno` | Enxergar em cena escura por intensificação de luz, e capturar a imagem com a coordenada. **Não é infravermelho.** | `IMPLEMENTED` |
| `#/contexto` | Escolher o modo de uso e manter zonas locais de risco com fonte e validade, importadas ou cadastradas à mão. | `IMPLEMENTED` |
| `#/sobrevivencia` | Ler sete guias offline, cada um com fonte citada e data de revisão. | `IMPLEMENTED` |
| `#/sobre` | Ver a versão real do aplicativo, os limites e o que ele faz com os dados. | `IMPLEMENTED` |
| `#/diagnostico` | Ver o estado observável do ambiente, com `INDISPONÍVEL` onde o aparelho não informa. | `IMPLEMENTED` |
| `#/doar` | Entender como o projeto se sustenta. **Nenhum pagamento é processado**: `CHECKOUT NÃO CONFIGURADO`. | `UNAVAILABLE` |
| `#/tiro` | Calculadora do ambiente de testes de **Arma 3**. Fora do menu, marcada na própria tela, sem funcionalidade nova. | `LEGACY` |

### Fora das telas

- **Privacidade** — a posição não sai do aparelho automaticamente; todo envio
  começa por uma ação explícita. Escuta e visão noturna não gravam, não guardam
  e não transmitem, e há teste estrutural lendo o código para cobrar isso.
- **Offline** — a shell, as telas, a posição, a bússola, as trilhas, os pontos,
  as zonas e o manual funcionam sem rede depois do primeiro carregamento. Tiles
  precisam ser preparados numa etapa própria, com conexão.
- **Atualização confirmada** — nunca automática; ver
  [`docs/ATUALIZACAO-CONFIRMADA.md`](docs/ATUALIZACAO-CONFIRMADA.md).

### Documentação (não é funcionalidade)

[`docs/PARIDADE-WEB-MOBILE.md`](docs/PARIDADE-WEB-MOBILE.md) — matriz web/dist/Capacitor/Android e como cada ✅ foi medido ·
[`docs/MAPA-DE-FUNCIONALIDADES.md`](docs/MAPA-DE-FUNCIONALIDADES.md) ·
[`docs/MEGA-PLANO.md`](docs/MEGA-PLANO.md) ·
[`docs/BALISTICA.md`](docs/BALISTICA.md) ·
[`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) ·
[`docs/OPERACAO-BATERIA-GPS-4-DIAS.md`](docs/OPERACAO-BATERIA-GPS-4-DIAS.md) ·
[`docs/CHECKLIST-MOBILE-V1.0.0.md`](docs/CHECKLIST-MOBILE-V1.0.0.md) ·
[`docs/adr/`](docs/adr/)

## Estado da construção V2

O prompt contínuo da V2 é executado sobre o estado real sem reiniciar o projeto. A memória persistente está em [`V2_STATUS.md`](V2_STATUS.md), [`V2_MASTER_CHECKLIST.md`](V2_MASTER_CHECKLIST.md), [`V2_PROGRESS.md`](V2_PROGRESS.md), [`V2_BLOCKERS.md`](V2_BLOCKERS.md), [`V2_DECISIONS.md`](V2_DECISIONS.md), [`V2_CHANGELOG.md`](V2_CHANGELOG.md), [`V2_RISK_REGISTER.md`](V2_RISK_REGISTER.md), [`V2_TEST_MATRIX.md`](V2_TEST_MATRIX.md), [`V2_FEATURE_MATRIX.md`](V2_FEATURE_MATRIX.md) e [`V2_ARCHITECTURE_MAP.md`](V2_ARCHITECTURE_MAP.md). Itens não necessários para a V2 ficam em [`V3_BACKLOG.md`](V3_BACKLOG.md). O estado atual é **V2 IN PROGRESS**; o próximo gargalo civil escolhido é um diagnóstico local observável, sem telemetria escondida.

A stack atual permanece JavaScript ES2022, Vite, Capacitor e MapLibre até que profiling real justifique Kotlin, Swift ou Rust/WASM. O Vanguard Field civil não usa os módulos balísticos legados. Eles pertencem ao contexto separado de uma wiki de Arma 3, criada para testes de software e referência dentro do videogame; são `LEGACY-RESTRICTED`, nunca foram destinados a ambientes reais e não recebem novas capacidades operacionais.

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
    configuracao.js    identidade pública e URLs oficiais sem segredos
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

O repositório original continha uma wiki/ambiente de testes de Arma 3, incluindo um computador de tiro e um motor balístico. Esse conjunto foi preservado separadamente para manter o histórico e os testes relacionados ao videogame. **Os módulos balísticos foram criados somente para simulação e testes no ambiente virtual do Arma 3; nunca foram criados para ambientes, equipamentos, treinamento ou operações reais.** Eles não fazem parte do Vanguard Field civil, não são manual nem tabela oficial de tiro e não devem ser adaptados para uso no mundo real.

Registro histórico: quando os mapas/terrenos do Arma 3 ainda não estavam disponíveis, o fluxo de construção do Claude Code inseriu provisoriamente uma API de imagens de satélite do mundo real na camada cartográfica. Isso foi uma contingência técnica tomada pelo processo de construção, não uma solicitação do usuário. Essa imagem mostrava o mundo real e nunca deve ser confundida com mapa ou terreno do Arma 3. O mapa real pertence, quando configurado, ao Vanguard Field civil; o simulador/wiki deve usar somente sua base virtual própria. A distinção está detalhada em [`docs/ESCOPO-WIKI-ARMA3-E-MAPAS.md`](docs/ESCOPO-WIKI-ARMA3-E-MAPAS.md). A interface principal do Vanguard Field prioriza orientação, retorno pela trilha e preparação responsável de coordenadas para socorro.

## Estado da release

A versão corrente é a mostrada na tela `#/sobre`, e ela vem do `package.json`
no momento do build — a mesma fonte que o `versionName` do Android e o gate de
versão do workflow conferem.

- **1.4.0** — visão noturna por intensificação de luz; bússola 3,01× mais
  estável; coordenada da parada 2,73× mais precisa (ADR-0044).
- **1.3.5** — odômetro em 3D, contagem de passos, resumo do dia na tela
  bloqueada (ADR-0043).
- **1.3.2** — assinatura fixa do APK e identidade visual própria (ADR-0042).

O histórico completo está em [`CHANGELOG.md`](CHANGELOG.md).
