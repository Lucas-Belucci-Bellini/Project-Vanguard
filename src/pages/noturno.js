/**
 * Tela de visão noturna.
 *
 * A tela mostra três coisas ao mesmo tempo, e por um motivo: a imagem, os
 * números do que foi feito com ela, e o que este modo **não** é. Uma imagem de
 * visão noturna amplificada 12× é em boa parte ruído organizado; quem está
 * olhando precisa saber o quanto foi amplificado para decidir se acredita no
 * vulto que viu.
 *
 * A captura reaproveita a foto de parada que já existe (`foto-parada.js` +
 * `foto-storage.js`): a imagem noturna é guardada com a coordenada da captura,
 * no mesmo lugar, exportada nos mesmos formatos. Nenhuma arquitetura paralela.
 */

import '../styles/noturno.css';
import { h } from '../ui/helpers.js';
import { estado, CHAVES } from '../core/estado.js';
import { criarCameraNoturna, ESTADOS_CAMERA } from '../core/camera-noturna.js';
import { PALETAS, DIAGNOSTICOS } from '../engine/visao-noturna.js';
import { criarMediaDeFixos } from '../engine/fixo-medio.js';
import { iniciarAcompanhamento, precisaoLabel } from '../core/localizacao.js';
import { criarRegistroFotoParada, PRECISAO_PARADA_PADRAO_M } from '../core/foto-parada.js';
import { criarStorageFotos } from '../core/foto-storage.js';

const PALETAS_UI = [
  { id: PALETAS.FOSFORO, rotulo: 'FÓSFORO', nota: 'O verde clássico. Queima pouco a visão noturna.' },
  { id: PALETAS.VERMELHO, rotulo: 'VERMELHO', nota: 'O que menos estraga a adaptação ao escuro.' },
  { id: PALETAS.BRANCO_QUENTE, rotulo: 'BRANCO', nota: 'Mais detalhe percebido, pior para os olhos.' },
  { id: PALETAS.CINZA, rotulo: 'CINZA', nota: 'Sem viés de cor, para julgar a imagem crua.' },
];

const MENSAGEM_DO_ESTADO = {
  [ESTADOS_CAMERA.PARADA]: 'Parada. A câmera está solta.',
  [ESTADOS_CAMERA.PEDINDO_PERMISSAO]: 'Pedindo acesso à câmera…',
  [ESTADOS_CAMERA.ATIVA]: 'Ativa. Nada é gravado nem enviado.',
  [ESTADOS_CAMERA.NEGADA]: 'Permissão negada. Libere a câmera nas configurações do aparelho.',
  [ESTADOS_CAMERA.INDISPONIVEL]: 'Este aparelho ou navegador não entrega a câmera ao aplicativo.',
  [ESTADOS_CAMERA.FALHOU]: 'A câmera falhou.',
};

const AVISO_DIAGNOSTICO = {
  [DIAGNOSTICOS.ESCURO_DEMAIS]: '⚠ Escuro demais: não há luz suficiente para amplificar. O que aparece é ruído do sensor, não a cena. Acenda a lanterna ou procure alguma fonte de luz.',
  [DIAGNOSTICOS.ESTOURADO]: '⚠ Claro demais para este modo: a cena já é visível a olho nu.',
};

