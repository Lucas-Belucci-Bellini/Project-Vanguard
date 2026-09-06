/**
 * Escuta de ambiente — o microfone ligado no motor de `src/engine/escuta.js`.
 *
 * ## Só escuta. Nunca fala.
 *
 * Isto não é um rádio e não pode virar um. O que este módulo faz com o áudio é
 * uma coisa só: passar por uma FFT e ler números. O sinal **não sai daqui** —
 * não é gravado, não é guardado, não é enviado e não é reproduzido. O que
 * atravessa a fronteira deste arquivo são três números por quadro (nível de
 * grave, de rodagem e de voz) e, quando é o caso, um evento.
 *
 * Isso é estrutural, não é promessa: o grafo de áudio termina no `AnalyserNode`
 * e **não é ligado a `destination`**, não existe `MediaRecorder`, não existe
 * `RTCPeerConnection`, não existe rede. `test/escuta-ambiente.test.js` cobra
 * essa lista lendo o próprio código — se alguém acrescentar qualquer uma delas
 * aqui ou no motor, o teste quebra.
 *
 * A razão é do operador, e é boa: um aplicativo que transmite vira brinquedo de
 * quem quer atrapalhar. Escutar ajuda o grupo; falar abre uma porta que não
 * precisa existir.
 *
 * ## O microfone precisa vir cru
 *
 * `autoGainControl` é o inimigo direto desta medição: ele existe para manter a
 * voz num volume constante, ou seja, para **apagar exatamente a subida de
 * nível** que denuncia algo se aproximando. `noiseSuppression` remove ruído de
 * fundo — que aqui é o sinal. Os três são pedidos desligados; o navegador pode
 * recusar, e por isso a tela mostra o que foi concedido.
 */

import { analisarQuadro, criarDetectorAcustico, EVENTOS_ESCUTA } from '../engine/escuta.js';
import { dispararAlerta, GRAVIDADES, TIPOS_ALERTA } from './alertas-tateis.js';

export const ESTADOS_ESCUTA = Object.freeze({
  PARADA: 'PARADA',
  INDISPONIVEL: 'INDISPONIVEL',
  PEDINDO_PERMISSAO: 'PEDINDO_PERMISSAO',
  ESCUTANDO: 'ESCUTANDO',
  NEGADA: 'NEGADA',
  FALHOU: 'FALHOU',
});

/** Pedido de mídia: cru, e só áudio. Vídeo nunca é solicitado. */
export const RESTRICOES_AUDIO = Object.freeze({
  audio: Object.freeze({
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  }),
  video: false,
});

const GRAVIDADE_DO_EVENTO = Object.freeze({
  [EVENTOS_ESCUTA.VEICULO_APROXIMANDO]: GRAVIDADES.ALTO,
  [EVENTOS_ESCUTA.CHAMADO_VOZ]: GRAVIDADES.AVISO,
});

function acharContextoAudio(janela) {
  return janela?.AudioContext ?? janela?.webkitAudioContext ?? null;
}

function motivoDaFalha(erro) {
  const nome = erro?.name ?? '';
  if (nome === 'NotAllowedError' || nome === 'SecurityError') return ESTADOS_ESCUTA.NEGADA;
  if (nome === 'NotFoundError' || nome === 'OverconstrainedError') return ESTADOS_ESCUTA.INDISPONIVEL;
  return ESTADOS_ESCUTA.FALHOU;
}

/**
 * @param {object} opcoes
 * @param {(leitura: object) => void} [opcoes.aoQuadro] cada quadro medido
 * @param {(aviso: object) => void} [opcoes.aoEvento] evento reconhecido
 * @param {(estado: object) => void} [opcoes.aoEstado] mudança de estado
 */
