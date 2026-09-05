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
import { resolverMissao, normalizarPosicao } from '../engine/fire-mission.js';
import { listarSistemas, SISTEMAS } from '../engine/charges.js';
import { latLonParaMGRS } from '../engine/mgrs.js';
import { MIL_SYSTEMS } from '../engine/angles.js';
import {
  terrenosComGrade, acharTerreno, sentidoNorthing, metrosParaGrade, dentroDoMundo
} from '../engine/arma3-grid.js';
import { carregarTerrenos } from '../data/arma3-terrenos.js';

/* Converte a posição guardada no estado para o formato do contrato. */
function paraContrato(p, quadro) {
  if (!p) return null;
  return quadro === 'geo'
    ? { tipo: 'latlon', lat: p.lat, lon: p.lon, alt: p.alt ?? 0 }
    : { tipo: 'local', x: p.x, y: p.y, alt: p.alt ?? 0 };
}

export function tiroPage({ query = {} } = {}) {
  /* O quadro deixou de ser lido uma vez e congelado: agora é trocável na
   * própria tela (MGRS do mundo real × grade de um terreno do Arma 3), e
   * praticamente tudo que é rótulo, dica e placeholder depende dele. */
  let quadro = estado.get(CHAVES.QUADRO, 'geo');

  /* `#/tiro?terreno=altis` — como o Projeto Baluarte manda contexto junto do
   * link. Um terreno pedido implica o quadro local: chegar com o terreno certo
   * e a tela em MGRS seria pior que não passar nada. Só vale se o terreno
   * existir de fato, para um link velho não trocar o quadro à toa. */
  const terrenoPedido = query.terreno && acharTerreno(query.terreno);
  if (terrenoPedido?.grade) quadro = 'local';
  const sistemaMil = estado.get(CHAVES.MIL, 'nato');

  /* Terrenos do jogo com grade MEDIDA no config (offset + sinal do passo).
   * Sem grade não dá para converter "034056" em metros — e esses ficam de
   * fora da lista em vez de aparecerem quebrados. */
  const TERRENOS_A3 = terrenosComGrade();
  let ambiente = estado.get(CHAVES.AMBIENTE, {
    ventoVelocidadeMs: 0, ventoDirecaoDeg: 0, declinacaoMagDeg: 0
  });

  const raiz = h('div', { className: 'vg-pagina tiro' });

  /*
   * Esta tela é LEGADA e fica fora do menu de propósito — só se chega a ela
   * por link direto. Ela pertence ao ambiente de testes de Arma 3 e não faz
   * parte do fluxo do Vanguard Field.
   *
   * O aviso é renderizado na própria tela, e não apenas registrado na
   * documentação, porque quem abre a URL não leu a documentação. Uma
   * calculadora balística sem rótulo, num aplicativo de navegação civil, é
   * exatamente o tipo de coisa que alguém pode confundir com ferramenta
   * operacional — e os valores aqui são referências de simulação de um
   * videogame, não tabela de tiro.
   */
  const avisoLegado = h('aside', { className: 'tiro__legado', role: 'note' },
    h('strong', null, 'TELA LEGADA · SIMULAÇÃO DE VIDEOGAME'),
    h('p', null, 'Ferramenta de teste do ambiente de ',
      h('b', null, 'Arma 3'),
      '. Os valores são referências de modelo dentro daquele jogo — não são tabela de tiro, manual, nem orientação para equipamento, treinamento ou operação real.'),
    h('p', null, 'Está fora do fluxo do Vanguard Field e não recebe funcionalidade nova. Para navegação civil, use ',
      h('a', { href: '#/mapa' }, 'Mapa'), ', ',
      h('a', { href: '#/navegacao' }, 'Navegação'), ' ou ',
      h('a', { href: '#/bussola' }, 'Bússola'), '.'));

  const entrada = h('section', { className: 'tiro__entrada' });
  const saida = h('section', { className: 'tiro__saida' });
  raiz.append(avisoLegado, entrada, saida);

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
  const inPecaPos = h('input', { type: 'text' });
  const inAlvoPos = h('input', { type: 'text' });

  const inVentoVel = h('input', { type: 'number', step: '0.5', value: String(ambiente.ventoVelocidadeMs ?? 0) });
  const inVentoDir = h('input', { type: 'number', step: '1', value: String(ambiente.ventoDirecaoDeg ?? 0) });
  const inDeclinacao = h('input', { type: 'number', step: '0.1', value: String(ambiente.declinacaoMagDeg ?? 0) });

  /* ── Quadro de referência ──
   * Duas realidades diferentes, e o operador precisa ver em qual está: MGRS
   * amarra ao planeta; a grade do Arma amarra ao config de UM mundo. Digitar
   * "034056" nas duas dá pontos diferentes, então isto não pode ser implícito. */
  const selQuadro = h('select', {
    onchange: () => { quadro = selQuadro.value; estado.set(CHAVES.QUADRO, quadro); atualizarQuadro(); }
  },
    h('option', { value: 'geo' }, 'MGRS — mundo real'),
    h('option', { value: 'local' }, 'GRADE DE TERRENO — Arma 3')
  );
  selQuadro.value = quadro;

  const selTerreno = h('select', {
    onchange: () => { estado.set(CHAVES.TERRENO, selTerreno.value); atualizarQuadro(); }
  }, ...TERRENOS_A3.map((t) => h('option', { value: t.id },
    `${t.nome}${t.ehMod ? ' [MOD]' : ''}${t.tamanhoM ? ` — ${(t.tamanhoM / 1000).toFixed(1)} km` : ''}`)));

  /* O terreno guardado pode ter sumido da base (mod removido do dump). Cai no
   * Altis, e se nem ele existir, no primeiro com grade — nunca em `undefined`,
   * que faria a grade ser lida pela convenção genérica sem ninguém notar. */
  const terrenoSalvo = terrenoPedido?.grade ? terrenoPedido.id : estado.get(CHAVES.TERRENO, 'altis');
  selTerreno.value = TERRENOS_A3.some((t) => t.id === terrenoSalvo)
    ? terrenoSalvo
    : (TERRENOS_A3.some((t) => t.id === 'altis') ? 'altis' : TERRENOS_A3[0]?.id ?? '');

  const dicaTerreno = h('span', { className: 'vg-dica' }, '');
  const campoTerreno = TERRENOS_A3.length
    ? h('div', { className: 'vg-campo' },
        h('label', null, 'Terreno'), selTerreno, dicaTerreno)
    : h('div', { className: 'vg-aviso' },
        'A base de terrenos do Arma 3 não trouxe nenhum mundo com grade medida.');

  const terrenoAtual = () => (quadro === 'local' ? acharTerreno(selTerreno.value) : null);

  /* ── Localidades do terreno ──
   * O `A3TER` do bundle traz só a contagem; os nomes e as posições moram no
   * JSON pesado, buscado sob demanda. Poder dizer "alvo em Kavala" em vez de
   * decorar seis dígitos é o que torna o terreno do jogo utilizável de fato —
   * e o nome vira grade na tela, então o operador confere contra a carta. */
  const selLocalidade = h('select', { disabled: true },
    h('option', null, 'carregando…'));
  const btnLocalPeca = h('button', { type: 'button', disabled: true, onclick: () => usarLocalidade(inPecaPos) }, '→ PEÇA');
  const btnLocalAlvo = h('button', { type: 'button', disabled: true, onclick: () => usarLocalidade(inAlvoPos) }, '→ ALVO');
  const dicaLocalidade = h('span', { className: 'vg-dica' }, '');

  const painelLocalidades = h('div', { className: 'vg-painel' },
    h('div', { className: 'vg-painel__titulo' }, '◤ LOCALIDADES DO TERRENO'),
    h('div', { className: 'vg-painel__corpo' },
      h('div', { className: 'vg-campo' },
        h('label', null, 'Lugar'), selLocalidade, dicaLocalidade),
      h('div', { className: 'vg-campo__linha' }, btnLocalPeca, btnLocalAlvo)));

  /* Rótulos legíveis dos tipos do config. O que não estiver aqui aparece com o
   * nome cru do engine — inventar tradução para um tipo que não conhecemos
   * seria afirmar algo sobre o dado. */
  const TIPO_LOCAL = {
    NameCityCapital: 'capital', NameCity: 'cidade', NameVillage: 'vila',
    NameLocal: 'local', NameMarine: 'marítimo', Hill: 'elevação',
    CityCenter: 'centro urbano', Airport: 'aeroporto',
  };

  let dbTerrenos = null;   // promessa do JSON pesado, buscada uma vez só
  let vivo = true;         // a tela pode sair antes do fetch voltar

  /** Lugares nomeados do terreno, já em metros do mundo. */
  function lugaresDe(db, t) {
    const bruto = db?.terrenos?.[t.id];
    if (!bruto) return [];
    const loc = (bruto.localidades ?? [])
      .filter((l) => l.nome && Number.isFinite(l.x) && Number.isFinite(l.y))
      .map((l) => ({ nome: l.nome, tipo: TIPO_LOCAL[l.tipo] ?? l.tipo, x: l.x, y: l.y }));
    const aer = (bruto.aeroportos ?? [])
      .filter((a) => Number.isFinite(a.x) && Number.isFinite(a.y))
      .map((a, i) => ({
        nome: `Aeroporto ${a.nome ?? i}`, tipo: TIPO_LOCAL.Airport, x: a.x, y: a.y,
      }));
    return [...loc, ...aer].sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  }

  function preencherLocalidades() {
    const t = terrenoAtual();
    if (!t) return;
    empty(selLocalidade);
    selLocalidade.disabled = true;
    btnLocalPeca.disabled = btnLocalAlvo.disabled = true;
    selLocalidade.append(h('option', null, 'carregando…'));
    dicaLocalidade.textContent = '';

    if (!dbTerrenos) dbTerrenos = carregarTerrenos();
    dbTerrenos.then((db) => {
      if (!vivo || terrenoAtual()?.id !== t.id) return;
      const lugares = lugaresDe(db, t);
      empty(selLocalidade);
      if (!lugares.length) {
        selLocalidade.append(h('option', null, '— sem lugares nomeados —'));
        dicaLocalidade.textContent = `${t.nome} não declara localidade com nome.`;
        return;
      }
      for (const [i, l] of lugares.entries()) {
        const g = metrosParaGrade(l.x, l.y, t);
        selLocalidade.append(h('option', { value: String(i) },
          `${l.nome} — ${l.tipo}${g ? ` · ${g}` : ''}`));
      }
      selLocalidade.dataset.lugares = JSON.stringify(lugares);
      selLocalidade.disabled = false;
      btnLocalPeca.disabled = btnLocalAlvo.disabled = false;
      dicaLocalidade.textContent = `${lugares.length} lugares em ${t.nome}`;
    }).catch((err) => {
      if (!vivo) return;
      dbTerrenos = null;  // deixa tentar de novo na próxima troca de terreno
      empty(selLocalidade);
      selLocalidade.append(h('option', null, '— indisponível —'));
      dicaLocalidade.textContent = `Não deu para carregar a base de localidades: ${err.message}`;
    });
  }

  /** Joga a localidade escolhida no campo de posição, já como grade. */
  function usarLocalidade(input) {
    const t = terrenoAtual();
    const lugares = JSON.parse(selLocalidade.dataset.lugares || '[]');
    const l = lugares[Number(selLocalidade.value)];
    if (!t || !l) return;
    /* Grade quando dá; metros quando o mundo não tem grade utilizável. O que
     * NÃO pode é escrever um número sem dizer em que unidade ele está. */
    input.value = metrosParaGrade(l.x, l.y, t) || `${Math.round(l.x)},${Math.round(l.y)}`;
  }

  /* Rótulos e dicas mudam com o quadro; guardados para não reconstruir a tela. */
  const lblPecaPos = h('label', null, '');
  const dicaPecaPos = h('span', { className: 'vg-dica' }, '');
  const lblAlvoPos = h('label', null, '');
  const campoDeclinacao = campo('Declinação mag. (°)', inDeclinacao, 'Leste positivo');

  entrada.append(
    h('div', { className: 'vg-painel' },
      h('div', { className: 'vg-painel__titulo' }, '◤ QUADRO'),
      h('div', { className: 'vg-painel__corpo' },
        campo('Referência', selQuadro),
        campoTerreno)),

    painelLocalidades,

    h('div', { className: 'vg-painel' },
      h('div', { className: 'vg-painel__titulo' }, '◤ PEÇA'),
      h('div', { className: 'vg-painel__corpo' },
        h('div', { className: 'vg-campo' }, lblPecaPos, inPecaPos, dicaPecaPos),
        campo('Altitude (m)', inPecaAlt),
        campo('Sistema', selSistema))),

    h('div', { className: 'vg-painel' },
      h('div', { className: 'vg-painel__titulo' }, '◤ ALVO'),
      h('div', { className: 'vg-painel__corpo' },
        h('div', { className: 'vg-campo' }, lblAlvoPos, inAlvoPos),
        campo('Altitude (m)', inAlvoAlt))),

    h('div', { className: 'vg-painel' },
      h('div', { className: 'vg-painel__titulo' }, '◤ AMBIENTE'),
      h('div', { className: 'vg-painel__corpo' },
        h('div', { className: 'vg-campo__linha' },
          campo('Vento (m/s)', inVentoVel),
          campo('Vento de (°)', inVentoDir, 'De onde vem')),
        campoDeclinacao)),

    h('div', { className: 'vg-painel' },
      h('div', { className: 'vg-painel__titulo' }, '◤ OPÇÕES'),
      h('div', { className: 'vg-painel__corpo' },
        campo('Trajetória', selModo),
        campo('Unidade angular', selMil),
        campo('Modelo', selSolver,
          'Vácuo ignora o ar: use só para estimar'))),

    h('button', { className: 'primario tiro__calcular', onclick: () => calcular() }, '▶ CALCULAR SOLUÇÃO')
  );

  /**
   * Reflete o quadro escolhido na tela inteira.
   *
   * O texto do sentido do northing não é enfeite: é a diferença entre acertar
   * o alvo e acertar o ponto espelhado. Em 30 dos 31 mundos do jogo o rótulo
   * de northing cresce para o SUL, ao contrário de toda carta MGRS — e quem
   * não sabe disso não tem como desconfiar do resultado.
   */
  function atualizarQuadro() {
    const geo = quadro === 'geo';
    campoTerreno.hidden = geo;
    campoDeclinacao.hidden = !geo;
    painelLocalidades.hidden = geo || !TERRENOS_A3.length;
    if (!painelLocalidades.hidden) preencherLocalidades();

    lblPecaPos.textContent = geo ? 'Posição (MGRS)' : 'Grade da carta';
    lblAlvoPos.textContent = lblPecaPos.textContent;

    const t = terrenoAtual();
    if (geo) {
      inPecaPos.placeholder = '23K PQ 83477 60685';
      inAlvoPos.placeholder = '23K PQ 86000 63000';
      dicaPecaPos.textContent = 'Aceita 4 a 10 dígitos';
      return;
    }

    const g = t?.grade;
    const dig = g ? g.digitos * 2 : 6;
    inPecaPos.placeholder = '0'.repeat(Math.max(0, dig - 4)) + '3405';
    inAlvoPos.placeholder = '0'.repeat(Math.max(0, dig - 4)) + '5062';
    dicaPecaPos.textContent = `Grade de ${dig} dígitos como está na carta, ou "x,y" em metros do mundo`;

    if (!t) { dicaTerreno.textContent = ''; return; }
    const sentido = sentidoNorthing(t) === 'norte-para-sul'
      ? '⚠ northing conta do NORTE para o SUL'
      : 'northing conta do sul para o norte';
    dicaTerreno.textContent = [
      t.tamanhoM ? `${t.tamanhoM / 1000} × ${t.tamanhoM / 1000} km` : 'tamanho não declarado',
      g ? `célula ${Math.abs(g.passoX)} m` : null,
      sentido,
    ].filter(Boolean).join(' · ');
  }

  /* Pré-preenche com o que veio do mapa, se houver. Em quadro local a posição
   * salva está em metros do mundo: vira grade quando há terreno para converter,
   * e "x,y" quando não há — nunca um número que finja ser grade. */
  const pecaSalva = estado.get(CHAVES.PECA, null);
  const alvoSalvo = estado.get(CHAVES.ALVO, null);
  const preencher = (p) => {
    if (quadro === 'geo') return latLonParaMGRS(p.lat, p.lon, 5, true);
    const t = terrenoAtual();
    return (t && metrosParaGrade(p.x, p.y, t)) || `${Math.round(p.x)},${Math.round(p.y)}`;
  };
  if (pecaSalva) {
    inPecaPos.value = preencher(pecaSalva);
    inPecaAlt.value = String(Math.round(pecaSalva.alt ?? 0));
  }
  if (alvoSalvo) {
    inAlvoPos.value = preencher(alvoSalvo);
    inAlvoAlt.value = String(Math.round(alvoSalvo.alt ?? 0));
  }

  /* As grades do link vencem o que ficou salvo: quem clicou "abrir no
   * Vanguard" no Baluarte quer CONTINUAR aquele par, não achar a missão
   * anterior. Só valem com terreno, senão seriam dígitos sem quadro. */
  if (terrenoPedido?.grade) {
    if (query.peca) inPecaPos.value = String(query.peca);
    if (query.alvo) inAlvoPos.value = String(query.alvo);
  }

  atualizarQuadro();

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
    /* `terreno` é o que faz o motor ler a grade pelo config DAQUELE mundo em
     * vez da convenção genérica. Vai só quando há terreno escolhido — mandar
     * um id vazio faria o motor recusar, e sem ele a leitura é a antiga. */
    const t = terrenoAtual();
    return t
      ? { tipo: 'local', grid: txt, terreno: t.id, alt }
      : { tipo: 'local', grid: txt, alt };
  }

  /**
   * Avisa quando a posição cai fora do terreno escolhido.
   *
   * Este é o sintoma de grade lida na convenção errada: inverter o northing
   * num mapa de 30 km costuma jogar o ponto para fora dele. O aviso é de
   * ATENÇÃO, não de erro — a conta continua válida, e o operador pode estar
   * mesmo mirando fora dos limites do mundo.
   *
   * Quando o mundo não declara `mapSize`, `dentroDoMundo()` devolve `null` e
   * nada é dito. Não saber não é o mesmo que estar fora.
   */
  function avisarForaDoMundo(pedido) {
    const t = terrenoAtual();
    if (!t) return;
    for (const [rotulo, pos] of [['PEÇA', pedido.peca.pos], ['ALVO', pedido.alvo.pos]]) {
      let p;
      try { p = normalizarPosicao(pos, rotulo); } catch { continue; }
      if (p.tipo !== 'local') continue;
      if (dentroDoMundo(p, t) === false) {
        saida.append(h('div', { className: 'vg-aviso' },
          `ATENÇÃO: a ${rotulo} cai fora de ${t.nome} `
          + `(${Math.round(p.x)}, ${Math.round(p.y)} m, mundo de ${t.tamanhoM} m). `
          + 'Confira o terreno e o sentido do northing na carta.'));
      }
    }
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

    avisarForaDoMundo(pedido);

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

    pedidoAtual = pedido;
    renderizar(r);
  }

  /* O pedido que gerou a resposta na tela — a renderização precisa dele para
   * reconverter a posição do alvo em grade e devolver a conferência. */
  let pedidoAtual = null;

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

    /* Devolver a grade do ALVO reconvertida é conferência, não redundância:
     * se o que aparece aqui não bate com o que o operador lê na carta, o
     * terreno escolhido está errado — e ele descobre antes de atirar. */
    const terr = terrenoAtual();
    const gradeAlvo = terr && r.geometria.quadro === 'local' && (() => {
      try {
        const p = normalizarPosicao(pedidoAtual.alvo.pos, 'alvo');
        return metrosParaGrade(p.x, p.y, terr);
      } catch { return null; }
    })();

    saida.append(h('div', { className: 'tiro__chips' },
      terr && chip('TERRENO', terr.nome),
      gradeAlvo && chip('ALVO (grade)', gradeAlvo),
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
  if ((pecaSalva && alvoSalvo) || (inPecaPos.value && inAlvoPos.value)) queueMicrotask(calcular);
  else saida.append(h('div', { className: 'tiro__vazio' },
    h('p', null, 'Informe peça e alvo e calcule a solução.'),
    h('p', { className: 'u-mudo' }, 'Ou marque os dois no mapa — eles chegam aqui preenchidos.')));

  /* A base de localidades é buscada em rede: sair da tela antes de ela voltar
   * não pode fazer o `.then` mexer em DOM que já não existe. */
  return { elemento: raiz, desmontar: () => { vivo = false; } };
}
