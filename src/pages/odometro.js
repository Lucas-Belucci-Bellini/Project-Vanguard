/**
 * Contador de trajeto — quantos metros e quantos quilômetros.
 *
 * ## Por que esta tela existe separada do mapa
 *
 * Até aqui, saber a distância andada exigia abrir `#/mapa`: carregar o
 * MapLibre (802 kB), instanciar o motor, e buscar tiles pela rede. Numa
 * estrada sem sinal, com bateria curta, isso é caro para responder uma
 * pergunta que **não precisa de mapa nenhum**: quanto eu já andei.
 *
 * Esta tela não carrega mapa, não pede tile, não toca a rede. Ela lê o mesmo
 * gravador que o mapa lê — um só rastreamento no aplicativo (ADR-0047) — e
 * mostra o número grande.
 *
 * ## O que ela não faz, e diz que não faz
 *
 * - **Não é uma segunda gravação.** Iniciar aqui é a MESMA rota que o mapa
 *   controla. Duas telas, um gravador; nunca dois números para a mesma
 *   caminhada.
 * - **Não inventa o que não viu.** Perda de sinal aparece como trecho sem
 *   registro, separado do que foi medido. A reta entre dois fixos separados
 *   por um buraco é palpite, e palpite não entra no total (`engine/distancia.js`).
 * - **Não anuncia precisão que não tem.** O erro do GNSS não some porque o
 *   número é grande.
 */
import '../styles/odometro.css';
import { h } from '../ui/helpers.js';
import { rastreamentoDoAplicativo } from '../core/rastreamento-app.js';
import { medirDistancia } from '../engine/distancia.js';
import { velocidadeLabel, precisaoLabel } from '../core/localizacao.js';
import { formatarDistancia, formatarDuracao, formatarRitmo } from '../ui/formato-trajeto.js';

/** Recalcular os vãos percorre a trilha: não pode acontecer a cada fixo. */
const INTERVALO_VAOS_MS = 3000;

