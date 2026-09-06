/**
 * Câmera noturna — a câmera do aparelho ligada no motor de
 * `src/engine/visao-noturna.js`.
 *
 * ## Só vê. Nunca transmite.
 *
 * A mesma regra da escuta, pelo mesmo motivo — e aqui ela pesa mais, porque
 * imagem identifica pessoa e lugar. O caminho do vídeo neste módulo é um só:
 * `getUserMedia` → `<video>` → `canvas` → pixels → `canvas` de volta na tela.
 * Ele **não** é gravado, **não** é enviado e **não** é guardado sozinho. Só
 * existe arquivo quando o operador aperta o botão de capturar, e mesmo assim o
 * destino é o armazenamento local que já existe (`foto-storage.js`), no
 * aparelho, com a coordenada da captura.
 *
 * Isso é estrutural, não é promessa: não há `MediaRecorder`, não há
 * `RTCPeerConnection`, não há `fetch`, `XMLHttpRequest` ou `WebSocket` neste
 * arquivo nem no motor. `test/camera-noturna.test.js` cobra essa lista lendo o
 * próprio código — acrescentar qualquer uma delas quebra o teste.
 *
 * ## O pedido de câmera é feito para o escuro
 *
 * Três coisas melhoram a imagem antes de qualquer processamento, e as três
 * dependem do aparelho aceitar:
 *
 * - **Exposição longa.** Mais tempo de sensor por quadro é mais fóton por
 *   quadro. Onde `exposureMode: 'manual'` existe, o módulo pede o maior tempo
 *   que a câmera declara. Onde não existe, segue sem ele.
 * - **Taxa de quadros baixa.** 15 fps em vez de 30 dá ao sensor o dobro de
 *   tempo por quadro, e a pilha temporal já cuida do resto.
 * - **Nada de correção automática de cor.** O balanço de branco automático
 *   persegue uma cor que não existe numa cena monocromática escura, e fica
 *   bombeando a imagem.
 *
 * Cada uma dessas é pedida como *ideal*, nunca como obrigatória: uma restrição
 * obrigatória que o aparelho não atende faz o `getUserMedia` inteiro falhar, e
 * ficar sem câmera para ganhar exposição seria um péssimo negócio. O que foi
 * concedido de verdade é lido de volta e mostrado na tela.
 */

import { criarVisaoNoturna, PALETAS, DIAGNOSTICOS } from '../engine/visao-noturna.js';

export const ESTADOS_CAMERA = Object.freeze({
  PARADA: 'PARADA',
  INDISPONIVEL: 'INDISPONIVEL',
  PEDINDO_PERMISSAO: 'PEDINDO_PERMISSAO',
  ATIVA: 'ATIVA',
  NEGADA: 'NEGADA',
  FALHOU: 'FALHOU',
});

/**
 * Pedido de mídia: só vídeo, câmera de trás, e as preferências de pouca luz.
 * Áudio nunca é solicitado — este módulo não tem nada que ouvir.
 */
export const RESTRICOES_VIDEO = Object.freeze({
  audio: false,
  video: Object.freeze({
    facingMode: Object.freeze({ ideal: 'environment' }),
    width: Object.freeze({ ideal: 1280 }),
    height: Object.freeze({ ideal: 720 }),
    frameRate: Object.freeze({ ideal: 15, max: 30 }),
  }),
});

/** Lado maior do quadro processado. Acima disto não cabe em 15 fps no celular. */
export const LADO_MAXIMO_PROCESSADO = 640;

function motivoDaFalha(erro) {
  const nome = erro?.name ?? '';
  if (nome === 'NotAllowedError' || nome === 'SecurityError') return ESTADOS_CAMERA.NEGADA;
  if (nome === 'NotFoundError' || nome === 'OverconstrainedError' || nome === 'NotReadableError') {
    return ESTADOS_CAMERA.INDISPONIVEL;
  }
  return ESTADOS_CAMERA.FALHOU;
}

