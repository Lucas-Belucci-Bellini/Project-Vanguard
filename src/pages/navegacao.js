import '../styles/navegacao.css';
import { h, num, dist } from '../ui/helpers.js';
import { estado, CHAVES } from '../core/estado.js';
import { latLonParaMGRS, latLonParaUTM, mgrsParaLatLon } from '../engine/mgrs.js';
import { rumoGeodesico, distanciaGeodesica, cardinalDeGraus } from '../core/navegacao-rumo.js';

function posicaoAtual() {
  const local = estado.get(CHAVES.LOCAL, null);
  const lat = Number(local?.lat ?? local?.latitude);
  const lon = Number(local?.lon ?? local?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 ? { lat, lon, alt: local?.alt ?? local?.altitude ?? null } : null;
}
function bloco(titulo, ...filhos) { return h('section', { className: 'navegacao__bloco' }, h('h2', null, titulo), ...filhos); }
function linha(rotulo, valor) { return h('div', { className: 'navegacao__linha' }, h('span', null, rotulo), h('strong', null, valor ?? 'INDISPONÍVEL')); }

export function navegacaoPage() {
  const raiz = h('main', { className: 'pagina navegacao', id: 'conteudo-principal' });
  const pos = posicaoAtual();
  const estadoTela = h('p', { className: 'navegacao__estado', role: 'status', ariaLive: 'polite' }, pos ? 'Coordenada local disponível.' : 'POSIÇÃO ATUAL INDISPONÍVEL');
  const posicao = bloco('POSIÇÃO ATUAL');
  if (pos) {
    const utm = latLonParaUTM(pos.lat, pos.lon);
    posicao.append(linha('Latitude', `${num(pos.lat, 6)}°`), linha('Longitude', `${num(pos.lon, 6)}°`), linha('MGRS', latLonParaMGRS(pos.lat, pos.lon, 5, true)), linha('UTM', `${utm.zona}${utm.banda} · E ${Math.round(utm.easting)} · N ${Math.round(utm.northing)}`), linha('Elevação', pos.alt == null ? 'DADOS DE ELEVAÇÃO INDISPONÍVEIS' : `${num(Number(pos.alt), 1)} m`), linha('Precisão', pos.accuracy == null ? 'INDISPONÍVEL' : `${num(Number(pos.accuracy), 1)} m`));
  } else posicao.append(linha('Coordenada', 'INDISPONÍVEL'));

  const rumo = bloco('ORIENTAÇÃO', linha('Rumo', 'INDISPONÍVEL'), linha('Norte verdadeiro', 'INDISPONÍVEL'), linha('Norte magnético', 'INDISPONÍVEL'), linha('Declinação', 'INDISPONÍVEL'), linha('Sensor', 'SENSOR NÃO DISPONÍVEL'));
  const alvoLat = h('input', { type: 'number', step: 'any', placeholder: 'Latitude', ariaLabel: 'Latitude do waypoint' });
  const alvoLon = h('input', { type: 'number', step: 'any', placeholder: 'Longitude', ariaLabel: 'Longitude do waypoint' });
  const alvoEstado = h('p', { className: 'navegacao__estado', role: 'status', ariaLive: 'polite' }, 'Informe um waypoint para calcular distância e rumo.');
  const calcular = () => {
    const alvo = { lat: Number(alvoLat.value), lon: Number(alvoLon.value) };
    if (!Number.isFinite(alvo.lat) || !Number.isFinite(alvo.lon) || alvo.lat < -90 || alvo.lat > 90 || alvo.lon < -180 || alvo.lon > 180) { alvoEstado.textContent = 'Waypoint inválido.'; return; }
    const d = pos ? distanciaGeodesica(pos, alvo) : null; const b = pos ? rumoGeodesico(pos, alvo) : null;
    alvoEstado.textContent = pos ? `DISTÂNCIA ${dist(d)} · RUMO ${num(b, 1)}° ${cardinalDeGraus(b)}` : 'POSIÇÃO ATUAL INDISPONÍVEL';
  };
  const navegacaoAtiva = bloco('NAVEGAÇÃO ATIVA', h('div', { className: 'navegacao__form' }, alvoLat, alvoLon, h('button', { type: 'button', className: 'vg-botao', onclick: calcular }, 'CALCULAR RUMO')), alvoEstado);
  const conversorEntrada = h('input', { type: 'text', placeholder: 'MGRS para converter', ariaLabel: 'Coordenada MGRS para converter' });
  const conversorSaida = h('p', { className: 'navegacao__estado', role: 'status', ariaLive: 'polite' }, 'Conversão local, sem rede.');
  const converter = () => { try { const p = mgrsParaLatLon(conversorEntrada.value); conversorSaida.textContent = `LAT/LON ${num(p.lat, 6)}, ${num(p.lon, 6)}`; } catch { conversorSaida.textContent = 'MGRS inválido.'; } };
  const ferramentas = bloco('FERRAMENTAS DE NAVEGAÇÃO', h('div', { className: 'navegacao__form' }, conversorEntrada, h('button', { type: 'button', className: 'vg-botao', onclick: converter }, 'CONVERTER MGRS')), conversorSaida, h('p', { className: 'u-mudo' }, 'Waypoints, trilhas, grade, medição e exportação permanecem locais. ETA e elevação só aparecem quando houver dados suficientes.'));
  raiz.append(h('header', null, h('h1', null, 'NAVEGAÇÃO'), estadoTela), posicao, rumo, navegacaoAtiva, ferramentas, h('button', { type: 'button', className: 'vg-botao', onclick: () => { location.hash = '#/mapa'; } }, 'ABRIR NO MAPA'));
  return { elemento: raiz, desmontar: null };
}
