/**
 * Clima e tempestade.
 *
 * ## A tela tem duas metades, e a ordem delas é deliberada
 *
 * Em cima fica o **cronômetro do trovão**, que funciona sem rede nenhuma.
 * Embaixo ficam as **condições e a previsão**, que precisam de internet.
 *
 * A ordem é essa porque numa estrada à noite, no meio de um temporal, a rede é
 * a primeira coisa a sumir — e a medida que decide procurar abrigo é
 * justamente a que não depende dela. Um app que colocasse a previsão em cima
 * estaria organizando a tela pelo que é bonito, não pelo que salva.
 *
 * ## O que esta tela NÃO faz
 *
 * - **Não detecta raio.** Um celular não tem sensor para isso. Quem vê o
 *   clarão e ouve o trovão é a pessoa; o app cronometra e faz a conta.
 * - **Não substitui alerta oficial.** Defesa Civil (199) e os avisos do
 *   INMET/Defesa Civil vêm antes disto, sempre.
 * - **Não diz que está seguro.** A escala vai até DISTANTE e para ali. Raio
 *   cai a 10–15 km da chuva, sob céu que parece limpo.
 */
import '../styles/clima.css';
import { h } from '../ui/helpers.js';
import { estado, CHAVES } from '../core/estado.js';
import { rastreamentoDoAplicativo } from '../core/rastreamento-app.js';
import { atualizarClima, lerClima, trovoadaPrevista, RESULTADO_CLIMA } from '../core/clima.js';
import {
  distanciaDoTrovao, tendencia, esperaRestante, RISCO,
  SEGUNDOS_ABRIGO, ESPERA_APOS_ULTIMO_TROVAO_MS,
} from '../engine/tempestade.js';
import { formatarDuracao } from '../ui/formato-trajeto.js';

const TEXTO_RISCO = {
  [RISCO.ABRIGO_AGORA]: {
    titulo: 'PROCURE ABRIGO AGORA',
    corpo: 'A tempestade está no alcance. Saia de campo aberto, cume, água e árvore isolada. Abrigo é construção com paredes ou veículo fechado — barraca e coberto de metal não protegem.',
  },
  [RISCO.APROXIMANDO]: {
    titulo: 'PERTO — PREPARE ABRIGO',
    corpo: 'Ainda fora dos 10 km, mas tempestade muda de direção. Identifique agora para onde ir, antes de precisar.',
  },
  [RISCO.DISTANTE]: {
    titulo: 'DISTANTE POR ENQUANTO',
    corpo: 'Longe neste momento. Não é o mesmo que seguro: descargas saem da nuvem e atingem o solo a 10–15 km da chuva, sob céu que parece limpo.',
  },
  [RISCO.DESCONHECIDO]: {
    titulo: 'SEM MEDIDA',
    corpo: 'Nenhum intervalo cronometrado ainda. Ausência de medida não é ausência de risco.',
  },
};

