/**
 * Registro de datasets offline instalados no aparelho.
 *
 * Este módulo é o caminho de LEITURA do dataset: `dataset-sync.js` instala e
 * ativa, o registro responde "o que existe aqui e dá para usar?". Ele não
 * baixa, não escreve, não ativa e não apaga nada.
 *
 * A pergunta é respondida por uma escada de verificação, na ordem, em que
 * cada degrau precisa passar para o seguinte ser tentado:
 *
 *   manifesto existe → manifesto válido → pacote existe → pacote ativo
 *   → tamanho igual ao declarado → checksum SHA-256 confere → VALID
 *
 * Um degrau que falha produz INVALID com o motivo exato. Corrupção nunca é
 * silenciada nem convertida em ausência: um manifesto sem pacote é um dataset
 * quebrado (INVALID), não um aparelho sem dataset (ABSENT).
 *
 * O checksum é a única prova de integridade aceita. Quando ele não pode ser
 * calculado — o chamador pediu uma inspeção rápida, ou o ambiente não tem Web
 * Crypto — o resultado é UNVERIFIED, nunca VALID: estrutura conferida não é
 * integridade provada.
 */

import { criarStorageDataset } from './dataset-storage.js';
import { criarPackageStorage, PACKAGE_STATES } from './dataset-package-storage.js';
import { verificarIntegridadeDataset } from './dataset-integridade.js';

export const ESTADOS_REGISTRO_DATASET = Object.freeze({
  VALIDO: 'VALID',
  INVALIDO: 'INVALID',
  NAO_VERIFICADO: 'UNVERIFIED',
  AUSENTE: 'ABSENT',
});

export const MOTIVOS_REGISTRO_DATASET = Object.freeze({
  SEM_DATASET: 'NO_DATASET',
  MANIFESTO_ILEGIVEL: 'MANIFEST_UNREADABLE',
  MANIFESTO_AUSENTE: 'MANIFEST_MISSING',
  PACOTE_ILEGIVEL: 'PACKAGE_UNREADABLE',
  PACOTE_AUSENTE: 'PACKAGE_MISSING',
  PACOTE_NAO_ATIVO: 'PACKAGE_NOT_ACTIVE',
  TAMANHO_DIVERGENTE: 'SIZE_MISMATCH',
  CHECKSUM_INVALIDO: 'CHECKSUM_MISMATCH',
  CHECKSUM_INDISPONIVEL: 'CHECKSUM_UNAVAILABLE',
  CHECKSUM_NAO_VERIFICADO: 'CHECKSUM_NOT_VERIFIED',
});

export const ETAPAS_REGISTRO_DATASET = Object.freeze([
  'MANIFEST_READ',
  'MANIFEST_PRESENT',
  'PACKAGE_READ',
  'PACKAGE_PRESENT',
  'PACKAGE_ACTIVE',
  'SIZE',
  'CHECKSUM',
]);

function tamanhoDeclarado(manifesto) {
  return manifesto.regions.reduce((total, regiao) => total + regiao.sizeBytes, 0);
}

function relatorio(base, { estado, motivo = null, mensagem, etapas }) {
  return Object.freeze({
    estado,
    motivo,
    mensagem,
    valido: estado === ESTADOS_REGISTRO_DATASET.VALIDO,
    etapas: Object.freeze(etapas.map((etapa) => Object.freeze({ ...etapa }))),
    ...base,
  });
}

function base({ manifesto = null, tamanhoEsperado = null, tamanhoReal = null, checksumCalculado = null } = {}) {
  return {
    datasetId: manifesto?.datasetId ?? null,
    version: manifesto?.version ?? null,
    manifesto,
    tamanhoEsperado,
    tamanhoReal,
    checksumEsperado: manifesto?.checksum ?? null,
    checksumCalculado,
  };
}

/**
 * Percorre a escada de verificação do dataset ativo instalado.
 *
 * `verificarChecksum: false` interrompe a escada antes do último degrau e
 * devolve UNVERIFIED: serve para uma leitura barata no boot, não para decidir
 * que o dataset está bom.
 */
