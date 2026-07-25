/**
 * `#/tiro` — Computador de tiro (Fire Direction Center).
 *
 * ── Princípio de layout ──
 * Quem opera a peça está sob estresse, com o rádio no ouvido, e precisa de
 * DOIS números: **azimute** e **elevação**. Então esses dois ocupam o topo,
 * enormes, em cores diferentes (fósforo × âmbar) para não haver troca. Tudo
 * o mais — carga, tempo de voo, apogeu, avisos — é secundário e vem abaixo,
 * em corpo menor. Entrada fica à esquerda, saída à direita: o olho nunca
 * precisa procurar onde o resultado apareceu.
 *
 * Cores diferentes para azimute e elevação é decisão deliberada de segurança:
 * são dois números de 4 dígitos na mesma faixa (0000–6400) e trocá-los põe a
 * granada em qualquer lugar menos no alvo.
 */

import '../styles/tiro.css';
import { h, $, empty, dist, mil, seg, num } from '../ui/helpers.js';
import { estado, CHAVES } from '../core/estado.js';
import { resolverMissao } from '../engine/fire-mission.js';
import { listarSistemas, SISTEMAS } from '../engine/charges.js';
import { latLonParaMGRS } from '../engine/mgrs.js';
import { MIL_SYSTEMS } from '../engine/angles.js';

/* Converte a posição guardada no estado para o formato do contrato. */
function paraContrato(p, quadro) {
  if (!p) return null;
  return quadro === 'geo'
    ? { tipo: 'latlon', lat: p.lat, lon: p.lon, alt: p.alt ?? 0 }
    : { tipo: 'local', x: p.x, y: p.y, alt: p.alt ?? 0 };
}

