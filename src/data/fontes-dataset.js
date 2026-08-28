export const CRITERIOS_GOVERNANCA_FONTE = Object.freeze([
  'licenseConfirmed',
  'redistributionConfirmed',
  'offlineUseConfirmed',
  'commercialUseConfirmed',
  'attributionConfirmed',
  'updatePolicyConfirmed',
  'storageRightsConfirmed',
  'providerRestrictionsConfirmed',
]);

export const ESTADOS_GOVERNANCA_FONTE = Object.freeze({
  APROVADA: 'APPROVED',
  REVISAR: 'REVIEW_REQUIRED',
  NAO_APROVADA: 'NOT_APPROVED',
  DESCONHECIDA: 'UNKNOWN',
});

const IDENTIFICADOR = /^[a-z0-9][a-z0-9._-]{0,63}$/;

function congelar(valor) {
  if (valor == null || typeof valor !== 'object' || Object.isFrozen(valor)) return valor;
  if (Array.isArray(valor)) {
    valor.forEach(congelar);
  } else {
    Object.values(valor).forEach(congelar);
  }
  return Object.freeze(valor);
}

function texto(valor) {
  return typeof valor === 'string' && valor.trim().length > 0;
}

function erro(campo, motivo) {
  return { campo, motivo };
}

function registroValido(fonte) {
  const erros = [];
  if (!fonte || typeof fonte !== 'object' || Array.isArray(fonte)) return [erro('fonte', 'deve ser um objeto')];
  if (!texto(fonte.sourceId) || !IDENTIFICADOR.test(fonte.sourceId)) erros.push(erro('sourceId', 'deve usar identificador minúsculo seguro'));
  if (!texto(fonte.nome)) erros.push(erro('nome', 'deve identificar o provedor'));
  if (!texto(fonte.layerId)) erros.push(erro('layerId', 'deve identificar a camada atual'));
  if (!texto(fonte.sourceUrl) || !/^https:\/\//.test(fonte.sourceUrl)) erros.push(erro('sourceUrl', 'deve ser URL HTTPS'));
  if (!Array.isArray(fonte.policyUrls) || fonte.policyUrls.length === 0 || fonte.policyUrls.some((url) => !/^https:\/\//.test(url))) {
    erros.push(erro('policyUrls', 'deve conter ao menos uma URL HTTPS de política'));
  }
  if (!texto(fonte.currentUse)) erros.push(erro('currentUse', 'deve declarar como a fonte é usada hoje'));
  for (const criterio of CRITERIOS_GOVERNANCA_FONTE) {
    if (typeof fonte[criterio] !== 'boolean') erros.push(erro(criterio, 'deve ser booleano e confirmado explicitamente'));
  }
  return erros;
}

export const FONTES_DATASET_ATUAIS = congelar([
  {
    sourceId: 'google-satellite-raster',
    nome: 'Google Satellite raster endpoint',
    layerId: 'sat',
    sourceUrl: 'https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    policyUrls: ['https://developers.google.com/maps/documentation/tile/policies'],
    currentUse: 'ONLINE_RENDER_ONLY',
    licenseConfirmed: false,
    redistributionConfirmed: false,
    offlineUseConfirmed: false,
    commercialUseConfirmed: false,
    attributionConfirmed: false,
    updatePolicyConfirmed: false,
    storageRightsConfirmed: false,
    providerRestrictionsConfirmed: false,
    note: 'Endpoint raster atual não foi aprovado como fonte de pacote offline; política de produto/contrato precisa ser confirmada.',
  },
  {
    sourceId: 'opentopomap-raster',
    nome: 'OpenTopoMap raster tiles',
    layerId: 'terreno',
    sourceUrl: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
    policyUrls: ['https://opentopomap.org/about'],
    currentUse: 'ONLINE_RENDER_ONLY',
    licenseConfirmed: true,
    redistributionConfirmed: false,
    offlineUseConfirmed: false,
    commercialUseConfirmed: true,
    attributionConfirmed: true,
    updatePolicyConfirmed: false,
    storageRightsConfirmed: false,
    providerRestrictionsConfirmed: false,
    note: 'A página informa CC-BY-SA e uso em aplicações, mas não autoriza automaticamente um pacote offline redistribuível.',
  },
  {
    sourceId: 'openstreetmap-standard-raster',
    nome: 'OpenStreetMap standard raster tiles',
    layerId: 'dark',
    sourceUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    policyUrls: ['https://operations.osmfoundation.org/policies/tiles/'],
    currentUse: 'ONLINE_RENDER_ONLY',
    licenseConfirmed: true,
    redistributionConfirmed: false,
    offlineUseConfirmed: false,
    commercialUseConfirmed: false,
    attributionConfirmed: true,
    updatePolicyConfirmed: false,
    storageRightsConfirmed: false,
    providerRestrictionsConfirmed: true,
    note: 'A política oficial do servidor de tiles proíbe uso offline/prefetch; o servidor não pode ser backend de distribuição de pacotes.',
  },
  {
    sourceId: 'esri-world-imagery',
    nome: 'Esri World Imagery',
    layerId: 'imagery',
    sourceUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    policyUrls: ['https://developers.arcgis.com/terms/'],
    currentUse: 'ONLINE_RENDER_ONLY',
    licenseConfirmed: false,
    redistributionConfirmed: false,
    offlineUseConfirmed: false,
    commercialUseConfirmed: false,
    attributionConfirmed: false,
    updatePolicyConfirmed: false,
    storageRightsConfirmed: false,
    providerRestrictionsConfirmed: false,
    note: 'Termos gerais não substituem análise do serviço e do contrato aplicável ao produto World Imagery.',
  },
  {
    sourceId: 'esri-boundaries-places',
    nome: 'ArcGIS World Boundaries and Places',
    layerId: 'labels',
    sourceUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    policyUrls: ['https://developers.arcgis.com/terms/'],
    currentUse: 'ONLINE_RENDER_ONLY',
    licenseConfirmed: false,
    redistributionConfirmed: false,
    offlineUseConfirmed: false,
    commercialUseConfirmed: false,
    attributionConfirmed: false,
    updatePolicyConfirmed: false,
    storageRightsConfirmed: false,
    providerRestrictionsConfirmed: false,
    note: 'Rótulos atuais são camada online; não existe autorização registrada para empacotamento offline.',
  },
  {
    sourceId: 'nasa-gibs-modis',
    nome: 'NASA GIBS MODIS Terra',
    layerId: 'gibs',
    sourceUrl: 'https://gibs.earthdata.nasa.gov/',
    policyUrls: ['https://www.earthdata.nasa.gov/engage/open-data-services-software-policies/data-use-guidance'],
    currentUse: 'ONLINE_RENDER_ONLY',
    licenseConfirmed: false,
    redistributionConfirmed: false,
    offlineUseConfirmed: false,
    commercialUseConfirmed: false,
    attributionConfirmed: false,
    updatePolicyConfirmed: false,
    storageRightsConfirmed: false,
    providerRestrictionsConfirmed: false,
    note: 'A orientação NASA distingue conteúdo NASA de material de terceiros e exige validar a fonte específica; o serviço GIBS não foi aprovado como pacote local.',
  },
  {
    sourceId: 'gebco-wms',
    nome: 'GEBCO bathymetry WMS',
    layerId: 'gebco',
    sourceUrl: 'https://wms.gebco.net/',
    policyUrls: ['https://www.gebco.net/data-products/gridded-bathymetry-data/'],
    currentUse: 'ONLINE_RENDER_ONLY',
    licenseConfirmed: true,
    redistributionConfirmed: true,
    offlineUseConfirmed: true,
    commercialUseConfirmed: true,
    attributionConfirmed: true,
    updatePolicyConfirmed: true,
    storageRightsConfirmed: false,
    providerRestrictionsConfirmed: false,
    note: 'GEBCO informa domínio público e downloads do grid, mas o WMS atual ainda não é um pacote versionado aprovado para o app; revisar termos e pipeline do produto escolhido.',
  },
  {
    sourceId: 'aws-terrain-tiles',
    nome: 'Mapzen/AWS Terrain Tiles',
    layerId: 'dem',
    sourceUrl: 'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png',
    policyUrls: ['https://registry.opendata.aws/terrain-tiles/'],
    currentUse: 'ONLINE_RENDER_ONLY',
    licenseConfirmed: false,
    redistributionConfirmed: false,
    offlineUseConfirmed: false,
    commercialUseConfirmed: false,
    attributionConfirmed: false,
    updatePolicyConfirmed: false,
    storageRightsConfirmed: false,
    providerRestrictionsConfirmed: false,
    note: 'O registro AWS aponta licença/documentação de atribuição; ainda não há avaliação suficiente para redistribuição offline deste endpoint.',
  },
]);

export function validarFonteDataset(fonte) {
  const erros = registroValido(fonte);
  return { valido: erros.length === 0, erros };
}

export function avaliarFonteDataset(fonte) {
  const validacao = validarFonteDataset(fonte);
  if (!validacao.valido) {
    return {
      valido: false,
      estado: ESTADOS_GOVERNANCA_FONTE.DESCONHECIDA,
      motivos: validacao.erros,
      criteriosAusentes: [],
    };
  }
  const criteriosAusentes = CRITERIOS_GOVERNANCA_FONTE.filter((criterio) => fonte[criterio] !== true);
  return {
    valido: true,
    estado: criteriosAusentes.length === 0 ? ESTADOS_GOVERNANCA_FONTE.APROVADA : ESTADOS_GOVERNANCA_FONTE.REVISAR,
    motivos: criteriosAusentes.map((criterio) => ({ campo: criterio, motivo: 'não confirmado para o pacote offline' })),
    criteriosAusentes,
  };
}

export function fonteAptaParaPacoteOffline(fonte) {
  return avaliarFonteDataset(fonte).estado === ESTADOS_GOVERNANCA_FONTE.APROVADA;
}

export function avaliarCatalogoFontes(fontes = FONTES_DATASET_ATUAIS) {
  if (!Array.isArray(fontes)) {
    return { valido: false, podeCriarPacote: false, fontesAptas: [], resultados: [], erros: [{ campo: 'fontes', motivo: 'deve ser uma lista' }] };
  }
  const resultados = fontes.map((fonte) => ({
    sourceId: fonte?.sourceId ?? null,
    ...avaliarFonteDataset(fonte),
  }));
  const fontesAptas = resultados.filter((resultado) => resultado.estado === ESTADOS_GOVERNANCA_FONTE.APROVADA).map((resultado) => resultado.sourceId);
  return {
    valido: resultados.every((resultado) => resultado.valido),
    podeCriarPacote: resultados.length > 0 && resultados.every((resultado) => resultado.estado === ESTADOS_GOVERNANCA_FONTE.APROVADA),
    fontesAptas,
    resultados,
    erros: resultados.flatMap((resultado) => resultado.valido ? [] : resultado.motivos),
  };
}