/** Escala o quadro para caber no orçamento de processamento, mantendo a proporção. */
export function dimensaoProcessada(largura, altura, ladoMaximo = LADO_MAXIMO_PROCESSADO) {
  const l = Number(largura) > 0 ? Math.round(Number(largura)) : 0;
  const a = Number(altura) > 0 ? Math.round(Number(altura)) : 0;
  if (!l || !a) return { largura: 0, altura: 0, escala: 1 };
  const maior = Math.max(l, a);
  if (maior <= ladoMaximo) return { largura: l, altura: a, escala: 1 };
  const escala = ladoMaximo / maior;
  return {
    largura: Math.max(1, Math.round(l * escala)),
    altura: Math.max(1, Math.round(a * escala)),
    escala,
  };
}

/**
 * Lê o que a câmera declara saber fazer. Tudo aqui é opcional por natureza:
 * navegador sem `getCapabilities` devolve tudo `false`, e o app segue.
 */
export function lerCapacidades(trilha) {
  let capacidades = null;
  try {
    capacidades = trilha?.getCapabilities?.() ?? null;
  } catch {
    capacidades = null;
  }
  const tem = (chave) => capacidades != null && chave in capacidades;
  return {
    lanterna: tem('torch') && capacidades.torch !== false,
    exposicaoManual: Array.isArray(capacidades?.exposureMode) && capacidades.exposureMode.includes('manual'),
    tempoExposicao: tem('exposureTime') ? capacidades.exposureTime : null,
    iso: tem('iso') ? capacidades.iso : null,
    cru: capacidades,
  };
}

/**
 * Pede a exposição mais longa que a câmera declara.
 * Falha aqui nunca é fatal: a imagem fica mais escura, e a pilha compensa parte.
 */
export async function aplicarExposicaoLonga(trilha, capacidades) {
  if (!capacidades?.exposicaoManual || typeof trilha?.applyConstraints !== 'function') {
    return { aplicada: false, motivo: 'A câmera não expõe controle manual de exposição.' };
  }
  const maximo = Number(capacidades.tempoExposicao?.max);
  const avancado = { exposureMode: 'manual' };
  if (Number.isFinite(maximo) && maximo > 0) avancado.exposureTime = maximo;
  if (capacidades.iso && Number.isFinite(Number(capacidades.iso.max))) avancado.iso = Number(capacidades.iso.max);
  try {
    await trilha.applyConstraints({ advanced: [avancado] });
    return { aplicada: true, tempoExposicao: avancado.exposureTime ?? null, iso: avancado.iso ?? null, motivo: null };
  } catch (erro) {
    return { aplicada: false, motivo: erro?.message ?? 'A câmera recusou a exposição longa.' };
  }
}

/**
 * @param {object} opcoes
 * @param {(relatorio: object) => void} [opcoes.aoQuadro] relatório de cada quadro
 * @param {(estado: object) => void} [opcoes.aoEstado] mudança de estado
 */