export function noturnoPage() {
  const raiz = h('div', { className: 'vg-pagina noturno' });
  const guardado = estado.get(CHAVES.NOTURNO, null);

  let camera = null;
  let pararGps = null;
  let posicao = null;
  let desmontado = false;
  let capturando = false;
  const mediaFixos = criarMediaDeFixos();
  const storageFotos = criarStorageFotos();

  // ── Visor ─────────────────────────────────────────────────────────────────
  const tela = h('canvas', { className: 'noturno__canvas', width: 640, height: 480, ariaLabel: 'Imagem da visão noturna' });
  const semImagem = h('div', { className: 'noturno__vazio' },
    h('strong', null, 'VISÃO NOTURNA'),
    h('p', null, 'Amplificação de luz. Aponte a câmera e toque em COMEÇAR.'));
  const visor = h('div', { className: 'noturno__visor' }, tela, semImagem);

  const avisoDiagnostico = h('p', { className: 'noturno__diagnostico', role: 'status', hidden: true });

  // ── Números do que foi feito com a imagem ────────────────────────────────
  function medidor(rotulo, dica) {
    const valor = h('strong', null, '—');
    return {
      elemento: h('div', { className: 'noturno__medidor', title: dica }, h('span', null, rotulo), valor),
      valor,
    };
  }
  const mAmplificacao = medidor('AMPLIFICAÇÃO', 'Quanto o contraste da cena foi esticado.');
  const mPilha = medidor('QUADROS NA PILHA', 'Quantos quadros estão sendo somados. Mais quadros, menos ruído.');
  const mRuido = medidor('RUÍDO', 'O que sobrou do ruído do sensor depois da pilha.');
  const mLuz = medidor('LUZ DA CENA', 'Brilho médio que chega ao sensor, de 0 a 255.');

  // ── Controles ─────────────────────────────────────────────────────────────
  const botao = h('button', { className: 'noturno__botao primario', type: 'button' }, 'COMEÇAR');
  const botaoCapturar = h('button', { className: 'noturno__botao', type: 'button', disabled: true }, '⏺ CAPTURAR');
  const botaoLanterna = h('button', { className: 'noturno__botao', type: 'button', hidden: true }, '🔦 LANTERNA');

  const seletorPaleta = h('div', { className: 'noturno__paletas', role: 'group', 'aria-label': 'Cor da imagem' });
  let paletaAtual = PALETAS_UI.find((p) => p.id === guardado?.paleta)?.id ?? PALETAS.FOSFORO;
  const notaPaleta = h('p', { className: 'noturno__nota' }, '');
  const botoesPaleta = PALETAS_UI.map((opcao) => {
    const botaoPaleta = h('button', {
      className: 'noturno__paleta',
      type: 'button',
      dataset: { paleta: opcao.id },
      onclick: () => aplicarPaleta(opcao.id),
    }, opcao.rotulo);
    seletorPaleta.append(botaoPaleta);
    return botaoPaleta;
  });

  const ganhoInicial = Number.isFinite(Number(guardado?.ganho)) ? Number(guardado.ganho) : 1;
  const ganho = h('input', {
    className: 'noturno__faixa', type: 'range', min: '0.5', max: '4', step: '0.1',
    value: String(ganhoInicial), 'aria-label': 'Ganho manual',
  });
  const ganhoValor = h('span', { className: 'noturno__faixa-valor' }, `${ganhoInicial.toFixed(1)}×`);

  const empilhar = h('input', { type: 'checkbox', checked: guardado?.empilhar !== false, id: 'noturno-empilhar' });

  const status = h('p', { className: 'noturno__status', role: 'status' }, MENSAGEM_DO_ESTADO[ESTADOS_CAMERA.PARADA]);
  const statusCaptura = h('p', { className: 'noturno__captura-status', role: 'status' },
    `A imagem é guardada com a coordenada da captura; a parada pede precisão de ${PRECISAO_PARADA_PADRAO_M} m ou melhor.`);
  const statusPosicao = h('p', { className: 'noturno__posicao' }, 'Sem fixo de GPS ainda.');

  function guardarPreferencias() {
    estado.set(CHAVES.NOTURNO, {
      paleta: paletaAtual,
      ganho: Number(ganho.value),
      empilhar: empilhar.checked,
    });
  }

  function aplicarPaleta(id) {
    paletaAtual = camera ? camera.trocarPaleta(id) : id;
    botoesPaleta.forEach((b) => b.classList.toggle('is-ativa', b.dataset.paleta === paletaAtual));
    notaPaleta.textContent = PALETAS_UI.find((p) => p.id === paletaAtual)?.nota ?? '';
    raiz.dataset.paleta = paletaAtual;
    guardarPreferencias();
  }

  function aplicarAjustes() {
    ganhoValor.textContent = `${Number(ganho.value).toFixed(1)}×`;
    camera?.ajustar({ ganho: Number(ganho.value), empilhar: empilhar.checked });
    guardarPreferencias();
  }
  ganho.addEventListener('input', aplicarAjustes);
  empilhar.addEventListener('change', aplicarAjustes);

  function aplicarQuadro(relatorio) {
    if (desmontado) return;
    mAmplificacao.valor.textContent = `${relatorio.amplificacao.toFixed(1)}×`;
    mPilha.valor.textContent = relatorio.empilhando
      ? `${relatorio.quadrosEquivalentes.toFixed(1)}`
      : '1 (desligada)';
    // O inverso do fator é o que a pessoa quer ler: "3× menos ruído".
    mRuido.valor.textContent = `${(1 / relatorio.fatorRuido).toFixed(1)}× menos`;
    mLuz.valor.textContent = relatorio.luzMedia.toFixed(1);
    const aviso = AVISO_DIAGNOSTICO[relatorio.diagnostico];
    avisoDiagnostico.hidden = !aviso;
    avisoDiagnostico.textContent = aviso ?? '';
  }

  function aplicarEstadoCamera({ estado: novo, capacidades, exposicao }) {
    if (desmontado) return;
    status.textContent = MENSAGEM_DO_ESTADO[novo] ?? novo;
    raiz.dataset.camera = novo;
    const ativa = novo === ESTADOS_CAMERA.ATIVA;
    botao.textContent = ativa ? 'PARAR' : 'COMEÇAR';
    botao.classList.toggle('primario', !ativa);
    botaoCapturar.disabled = !ativa;
    semImagem.hidden = ativa;
    botaoLanterna.hidden = !ativa || !capacidades?.lanterna;
    if (ativa && exposicao) {
      // O que o aparelho concedeu, não o que foi pedido: sem exposição longa a
      // imagem é mais escura, e quem lê a tela merece saber por quê.
      status.textContent = exposicao.aplicada
        ? 'Ativa, com exposição longa concedida pelo aparelho. Nada é gravado nem enviado.'
        : 'Ativa. Este aparelho não deixa o app alongar a exposição, então a imagem depende só do empilhamento.';
    }
  }

  async function alternarCamera() {
    if (camera && camera.estadoAtual() === ESTADOS_CAMERA.ATIVA) {
      camera.parar();
      return;
    }
    camera ??= criarCameraNoturna({
      paleta: paletaAtual,
      aoQuadro: aplicarQuadro,
      aoEstado: aplicarEstadoCamera,
    });
    camera.ligarDestino(tela);
    camera.ajustar({ ganho: Number(ganho.value), empilhar: empilhar.checked });
    await camera.iniciar();
  }

  async function alternarLanterna() {
    const resultado = await camera?.alternarLanterna(!botaoLanterna.classList.contains('is-ativa'));
    if (!resultado?.ok) {
      status.textContent = resultado?.motivo ?? 'A lanterna não respondeu.';
      return;
    }
    botaoLanterna.classList.toggle('is-ativa', resultado.ligada);
  }

  async function capturar() {
    if (capturando) return;
    capturando = true;
    botaoCapturar.disabled = true;
    try {
      const foto = await camera?.capturar();
      if (!foto?.ok) {
        statusCaptura.textContent = foto?.motivo ?? 'A imagem não pôde ser capturada.';
        return;
      }
      if (!posicao) {
        // A regra da foto de parada: sem posição real não existe registro.
        // Inventar a coordenada seria dizer onde a pessoa estava sem saber.
        statusCaptura.textContent = 'Sem fixo de GPS. A imagem não é guardada sem coordenada — ligue a localização e espere o fixo.';
        return;
      }
      const registro = criarRegistroFotoParada({
        id: `noturno-${new Date().toISOString().replace(/[:.]/g, '-')}`,
        posicao,
        imagem: { mime: foto.mime, sizeBytes: foto.bytes.byteLength, largura: foto.largura, altura: foto.altura },
        capturadaEm: Date.now(),
        nota: foto.relatorio
          ? `Visão noturna, amplificada ${foto.relatorio.amplificacao.toFixed(1)}× com ${foto.relatorio.quadrosEquivalentes.toFixed(1)} quadros na pilha.`
          : 'Visão noturna.',
      });
      if (!registro.ok) {
        statusCaptura.textContent = registro.motivo;
        return;
      }
      const gravacao = await storageFotos.salvarFoto(registro.registro, foto.bytes);
      if (desmontado) return;
      statusCaptura.textContent = gravacao.ok
        ? `Guardada em ${registro.registro.mgrs ?? 'coordenada local'}${registro.registro.dentroDoLimite ? '' : ' — com a ressalva de precisão no registro'}. Ela aparece na lista de paradas do Mapa.`
        : `A imagem não foi guardada: ${gravacao.motivo}`;
    } catch (erro) {
      statusCaptura.textContent = erro?.message ?? 'A captura falhou.';
    } finally {
      capturando = false;
      botaoCapturar.disabled = camera?.estadoAtual() !== ESTADOS_CAMERA.ATIVA;
    }
  }

  botao.addEventListener('click', alternarCamera);
  botaoCapturar.addEventListener('click', capturar);
  botaoLanterna.addEventListener('click', alternarLanterna);

  // ── GPS: a média de fixos melhora a coordenada da captura ────────────────
  pararGps = iniciarAcompanhamento({
    mode: 'trilha',
    onPosition: (nova) => {
      if (desmontado) return;
      const media = mediaFixos.adicionar(nova);
      // A média só substitui o fixo cru quando ela existe E é melhor: parado,
      // ela reduz o espalhamento; andando, o fixo cru é quem descreve o agora.
      posicao = media.posicao && media.posicao.accuracy < (nova.accuracy ?? Infinity)
        ? { ...nova, ...media.posicao }
        : nova;
      statusPosicao.textContent = posicao.mediada
        ? `${precisaoLabel(posicao.accuracy)} — média de ${posicao.amostras} fixos parados (o fixo cru é ${precisaoLabel(nova.accuracy)}).`
        : `${precisaoLabel(nova.accuracy)} — fixo do aparelho.`;
    },
    onError: () => {
      if (!desmontado) statusPosicao.textContent = 'Sem fixo de GPS. A captura precisa de coordenada para virar registro.';
    },
  });

  aplicarPaleta(paletaAtual);
  aplicarAjustes();

  // `.vg-pagina` é `overflow: hidden`; o rolamento é do contêiner interno,
  // como nas outras telas. Sem isto o conteúdo é cortado no rodapé.
  const rolagem = h('div', { className: 'noturno__scroll' });
  rolagem.append(
    h('header', { className: 'noturno__head' },
      h('h1', null, 'Visão noturna'),
      h('p', null, 'Amplificação da luz que já existe, com a coordenada de onde a imagem foi feita.')),
    visor,
    avisoDiagnostico,
    h('div', { className: 'noturno__acoes' }, botao, botaoCapturar, botaoLanterna),
    status,
    h('div', { className: 'noturno__medidores' },
      mAmplificacao.elemento, mPilha.elemento, mRuido.elemento, mLuz.elemento),
    h('section', { className: 'noturno__controles' },
      h('h2', null, 'Ajustes'),
      seletorPaleta,
      notaPaleta,
      h('label', { className: 'noturno__faixa-linha' },
        h('span', null, 'GANHO'), ganho, ganhoValor),
      h('label', { className: 'noturno__opcao', htmlFor: 'noturno-empilhar' },
        empilhar,
        h('span', null, 'Empilhar quadros (menos ruído parado, rastro em movimento)'))),
    h('section', { className: 'noturno__captura' },
      h('h2', null, 'Captura'),
      statusCaptura,
      statusPosicao),
    h('section', { className: 'noturno__limite' },
      h('h2', null, 'O que este modo é, e o que não é'),
      h('p', null, h('strong', null, 'Não é infravermelho e não é térmico. '),
        'A câmera do celular tem um filtro corta-IR de fábrica e não existe sensor térmico em telefone comum — nenhum software desfaz isso. No escuro absoluto não há o que amplificar, e a tela avisa quando é esse o caso.'),
      h('p', null, 'O que ele faz é somar quadros para cancelar o ruído do sensor e esticar o contraste do pouco de luz que existe. Parado, a pilha chega a nove quadros e o ruído cai três vezes; varrendo o terreno, ela encolhe sozinha para a imagem não arrastar.'),
      h('p', null, 'A imagem não é gravada nem enviada. Só vira arquivo quando você toca em CAPTURAR, e o arquivo fica no aparelho.')),
  );
  raiz.append(rolagem);

  return {
    elemento: raiz,
    desmontar: () => {
      desmontado = true;
      // Sair da tela solta a câmera. Deixá-la aberta com a tela fora do ar
      // seria queimar bateria e manter o indicador do sistema aceso sem que
      // nada esteja usando a imagem.
      try { camera?.parar(); } catch { /* já parada */ }
      camera = null;
      // `iniciarAcompanhamento` devolve a própria função de parada, não um
      // objeto com `.encerrar()`.
      try { pararGps?.(); } catch { /* já encerrado */ }
      pararGps = null;
    },
  };
}
