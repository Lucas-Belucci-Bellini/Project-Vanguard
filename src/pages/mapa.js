import '../styles/mapa.css';
import { h, empty, dist, num } from '../ui/helpers.js';
import { estado, CHAVES } from '../core/estado.js';
import { iniciarAcompanhamento, solicitarPosicao, precisaoLabel, velocidadeLabel, idadePosicaoLabel, frescorPosicao } from '../core/localizacao.js';
import { haversine, vincentyInverse, bearingTo } from '../engine/geo.js';
import { latLonParaMGRS, latLonParaUTM, utmParaLatLon, fusoDe } from '../engine/mgrs.js';
import { CAMADAS_BASE, CAMADAS_OVERLAY } from '../data/camadas-mapa.js';
import { ROTAS_PEREGRINACAO, rotaPorId, statusRotaLabel } from '../data/rotas-peregrinacao.js';
import { contextoPorId, detectarContexto } from '../core/contexto.js';
import { resumoTrilha } from '../core/trilha.js';
import { estadoTrilha, transicionarTrilha, ESTADOS_TRILHA } from '../core/trilha-sessao.js';
import { planejarTilesDoViewport } from '../core/mapa-offline.js';
import { criarControleCentralizacao } from '../core/centralizacao-manual.js';
import { criarControleBackground, ESTADOS_BACKGROUND } from '../core/background-localizacao.js';
import { chaveDesenhoGrade } from '../core/chave-renderizacao.js';
import { exportarRegistroLocal, exportarRegistroGpx, exportarRegistroKml, importarRegistroGpx, importarRegistroKml, importarRegistroLocal } from '../core/registro-offline.js';
import { detectarFormatoRegistro, FORMATOS_REGISTRO } from '../core/registro-arquivo.js';
import { compartilharArquivo, ESTADOS_COMPARTILHAMENTO } from '../platform/compartilhamento.js';
import { criarMotorMapa } from '../core/map-engine.js';

const BASES = Object.fromEntries(CAMADAS_BASE.map((camada) => [camada.id, camada]));
const ROTULOS = CAMADAS_OVERLAY.find((camada) => camada.id === 'labels') ?? null;
const CENTRO_FALLBACK = [-43.21, -22.95];

// ... restante da página preservado ...

async function carregarMapLibre() {
  try {
    await import('maplibre-gl/dist/maplibre-gl.css');
    const mod = await import('maplibre-gl');
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

// O motor é agora criado pela camada de composição. O restante da lógica
// tática da página permanece inalterado.
async function criarMapaDaPagina({ providerId, canvas, posicao }) {
  const motor = await criarMotorMapa({ providerId, carregarMapLibre });
  const instancia = motor.montar({
    container: canvas,
    center: posicao ? [posicao.lon, posicao.lat] : CENTRO_FALLBACK,
    zoom: posicao ? 15 : 12,
    attributionControl: { compact: true },
  });
  return { motor, instancia };
}

export { criarMapaDaPagina };

// A implementação completa da página continua no arquivo original durante a
// migração incremental. A integração definitiva deve substituir apenas o
// bloco de construção do MapLibre por criarMapaDaPagina(), preservando GPS,
// trilhas, waypoints, grade e cache offline.