export function climaPage() {
  const rastreio = rastreamentoDoAplicativo();
  const raiz = h('div', { className: 'vg-pagina clima' });
  const rolagem = h('div', { className: 'clima__scroll' });

  // ── Estado do cronômetro ────────────────────────────────────────────────
  let clarãoEm = null;
  let medidas = [];          // segundos de cada par clarão→trovão, em ordem
  let ultimoTrovaoEm = null;
  let ultima = null;
  let tique = null;
  let desmontado = false;
  let inscricao = null;
  let buscouComPosicao = false;

  const cronometro = h('strong', { className: 'clima__cronometro' }, '—');
  const botaoMedir = h('button', { className: 'clima__botao clima__botao--medir', type: 'button' }, 'VI O CLARÃO');
  const botaoCancelar = h('button', { className: 'clima__botao', type: 'button', hidden: true }, 'CANCELAR');
  const veredito = h('strong', { className: 'clima__veredito' }, TEXTO_RISCO[RISCO.DESCONHECIDO].titulo);
  const vereditoCorpo = h('p', { className: 'clima__veredito-corpo' }, TEXTO_RISCO[RISCO.DESCONHECIDO].corpo);
  const leituraTexto = h('p', { className: 'clima__leitura', role: 'status', ariaLive: 'polite' },
    'Toque em VI O CLARÃO no instante do relâmpago e em OUVI O TROVÃO quando o som chegar.');
  const tendenciaTexto = h('p', { className: 'clima__tendencia' }, '');
  const esperaTexto = h('p', { className: 'clima__espera' }, '');

  // ── Condições (rede) ────────────────────────────────────────────────────
  const climaCampos = {};
  function campo(chave, rotulo) {
    const valor = h('strong', { className: 'clima__campo-valor' }, '—');
    climaCampos[chave] = valor;
    return h('div', { className: 'clima__campo' }, h('span', { className: 'clima__campo-rotulo' }, rotulo), valor);
  }
  const climaStatus = h('p', { className: 'clima__status', role: 'status', ariaLive: 'polite' }, 'Sem leitura ainda.');
  const climaBotao = h('button', { className: 'clima__botao', type: 'button' }, 'ATUALIZAR COM INTERNET');
  const horas = h('div', { className: 'clima__horas' });
  const alertaTrovoada = h('p', { className: 'clima__alerta', hidden: true });

  /** Temperatura medida entra na conta do som; sem ela, a de 20 °C, e a tela diz. */
  function temperaturaAtual() {
    const { leitura } = lerClima({ estado });
    const t = Number(leitura?.atual?.temperaturaC);
    return Number.isFinite(t) ? t : null;
  }

  function pintarTempestade() {
    if (desmontado) return;
    const agora = Date.now();

    if (clarãoEm !== null) {
      const s = (agora - clarãoEm) / 1000;
      cronometro.textContent = `${s.toFixed(1)} s`;
      raiz.classList.add('is-contando');
    } else if (ultima?.valida) {
      cronometro.textContent = `${(ultima.metros / 1000).toFixed(1)} km`;
      raiz.classList.remove('is-contando');
    } else {
      cronometro.textContent = '—';
      raiz.classList.remove('is-contando');
    }

    const risco = ultima?.valida ? ultima.risco : RISCO.DESCONHECIDO;
    veredito.textContent = TEXTO_RISCO[risco].titulo;
    vereditoCorpo.textContent = TEXTO_RISCO[risco].corpo;
    raiz.dataset.risco = risco;

    if (ultima?.valida) {
      const km = ultima.metros / 1000;
      const incertezaKm = ultima.incertezaM / 1000;
      leituraTexto.textContent = `${ultima.segundos.toFixed(1)} s entre clarão e trovão · ${km.toFixed(1)} km ± ${incertezaKm.toFixed(1)} km · som a ${Math.round(ultima.velocidadeSomMs)} m/s (${ultima.temperaturaMedida ? 'temperatura medida' : 'temperatura suposta de 20 °C'}). A distância é até o ponto mais próximo do raio, que tem quilômetros de comprimento.`;
    } else if (ultima && !ultima.valida) {
      leituraTexto.textContent = 'Intervalo longo demais para ser o mesmo raio — acima de ~25 km o trovão não chega audível. Cronometre o próximo.';
    }

    const t = tendencia(medidas);
    tendenciaTexto.textContent = !t.conhecida
      ? `${medidas.length === 1 ? 'Uma medida' : 'Nenhuma medida'} — com duas ou mais dá para dizer se está vindo ou indo.`
      : t.sentido === 'APROXIMANDO' ? `VINDO PARA CÁ — ${medidas.length} medidas, ${Math.abs(t.deltaS).toFixed(0)} s a menos.`
        : t.sentido === 'AFASTANDO' ? `Afastando — ${medidas.length} medidas, ${t.deltaS.toFixed(0)} s a mais.`
          : `Estável — ${medidas.length} medidas, sem deslocamento claro.`;

    const espera = esperaRestante(ultimoTrovaoEm, agora);
    esperaTexto.textContent = !espera.conhecida
      ? ''
      : espera.liberado
        ? '30 minutos desde o último trovão cronometrado. A regra 30/30 está cumprida — confira o céu e os avisos oficiais antes de seguir.'
        : `Faltam ${formatarDuracao(espera.restanteMs)} dos 30 minutos após o último trovão. A maior parte dos acidentes com raio acontece DEPOIS do pico, quando parece ter passado.`;
    esperaTexto.hidden = !espera.conhecida;
  }

  botaoMedir.onclick = () => {
    if (clarãoEm === null) {
      clarãoEm = Date.now();
      botaoMedir.textContent = 'OUVI O TROVÃO';
      botaoCancelar.hidden = false;
      pintarTempestade();
      return;
    }
    const segundos = (Date.now() - clarãoEm) / 1000;
    clarãoEm = null;
    ultimoTrovaoEm = Date.now();
    ultima = distanciaDoTrovao(segundos, { temperaturaC: temperaturaAtual() });
    if (ultima.valida) medidas = [...medidas, segundos].slice(-12);
    botaoMedir.textContent = 'VI O CLARÃO';
    botaoCancelar.hidden = true;
    if (navigator.vibrate) { try { navigator.vibrate(ultima.risco === RISCO.ABRIGO_AGORA ? [120, 80, 120, 80, 120] : 60); } catch { /* sem vibração */ } }
    pintarTempestade();
  };

  botaoCancelar.onclick = () => {
    clarãoEm = null;
    botaoMedir.textContent = 'VI O CLARÃO';
    botaoCancelar.hidden = true;
    pintarTempestade();
  };

  // ── Condições pela rede ─────────────────────────────────────────────────
  function pintarClima() {
    if (desmontado) return;
    const { leitura, idadeMs, velha } = lerClima({ estado });
    if (!leitura) {
      climaStatus.textContent = 'Nenhuma leitura guardada. Com internet, toque em ATUALIZAR — depois ela continua legível sem rede.';
      return;
    }
    const a = leitura.atual;
    climaCampos.condicao.textContent = a.texto;
    climaCampos.temperatura.textContent = Number.isFinite(a.temperaturaC) ? `${a.temperaturaC.toFixed(1)} °C` : '—';
    climaCampos.sensacao.textContent = Number.isFinite(a.sensacaoC) ? `${a.sensacaoC.toFixed(1)} °C` : '—';
    climaCampos.chuva.textContent = Number.isFinite(a.chuvaMm) ? `${a.chuvaMm.toFixed(1)} mm` : '—';
    climaCampos.vento.textContent = Number.isFinite(a.ventoKmh) ? `${Math.round(a.ventoKmh)} km/h` : '—';
    climaCampos.rajada.textContent = Number.isFinite(a.rajadaKmh) ? `${Math.round(a.rajadaKmh)} km/h` : '—';
    climaCampos.umidade.textContent = Number.isFinite(a.umidadePct) ? `${Math.round(a.umidadePct)} %` : '—';
    climaCampos.pressao.textContent = Number.isFinite(a.pressaoHpa) ? `${Math.round(a.pressaoHpa)} hPa` : '—';

    const minutos = Math.round(idadeMs / 60_000);
    // A idade ao lado do número não é enfeite: uma previsão de três horas atrás
    // não descreve o céu que está lá fora numa noite de temporal.
    climaStatus.textContent = velha
      ? `LEITURA DE ${minutos} MINUTOS ATRÁS — pode não descrever o céu de agora. Atualize se houver rede.`
      : `Lida há ${minutos === 0 ? 'menos de um minuto' : `${minutos} min`} · ${leitura.fonte} · previsão, não observação do lugar exato.`;

    horas.replaceChildren(...leitura.horas.slice(0, 8).map((hora) => h('div',
      { className: `clima__hora${hora.trovoada ? ' is-trovoada' : ''}` },
      h('span', { className: 'clima__hora-hora' }, String(hora.hora).slice(11, 16)),
      h('span', { className: 'clima__hora-cond' }, hora.texto),
      h('span', { className: 'clima__hora-chuva' },
        Number.isFinite(hora.chuvaProbabilidade) ? `${hora.chuvaProbabilidade}%` : '—'),
      h('span', { className: 'clima__hora-rajada' },
        Number.isFinite(hora.rajadaKmh) ? `${Math.round(hora.rajadaKmh)} km/h` : '—'))));

    const t = trovoadaPrevista(leitura);
    alertaTrovoada.hidden = !t.prevista;
    if (t.prevista) {
      alertaTrovoada.textContent = t.agora
        ? `TROVOADA AGORA na previsão${t.granizo ? ', com granizo' : ''}. Use o cronômetro acima para saber a que distância.`
        : `TROVOADA PREVISTA a partir de ${String(t.proximaHora).slice(11, 16)}${t.granizo ? ', com granizo' : ''} — ${t.horasComTrovoada} h na janela. Decida agora onde vai estar quando chegar.`;
    }
  }

  async function buscar() {
    climaBotao.disabled = true;
    const rotulo = climaBotao.textContent;
    climaBotao.textContent = 'BUSCANDO…';
    try {
      const posicao = rastreio.ultimaPosicao() ?? estado.get(CHAVES.LOCAL, null);
      const r = await atualizarClima({ posicao, estado });
      if (desmontado) return;
      pintarClima();
      if (r.resultado === RESULTADO_CLIMA.SEM_POSICAO) {
        climaStatus.textContent = 'Buscando um fixo de GPS para saber onde consultar. O cronômetro do trovão acima não depende disso e já funciona.';
      } else if (r.resultado === RESULTADO_CLIMA.SEM_REDE) {
        // A leitura guardada continua na tela: falha de rede não apaga o que
        // já se sabia. O que muda é o aviso.
        climaStatus.textContent = r.leitura
          ? `Sem rede agora — mostrando a leitura de ${Math.round((r.idadeMs ?? 0) / 60_000)} min atrás. Ela não foi apagada.`
          : 'Sem rede e sem leitura guardada. O cronômetro do trovão acima continua funcionando.';
      } else if (r.resultado === RESULTADO_CLIMA.RESPOSTA_INVALIDA) {
        climaStatus.textContent = 'A fonte respondeu algo que não dá para ler. A leitura anterior foi mantida.';
      }
    } finally {
      if (!desmontado) { climaBotao.disabled = false; climaBotao.textContent = rotulo; }
    }
  }
  climaBotao.onclick = buscar;

  rolagem.append(
    h('header', { className: 'clima__topo' },
      h('h1', null, 'Tempestade'),
      h('p', { className: 'clima__subtitulo' }, 'O cronômetro do trovão funciona sem internet. A previsão precisa dela.')),

    h('section', { className: 'clima__cartao clima__cartao--medida' },
      h('div', { className: 'clima__cronometro-linha' }, cronometro),
      h('div', { className: 'clima__acoes' }, botaoMedir, botaoCancelar),
      leituraTexto,
      h('div', { className: 'clima__veredito-caixa' }, veredito, vereditoCorpo),
      tendenciaTexto,
      esperaTexto),

    alertaTrovoada,

    h('section', { className: 'clima__cartao' },
      h('h2', null, 'CONDIÇÕES'),
      h('div', { className: 'clima__grade' },
        campo('condicao', 'CÉU'), campo('temperatura', 'TEMPERATURA'),
        campo('sensacao', 'SENSAÇÃO'), campo('chuva', 'CHUVA'),
        campo('vento', 'VENTO'), campo('rajada', 'RAJADA'),
        campo('umidade', 'UMIDADE'), campo('pressao', 'PRESSÃO')),
      climaStatus,
      climaBotao),

    h('section', { className: 'clima__cartao' }, h('h2', null, 'PRÓXIMAS HORAS'), horas),

    h('section', { className: 'clima__cartao clima__cartao--nota' },
      h('h2', null, 'Limites desta tela'),
      h('p', null, 'O aplicativo não detecta raio: celular não tem sensor para isso. Quem vê o clarão e ouve o trovão é você; o app cronometra e faz a conta.'),
      h('p', null, 'A previsão é de modelo numérico para a sua região, não observação do ponto exato onde você está. Ela envelhece, e a idade dela aparece ao lado do número de propósito.'),
      h('p', null, 'Isto não substitui alerta oficial. No Brasil, Defesa Civil é 199 e os avisos do INMET vêm antes disto — sempre.'),
      h('p', null, 'A escala vai até DISTANTE e para ali. Não existe rótulo de "seguro": descargas saem da nuvem e atingem o solo a 10–15 km da chuva, sob céu que parece limpo.')),
  );

  raiz.append(rolagem);
  pintarTempestade();
  pintarClima();

  /**
   * A tela pede o PRÓPRIO fixo.
   *
   * Sem isto ela dependia de outra tela já ter conseguido posição, e abrir a
   * Tempestade direto respondia "abra o mapa primeiro" — numa tela cuja razão
   * de existir é ser aberta com pressa, no meio de um temporal. Observar o
   * serviço de rastreamento é o que acende o watcher (ADR-0047); deixar de
   * observar, ao sair, não para gravação nenhuma.
   */
  inscricao = rastreio.observar((evento) => {
    if (desmontado || evento.tipo !== 'POSICAO' || buscouComPosicao) return;
    buscouComPosicao = true;
    void buscar();
  }, { oculto: document.hidden });

  // E uma busca já: se houver posição guardada, o número aparece na hora em
  // vez de esperar o primeiro fixo do GPS, que demora em céu encoberto.
  void buscar();
  // O cronômetro precisa correr; a espera dos 30 min também.
  tique = window.setInterval(() => { if (!document.hidden) pintarTempestade(); }, 100);

  return {
    elemento: raiz,
    desmontar: () => {
      desmontado = true;
      window.clearInterval(tique);
      inscricao?.parar();
      inscricao = null;
    },
  };
}
