/**
 * Tela de navegação.
 *
 * ## O defeito que ela tinha
 *
 * A versão anterior lia `estado.get(CHAVES.LOCAL)` **uma vez**, no momento em
 * que a tela era montada, e não assinava atualização nenhuma (`desmontar` era
 * `null`, porque não havia nada para desligar). Quem abrisse a tela e saísse
 * andando via o número congelado onde estava quando abriu — em campo isso é
 * indistinguível de "o app parou no meio" e de "ele acha que não saí do lugar".
 *
 * Agora ela acompanha o GPS enquanto está visível e desliga o watcher ao sair,
 * que é o que impede o watcher de ficar vivo consumindo bateria numa tela que
 * ninguém está vendo.
 */
import '../styles/navegacao.css';
import { h, num, dist } from '../ui/helpers.js';
import { estado, CHAVES } from '../core/estado.js';
import { latLonParaMGRS, latLonParaUTM, mgrsParaLatLon } from '../engine/mgrs.js';
import { rumoGeodesico, distanciaGeodesica, cardinalDeGraus } from '../core/navegacao-rumo.js';
import { iniciarAcompanhamento, precisaoLabel } from '../core/localizacao.js';

function normalizar(local) {
  const lat = Number(local?.lat ?? local?.latitude);
  const lon = Number(local?.lon ?? local?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return {
    lat,
    lon,
    alt: local?.alt ?? local?.altitude ?? null,
    accuracy: local?.accuracy ?? null,
    timestamp: local?.timestamp ?? null,
  };
}

function posicaoAtual() {
  return normalizar(estado.get(CHAVES.LOCAL, null));
}
function bloco(titulo, ...filhos) { return h('section', { className: 'navegacao__bloco' }, h('h2', null, titulo), ...filhos); }
function linha(rotulo, valor) { return h('div', { className: 'navegacao__linha' }, h('span', null, rotulo), h('strong', null, valor ?? 'INDISPONÍVEL')); }

export function navegacaoPage() {
  const raiz = h('main', { className: 'pagina navegacao', id: 'conteudo-principal' });
  let pos = posicaoAtual();
  let pararGps = null;
  let desmontado = false;

  const estadoTela = h('p', { className: 'navegacao__estado', role: 'status', ariaLive: 'polite' }, pos ? 'Coordenada local disponível.' : 'POSIÇÃO ATUAL INDISPONÍVEL');

  // As linhas viram referências vivas: a tela reescreve os valores a cada fixo
  // em vez de ser montada uma vez com o que havia no armazenamento.
  const valores = {};
  function linhaViva(chave, rotulo) {
    const valor = h('strong', null, 'INDISPONÍVEL');
    valores[chave] = valor;
    return h('div', { className: 'navegacao__linha' }, h('span', null, rotulo), valor);
  }
  const posicao = bloco('POSIÇÃO ATUAL',
    linhaViva('lat', 'Latitude'), linhaViva('lon', 'Longitude'), linhaViva('mgrs', 'MGRS'),
    linhaViva('utm', 'UTM'), linhaViva('elev', 'Elevação'), linhaViva('prec', 'Precisão'));

  const alvoLat = h('input', { type: 'number', step: 'any', placeholder: 'Latitude', ariaLabel: 'Latitude do waypoint' });
  const alvoLon = h('input', { type: 'number', step: 'any', placeholder: 'Longitude', ariaLabel: 'Longitude do waypoint' });
  const alvoEstado = h('p', { className: 'navegacao__estado', role: 'status', ariaLive: 'polite' }, 'Informe um waypoint para calcular distância e rumo.');

  function alvoValido() {
    const alvo = { lat: Number(alvoLat.value), lon: Number(alvoLon.value) };
    if (!Number.isFinite(alvo.lat) || !Number.isFinite(alvo.lon)) return null;
    if (alvo.lat < -90 || alvo.lat > 90 || alvo.lon < -180 || alvo.lon > 180) return null;
    return alvo;
  }

  /** Recalcula rumo e distância — chamado no botão E a cada fixo novo. */
  function recalcularAlvo({ silencioso = false } = {}) {
    const alvo = alvoValido();
    if (!alvo) {
      if (!silencioso) alvoEstado.textContent = 'Waypoint inválido.';
      return;
    }
    if (!pos) { alvoEstado.textContent = 'POSIÇÃO ATUAL INDISPONÍVEL'; return; }
    const d = distanciaGeodesica(pos, alvo);
    const b = rumoGeodesico(pos, alvo);
    // Em linha reta, de propósito: é a direção para onde apontar, não o
    // caminho a percorrer. O caminho andado é a trilha, na tela do mapa.
    alvoEstado.textContent = `DISTÂNCIA ${dist(d)} em linha reta · RUMO ${num(b, 1)}° ${cardinalDeGraus(b)}`;
  }

  function pintar() {
    if (desmontado) return;
    estadoTela.textContent = pos
      ? `Acompanhando o GPS · ${precisaoLabel(pos.accuracy)}`
      : 'POSIÇÃO ATUAL INDISPONÍVEL';
    if (!pos) {
      for (const valor of Object.values(valores)) valor.textContent = 'INDISPONÍVEL';
      return;
    }
    const utm = latLonParaUTM(pos.lat, pos.lon);
    valores.lat.textContent = `${num(pos.lat, 6)}°`;
    valores.lon.textContent = `${num(pos.lon, 6)}°`;
    try { valores.mgrs.textContent = latLonParaMGRS(pos.lat, pos.lon, 5, true); } catch { valores.mgrs.textContent = 'INDISPONÍVEL'; }
    valores.utm.textContent = `${utm.zona}${utm.banda} · E ${Math.round(utm.easting)} · N ${Math.round(utm.northing)}`;
    valores.elev.textContent = pos.alt == null ? 'DADOS DE ELEVAÇÃO INDISPONÍVEIS' : `${num(Number(pos.alt), 1)} m`;
    valores.prec.textContent = pos.accuracy == null ? 'INDISPONÍVEL' : precisaoLabel(pos.accuracy);
    recalcularAlvo({ silencioso: true });
  }

  const rumo = bloco('ORIENTAÇÃO', linha('Rumo', 'USE A BÚSSOLA'), linha('Sensor', 'Os três nortes ficam na tela de bússola'));
  const navegacaoAtiva = bloco('NAVEGAÇÃO ATIVA', h('div', { className: 'navegacao__form' }, alvoLat, alvoLon, h('button', { type: 'button', className: 'vg-botao', onclick: () => recalcularAlvo() }, 'CALCULAR RUMO')), alvoEstado);
  const conversorEntrada = h('input', { type: 'text', placeholder: 'MGRS para converter', ariaLabel: 'Coordenada MGRS para converter' });
  const conversorSaida = h('p', { className: 'navegacao__estado', role: 'status', ariaLive: 'polite' }, 'Conversão local, sem rede.');
  const converter = () => { try { const p = mgrsParaLatLon(conversorEntrada.value); conversorSaida.textContent = `LAT/LON ${num(p.lat, 6)}, ${num(p.lon, 6)}`; } catch { conversorSaida.textContent = 'MGRS inválido.'; } };
  const ferramentas = bloco('FERRAMENTAS DE NAVEGAÇÃO', h('div', { className: 'navegacao__form' }, conversorEntrada, h('button', { type: 'button', className: 'vg-botao', onclick: converter }, 'CONVERTER MGRS')), conversorSaida, h('p', { className: 'u-mudo' }, 'Waypoints, trilhas, grade, medição e exportação permanecem locais.'));

  raiz.append(h('header', null, h('h1', null, 'NAVEGAÇÃO'), estadoTela), posicao, rumo, navegacaoAtiva, ferramentas, h('button', { type: 'button', className: 'vg-botao', onclick: () => { location.hash = '#/mapa'; } }, 'ABRIR NO MAPA'));

  pintar();
  pararGps = iniciarAcompanhamento({
    mode: 'trilha',
    onPosition: (nova) => { pos = normalizar(nova) ?? pos; pintar(); },
  });

  return {
    elemento: raiz,
    desmontar: () => {
      desmontado = true;
      // `iniciarAcompanhamento` devolve a própria função de parada, não um
      // objeto. Sem chamá-la, o watcher sobrevive à troca de tela e consome
      // bateria o dia inteiro alimentando uma página que ninguém olha.
      try { pararGps?.(); } catch { /* já encerrado */ }
      pararGps = null;
    },
  };
}