export function criarEscutaAmbiente({
  aoQuadro = () => {},
  aoEvento = () => {},
  aoEstado = () => {},
  limiares,
  intervaloMs = 100,
  fftTamanho = 2048,
  suavizacao = 0.4,
  janela = typeof window !== 'undefined' ? window : null,
  midia = typeof navigator !== 'undefined' ? navigator.mediaDevices : null,
  agora = () => Date.now(),
  vibrarApi,
  // O laço é injetável para o teste poder avançar o tempo em vez de esperar
  // por ele: uma aproximação leva oito segundos reais e vinte e oito
  // milissegundos de teste.
  agendar = (tarefa, ms) => {
    const id = setInterval(tarefa, ms);
    return () => clearInterval(id);
  },
} = {}) {
  let estado = ESTADOS_ESCUTA.PARADA;
  let erroAtual = null;
  let fluxo = null;
  let contexto = null;
  let analisador = null;
  let cancelarLaco = null;
  let buffer = null;
  let detector = null;
  let ultimoAvisoPorTipo = {};
  let concedido = null;

  function mudarEstado(novo, erro = null) {
    estado = novo;
    erroAtual = erro;
    aoEstado({ estado, erro: erro?.message ?? null, concedido });
  }

  function desligarGrafo() {
    if (cancelarLaco) {
      try { cancelarLaco(); } catch { /* laço já encerrado */ }
      cancelarLaco = null;
    }
    // Soltar as trilhas é o que apaga o indicador de microfone do sistema. Um
    // app que continua com o microfone aberto depois de "parar" é o pior tipo
    // de mentira que este módulo poderia contar.
    try { fluxo?.getTracks?.().forEach((trilha) => trilha.stop()); } catch { /* já solto */ }
    try { analisador?.disconnect?.(); } catch { /* já desconectado */ }
    try { contexto?.close?.(); } catch { /* já fechado */ }
    fluxo = null;
    analisador = null;
    contexto = null;
    buffer = null;
  }

  function medirQuadro() {
    if (!analisador || !buffer) return;
    analisador.getFloatFrequencyData(buffer);
    const quadro = analisarQuadro(buffer, { taxaAmostragem: contexto.sampleRate });
    if (!quadro) return;

    const instante = agora();
    const resultado = detector.observar({ instante, quadro });
    aoQuadro({
      instante,
      espectro: buffer,
      taxaAmostragem: contexto.sampleRate,
      quadro,
      leitura: resultado.leitura,
      motivo: resultado.motivo,
    });
    if (!resultado.evento) return;

    const disparo = dispararAlerta({
      tipo: TIPOS_ALERTA[resultado.evento],
      gravidade: GRAVIDADE_DO_EVENTO[resultado.evento] ?? GRAVIDADES.AVISO,
      agora: instante,
      ultimoAvisoPorTipo,
      ...(vibrarApi === undefined ? {} : { vibrarApi }),
    });
    ultimoAvisoPorTipo = disparo.ultimoAvisoPorTipo;
    // O aviso chega à tela mesmo quando a vibração não acontece: o iOS ignora
    // a API e o aparelho pode estar no silencioso. Canal visual nunca depende
    // do canal tátil.
    if (disparo.motivo === 'INTERVALO_NAO_CUMPRIDO') return;
    aoEvento({ evento: resultado.evento, instante, leitura: resultado.leitura, vibrou: disparo.vibrou });
  }

  return {
    estado: () => estado,
    erro: () => erroAtual,
    concedido: () => concedido,

    async iniciar() {
      if (estado === ESTADOS_ESCUTA.ESCUTANDO || estado === ESTADOS_ESCUTA.PEDINDO_PERMISSAO) return estado;

      const ContextoAudio = acharContextoAudio(janela);
      if (typeof midia?.getUserMedia !== 'function' || !ContextoAudio) {
        mudarEstado(ESTADOS_ESCUTA.INDISPONIVEL);
        return estado;
      }

      mudarEstado(ESTADOS_ESCUTA.PEDINDO_PERMISSAO);
      try {
        fluxo = await midia.getUserMedia(RESTRICOES_AUDIO);
      } catch (erro) {
        fluxo = null;
        mudarEstado(motivoDaFalha(erro), erro);
        return estado;
      }

      try {
        const trilha = fluxo.getAudioTracks?.()[0] ?? null;
        // O navegador pode conceder menos do que foi pedido. Mostrar o que
        // valeu é o que permite desconfiar da leitura em vez de confiar nela.
        concedido = trilha?.getSettings?.() ?? null;

        contexto = new ContextoAudio();
        if (contexto.state === 'suspended') await contexto.resume?.();
        analisador = contexto.createAnalyser();
        analisador.fftSize = fftTamanho;
        analisador.smoothingTimeConstant = suavizacao;
        // A fonte vai para o analisador e para o mais nada. Ligar em
        // `contexto.destination` jogaria o microfone no alto-falante.
        contexto.createMediaStreamSource(fluxo).connect(analisador);

        buffer = new Float32Array(analisador.frequencyBinCount);
        detector = criarDetectorAcustico({ limiares });
        ultimoAvisoPorTipo = {};
        cancelarLaco = agendar(medirQuadro, intervaloMs);
        mudarEstado(ESTADOS_ESCUTA.ESCUTANDO);
      } catch (erro) {
        desligarGrafo();
        mudarEstado(ESTADOS_ESCUTA.FALHOU, erro);
      }
      return estado;
    },

    parar() {
      desligarGrafo();
      detector = null;
      concedido = null;
      if (estado !== ESTADOS_ESCUTA.PARADA) mudarEstado(ESTADOS_ESCUTA.PARADA);
      return estado;
    },
  };
}
