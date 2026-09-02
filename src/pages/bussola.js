/* Bússola de campo: leitura do aparelho, norte verdadeiro, norte de grade,
 * rumo ao destino e conferência pelo Sol. */

import '../styles/bussola.css';
import { h, empty, dist, num } from '../ui/helpers.js';
import { estado, CHAVES } from '../core/estado.js';
import { iniciarAcompanhamento, precisaoLabel } from '../core/localizacao.js';
import { lerBussola, calibrarPeloSol, LADOS, REFERENCIAS_RUMO } from '../core/bussola-leitura.js';
import { criarFiltroDeRumo, QUALIDADES_RUMO } from '../engine/rumo-filtro.js';

function grausTexto(valor) {
  return valor == null ? '—' : `${String(Math.round(valor) % 360).padStart(3, '0')}°`;
}

function setaDoLado(lado) {
  if (lado === LADOS.EM_ROTA) return '▲';
  return lado === LADOS.DIREITA ? '▶' : '◀';
}

export function bussolaPage() {
  const raiz = h('div', { className: 'vg-pagina bussola' });
  const guardado = estado.get(CHAVES.BUSSOLA, null);

  let posicao = estado.get(CHAVES.LOCAL, null);
  let destino = estado.get(CHAVES.DESTINO, null);
  let rumoSensor = Number.isFinite(posicao?.heading) ? posicao.heading : null;
  let correcao = Number.isFinite(guardado?.correcaoSensorDeg) ? guardado.correcaoSensorDeg : null;
  let rumoTravado = Number.isFinite(guardado?.rumoTravadoDeg) ? guardado.rumoTravadoDeg : null;
  let origemLeitura = 'AGUARDANDO SENSOR';
  let sensorAtivo = false;
  let assistindoGps = false;
  let pararGps = () => {};
  let desmontado = false;

  const grau = h('strong', { className: 'bussola__grau' }, '—');
  const cardinal = h('span', { className: 'bussola__cardinal' }, '—');
  const origem = h('span', { className: 'bussola__origem' }, origemLeitura);

  const marcaDestino = h('span', { className: 'bussola__marca-alvo bussola__marca-alvo--destino', hidden: true, title: 'Destino' }, '◆');
  const marcaSol = h('span', { className: 'bussola__marca-alvo bussola__marca-alvo--sol', hidden: true, title: 'Sol' }, '☀');
  const marcaTravado = h('span', { className: 'bussola__marca-alvo bussola__marca-alvo--travado', hidden: true, title: 'Rumo travado' }, '┃');

  const rosa = h('div', { className: 'bussola__rosa', role: 'img', 'aria-label': 'Rosa dos ventos' },
    h('span', { className: 'bussola__ponto-norte' }, 'N'),
    h('span', { className: 'bussola__ponto-leste' }, 'L'),
    h('span', { className: 'bussola__ponto-sul' }, 'S'),
    h('span', { className: 'bussola__ponto-oeste' }, 'O'),
    h('div', { className: 'bussola__anel' },
      h('span', { className: 'bussola__marca bussola__marca--1' }),
      h('span', { className: 'bussola__marca bussola__marca--2' }),
      h('span', { className: 'bussola__marca bussola__marca--3' }),
      h('span', { className: 'bussola__marca bussola__marca--4' })
    ),
    marcaDestino, marcaSol, marcaTravado,
    h('span', { className: 'bussola__ponteiro', ariaHidden: 'true' }, '▲')
  );

  const detalheRumo = h('div', { className: 'bussola__readout' },
    h('span', { className: 'bussola__readout-label' }, 'AZIMUTE'),
    grau, cardinal, origem
  );

  const status = h('div', { className: 'bussola__status', role: 'status' },
    h('span', { className: 'bussola__status-dot' }),
    h('span', { className: 'bussola__status-texto' }, 'Toque em ativar para ligar o sensor e a posição.')
  );
  const ativar = h('button', { className: 'bussola__ativar', type: 'button', onclick: () => ativarSensor() }, 'ATIVAR SENSOR DO APARELHO');

  /* ── nortes ── */
  const linhaVerdadeiro = h('div', { className: 'bussola__linha' });
  const linhaGrade = h('div', { className: 'bussola__linha' });
  const linhaCorrecao = h('div', { className: 'bussola__linha' });
  const avisoReferencia = h('p', { className: 'bussola__aviso' });
  // A leitura crua do magnetômetro treme vários graus com o aparelho parado.
  // O filtro trabalha no vetor unitário (nunca em graus, senão 359° e 1° dão
  // 180°) e derruba esse tremor três vezes; a linha abaixo é o que ele mede
  // sobre a própria leitura — inclusive quando ela não merece confiança.
  const filtroRumo = criarFiltroDeRumo();
  let leituraFiltrada = null;
  const avisoEstabilidade = h('p', { className: 'bussola__aviso bussola__aviso--estabilidade', hidden: true });

  /* ── destino ── */
  const destinoCorpo = h('div', { className: 'bussola__destino-corpo' });
  const destinoSeta = h('strong', { className: 'bussola__seta' }, '—');

  /* ── sol ── */
  const solCorpo = h('div', { className: 'bussola__linha-grupo' });
  const botaoSol = h('button', { className: 'bussola__acao', type: 'button', onclick: () => calibrar() }, 'APONTAR PARA O SOL E CALIBRAR');

  /* ── correção manual ── */
  const campoDeclinacao = h('input', {
    className: 'bussola__campo', type: 'number', step: '0.1', inputMode: 'decimal',
    placeholder: 'ex.: -20.5', 'aria-label': 'Declinação magnética em graus, leste positivo',
  });
  const botaoDeclinacao = h('button', { className: 'bussola__acao', type: 'button', onclick: () => aplicarDeclinacao() }, 'USAR ESTA DECLINAÇÃO');
  const botaoLimparCorrecao = h('button', { className: 'bussola__acao bussola__acao--quieta', type: 'button', onclick: () => definirCorrecao(null, 'Correção apagada; a leitura volta a ser só do aparelho.') }, 'APAGAR CORREÇÃO');

  /* ── rumo travado ── */
  const travadoCorpo = h('div', { className: 'bussola__linha-grupo' });
  const botaoTravar = h('button', { className: 'bussola__acao', type: 'button', onclick: () => travarRumo() }, 'TRAVAR O RUMO ATUAL');
  const botaoDestravar = h('button', { className: 'bussola__acao bussola__acao--quieta', type: 'button', onclick: () => definirTravado(null) }, 'DESTRAVAR');

  function guardar() {
    estado.set(CHAVES.BUSSOLA, {
      correcaoSensorDeg: correcao,
      rumoTravadoDeg: rumoTravado,
      atualizadoEm: new Date().toISOString(),
    });
  }

  function definirCorrecao(valor, mensagem) {
    correcao = Number.isFinite(valor) ? valor : null;
    guardar();
    if (mensagem) status.querySelector('.bussola__status-texto').textContent = mensagem;
    renderizar();
  }

  function definirTravado(valor) {
    rumoTravado = Number.isFinite(valor) ? valor : null;
    guardar();
    renderizar();
  }

  function travarRumo() {
    const leitura = leituraAtual();
    const alvo = leitura.azimuteVerdadeiroDeg ?? leitura.rumoCruDeg;
    if (alvo == null) {
      status.querySelector('.bussola__status-texto').textContent = 'Sem leitura do sensor não há rumo para travar.';
      return;
    }
    definirTravado(alvo);
  }

  function aplicarDeclinacao() {
    const valor = Number(campoDeclinacao.value);
    if (!Number.isFinite(valor) || Math.abs(valor) > 180) {
      status.querySelector('.bussola__status-texto').textContent = 'Informe a declinação em graus, com leste positivo (ex.: -20.5).';
      return;
    }
    // Verdadeiro = magnético + declinação: a declinação É a correção, quando o
    // sensor entrega norte magnético.
    definirCorrecao(valor, `Declinação de ${valor}° aplicada como correção da leitura.`);
  }

  function calibrar() {
    const resultado = calibrarPeloSol({ rumoSensorDeg: rumoSensor, posicao });
    if (!resultado.ok) {
      status.querySelector('.bussola__status-texto').textContent = resultado.motivo;
      return;
    }
    definirCorrecao(resultado.correcaoDeg, resultado.motivo);
  }

  function leituraAtual() {
    return lerBussola({
      rumoSensorDeg: rumoSensor,
      correcaoSensorDeg: correcao,
      posicao,
      destino,
      rumoTravadoDeg: rumoTravado,
    });
  }

  /** `append` do DOM escreve "null" como texto — filtra antes de anexar. */
  function anexar(alvo, ...filhos) {
    alvo.append(...filhos.filter(Boolean));
    return alvo;
  }

  function linha(rotulo, valor, extra = null) {
    return h('div', { className: 'bussola__linha' },
      h('span', { className: 'bussola__linha-rotulo' }, rotulo),
      h('span', { className: 'bussola__linha-valor' }, valor),
      extra ? h('span', { className: 'bussola__linha-extra' }, extra) : null,
    );
  }

  function posicionarMarca(elemento, azimuteAlvo, referencia) {
    if (azimuteAlvo == null || referencia == null) {
      elemento.hidden = true;
      return;
    }
    elemento.hidden = false;
    // O alvo aparece onde ele está EM RELAÇÃO a para onde o aparelho aponta.
    elemento.style.setProperty('--marca', `${azimuteAlvo - referencia}deg`);
  }

  function renderizar() {
    const leitura = leituraAtual();
    const mostrado = leitura.azimuteVerdadeiroDeg ?? leitura.rumoCruDeg;
    grau.textContent = grausTexto(mostrado);
    cardinal.textContent = leitura.cardealVerdadeiro ?? leitura.cardealCru ?? '—';
    origem.textContent = leitura.referencia === REFERENCIAS_RUMO.CORRIGIDA
      ? `${origemLeitura} · CORRIGIDO`
      : `${origemLeitura} · SEM CORREÇÃO`;
    if (mostrado != null) rosa.style.setProperty('--heading', `${mostrado}deg`);

    empty(linhaVerdadeiro).append(linha('AZIMUTE VERDADEIRO', grausTexto(leitura.azimuteVerdadeiroDeg), leitura.cardealVerdadeiro ?? ''));
    empty(linhaGrade).append(linha('AZIMUTE DE GRADE', grausTexto(leitura.azimuteGradeDeg),
      leitura.convergenciaDeg == null ? 'sem posição' : `convergência ${num(leitura.convergenciaDeg, 2)}°`));
    empty(linhaCorrecao).append(linha('CORREÇÃO APLICADA', correcao == null ? '—' : `${correcao >= 0 ? '+' : ''}${num(correcao, 1)}°`,
      correcao == null ? 'leitura crua do aparelho' : 'leitura + correção'));
    avisoReferencia.textContent = leitura.avisos.join(' ');
    avisoReferencia.hidden = leitura.avisos.length === 0;
    pintarEstabilidade();

    empty(destinoCorpo);
    if (!leitura.destino) {
      destinoSeta.textContent = '—';
      destinoCorpo.append(h('p', { className: 'bussola__vazio' }, 'Nenhum destino definido. Marque um no mapa para a bússola apontar para ele.'));
    } else {
      const alvo = leitura.destino;
      destinoSeta.textContent = alvo.lado ? setaDoLado(alvo.lado) : '—';
      destinoSeta.className = `bussola__seta${alvo.lado === LADOS.EM_ROTA ? ' is-em-rota' : ''}`;
      anexar(destinoCorpo,
        alvo.nome ? h('strong', { className: 'bussola__destino-nome' }, alvo.nome) : null,
        linha('RUMO AO DESTINO', grausTexto(alvo.azimuteVerdadeiroDeg), alvo.cardeal ?? ''),
        linha('EM GRADE', grausTexto(alvo.azimuteGradeDeg), 'para casar com o mapa'),
        linha('DISTÂNCIA', dist(alvo.distanciaM)),
        linha('DESVIO', alvo.desvioDeg == null ? '—' : `${Math.abs(Math.round(alvo.desvioDeg))}°`,
          alvo.lado == null ? 'calibre para saber o lado' : alvo.lado === LADOS.EM_ROTA ? 'seguindo o rumo' : `vire à ${alvo.lado.toLowerCase()}`),
        linha('VOLTA', grausTexto(alvo.azimuteRetornoDeg), 'rumo de retorno'),
      );
    }

    empty(solCorpo);
    if (!leitura.sol) {
      solCorpo.append(h('p', { className: 'bussola__vazio' }, 'Sem posição não dá para calcular onde o Sol está.'));
      botaoSol.disabled = true;
    } else {
      const sol = leitura.sol;
      anexar(solCorpo,
        linha('AZIMUTE DO SOL', grausTexto(sol.azimuteDeg), sol.cardeal ?? ''),
        linha('ALTURA', `${Math.round(sol.elevacaoDeg)}°`, sol.acimaDoHorizonte ? 'acima do horizonte' : 'abaixo do horizonte'),
        sol.desvioDaLeituraDeg == null ? null
          : linha('DIFERENÇA PARA A LEITURA', `${Math.abs(Math.round(sol.desvioDaLeituraDeg))}°`,
            `gire à ${sol.desvioDaLeituraDeg > 0 ? 'direita' : 'esquerda'} para apontar no Sol`),
      );
      botaoSol.disabled = !sol.serveParaCalibrar || rumoSensor == null;
    }

    empty(travadoCorpo);
    if (!leitura.rumoTravado) {
      travadoCorpo.append(h('p', { className: 'bussola__vazio' }, 'Nenhum rumo travado. Aponte para onde quer ir e trave: o app avisa para que lado você desviou.'));
      botaoDestravar.hidden = true;
    } else {
      const travado = leitura.rumoTravado;
      botaoDestravar.hidden = false;
      anexar(travadoCorpo,
        linha('RUMO TRAVADO', grausTexto(travado.azimuteDeg), travado.cardeal ?? ''),
        linha('DESVIO', travado.desvioDeg == null ? '—' : `${Math.abs(Math.round(travado.desvioDeg))}° ${travado.lado === LADOS.EM_ROTA ? '' : setaDoLado(travado.lado)}`,
          travado.lado === LADOS.EM_ROTA ? 'no rumo' : travado.lado ? `vire à ${travado.lado.toLowerCase()}` : ''),
        linha('VOLTA', grausTexto(travado.azimuteRetornoDeg), 'rumo de retorno'),
        travado.relativoAoSensor ? h('p', { className: 'bussola__nota' }, 'Sem correção, o desvio é medido entre leituras do mesmo sensor — serve para seguir reto, mas o número absoluto ainda não é azimute verdadeiro.') : null,
      );
    }

    const referenciaMarcas = mostrado;
    posicionarMarca(marcaDestino, leitura.destino?.azimuteVerdadeiroDeg ?? null, referenciaMarcas);
    posicionarMarca(marcaSol, leitura.sol?.acimaDoHorizonte ? leitura.sol.azimuteDeg : null, referenciaMarcas);
    posicionarMarca(marcaTravado, leitura.rumoTravado?.azimuteDeg ?? null, referenciaMarcas);
  }

  /**
   * Diz em voz alta quando a agulha não merece confiança. Interferência
   * magnética (ferro, ímã de capa, alto-falante) entorta a leitura sem avisar,
   * e um número bonito e errado é pior do que um número com ressalva.
   */
  function pintarEstabilidade() {
    if (!leituraFiltrada || leituraFiltrada.qualidade === QUALIDADES_RUMO.INSUFICIENTE) {
      avisoEstabilidade.hidden = true;
      return;
    }
    const dispersao = leituraFiltrada.dispersaoDeg == null ? null : Math.round(leituraFiltrada.dispersaoDeg);
    if (leituraFiltrada.qualidade === QUALIDADES_RUMO.INTERFERENCIA) {
      avisoEstabilidade.hidden = false;
      avisoEstabilidade.classList.add('is-alerta');
      avisoEstabilidade.textContent = `⚠ Leitura espalhando ${dispersao}° com o aparelho parado: há interferência magnética por perto. Afaste-se de metal, do ímã da capa e de alto-falante antes de usar este rumo.`;
      return;
    }
    avisoEstabilidade.classList.remove('is-alerta');
    if (leituraFiltrada.qualidade === QUALIDADES_RUMO.ESTAVEL) {
      avisoEstabilidade.hidden = false;
      avisoEstabilidade.textContent = `Agulha estável — o tremor da leitura está sendo reduzido ${(1 / leituraFiltrada.fatorRuido).toFixed(1)}× (${Math.round(leituraFiltrada.amostrasEquivalentes)} leituras somadas).`;
      return;
    }
    avisoEstabilidade.hidden = true;
  }

  function handleOrientation(event) {
    const heading = Number.isFinite(event.webkitCompassHeading)
      ? event.webkitCompassHeading
      : event.absolute && Number.isFinite(event.alpha)
        ? 360 - event.alpha
        : null;
    if (heading == null) return;
    leituraFiltrada = filtroRumo.adicionar({ rumoDeg: heading, emMs: Date.now() });
    // O que a agulha mostra é o rumo filtrado; a leitura crua fica registrada
    // no estado do filtro para a linha de estabilidade poder compará-los.
    rumoSensor = leituraFiltrada.rumoDeg ?? heading;
    origemLeitura = 'SENSOR DO APARELHO';
    if (!sensorAtivo) {
      sensorAtivo = true;
      ativar.textContent = 'SENSOR ATIVO';
      ativar.disabled = true;
      status.classList.add('is-ready');
      status.querySelector('.bussola__status-texto').textContent = 'Sensor lendo. Segure o aparelho plano e longe de metal.';
    }
    renderizar();
  }

  async function ativarSensor() {
    try {
      if (!assistindoGps) {
        pararGps = iniciarAcompanhamento({
          mode: 'bussola',
          onPosition: (nova) => {
            if (desmontado) return;
            posicao = nova;
            if (!sensorAtivo && Number.isFinite(nova.heading)) {
              rumoSensor = nova.heading;
              origemLeitura = 'RUMO DO GPS';
            }
            status.querySelector('.bussola__status-texto').textContent = `${origemLeitura} · ${precisaoLabel(nova.accuracy)}`;
            renderizar();
          },
          onError: () => {
            if (!desmontado && !sensorAtivo) status.querySelector('.bussola__status-texto').textContent = 'GPS indisponível. O sensor ainda dá o rumo, mas sem posição não há norte de grade nem Sol.';
          },
        });
        assistindoGps = true;
      }
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const permissao = await DeviceOrientationEvent.requestPermission();
        if (permissao !== 'granted') throw new Error('Permissão do sensor negada.');
      }
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
      window.addEventListener('deviceorientation', handleOrientation, true);
      ativar.textContent = 'MOVIMENTE O APARELHO';
      status.querySelector('.bussola__status-texto').textContent = 'Sensor solicitado. Se a leitura oscilar, calibre com um movimento em oito.';
    } catch (erro) {
      status.querySelector('.bussola__status-texto').textContent = erro.message ?? 'Sensor indisponível; usando rumo do GPS quando houver deslocamento.';
    }
  }

  raiz.append(
    h('section', { className: 'bussola__scroll' },
      h('div', { className: 'bussola__head' },
        h('span', { className: 'bussola__eyebrow' }, 'INSTRUMENTO // ORIENTAÇÃO'),
        h('h1', null, 'Bússola de campo'),
        h('p', null, 'Segure o aparelho plano e longe de metal. A leitura do sensor vira azimute verdadeiro depois de conferida contra o Sol ou corrigida pela declinação da região.')
      ),
      h('div', { className: 'bussola__instrumento' }, rosa, detalheRumo),
      status,
      ativar,
      h('div', { className: 'bussola__cards' },
        h('article', { className: 'bussola__card' },
          h('span', { className: 'bussola__kicker' }, 'DESTINO'),
          destinoSeta,
          destinoCorpo
        ),
        h('article', { className: 'bussola__card' },
          h('span', { className: 'bussola__kicker' }, 'OS TRÊS NORTES'),
          linhaVerdadeiro, linhaGrade, linhaCorrecao, avisoReferencia, avisoEstabilidade
        ),
        h('article', { className: 'bussola__card bussola__card--amber' },
          h('span', { className: 'bussola__kicker' }, 'CONFERIR PELO SOL'),
          solCorpo,
          botaoSol,
          h('p', { className: 'bussola__nota' }, 'A direção do Sol é calculada no aparelho, sem rede e sem depender do fabricante. Aponte o topo do aparelho para o Sol e toque acima: a diferença medida corrige a declinação do lugar e o erro do sensor de uma vez. Não olhe diretamente para o Sol.')
        ),
        h('article', { className: 'bussola__card' },
          h('span', { className: 'bussola__kicker' }, 'DECLINAÇÃO CONHECIDA'),
          h('p', { className: 'bussola__nota' }, 'Se você já sabe a declinação magnética da região, informe aqui (leste positivo) em vez de usar o Sol.'),
          campoDeclinacao,
          botaoDeclinacao,
          botaoLimparCorrecao
        ),
        h('article', { className: 'bussola__card' },
          h('span', { className: 'bussola__kicker' }, 'SEGUIR UM RUMO'),
          travadoCorpo,
          botaoTravar,
          botaoDestravar
        ),
      ),
      h('button', { className: 'bussola__mapa', type: 'button', onclick: () => { location.hash = '#/mapa'; } }, 'ABRIR MAPA →')
    )
  );

  if (Number.isFinite(correcao)) campoDeclinacao.value = String(correcao);
  renderizar();

  return {
    elemento: raiz,
    desmontar: () => {
      desmontado = true;
      if (assistindoGps) pararGps();
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    }
  };
}