export function odometroPage() {
  const rastreio = rastreamentoDoAplicativo();
  const gravador = rastreio.gravador;

  const raiz = h('div', { className: 'vg-pagina odometro' });
  const rolagem = h('div', { className: 'odometro__scroll' });

  const numero = h('strong', { className: 'odometro__numero' }, '0');
  const unidade = h('span', { className: 'odometro__unidade' }, 'm');
  const situacao = h('p', { className: 'odometro__situacao', role: 'status', ariaLive: 'polite' }, 'Parado.');

  const campos = {};
  function campo(chave, rotulo, dica = null) {
    const valor = h('strong', { className: 'odometro__campo-valor' }, '—');
    campos[chave] = valor;
    return h('div', { className: 'odometro__campo' },
      h('span', { className: 'odometro__campo-rotulo' }, rotulo),
      valor,
      dica ? h('span', { className: 'odometro__campo-dica' }, dica) : null);
  }

  const aviso = h('p', { className: 'odometro__aviso', hidden: true });

  const botaoPrincipal = h('button', { className: 'odometro__botao odometro__botao--principal', type: 'button' }, 'INICIAR');
  const botaoParar = h('button', { className: 'odometro__botao', type: 'button' }, 'PARAR E GUARDAR');

  let vaosCache = null;
  let vaosEm = 0;
  let inscricao = null;
  let intervalo = null;
  let desmontado = false;

  /** O instante em que a rota começou, deduzido do primeiro ponto guardado. */
  function decorridoMs() {
    const trilha = gravador.trilha();
    if (trilha.length < 2) return 0;
    const inicio = Number(trilha[0]?.timestamp);
    const fim = Number(trilha[trilha.length - 1]?.timestamp);
    return Number.isFinite(inicio) && Number.isFinite(fim) && fim > inicio ? fim - inicio : 0;
  }

  /**
   * Os vãos custam uma passada pela trilha. A distância NÃO — ela vem do
   * odômetro corrente do gravador, que é O(1) por ponto. Por isso só esta
   * parte é limitada no tempo.
   */
  function vaos(agora) {
    if (vaosCache && agora - vaosEm < INTERVALO_VAOS_MS) return vaosCache;
    vaosCache = medirDistancia(gravador.trilha()).vaos;
    vaosEm = agora;
    return vaosCache;
  }

  function pintar() {
    if (desmontado) return;
    const agora = Date.now();
    const { rotaAtiva, rotaPausada } = gravador.rota();
    const metros = gravador.distanciaM();
    const od = gravador.odometro();
    const ms = decorridoMs();

    const d = formatarDistancia(metros);
    numero.textContent = d.valor;
    unidade.textContent = d.unidade;

    campos.tempo.textContent = ms ? formatarDuracao(ms) : '—';
    campos.ritmo.textContent = formatarRitmo(metros, ms);
    campos.subida.textContent = od.ganhoElevacaoM >= 1 ? `${Math.round(od.ganhoElevacaoM)} m` : '—';
    campos.descida.textContent = od.perdaElevacaoM >= 1 ? `${Math.round(od.perdaElevacaoM)} m` : '—';
    campos.pontos.textContent = String(gravador.total());

    const posicao = rastreio.ultimaPosicao();
    campos.velocidade.textContent = posicao ? velocidadeLabel(posicao.speed) : '—';
    campos.precisao.textContent = posicao ? precisaoLabel(posicao.accuracy) : 'SEM FIXO';

    const buracos = vaos(agora);
    if (buracos.quantidade > 0) {
      aviso.hidden = false;
      aviso.textContent = `${Math.round(buracos.naoObservadaM)} m em ${buracos.quantidade} ${buracos.quantidade === 1 ? 'trecho sem registro' : 'trechos sem registro'} — não entram no total. A reta entre dois fixos separados por um buraco de sinal é palpite, não medida.`;
    } else {
      aviso.hidden = true;
    }

    const saidos = gravador.saidosDaJanela();
    situacao.textContent = !rotaAtiva
      ? (gravador.total() ? `Parado. ${gravador.total()} pontos guardados; o total continua contando de onde parou.` : 'Parado. Toque em INICIAR para começar a contar.')
      : rotaPausada
        ? 'Pausado. O que já foi medido continua guardado.'
        : `Contando${saidos ? ` · ${saidos} pontos antigos saíram do traçado (a distância não os esquece)` : ''}.`;

    botaoPrincipal.textContent = !rotaAtiva ? 'INICIAR' : rotaPausada ? 'RETOMAR' : 'PAUSAR';
    botaoParar.disabled = !rotaAtiva;
    raiz.classList.toggle('is-contando', rotaAtiva && !rotaPausada);
  }

  botaoPrincipal.onclick = () => {
    const { rotaAtiva, rotaPausada } = gravador.rota();
    if (!rotaAtiva) rastreio.definirRota({ ativa: true, pausada: false });
    else rastreio.definirRota({ ativa: true, pausada: !rotaPausada });
    pintar();
  };

  botaoParar.onclick = () => {
    // Parar NUNCA apaga: o registro fica, e o total continua de onde parou.
    // Apagar é decisão explícita, e o lugar dela é o mapa.
    rastreio.definirRota({ ativa: false, pausada: false });
    pintar();
  };

  rolagem.append(
    h('header', { className: 'odometro__topo' },
      h('h1', null, 'Contador de trajeto'),
      h('p', { className: 'odometro__subtitulo' }, 'Sem mapa, sem tile, sem rede. Só o GPS do aparelho.')),

    h('section', { className: 'odometro__leitura' },
      h('div', { className: 'odometro__leitura-linha' }, numero, unidade),
      situacao),

    h('section', { className: 'odometro__grade' },
      campo('tempo', 'TEMPO'),
      campo('ritmo', 'RITMO'),
      campo('velocidade', 'VELOCIDADE'),
      campo('subida', 'SUBIDA', 'acumulada'),
      campo('descida', 'DESCIDA', 'acumulada'),
      campo('precisao', 'FIXO'),
      campo('pontos', 'PONTOS', 'no traçado')),

    aviso,

    h('section', { className: 'odometro__acoes' }, botaoPrincipal, botaoParar),

    h('section', { className: 'odometro__nota' },
      h('h2', null, 'Como este número é medido'),
      h('p', null, 'A distância soma o desnível, não só o plano: subir escada ou ladeira conta como o deslocamento que foi — uma conta 2D trataria isso como ficar parado.'),
      h('p', null, 'Cada trecho passa por uma peneira proporcional à precisão que o aparelho informa. Sem ela, o tremor do GPS de quem está sentado vira quilômetros por hora de distância que ninguém andou.'),
      h('p', null, 'A contagem é do aplicativo, não desta tela: trocar de tela, ou fechar esta, não interrompe nada. Só PARAR interrompe.')),
  );

  raiz.append(rolagem);
  pintar();

  inscricao = rastreio.observar(() => pintar(), { oculto: document.hidden });
  // O relógio anda mesmo sem fixo novo: parado sem sinal, o tempo continua
  // correndo e a tela precisa mostrar isso em vez de parecer travada.
  intervalo = window.setInterval(() => { if (!document.hidden) pintar(); }, 1000);

  return {
    elemento: raiz,
    desmontar: () => {
      desmontado = true;
      window.clearInterval(intervalo);
      // Sair daqui tira a plateia e NÃO para a contagem — é a regra do
      // ADR-0047, e é o que faz o número continuar certo ao voltar.
      inscricao?.parar();
      inscricao = null;
    },
  };
}
