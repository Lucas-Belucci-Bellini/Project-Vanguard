# VANGUARD FIELD

**Navegação de expedição para pessoas comuns em áreas remotas.** O Vanguard Field combina GPS/GNSS do aparelho, bússola, mapa com grade MGRS, registro local de trilha e um protocolo de compartilhamento de coordenadas para situações de emergência.

A interface foi desenhada para uso em celular, com botões grandes, alto contraste, modo noturno vermelho e navegação instalável como PWA em Android, incluindo aparelhos Xiaomi com MIUI ou HyperOS. O projeto também mantém compatibilidade web para testes e evolução rápida.

> O Vanguard Field ajuda a organizar uma navegação e a preparar uma posição para transmissão. **Ele não substitui treinamento de orientação, carta offline, bateria reserva, plano de viagem, equipe de emergência ou um comunicador via satélite.**

## O que já está implementado

| Área | Comportamento |
|---|---|
| **Início** | Painel de campo, ativação explícita do GPS, atalhos e tutorial de primeiro uso. |
| **Mapa** | Mapa MapLibre, bases topográfica/satélite/tática, leitura MGRS, centralização no fixo atual e pontos de referência. |
| **Trilha** | Registro local do caminho com distância acumulada, pausa, retomada e limpeza manual. Os pontos ficam no aparelho. |
| **Bússola** | Sensor de orientação do dispositivo com fallback para rumo fornecido pelo GPS e instruções de calibração. |
| **Socorro** | Captura da posição, preparação local do alerta e compartilhamento manual via recursos do aparelho ou área de transferência. |
| **Privacidade** | A posição não é enviada automaticamente. O compartilhamento só começa depois de uma ação explícita da pessoa. |
| **Offline parcial** | A shell do app e os dados locais podem ser reabertos sem internet depois do primeiro carregamento. Tiles cartográficos precisam ser preparados para uso offline em uma etapa própria. |

## Como usar em uma expedição

Abra o Vanguard Field antes de sair e toque em **Ativar GPS**. Aguarde uma leitura com precisão adequada e confira se a posição exibida faz sentido. No **Mapa**, toque em **Iniciar rota** para registrar o caminho no armazenamento local do aparelho. Use **Marcar ponto** em acampamentos, bifurcações, travessias ou outros locais importantes.

Na tela **Bússola**, toque em **Ativar sensor do aparelho**. Segure o telefone plano e longe de objetos magnéticos; se a leitura parecer errada, calibre o aparelho conforme as instruções do próprio sistema e compare a direção com o deslocamento observado no mapa.

Antes de entrar em uma região sem sinal, abra **Modo socorro**, atualize a posição e prepare o alerta local. Isso cria um pacote de coordenadas no aparelho, mas **não contata uma equipe**. Quando houver rede móvel, Wi-Fi, rádio com dados ou um mensageiro via satélite compatível, toque em **Compartilhar coordenadas** e confirme o destinatário.

## GPS, satélite e resgate: o que o celular consegue fazer

O GPS/GNSS é um sistema de **posicionamento**: o aparelho recebe sinais de satélites e calcula uma posição. Essa etapa pode continuar funcionando sem internet, embora relevo, cobertura do céu, interferência, bateria e qualidade do receptor alterem a precisão.

Um celular comum não transforma automaticamente essa posição em um pedido de resgate via satélite. **Posicionamento e comunicação são funções diferentes.** Para que uma equipe receba sua localização fora da rede móvel, é necessário um meio de transmissão compatível, como um comunicador via satélite ou rádio com dados. O aplicativo deixa essa distinção visível para evitar uma falsa sensação de segurança.

## Rodar localmente

```bash
npm install
npm run dev       # http://localhost:5174
npm test          # 65 testes do motor geográfico e legado
npm run build     # gera dist/
```

Node.js 22 ou superior é recomendado.

Para testar no Android ou em um Xiaomi, abra a versão publicada em um navegador compatível e use **Adicionar à tela inicial**. A permissão de localização deve ser concedida ao navegador ou ao atalho instalado. Uma futura etapa pode empacotar a mesma base em APK com Capacitor; o código atual já foi organizado para esse caminho, mas o diretório nativo ainda não faz parte deste protótipo.

## Estrutura principal

```text
src/
  core/
    estado.js          persistência local e chaves compartilhadas
    localizacao.js     normalização do GPS e ciclo de acompanhamento
  engine/
    geo.js             distância e azimute geodésicos
    mgrs.js            conversões UTM/MGRS
    ...                motor geográfico e módulos legados
  pages/
    inicio.js          painel inicial e tutorial
    mapa.js            mapa, trilha e pontos de referência
    bussola.js         sensor de orientação e fallback de rumo
    socorro.js         coordenadas e compartilhamento manual
  styles/              identidade visual mobile-first
public/
  manifest.webmanifest instalação como PWA
  sw.js                cache da shell do aplicativo
  icons/vanguard.svg   ícone instalável

test/                  testes determinísticos do motor
```

## Decisões de segurança do protótipo

A localização permanece no dispositivo por padrão. O modo Socorro não chama serviços externos e não simula uma confirmação de recebimento. A mensagem compartilhada inclui coordenadas MGRS, latitude/longitude, precisão e horário para que a pessoa possa escolher o canal correto.

O mapa online usa fontes públicas com atribuição, mas isso não significa que as imagens estejam disponíveis offline. Para uma versão de campo mais robusta, a próxima etapa deve incluir pacotes de tiles pré-baixados por área, expiração e verificação de integridade, além de uma integração opt-in com um provedor real de mensagens via satélite.

## Observação sobre o código legado

O repositório original continha um computador de tiro e um motor balístico. Esses módulos foram preservados para não quebrar o histórico e os testes do projeto, mas **não fazem parte da nova navegação civil nem do fluxo recomendado para o usuário**. A interface principal agora prioriza orientação, retorno pela trilha e preparação responsável de coordenadas para socorro.
