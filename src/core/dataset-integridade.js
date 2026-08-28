/**
 * Integridade criptográfica de pacotes de dataset.
 *
 * Calcula SHA-256 sobre os bytes reais recebidos. Este módulo não baixa,
 * armazena ou ativa pacotes: apenas transforma bytes em uma evidência de
 * integridade verificável pelo orquestrador.
 */

const HEX_SHA256 = /^[a-f0-9]{64}$/i;

function normalizarBytes(bytes) {
  if (bytes instanceof Uint8Array) return bytes;
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
  if (ArrayBuffer.isView(bytes)) return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  throw new TypeError('bytes deve ser ArrayBuffer, Uint8Array ou uma visão de buffer');
}

export async function calcularSha256(bytes, { cryptoImpl = globalThis.crypto } = {}) {
  const entrada = normalizarBytes(bytes);
  if (!cryptoImpl?.subtle?.digest) {
    const erro = new Error('SHA-256 Web Crypto indisponível neste ambiente');
    erro.code = 'CRYPTO_UNAVAILABLE';
    throw erro;
  }
  const copia = new Uint8Array(entrada);
  const digest = await cryptoImpl.subtle.digest('SHA-256', copia);
  return Array.from(new Uint8Array(digest), (valor) => valor.toString(16).padStart(2, '0')).join('');
}

export async function verificarIntegridadeDataset(bytes, checksumEsperado, { cryptoImpl = globalThis.crypto } = {}) {
  const esperado = String(checksumEsperado ?? '').toLowerCase();
  if (!HEX_SHA256.test(esperado)) {
    return { ok: false, codigo: 'CHECKSUM_ESPERADO_INVALIDO', motivo: 'O checksum esperado precisa ser SHA-256 hexadecimal de 64 caracteres.', checksumCalculado: null };
  }
  let checksumCalculado;
  try {
    checksumCalculado = await calcularSha256(bytes, { cryptoImpl });
  } catch (erro) {
    return { ok: false, codigo: erro?.code ?? 'CHECKSUM_CALCULO_FALHOU', motivo: erro?.message ?? 'Não foi possível calcular SHA-256.', checksumCalculado: null };
  }
  return {
    ok: checksumCalculado === esperado,
    codigo: checksumCalculado === esperado ? 'CHECKSUM_VALIDO' : 'CHECKSUM_INVALIDO',
    motivo: checksumCalculado === esperado ? 'Os bytes recebidos correspondem ao SHA-256 declarado.' : 'Os bytes recebidos não correspondem ao SHA-256 declarado.',
    checksumCalculado,
    bytes: normalizarBytes(bytes).byteLength,
  };
}