export function tiroPage() {
  const quadro = estado.get(CHAVES.QUADRO, 'geo');
  const sistemaMil = estado.get(CHAVES.MIL, 'nato');
  let ambiente = estado.get(CHAVES.AMBIENTE, {
    ventoVelocidadeMs: 0, ventoDirecaoDeg: 0, declinacaoMagDeg: 0
  });

  const raiz = h('div', { className: 'vg-pagina tiro' });
  const entrada = h('section', { className: 'tiro__entrada' });
  const saida = h('section', { className: 'tiro__saida' });
  raiz.append(entrada, saida);

  /* ── Entradas ── */
  const campo = (rotulo, el, dica) =>
    h('div', { className: 'vg-campo' },
      h('label', null, rotulo), el, dica && h('span', { className: 'vg-dica' }, dica));

  const selSistema = h('select', null,
    ...listarSistemas().map((s) =>
      h('option', { value: s.id },
        `${s.nome}${s.jogo ? ' [JOGO]' : ''} — máx ${(s.alcanceMaxM / 1000).toFixed(1)} km`))
  );
  selSistema.value = estado.get(CHAVES.SISTEMA, 'm252_81mm');

  const selModo = h('select', null,
    h('option', { value: 'alto' }, 'CURVO (alto ângulo)'),
    h('option', { value: 'tenso' }, 'TENSO (baixo ângulo)')
  );

  const selMil = h('select', null,
    ...Object.keys(MIL_SYSTEMS).map((k) => h('option', { value: k },
      ({ nato: 'MIL NATO (6400)', mrad: 'MRAD real (6283)', warsaw: 'MIL Varsóvia (6000)', swedish: 'STRECK (6300)' })[k]))
  );
  selMil.value = sistemaMil;

  const selSolver = h('select', null,
    h('option', { value: 'arrasto' }, 'COM ARRASTO (preciso)'),
    h('option', { value: 'vacuo' }, 'VÁCUO (instantâneo)')
  );

  const inPecaAlt = h('input', { type: 'number', step: '1', value: '0' });
  const inAlvoAlt = h('input', { type: 'number', step: '1', value: '0' });
  const inPecaPos = h('input', { type: 'text', placeholder: quadro === 'geo' ? '23K PQ 83477 60685' : '123456' });
  const inAlvoPos = h('input', { type: 'text', placeholder: quadro === 'geo' ? '23K PQ 86000 63000' : '135470' });

  const inVentoVel = h('input', { type: 'number', step: '0.5', value: String(ambiente.ventoVelocidadeMs ?? 0) });
  const inVentoDir = h('input', { type: 'number', step: '1', value: String(ambiente.ventoDirecaoDeg ?? 0) });
  const inDeclinacao = h('input', { type: 'number', step: '0.1', value: String(ambiente.declinacaoMagDeg ?? 0) });

  /* Pré-preenche com o que veio do mapa, se houver. */
  const pecaSalva = estado.get(CHAVES.PECA, null);
  const alvoSalvo = estado.get(CHAVES.ALVO, null);
  if (pecaSalva) {
    inPecaPos.value = quadro === 'geo'
      ? latLonParaMGRS(pecaSalva.lat, pecaSalva.lon, 5, true)
      : `${Math.round(pecaSalva.x)},${Math.round(pecaSalva.y)}`;
    inPecaAlt.value = String(Math.round(pecaSalva.alt ?? 0));
  }
  if (alvoSalvo) {
    inAlvoPos.value = quadro === 'geo'
      ? latLonParaMGRS(alvoSalvo.lat, alvoSalvo.lon, 5, true)
      : `${Math.round(alvoSalvo.x)},${Math.round(alvoSalvo.y)}`;
    inAlvoAlt.value = String(Math.round(alvoSalvo.alt ?? 0));
  }

  entrada.append(
    h('div', { className: 'vg-painel' },
      h('div', { className: 'vg-painel__titulo' }, '◤ PEÇA'),
      h('div', { className: 'vg-painel__corpo' },
        campo(quadro === 'geo' ? 'Posição (MGRS)' : 'Grid local', inPecaPos,
          quadro === 'geo' ? 'Aceita 4 a 10 dígitos' : 'Grid (ex.: 123456) ou "x,y" em metros'),
        campo('Altitude (m)', inPecaAlt),
        campo('Sistema', selSistema))),

    h('div', { className: 'vg-painel' },
      h('div', { className: 'vg-painel__titulo' }, '◤ ALVO'),
      h('div', { className: 'vg-painel__corpo' },
        campo(quadro === 'geo' ? 'Posição (MGRS)' : 'Grid local', inAlvoPos),
        campo('Altitude (m)', inAlvoAlt))),

    h('div', { className: 'vg-painel' },
      h('div', { className: 'vg-painel__titulo' }, '◤ AMBIENTE'),
      h('div', { className: 'vg-painel__corpo' },
        h('div', { className: 'vg-campo__linha' },
          campo('Vento (m/s)', inVentoVel),
          campo('Vento de (°)', inVentoDir, 'De onde vem')),
        quadro === 'geo' && campo('Declinação mag. (°)', inDeclinacao, 'Leste positivo'))),

    h('div', { className: 'vg-painel' },
      h('div', { className: 'vg-painel__titulo' }, '◤ OPÇÕES'),
      h('div', { className: 'vg-painel__corpo' },
        campo('Trajetória', selModo),
        campo('Unidade angular', selMil),
        campo('Modelo', selSolver,
          'Vácuo ignora o ar: use só para estimar'))),

    h('button', { className: 'primario tiro__calcular', onclick: () => calcular() }, '▶ CALCULAR SOLUÇÃO')
  );

  /* ── Interpretação das posições digitadas ── */
  function lerPos(input, altInput, rotulo) {
    const txt = input.value.trim();
    if (!txt) throw new Error(`${rotulo}: posição vazia`);
    const alt = Number(altInput.value) || 0;

    if (quadro === 'geo') return { tipo: 'mgrs', valor: txt, alt };

    /* Grade local: aceita "x,y" em metros ou a string de grid. */
    if (txt.includes(',')) {
      const [x, y] = txt.split(',').map((s) => Number(s.trim()));
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`${rotulo}: "x,y" inválido`);
      return { tipo: 'local', x, y, alt };
    }
    return { tipo: 'local', grid: txt, alt };
  }

  /* ── Cálculo e renderização ── */
  function calcular() {
    empty(saida);
    let pedido;
    try {
      pedido = {
        schema: 'vanguard.fire-mission/1',
        id: `FM-${Date.now()}`,
        peca: { pos: lerPos(inPecaPos, inPecaAlt, 'Peça'), sistema: selSistema.value },
        alvo: { pos: lerPos(inAlvoPos, inAlvoAlt, 'Alvo'), id: 'TGT' },
        ambiente: {
          ventoVelocidadeMs: Number(inVentoVel.value) || 0,
          ventoDirecaoDeg: Number(inVentoDir.value) || 0,
          declinacaoMagDeg: Number(inDeclinacao.value) || 0
        },
        opcoes: { modo: selModo.value, sistemaMil: selMil.value, solver: selSolver.value }
      };
    } catch (e) {
      saida.append(h('div', { className: 'vg-aviso vg-aviso--perigo' }, e.message));
      return;
    }

    estado.set(CHAVES.SISTEMA, selSistema.value);
    estado.set(CHAVES.MIL, selMil.value);
    estado.set(CHAVES.AMBIENTE, pedido.ambiente);

    let r;
    try {
      r = resolverMissao(pedido);
    } catch (e) {
      saida.append(h('div', { className: 'vg-aviso vg-aviso--perigo' }, `Erro de cálculo: ${e.message}`));
      return;
    }

    if (r.erros?.length) {
      saida.append(h('div', { className: 'vg-aviso vg-aviso--perigo' },
        h('strong', null, 'PEDIDO INVÁLIDO'),
        h('ul', null, ...r.erros.map((e) => h('li', null, e)))));
      return;
    }

    renderizar(r);
  }

  function renderizar(r) {
    const pref = r.solucoes.find((s) => s.preferida);

    /* Avisos primeiro: um DANGER CLOSE não pode aparecer depois do número. */
    for (const a of r.avisos) {
      const perigo = /DANGER CLOSE/.test(a);
      if (perigo || /ATENÇÃO/.test(a)) {
        saida.append(h('div', { className: `vg-aviso${perigo ? ' vg-aviso--perigo' : ''}` }, a));
      }
    }

    if (!r.ok) {
      saida.append(h('div', { className: 'vg-aviso vg-aviso--perigo' }, 'SEM SOLUÇÃO DE TIRO'));
      saida.append(h('div', { className: 'vg-painel' },
        h('div', { className: 'vg-painel__titulo' }, 'MOTIVOS'),
        h('div', { className: 'vg-painel__corpo' },
          h('ul', { className: 'tiro__motivos' }, ...r.avisos.map((a) => h('li', null, a))))));
      return;
    }

    /* ── Os dois números que importam ── */
    saida.append(h('div', { className: 'tiro__hud' },
      h('div', { className: 'vg-leitura vg-leitura--grande' },
        h('span', { className: 'vg-leitura__rotulo' }, 'AZIMUTE (grade)'),
        h('span', { className: 'vg-leitura__valor' }, mil(r.azimute.gradeMil)),
        h('span', { className: 'vg-leitura__unidade' },
          `${num(r.azimute.gradeDeg, 2)}° · ${r.motor.sistemaMil.toUpperCase()}`)),
      h('div', { className: 'vg-leitura vg-leitura--grande vg-leitura--ambar' },
        h('span', { className: 'vg-leitura__rotulo' }, 'ELEVAÇÃO'),
        h('span', { className: 'vg-leitura__valor' }, mil(pref.elevacaoMil)),
        h('span', { className: 'vg-leitura__unidade' },
          `${num(pref.elevacaoDeg, 2)}° · CARGA ${pref.carga}`))
    ));

    /* ── Linha secundária ── */
    const chip = (rot, val) => h('div', { className: 'tiro__chip' },
      h('span', { className: 'tiro__chip-rot' }, rot),
      h('span', { className: 'tiro__chip-val' }, val));

    saida.append(h('div', { className: 'tiro__chips' },
      chip('TEMPO DE VOO', seg(pref.tempoVooS)),
      chip('DISTÂNCIA', dist(r.geometria.distanciaHorizontalM)),
      chip('Δ ALTITUDE', `${num(r.geometria.deltaAltM, 0)} m`),
      chip('APOGEU', dist(pref.apiceM)),
      chip('APOGEU ABS.', `${num(pref.apiceAltitudeM, 0)} m`),
      chip('IMPACTO', `${num(pref.anguloImpactoDeg, 0)}° · ${num(pref.velocidadeImpactoMs, 0)} m/s`),
      r.azimute.magneticoMil != null && chip('AZ. MAGNÉTICO', mil(r.azimute.magneticoMil)),
      r.azimute.convergenciaDeg != null && chip('CONVERGÊNCIA', `${num(r.azimute.convergenciaDeg, 3)}°`),
      pref.derivaVentoM ? chip('DERIVA VENTO', `${num(pref.derivaVentoM, 1)} m`) : null,
      pref.correcaoDirecaoMil ? chip('CORREÇÃO DIR.', `${num(pref.correcaoDirecaoMil, 1)} mil`) : null,
      chip('ZONA BATIDA', `${num(pref.zonaBatida.erroProvavelAlcanceM, 0)} × ${num(pref.zonaBatida.erroProvavelDirecaoM, 0)} m`)
    ));

    /* ── Todas as cargas ── */
    saida.append(h('div', { className: 'vg-painel' },
      h('div', { className: 'vg-painel__titulo' }, `◤ SOLUÇÕES POR CARGA — ${r.sistema.nome}`),
      h('div', { className: 'vg-painel__corpo tiro__tabela-wrap' },
        h('table', { className: 'vg-tabela' },
          h('thead', null, h('tr', null,
            h('th', null, 'Carga'), h('th', null, 'v₀'), h('th', null, 'Elevação'),
            h('th', null, 'Graus'), h('th', null, 'T. voo'), h('th', null, 'Apogeu'),
            h('th', null, 'Folga'), h('th', null, ''))),
          h('tbody', null, ...r.solucoes.map((s) =>
            h('tr', { className: [s.preferida && 'preferida', s.abaixoDoMinimo && 'abaixo-min'].filter(Boolean).join(' ') },
              h('td', null, String(s.carga)),
              h('td', null, `${s.v0} m/s`),
              h('td', null, mil(s.elevacaoMil)),
              h('td', null, `${num(s.elevacaoDeg, 1)}°`),
              h('td', null, seg(s.tempoVooS)),
              h('td', null, dist(s.apiceM)),
              h('td', null, `${num(s.folgaRel * 100, 0)} %`),
              h('td', null,
                s.preferida ? h('span', { className: 'vg-badge u-acento' }, 'PREFERIDA')
                  : s.abaixoDoMinimo ? h('span', { className: 'vg-badge u-ambar' }, '< MÍN') : '')))))
      )));

    /* ── Outros avisos (não-segurança) ── */
    const outros = r.avisos.filter((a) => !/DANGER CLOSE|ATENÇÃO/.test(a));
    if (outros.length) {
      saida.append(h('div', { className: 'vg-painel' },
        h('div', { className: 'vg-painel__titulo' }, '◤ OBSERVAÇÕES'),
        h('div', { className: 'vg-painel__corpo' },
          h('ul', { className: 'tiro__motivos' }, ...outros.map((a) => h('li', null, a))))));
    }

    /* ── O pacote JSON, visível ──
     * Deixar o contrato à vista não é enfeite de debug: é o que permite
     * copiar a missão para o rádio digital, para a API ou para um teste. */
    const enxuto = { ...r, solucoes: r.solucoes.map(({ zonaBatida, ...s }) => s) };
    saida.append(h('details', { className: 'tiro__json' },
      h('summary', null, 'PACOTE vanguard.fire-solution/1'),
      h('pre', null, JSON.stringify(enxuto, null, 2))));
  }

  /* Se já veio tudo do mapa, calcula de cara. */
  if (pecaSalva && alvoSalvo) queueMicrotask(calcular);
  else saida.append(h('div', { className: 'tiro__vazio' },
    h('p', null, 'Informe peça e alvo e calcule a solução.'),
    h('p', { className: 'u-mudo' }, 'Ou marque os dois no mapa — eles chegam aqui preenchidos.')));

  return { elemento: raiz, desmontar: null };
}
