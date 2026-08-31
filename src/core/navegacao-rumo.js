import { bearingTo, haversine } from '../engine/geo.js';
import { deltaDeg, normDeg } from '../engine/angles.js';

export function normalizarGraus(graus) {
  if (graus == null || (typeof graus === 'string' && graus.trim() === '')) return null;
  const valor = Number(graus);
  if (!Number.isFinite(valor)) return null;
  return normDeg(valor);
}

export function diferencaAngular(origem, destino) {
  const a = normalizarGraus(origem);
  const b = normalizarGraus(destino);
  if (a == null || b == null) return null;
  return deltaDeg(a, b);
}

export function rumoGeodesico(origem, destino) {
  if (!origem || !destino) return null;
  try { return normalizarGraus(bearingTo(origem, destino)); } catch { return null; }
}

export function distanciaGeodesica(origem, destino) {
  if (!origem || !destino) return null;
  try { return haversine(origem, destino); } catch { return null; }
}

export function backBearing(origem, destino) {
  const rumo = rumoGeodesico(origem, destino);
  return rumo == null ? null : normalizarGraus(rumo + 180);
}

export function cardinalDeGraus(graus) {
  const valor = normalizarGraus(graus);
  if (valor == null) return null;
  const cardinais = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return cardinais[Math.round(valor / 45) % 8];
}

export function direcaoRelativa(heading, rumoAlvo) {
  const diferenca = diferencaAngular(heading, rumoAlvo);
  if (diferenca == null) return null;
  if (Math.abs(diferenca) < 5) return 'À frente';
  if (Math.abs(diferenca) > 175) return 'Atrás';
  return diferenca > 0 ? 'À direita' : 'À esquerda';
}

export function resumoSegmentos(pontos = []) {
  if (!Array.isArray(pontos)) return { segmentos: [], distanciaTotalM: 0 };
  const segmentos = [];
  for (let i = 1; i < pontos.length; i += 1) {
    const distanciaM = distanciaGeodesica(pontos[i - 1], pontos[i]);
    const rumo = rumoGeodesico(pontos[i - 1], pontos[i]);
    if (distanciaM == null || rumo == null) continue;
    segmentos.push({ de: i - 1, para: i, distanciaM, rumo, cardinal: cardinalDeGraus(rumo) });
  }
  return { segmentos, distanciaTotalM: segmentos.reduce((total, item) => total + item.distanciaM, 0) };
}
