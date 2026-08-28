export const ESQUEMA_DATASET = 'vanguard-dataset-manifest';
export const VERSAO_MANIFESTO_DATASET = 1;
export const ESTADOS_DATASET = Object.freeze({
  ATUAL: 'CURRENT',
  DESATUALIZADO: 'STALE',
  DESCONHECIDO: 'UNKNOWN',
});

const CHECKSUM_SHA256 = /^[a-f0-9]{64}$/i;
const DATASET_ID = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const VERSAO_DATASET = /^[0-9]+(?:\.[0-9]+){0,3}(?:[-+][0-9A-Za-z.-]+)?$/;
const VERSAO_APP = /^[0-9]+(?:\.[0-9]+){0,3}(?:[-+][0-9A-Za-z.-]+)?$/;

function texto(valor) {
  return typeof valor === 'string' && valor.trim().length > 0;
}

function dataIsoValida(valor) {
  if (!texto(valor)) return false;
  return Number.isFinite(Date.parse(valor)) && new Date(valor).toISOString() === valor;
}

function erro(campo, motivo) {
  return { campo, motivo };
}

function camposObrigatorios(manifesto) {
  const erros = [];
  if (!texto(manifesto?.datasetId) || !DATASET_ID.test(manifesto.datasetId)) erros.push(erro('datasetId', 'deve usar identificador minúsculo seguro'));
  if (!texto(manifesto?.version) || !VERSAO_DATASET.test(manifesto.version)) erros.push(erro('version', 'deve usar versão semântica numérica do dataset'));
  if (!Number.isInteger(manifesto?.formatVersion) || manifesto.formatVersion < 1) erros.push(erro('formatVersion', 'deve ser inteiro maior ou igual a 1'));
  if (!dataIsoValida(manifesto?.createdAt)) erros.push(erro('createdAt', 'deve ser data ISO-8601 UTC canônica'));
  if (!dataIsoValida(manifesto?.updatedAt)) erros.push(erro('updatedAt', 'deve ser data ISO-8601 UTC canônica'));
  if (!texto(manifesto?.source)) erros.push(erro('source', 'deve identificar a origem do dataset'));
  if (!texto(manifesto?.license)) erros.push(erro('license', 'deve identificar a licença ou o estado de revisão'));
  if (!CHECKSUM_SHA256.test(String(manifesto?.checksum ?? ''))) erros.push(erro('checksum', 'deve ser SHA-256 hexadecimal de 64 caracteres'));
  if (!texto(manifesto?.minimumAppVersion) || !VERSAO_APP.test(manifesto.minimumAppVersion)) erros.push(erro('minimumAppVersion', 'deve usar versão mínima do aplicativo'));
  return erros;
}

function validarRegioes(regioes) {
  if (!Array.isArray(regioes)) return [erro('regions', 'deve ser uma lista')];
  const erros = [];
  const ids = new Set();
  regioes.forEach((regiao, indice) => {
    const prefixo = `regions[${indice}]`;
    if (!regiao || typeof regiao !== 'object' || Array.isArray(regiao)) {
      erros.push(erro(prefixo, 'deve ser um objeto'));
      return;
    }
    if (!texto(regiao.id) || !DATASET_ID.test(regiao.id)) erros.push(erro(`${prefixo}.id`, 'deve usar identificador seguro'));
    if (ids.has(regiao.id)) erros.push(erro(`${prefixo}.id`, 'não pode se repetir'));
    ids.add(regiao.id);
    if (!texto(regiao.version) || !VERSAO_DATASET.test(regiao.version)) erros.push(erro(`${prefixo}.version`, 'deve usar versão válida'));
    if (!Number.isInteger(regiao.sizeBytes) || regiao.sizeBytes < 0) erros.push(erro(`${prefixo}.sizeBytes`, 'deve ser inteiro não negativo'));
    if (!CHECKSUM_SHA256.test(String(regiao.checksum ?? ''))) erros.push(erro(`${prefixo}.checksum`, 'deve ser SHA-256 hexadecimal'));
  });
  return erros;
}

export function validarManifestoDataset(manifesto) {
  const erros = [];
  if (!manifesto || typeof manifesto !== 'object' || Array.isArray(manifesto)) {
    return { valido: false, erros: [erro('manifest', 'deve ser um objeto')] };
  }
  if (manifesto.schema !== ESQUEMA_DATASET) erros.push(erro('schema', 'esquema desconhecido'));
  if (manifesto.manifestVersion !== VERSAO_MANIFESTO_DATASET) erros.push(erro('manifestVersion', 'versão de manifesto não suportada'));
  erros.push(...camposObrigatorios(manifesto));
  erros.push(...validarRegioes(manifesto.regions));
  if (manifesto.updatedAt && manifesto.createdAt && dataIsoValida(manifesto.updatedAt) && dataIsoValida(manifesto.createdAt) && Date.parse(manifesto.updatedAt) < Date.parse(manifesto.createdAt)) {
    erros.push(erro('updatedAt', 'não pode ser anterior a createdAt'));
  }
  return { valido: erros.length === 0, erros };
}

export function normalizarManifestoDataset(manifesto) {
  const resultado = validarManifestoDataset(manifesto);
  if (!resultado.valido) return { ...resultado, manifesto: null };
  const normalizado = {
    schema: ESQUEMA_DATASET,
    manifestVersion: VERSAO_MANIFESTO_DATASET,
    datasetId: manifesto.datasetId.trim(),
    version: manifesto.version.trim(),
    formatVersion: manifesto.formatVersion,
    createdAt: manifesto.createdAt,
    updatedAt: manifesto.updatedAt,
    source: manifesto.source.trim(),
    license: manifesto.license.trim(),
    checksum: String(manifesto.checksum).toLowerCase(),
    minimumAppVersion: manifesto.minimumAppVersion.trim(),
    regions: manifesto.regions.map((regiao) => ({
      id: regiao.id.trim(),
      version: regiao.version.trim(),
      sizeBytes: regiao.sizeBytes,
      checksum: String(regiao.checksum).toLowerCase(),
    })),
  };
  return { valido: true, erros: [], manifesto: Object.freeze(normalizado) };
}

export function estadoFrescorDataset(manifesto, { versaoAtual = null, agora = Date.now(), maxAgeMs = null } = {}) {
  if (validarManifestoDataset(manifesto).valido === false) return ESTADOS_DATASET.DESCONHECIDO;
  if (versaoAtual && manifesto.version !== versaoAtual) return ESTADOS_DATASET.DESATUALIZADO;
  if (maxAgeMs == null) return ESTADOS_DATASET.ATUAL;
  const atualizadoEm = Date.parse(manifesto.updatedAt);
  const referencia = Number(agora);
  if (!Number.isFinite(referencia) || !Number.isFinite(atualizadoEm) || referencia < atualizadoEm) return ESTADOS_DATASET.DESCONHECIDO;
  return referencia - atualizadoEm > maxAgeMs ? ESTADOS_DATASET.DESATUALIZADO : ESTADOS_DATASET.ATUAL;
}
