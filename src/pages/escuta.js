/**
 * Tela de escuta — analisador de frequências que só escuta.
 *
 * Mostra três coisas ao mesmo tempo, porque nenhuma delas basta sozinha:
 * o espectro ao vivo (para o operador ver o que o aparelho está ouvindo),
 * os números da decisão (nível, piso do lugar, subida) e a régua de
 * sensibilidade. Calibrar isto é trabalho de campo, e sem os números na tela
 * não há como calibrar — só como reclamar.
 */

import '../styles/escuta.css';
import { h } from '../ui/helpers.js';
import { estado, CHAVES } from '../core/estado.js';
import { ESTADOS_ESCUTA, criarEscutaAmbiente } from '../core/escuta-ambiente.js';
import { BANDAS, LIMIARES_PADRAO } from '../engine/escuta.js';
import { TIPOS_ALERTA, descreverAlerta, padraoDoAlerta, GRAVIDADES } from '../core/alertas-tateis.js';

const SENSIBILIDADES = [
  { id: 'conservadora', rotulo: 'CONSERVADORA', margemVeiculoDb: 9, subidaVeiculoDbPorSegundo: 1.5, margemChamadoDb: 14, descricao: 'Avisa menos. Para trecho movimentado, onde tudo é barulho.' },
  { id: 'equilibrada', rotulo: 'EQUILIBRADA', margemVeiculoDb: LIMIARES_PADRAO.margemVeiculoDb, subidaVeiculoDbPorSegundo: LIMIARES_PADRAO.subidaVeiculoDbPorSegundo, margemChamadoDb: LIMIARES_PADRAO.margemChamadoDb, descricao: 'O ponto de partida. Comece por aqui e ajuste no campo.' },
  { id: 'sensivel', rotulo: 'SENSÍVEL', margemVeiculoDb: 4, subidaVeiculoDbPorSegundo: 0.6, margemChamadoDb: 7, descricao: 'Avisa mais, erra mais. Para estrada vazia, onde qualquer motor importa.' },
];

const ROTULOS_EVENTO = {
  VEICULO_APROXIMANDO: { titulo: 'VEÍCULO SE APROXIMANDO', classe: 'escuta__evento--perigo' },
  CHAMADO_VOZ: { titulo: 'ALGUÉM CHAMANDO', classe: 'escuta__evento--voz' },
};

const MENSAGEM_DO_ESTADO = {
  [ESTADOS_ESCUTA.PARADA]: 'Parada. O microfone está solto.',
  [ESTADOS_ESCUTA.PEDINDO_PERMISSAO]: 'Pedindo acesso ao microfone…',
  [ESTADOS_ESCUTA.ESCUTANDO]: 'Escutando. Nada é gravado nem enviado.',
  [ESTADOS_ESCUTA.NEGADA]: 'Permissão negada. Libere o microfone nas configurações do aparelho.',
  [ESTADOS_ESCUTA.INDISPONIVEL]: 'Este aparelho ou navegador não entrega o microfone ao aplicativo.',
  [ESTADOS_ESCUTA.FALHOU]: 'A escuta falhou ao iniciar.',
};

function db(valor, casas = 1) {
  return Number.isFinite(valor) ? `${valor.toFixed(casas)} dB` : '—';
}

