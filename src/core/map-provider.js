/**
 * Contrato agnóstico do motor cartográfico.
 *
 * A UI não deve conhecer MapLibre, URLs de tiles ou detalhes do provedor.
 * Um provider somente descreve como renderizar e quais dados de mapa oferece.
 * Trilhas, waypoints e destino permanecem fora deste contrato.
 */

const CAMPOS_OBRIGATORIOS = ['id', 'nome', 'tiles'];

export function validarMapProvider(provider) {
  if (!provider || typeof provider !== 'object') {
    return { valido: false, erros: ['provider ausente ou inválido'] };
  }

  const erros = CAMPOS_OBRIGATORIOS
    .filter((campo) => provider[campo] == null || provider[campo] === '')
    .map((campo) => `campo obrigatório ausente: ${campo}`);

  if (!Array.isArray(provider.tiles) || provider.tiles.length === 0) {
    erros.push('tiles deve ser um array não vazio');
  }

  if (provider.maxzoom != null && (!Number.isInteger(Number(provider.maxzoom)) || Number(provider.maxzoom) < 0)) {
    erros.push('maxzoom deve ser um inteiro não negativo');
  }

  return { valido: erros.length === 0, erros };
}

export function criarMapProvider(definicao, adaptador = {}) {
  const validacao = validarMapProvider(definicao);
  if (!validacao.valido) {
    throw new TypeError(`MapProvider inválido: ${validacao.erros.join('; ')}`);
  }

  return Object.freeze({
    id: String(definicao.id),
    nome: String(definicao.nome),
    tiles: [...definicao.tiles].map(String),
    tileSize: Number(definicao.tileSize ?? 256),
    maxzoom: Number(definicao.maxzoom ?? 16),
    creditos: String(definicao.creditos ?? ''),
    renderizar: typeof adaptador.renderizar === 'function' ? adaptador.renderizar : null,
    destruir: typeof adaptador.destruir === 'function' ? adaptador.destruir : null,
  });
}

export function providerDeCamada(camada, adaptador = {}) {
  return criarMapProvider(camada, adaptador);
}

export function providerSuportaZoom(provider, zoom) {
  if (!provider) return false;
  const valor = Number(zoom);
  return Number.isFinite(valor) && valor >= 0 && valor <= Number(provider.maxzoom);
}