export async function inspecionarDatasetInstalado({
  datasetStorage = criarStorageDataset(),
  packageStorage = criarPackageStorage(),
  verificarIntegridade = verificarIntegridadeDataset,
  verificarChecksum = true,
  cryptoImpl = globalThis.crypto,
} = {}) {
  const etapas = [];
  const registrar = (etapa, ok, detalhe = null) => {
    etapas.push({ etapa, ok, detalhe });
    return ok;
  };

  const leitura = datasetStorage.lerAtivo();
  if (!leitura.ok) {
    registrar('MANIFEST_READ', false, leitura.codigo ?? null);
    return relatorio(base(), {
      estado: ESTADOS_REGISTRO_DATASET.INVALIDO,
      motivo: MOTIVOS_REGISTRO_DATASET.MANIFESTO_ILEGIVEL,
      mensagem: leitura.motivo ?? 'O manifesto ativo não pôde ser lido.',
      etapas,
    });
  }
  registrar('MANIFEST_READ', true);

  const manifesto = leitura.valor ?? null;
  if (!manifesto) {
    registrar('MANIFEST_PRESENT', false);
    return relatorio(base(), {
      estado: ESTADOS_REGISTRO_DATASET.AUSENTE,
      motivo: MOTIVOS_REGISTRO_DATASET.SEM_DATASET,
      mensagem: 'Nenhum dataset offline está instalado neste aparelho.',
      etapas,
    });
  }
  registrar('MANIFEST_PRESENT', true, manifesto.datasetId);

  const esperado = tamanhoDeclarado(manifesto);
  const contexto = { manifesto, tamanhoEsperado: esperado };

  const pacote = await packageStorage.lerPacote(manifesto.datasetId);
  if (!pacote.ok) {
    registrar('PACKAGE_READ', false, pacote.codigo ?? null);
    return relatorio(base(contexto), {
      estado: ESTADOS_REGISTRO_DATASET.INVALIDO,
      motivo: MOTIVOS_REGISTRO_DATASET.PACOTE_ILEGIVEL,
      mensagem: pacote.motivo ?? 'O pacote físico do dataset não pôde ser lido.',
      etapas,
    });
  }
  registrar('PACKAGE_READ', true);

  if (!pacote.pacote) {
    registrar('PACKAGE_PRESENT', false);
    return relatorio(base(contexto), {
      estado: ESTADOS_REGISTRO_DATASET.INVALIDO,
      motivo: MOTIVOS_REGISTRO_DATASET.PACOTE_AUSENTE,
      mensagem: 'O manifesto declara um dataset ativo, mas o pacote físico não existe.',
      etapas,
    });
  }
  registrar('PACKAGE_PRESENT', true);

  if (pacote.pacote.state !== PACKAGE_STATES.ACTIVE) {
    registrar('PACKAGE_ACTIVE', false, pacote.pacote.state ?? null);
    return relatorio(base({ ...contexto, tamanhoReal: pacote.pacote.sizeBytes ?? null }), {
      estado: ESTADOS_REGISTRO_DATASET.INVALIDO,
      motivo: MOTIVOS_REGISTRO_DATASET.PACOTE_NAO_ATIVO,
      mensagem: 'O pacote físico não foi promovido para ativo e não pode ser servido.',
      etapas,
    });
  }
  registrar('PACKAGE_ACTIVE', true);

  const real = Number(pacote.pacote.sizeBytes ?? pacote.pacote.bytes?.byteLength ?? -1);
  contexto.tamanhoReal = real;
  if (real !== esperado) {
    registrar('SIZE', false, `${real} != ${esperado}`);
    return relatorio(base(contexto), {
      estado: ESTADOS_REGISTRO_DATASET.INVALIDO,
      motivo: MOTIVOS_REGISTRO_DATASET.TAMANHO_DIVERGENTE,
      mensagem: `O pacote tem ${real} bytes e o manifesto declara ${esperado}.`,
      etapas,
    });
  }
  registrar('SIZE', true, real);

  if (!verificarChecksum) {
    registrar('CHECKSUM', false, 'SKIPPED');
    return relatorio(base(contexto), {
      estado: ESTADOS_REGISTRO_DATASET.NAO_VERIFICADO,
      motivo: MOTIVOS_REGISTRO_DATASET.CHECKSUM_NAO_VERIFICADO,
      mensagem: 'A estrutura confere, mas a integridade não foi verificada nesta inspeção.',
      etapas,
    });
  }

  const integridade = await verificarIntegridade(pacote.pacote.bytes, manifesto.checksum, { cryptoImpl });
  contexto.checksumCalculado = integridade.checksumCalculado ?? null;

  if (!integridade.ok && integridade.codigo === 'CRYPTO_UNAVAILABLE') {
    registrar('CHECKSUM', false, integridade.codigo);
    return relatorio(base(contexto), {
      estado: ESTADOS_REGISTRO_DATASET.NAO_VERIFICADO,
      motivo: MOTIVOS_REGISTRO_DATASET.CHECKSUM_INDISPONIVEL,
      mensagem: 'Este ambiente não oferece SHA-256; a integridade do dataset não pode ser provada aqui.',
      etapas,
    });
  }

  if (!integridade.ok) {
    registrar('CHECKSUM', false, integridade.codigo ?? null);
    return relatorio(base(contexto), {
      estado: ESTADOS_REGISTRO_DATASET.INVALIDO,
      motivo: MOTIVOS_REGISTRO_DATASET.CHECKSUM_INVALIDO,
      mensagem: integridade.motivo ?? 'Os bytes do pacote não correspondem ao checksum do manifesto.',
      etapas,
    });
  }
  registrar('CHECKSUM', true, integridade.checksumCalculado);

  return relatorio(base(contexto), {
    estado: ESTADOS_REGISTRO_DATASET.VALIDO,
    mensagem: `Dataset ${manifesto.datasetId} ${manifesto.version} verificado byte a byte.`,
    etapas,
  });
}

/**
 * Registro consultável de datasets instalados.
 *
 * `listar()` devolve no máximo uma entrada porque o storage guarda um único
 * manifesto ativo. A lista é o formato de saída para que múltiplos datasets
 * caibam aqui sem trocar a API do chamador — ela não finge um catálogo que o
 * armazenamento ainda não tem.
 */
export function criarRegistroDatasets(dependencias = {}) {
  async function inspecionar(opcoes = {}) {
    return inspecionarDatasetInstalado({ ...dependencias, ...opcoes });
  }

  return Object.freeze({
    inspecionar,

    async listar(opcoes = {}) {
      const entrada = await inspecionar(opcoes);
      return entrada.estado === ESTADOS_REGISTRO_DATASET.AUSENTE ? [] : [entrada];
    },

    async obterValido(opcoes = {}) {
      const entrada = await inspecionar(opcoes);
      return entrada.valido ? entrada : null;
    },

    async existeDatasetUsavel(opcoes = {}) {
      return (await inspecionar(opcoes)).valido;
    },
  });
}