export function criarCameraNoturna({
  aoQuadro = () => {},
  aoEstado = () => {},
  paleta = PALETAS.FOSFORO,
  ladoMaximo = LADO_MAXIMO_PROCESSADO,
  midia = typeof navigator !== 'undefined' ? navigator.mediaDevices : null,
  documento = typeof document !== 'undefined' ? document : null,
  // O laço é injetável para o teste avançar quadro a quadro em vez de esperar
  // pela tela — o mesmo recurso que a escuta usa.
  agendar = (tarefa) => {
    const janela = typeof window !== 'undefined' ? window : null;
    if (janela?.requestAnimationFrame) {
      const id = janela.requestAnimationFrame(tarefa);
      return () => janela.cancelAnimationFrame(id);
    }
    const id = setTimeout(tarefa, 66);
    return () => clearTimeout(id);
  },
} = {}) {
  const motor = criarVisaoNoturna({ paleta });
  let estado = ESTADOS_CAMERA.PARADA;
  let fluxo = null;
  let trilha = null;
  let video = null;
  let telaTrabalho = null;
  let pincelTrabalho = null;
  let cancelarLaco = null;
  let destino = null;
  let capacidades = null;
  let exposicao = null;
  let lanternaLigada = false;
  let ajustes = { ganho: 1, empilhar: true };
  let ultimoRelatorio = null;

  function mudarEstado(novo, erro = null) {
    estado = novo;
    aoEstado({
      estado,
      erro: erro?.message ?? null,
      capacidades,
      exposicao,
      lanternaLigada,
      resolucao: telaTrabalho ? { largura: telaTrabalho.width, altura: telaTrabalho.height } : null,
    });
  }

  function soltarTudo() {
    if (cancelarLaco) {
      try { cancelarLaco(); } catch { /* laço já encerrado */ }
      cancelarLaco = null;
    }
    // Soltar a trilha é o que apaga o indicador de câmera do sistema. Um app
    // que continua com a câmera aberta depois de "parar" é exatamente o tipo de
    // mentira que este módulo não pode contar.
    try { fluxo?.getTracks?.().forEach((t) => t.stop()); } catch { /* já solto */ }
    try { if (video) video.srcObject = null; } catch { /* nada a fazer */ }
    fluxo = null;
    trilha = null;
    lanternaLigada = false;
  }

  function desenharQuadro() {
    if (!video || !pincelTrabalho || !telaTrabalho) return null;
    const { width: l, height: a } = telaTrabalho;
    if (!l || !a) return null;
    pincelTrabalho.drawImage(video, 0, 0, l, a);
    const imagem = pincelTrabalho.getImageData(0, 0, l, a);
    const relatorio = motor.processar(imagem.data, l, a, ajustes);
    pincelTrabalho.putImageData(imagem, 0, 0);
    if (destino) {
      const pincelDestino = destino.getContext('2d');
      if (pincelDestino) {
        if (destino.width !== l || destino.height !== a) { destino.width = l; destino.height = a; }
        pincelDestino.drawImage(telaTrabalho, 0, 0);
      }
    }
    ultimoRelatorio = relatorio;
    return relatorio;
  }

  function laco() {
    if (estado !== ESTADOS_CAMERA.ATIVA) return;
    let relatorio = null;
    try {
      relatorio = desenharQuadro();
    } catch (erro) {
      mudarEstado(ESTADOS_CAMERA.FALHOU, erro);
      soltarTudo();
      return;
    }
    if (relatorio) aoQuadro(relatorio);
    cancelarLaco = agendar(laco);
  }

  return {
    estadoAtual: () => estado,
    relatorio: () => ultimoRelatorio,
    capacidades: () => capacidades,
    paletaAtual: () => motor.paletaAtual(),
    trocarPaleta: (nome) => motor.trocarPaleta(nome),
    ajustar(novos = {}) {
      ajustes = { ...ajustes, ...novos };
      return { ...ajustes };
    },
    ajustesAtuais: () => ({ ...ajustes }),
    /** Onde a imagem processada é pintada. */
    ligarDestino(canvas) { destino = canvas ?? null; },

    /** Liga ou desliga a lanterna, quando o aparelho tem uma. */
    async alternarLanterna(ligar) {
      if (!capacidades?.lanterna || typeof trilha?.applyConstraints !== 'function') {
        return { ok: false, ligada: false, motivo: 'Este aparelho não expõe a lanterna ao aplicativo.' };
      }
      try {
        await trilha.applyConstraints({ advanced: [{ torch: Boolean(ligar) }] });
        lanternaLigada = Boolean(ligar);
        return { ok: true, ligada: lanternaLigada, motivo: null };
      } catch (erro) {
        return { ok: false, ligada: lanternaLigada, motivo: erro?.message ?? 'A lanterna recusou o comando.' };
      }
    },

    async iniciar() {
      if (estado === ESTADOS_CAMERA.ATIVA) return { ok: true, estado };
      if (!midia?.getUserMedia || !documento?.createElement) {
        mudarEstado(ESTADOS_CAMERA.INDISPONIVEL);
        return { ok: false, estado, motivo: 'Este aparelho ou navegador não entrega a câmera ao aplicativo.' };
      }

      mudarEstado(ESTADOS_CAMERA.PEDINDO_PERMISSAO);
      try {
        fluxo = await midia.getUserMedia(RESTRICOES_VIDEO);
      } catch (erro) {
        mudarEstado(motivoDaFalha(erro), erro);
        return { ok: false, estado, motivo: erro?.message ?? 'A câmera não pôde ser aberta.' };
      }

      try {
        trilha = fluxo.getVideoTracks?.()[0] ?? null;
        capacidades = lerCapacidades(trilha);
        exposicao = await aplicarExposicaoLonga(trilha, capacidades);

        video = documento.createElement('video');
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.srcObject = fluxo;
        await video.play?.();

        const ajuste = trilha?.getSettings?.() ?? {};
        const bruto = {
          largura: video.videoWidth || ajuste.width || 640,
          altura: video.videoHeight || ajuste.height || 480,
        };
        const alvo = dimensaoProcessada(bruto.largura, bruto.altura, ladoMaximo);
        telaTrabalho = documento.createElement('canvas');
        telaTrabalho.width = alvo.largura;
        telaTrabalho.height = alvo.altura;
        // `willReadFrequently` evita que o navegador mantenha a superfície na
        // GPU: cada quadro é lido de volta, e sem isso a leitura domina o custo.
        pincelTrabalho = telaTrabalho.getContext('2d', { willReadFrequently: true });
        if (!pincelTrabalho) throw new Error('Este navegador não entrega um contexto 2D para processar a imagem.');

        motor.reiniciar();
        mudarEstado(ESTADOS_CAMERA.ATIVA);
        cancelarLaco = agendar(laco);
        return { ok: true, estado, capacidades, exposicao };
      } catch (erro) {
        soltarTudo();
        mudarEstado(ESTADOS_CAMERA.FALHOU, erro);
        return { ok: false, estado, motivo: erro?.message ?? 'A câmera abriu mas não pôde ser preparada.' };
      }
    },

    parar() {
      soltarTudo();
      motor.reiniciar();
      if (estado !== ESTADOS_CAMERA.PARADA) mudarEstado(ESTADOS_CAMERA.PARADA);
      return { ok: true, estado };
    },

    /**
     * Congela o quadro processado num arquivo. É o único caminho pelo qual a
     * imagem vira bytes — e ele só existe quando o operador pede.
     */
    async capturar({ tipo = 'image/jpeg', qualidade = 0.9 } = {}) {
      if (estado !== ESTADOS_CAMERA.ATIVA || !telaTrabalho) {
        return { ok: false, motivo: 'A câmera noturna não está ativa.', bytes: null, mime: null };
      }
      const relatorio = ultimoRelatorio;
      const blob = await new Promise((resolve) => {
        if (typeof telaTrabalho.toBlob === 'function') telaTrabalho.toBlob(resolve, tipo, qualidade);
        else resolve(null);
      });
      if (!blob) return { ok: false, motivo: 'Este navegador não converteu a imagem em arquivo.', bytes: null, mime: null };
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (!bytes.byteLength) return { ok: false, motivo: 'A imagem saiu vazia.', bytes: null, mime: null };
      return {
        ok: true,
        bytes,
        mime: blob.type || tipo,
        largura: telaTrabalho.width,
        altura: telaTrabalho.height,
        // O relatório viaja junto: uma foto de visão noturna sem dizer quanto
        // foi amplificada é uma foto que o operador não consegue julgar depois.
        relatorio: relatorio
          ? {
              amplificacao: relatorio.amplificacao,
              quadrosEquivalentes: relatorio.quadrosEquivalentes,
              paleta: relatorio.paleta,
              diagnostico: relatorio.diagnostico,
              luzMedia: relatorio.luzMedia,
            }
          : null,
        motivo: null,
      };
    },
  };
}

export { PALETAS, DIAGNOSTICOS };