export function escutaPage() {
  const raiz = h('div', { className: 'vg-pagina escuta' });
  const guardado = estado.get(CHAVES.ESCUTA, null);
  let sensibilidade = SENSIBILIDADES.find((s) => s.id === guardado?.sensibilidade) ?? SENSIBILIDADES[1];
  let escuta = null;
  let desmontado = false;

  // ── Espectro ──────────────────────────────────────────────────────────────
  const tela = h('canvas', { className: 'escuta__canvas', width: 600, height: 190, ariaHidden: 'true' });
  const pincel = tela.getContext('2d');
  let pisoVisivel = null;

  const ESCALA = { pisoDb: -110, topoDb: -10, maxHz: 4000 };

  function ajustarResolucao() {
    // O canvas é desenhado em pixels de verdade: sem isto o traço fica borrado
    // num aparelho com tela densa, que é exatamente onde ele precisa ser lido.
    const proporcao = Math.min(window.devicePixelRatio || 1, 3);
    const caixa = tela.getBoundingClientRect();
    if (!caixa.width) return;
    tela.width = Math.round(caixa.width * proporcao);
    tela.height = Math.round(caixa.height * proporcao);
  }

  function desenhar(espectro, taxaAmostragem) {
    if (!pincel) return;
    const { width: largura, height: altura } = tela;
    const escala = Math.max(1, largura / 380);
    pincel.clearRect(0, 0, largura, altura);

    const xDe = (hz) => (Math.min(hz, ESCALA.maxHz) / ESCALA.maxHz) * largura;
    // Nível fora da escala é preso na borda em vez de sair da tela: em
    // silêncio digital o traço tem de continuar visível, senão não dá para
    // distinguir "está quieto" de "parou de funcionar".
    const yDe = (db) => {
      const recortado = Math.min(ESCALA.topoDb, Math.max(ESCALA.pisoDb, Number.isFinite(db) ? db : ESCALA.pisoDb));
      return altura - ((recortado - ESCALA.pisoDb) / (ESCALA.topoDb - ESCALA.pisoDb)) * altura;
    };

    // As faixas que o detector usa ficam marcadas atrás do traço: é o que
    // deixa ver *onde* o sinal apareceu, não só que apareceu.
    // Os rótulos são escalonados na vertical: a banda do grave é estreita
    // nesta escala e os dois nomes se atropelariam na mesma linha.
    [
      [BANDAS.MOTOR, 'rgba(255,84,84,.16)', 'GRAVE'],
      [BANDAS.VOZ, 'rgba(139,255,63,.12)', 'VOZ'],
    ].forEach(([banda, cor, nome], indice) => {
      pincel.fillStyle = cor;
      pincel.fillRect(xDe(banda.deHz), 0, xDe(banda.ateHz) - xDe(banda.deHz), altura);
      pincel.fillStyle = 'rgba(233,233,222,.45)';
      pincel.font = `${9 * escala}px ui-monospace, monospace`;
      pincel.fillText(nome, xDe(banda.deHz) + 3 * escala, (11 + indice * 11) * escala);
    });

    pincel.strokeStyle = 'rgba(233,233,222,.10)';
    pincel.lineWidth = escala;
    for (let db = ESCALA.pisoDb; db <= ESCALA.topoDb; db += 25) {
      const y = yDe(db);
      pincel.beginPath();
      pincel.moveTo(0, y);
      pincel.lineTo(largura, y);
      pincel.stroke();
    }

    // O piso aprendido do lugar, para a régua de sensibilidade ter referência
    // visível: o alerta mede distância até esta linha, não até o chão.
    if (Number.isFinite(pisoVisivel)) {
      pincel.strokeStyle = 'rgba(255,176,0,.6)';
      pincel.setLineDash([4 * escala, 4 * escala]);
      pincel.beginPath();
      pincel.moveTo(0, yDe(pisoVisivel));
      pincel.lineTo(largura, yDe(pisoVisivel));
      pincel.stroke();
      pincel.setLineDash([]);
    }

    if (!espectro) return;
    const larguraBin = taxaAmostragem / (2 * espectro.length);
    const ultimoBin = Math.min(espectro.length - 1, Math.round(ESCALA.maxHz / larguraBin));
    pincel.beginPath();
    for (let i = 0; i <= ultimoBin; i += 1) {
      const x = (i / ultimoBin) * largura;
      const y = yDe(espectro[i]);
      if (i === 0) pincel.moveTo(x, y);
      else pincel.lineTo(x, y);
    }
    pincel.strokeStyle = 'rgba(139,255,63,.85)';
    pincel.lineWidth = 1.5 * escala;
    pincel.stroke();
  }

  // ── Números da decisão ────────────────────────────────────────────────────
  function medidor(rotulo) {
    const valor = h('strong', null, '—');
    return { elemento: h('div', { className: 'escuta__medidor' }, h('span', null, rotulo), valor), valor };
  }
  const mMotor = medidor('GRAVE (motor)');
  const mVoz = medidor('VOZ');
  const mPiso = medidor('PISO DO LUGAR');
  const mSubida = medidor('SUBIDA');

  const eventoCartao = h('div', { className: 'escuta__evento', role: 'status', hidden: true });
  const eventoTitulo = h('strong', null, '');
  const eventoDetalhe = h('span', { className: 'escuta__evento-detalhe' }, '');
  eventoCartao.append(eventoTitulo, eventoDetalhe);
  let limparEvento = null;

  const statusTexto = h('p', { className: 'escuta__status', role: 'status' }, MENSAGEM_DO_ESTADO[ESTADOS_ESCUTA.PARADA]);
  const concedidoTexto = h('p', { className: 'escuta__concedido' }, '');
  const botao = h('button', { className: 'escuta__botao primario', type: 'button' }, 'COMEÇAR A ESCUTAR');

  function pintarEvento({ evento, vibrou }) {
    const rotulo = ROTULOS_EVENTO[evento];
    if (!rotulo) return;
    eventoCartao.hidden = false;
    eventoCartao.className = `escuta__evento ${rotulo.classe}`;
    eventoTitulo.textContent = rotulo.titulo;
    eventoDetalhe.textContent = vibrou
      ? descreverAlerta(TIPOS_ALERTA[evento])
      : `${descreverAlerta(TIPOS_ALERTA[evento])} (sem vibração neste aparelho)`;
    if (limparEvento) clearTimeout(limparEvento);
    limparEvento = setTimeout(() => { eventoCartao.hidden = true; }, 12_000);
  }

  function aplicarEstado({ estado: novo, concedido }) {
    statusTexto.textContent = MENSAGEM_DO_ESTADO[novo] ?? novo;
    raiz.dataset.escuta = novo;
    const ligada = novo === ESTADOS_ESCUTA.ESCUTANDO;
    botao.textContent = ligada ? 'PARAR' : 'COMEÇAR A ESCUTAR';
    botao.classList.toggle('primario', !ligada);
    // O navegador pode conceder menos do que foi pedido. Ganho automático
    // ligado achata a subida de nível — quem lê a tela precisa saber disso
    // antes de culpar o detector.
    const ganho = concedido?.autoGainControl;
    concedidoTexto.textContent = ganho === true
      ? '⚠ O aparelho manteve o ganho automático ligado: ele achata a subida de nível e o alerta de veículo fica menos confiável.'
      : '';
  }

  function aplicarQuadro({ espectro, taxaAmostragem, leitura }) {
    if (desmontado) return;
    pisoVisivel = leitura?.pisoMotorDb ?? null;
    desenhar(espectro, taxaAmostragem);
    if (!leitura) return;
    mMotor.valor.textContent = db(leitura.motorDb);
    mVoz.valor.textContent = db(leitura.vozDb);
    mPiso.valor.textContent = db(leitura.pisoMotorDb);
    mSubida.valor.textContent = Number.isFinite(leitura.subidaMotorDbPorSegundo)
      ? `${leitura.subidaMotorDbPorSegundo >= 0 ? '+' : ''}${leitura.subidaMotorDbPorSegundo.toFixed(2)} dB/s`
      : '—';
  }

  function construirEscuta() {
    return criarEscutaAmbiente({
      limiares: {
        margemVeiculoDb: sensibilidade.margemVeiculoDb,
        subidaVeiculoDbPorSegundo: sensibilidade.subidaVeiculoDbPorSegundo,
        margemChamadoDb: sensibilidade.margemChamadoDb,
      },
      aoQuadro: aplicarQuadro,
      aoEvento: pintarEvento,
      aoEstado: aplicarEstado,
    });
  }

  botao.onclick = async () => {
    if (escuta && escuta.estado() === ESTADOS_ESCUTA.ESCUTANDO) {
      escuta.parar();
      return;
    }
    botao.disabled = true;
    escuta = construirEscuta();
    await escuta.iniciar();
    botao.disabled = false;
  };

  const seletorSensibilidade = h('select', {
    className: 'escuta__sensibilidade',
    ariaLabel: 'Sensibilidade da escuta',
    onchange: (e) => {
      sensibilidade = SENSIBILIDADES.find((s) => s.id === e.target.value) ?? SENSIBILIDADES[1];
      estado.set(CHAVES.ESCUTA, { sensibilidade: sensibilidade.id });
      descricaoSensibilidade.textContent = sensibilidade.descricao;
      // Trocar a régua com a escuta ligada precisa reconstruir o detector: o
      // piso do lugar é aprendido, e mantê-lo com outros limiares daria uma
      // leitura que não corresponde a nenhuma das duas configurações.
      if (escuta && escuta.estado() === ESTADOS_ESCUTA.ESCUTANDO) {
        escuta.parar();
        escuta = construirEscuta();
        escuta.iniciar();
      }
    }
  }, ...SENSIBILIDADES.map((s) => h('option', { value: s.id }, s.rotulo)));
  seletorSensibilidade.value = sensibilidade.id;
  const descricaoSensibilidade = h('small', { className: 'escuta__dica' }, sensibilidade.descricao);

  const vocabulario = h('ul', { className: 'escuta__vocabulario' },
    ...[TIPOS_ALERTA.VEICULO_APROXIMANDO, TIPOS_ALERTA.CHAMADO_VOZ].map((tipo) =>
      h('li', null,
        h('strong', null, descreverAlerta(tipo)),
        h('button', {
          className: 'escuta__provar',
          type: 'button',
          onclick: () => navigator.vibrate?.(padraoDoAlerta(tipo, GRAVIDADES.ALTO))
        }, 'SENTIR')
      )
    )
  );

  raiz.append(
    h('section', { className: 'escuta__scroll' },
      h('div', { className: 'escuta__head' },
        h('div', { className: 'escuta__eyebrow' }, 'ESCUTA DE AMBIENTE'),
        h('h1', null, 'Ouvir antes de ver.'),
        h('p', null, 'O microfone mede o ruído em volta e avisa por vibração quando o grave sobe como sobe um veículo se aproximando, ou quando alguém chama em voz alta. Serve para o trecho de estrada onde o caminhão vem por trás e para a mensagem que atravessa a fila gritada de pessoa em pessoa.')
      ),

      h('div', { className: 'vg-aviso escuta__contrato' },
        h('strong', null, 'Só escuta. Nunca transmite. '),
        'O áudio não é gravado, não é guardado e não sai do aparelho: o que existe são os números desta tela. Não há como falar por aqui — é de propósito.'
      ),

      eventoCartao,
      h('div', { className: 'escuta__painel' },
        tela,
        h('div', { className: 'escuta__medidores' }, mMotor.elemento, mVoz.elemento, mPiso.elemento, mSubida.elemento)
      ),

      botao,
      statusTexto,
      concedidoTexto,

      h('div', { className: 'escuta__campo' },
        h('label', { htmlFor: 'escuta-sensibilidade' }, 'SENSIBILIDADE'),
        seletorSensibilidade,
        descricaoSensibilidade
      ),

      h('div', { className: 'escuta__bloco' },
        h('span', { className: 'escuta__kicker' }, 'COMO CADA AVISO VIBRA'),
        vocabulario
      ),

      h('div', { className: 'escuta__bloco escuta__bloco--limites' },
        h('span', { className: 'escuta__kicker' }, 'O QUE ISTO NÃO FAZ'),
        h('ul', null,
          h('li', null, 'Não diz de que lado vem. Direção exigiria dois microfones separados por uma distância conhecida, e o navegador entrega só um canal.'),
          h('li', null, 'Não identifica o veículo nem entende a palavra falada — mede energia por faixa de frequência, não conteúdo.'),
          h('li', null, 'Não usa a antena do celular. Rádio, FM e sinal de celular não são acessíveis a um aplicativo; o sensor aqui é o microfone.'),
          h('li', null, 'Com a tela apagada o sistema pode suspender o processamento de áudio. Para o trecho em que a escuta importa, deixe a tela ligada.'),
          h('li', null, 'Gasta bateria e ocupa o microfone: outra gravação ou uma chamada interrompe a escuta.'),
          h('li', null, 'Os limiares são um ponto de partida calculado, não medição de estrada. Use os números acima para ajustar a régua no lugar onde você está.')
        )
      )
    )
  );

  aplicarEstado({ estado: ESTADOS_ESCUTA.PARADA, concedido: null });

  const aoRedimensionar = () => { ajustarResolucao(); desenhar(null, 0); };
  window.addEventListener('resize', aoRedimensionar);
  // O canvas ainda não tem largura no momento em que a tela é construída: o
  // primeiro desenho espera o navegador colocá-la no lugar.
  requestAnimationFrame(aoRedimensionar);

  return {
    elemento: raiz,
    desmontar: () => {
      desmontado = true;
      window.removeEventListener('resize', aoRedimensionar);
      if (limparEvento) clearTimeout(limparEvento);
      // Sair da tela solta o microfone. Deixá-lo aberto com a tela fora do ar
      // seria consumir bateria e manter o indicador do sistema aceso sem que
      // nada esteja usando o resultado.
      escuta?.parar();
      escuta = null;
    }
  };
}
