/**
 * Registro de foto de parada: uma imagem amarrada ao lugar onde ela foi tirada.
 *
 * Este módulo é puro — não abre câmera, não grava em disco e não conhece DOM.
 * Ele responde uma coisa só: *esta imagem pode ser registrada como a parada
 * daquele lugar, e com que qualidade?*
 *
 * Duas regras sustentam o resto:
 *
 * 1. **Sem posição real não existe foto de parada.** Uma imagem sem fixo válido
 *    não vira registro com coordenada zerada, herdada ou estimada — ela é
 *    recusada, e quem chamou decide se espera o fixo. Inventar a coordenada
 *    seria dizer onde a pessoa estava sem saber.
 *
 * 2. **Qualidade ruim não apaga a foto.** Se o fixo veio com 60 m em vez dos
 *    25 m pedidos, o registro é criado assim mesmo, com a precisão real gravada
 *    e `dentroDoLimite: false`. Perder a foto de uma parada que não se repete é
 *    pior do que guardá-la com a ressalva visível. O que nunca acontece é a
 *    ressalva sumir.
 */

import { latLonParaMGRS } from '../engine/mgrs.js';

export const ESQUEMA_FOTO_PARADA = 'vanguard-foto-parada';
export const VERSAO_FOTO_PARADA = 1;

/** Precisão pedida para a parada. Acima disso o registro nasce marcado. */
export const PRECISAO_PARADA_PADRAO_M = 25;

/** Um fixo mais velho que isso não descreve mais "onde eu parei agora". */
export const IDADE_MAXIMA_FIXO_PADRAO_MS = 60_000;

export const ESTADOS_FOTO_PARADA = Object.freeze({
  ACEITA: 'ACEITA',
  PRECISAO_INSUFICIENTE: 'PRECISAO_INSUFICIENTE',
  POSICAO_ANTIGA: 'POSICAO_ANTIGA',
  SEM_POSICAO: 'SEM_POSICAO',
  IMAGEM_INVALIDA: 'IMAGEM_INVALIDA',
});

const MIMES_ACEITOS = Object.freeze(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

// `Number(null)`, `Number('')` e `Number([])` valem 0. Aceitar essas conversões
// aqui transformaria `lon: null` na longitude 0 — uma coordenada real no golfo
// da Guiné —, que é exatamente a invenção de posição que este módulo existe
// para impedir. Só número e string numérica passam.
function numeroFinito(valor) {
  if (typeof valor !== 'number' && typeof valor !== 'string') return null;
  if (typeof valor === 'string' && valor.trim() === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function coordenadaValida(lat, lon) {
  return lat != null && lon != null && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function textoCurto(valor, limite) {
  return typeof valor === 'string' && valor.trim() ? valor.trim().slice(0, limite) : null;
}

function dataIso(valor) {
  const numero = numeroFinito(valor);
  return numero == null ? null : new Date(numero).toISOString();
}

/**
 * Julga o fixo que acompanharia a foto, sem tocar na imagem.
 * Serve para a tela avisar *antes* de abrir a câmera.
 */
export function avaliarPosicaoParada({
  posicao = null,
  agora = Date.now(),
  precisaoMaximaM = PRECISAO_PARADA_PADRAO_M,
  idadeMaximaMs = IDADE_MAXIMA_FIXO_PADRAO_MS,
} = {}) {
  const lat = numeroFinito(posicao?.lat);
  const lon = numeroFinito(posicao?.lon);
  const limite = Number(precisaoMaximaM) > 0 ? Number(precisaoMaximaM) : PRECISAO_PARADA_PADRAO_M;

  if (!coordenadaValida(lat, lon)) {
    return {
      estado: ESTADOS_FOTO_PARADA.SEM_POSICAO,
      motivo: 'Não há fixo de GPS válido para dizer onde a foto foi tirada.',
      utilizavel: false,
      dentroDoLimite: false,
      precisaoM: null,
      idadeMs: null,
      precisaoMaximaM: limite,
    };
  }

  const precisaoM = numeroFinito(posicao?.accuracy);
  const fixoEm = numeroFinito(posicao?.createdAt ?? posicao?.timestamp);
  const referencia = numeroFinito(agora);
  const idadeMs = fixoEm != null && referencia != null && referencia >= fixoEm ? referencia - fixoEm : null;
  const idadeLimite = Number(idadeMaximaMs) > 0 ? Number(idadeMaximaMs) : IDADE_MAXIMA_FIXO_PADRAO_MS;
  const dentroDoLimite = precisaoM != null && precisaoM >= 0 && precisaoM <= limite;

  if (idadeMs != null && idadeMs > idadeLimite) {
    return {
      estado: ESTADOS_FOTO_PARADA.POSICAO_ANTIGA,
      motivo: `O último fixo tem ${Math.round(idadeMs / 1000)} s e pode não ser mais o lugar da parada.`,
      utilizavel: true,
      dentroDoLimite,
      precisaoM,
      idadeMs,
      precisaoMaximaM: limite,
    };
  }

  if (!dentroDoLimite) {
    return {
      estado: ESTADOS_FOTO_PARADA.PRECISAO_INSUFICIENTE,
      motivo: precisaoM == null
        ? 'O aparelho não informou a precisão deste fixo.'
        : `A precisão do fixo é de ${Math.round(precisaoM)} m e a parada pede ${limite} m ou menos.`,
      utilizavel: true,
      dentroDoLimite: false,
      precisaoM,
      idadeMs,
      precisaoMaximaM: limite,
    };
  }

  return {
    estado: ESTADOS_FOTO_PARADA.ACEITA,
    motivo: `Fixo de ${Math.round(precisaoM)} m, dentro dos ${limite} m pedidos.`,
    utilizavel: true,
    dentroDoLimite: true,
    precisaoM,
    idadeMs,
    precisaoMaximaM: limite,
  };
}

function validarImagem(imagem) {
  const mime = textoCurto(imagem?.mime, 60);
  const sizeBytes = numeroFinito(imagem?.sizeBytes);
  if (!mime || !MIMES_ACEITOS.includes(mime.toLowerCase())) {
    return { erro: 'O arquivo precisa ser uma imagem (JPEG, PNG, WebP ou HEIC).' };
  }
  if (sizeBytes == null || !Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    return { erro: 'A imagem está vazia ou o tamanho não pôde ser lido.' };
  }
  const largura = numeroFinito(imagem?.largura);
  const altura = numeroFinito(imagem?.altura);
  return {
    imagem: {
      mime: mime.toLowerCase(),
      sizeBytes,
      ...(largura != null && largura > 0 ? { largura: Math.round(largura) } : {}),
      ...(altura != null && altura > 0 ? { altura: Math.round(altura) } : {}),
    },
  };
}

/**
 * Monta o registro da parada. `ok: false` só acontece quando não dá para
 * amarrar a imagem a um lugar (sem fixo) ou quando não há imagem válida;
 * qualidade fraca do fixo produz registro marcado, nunca ausência de registro.
 */
export function criarRegistroFotoParada({
  id,
  posicao = null,
  imagem = null,
  capturadaEm = Date.now(),
  nota = null,
  precisaoMaximaM = PRECISAO_PARADA_PADRAO_M,
  idadeMaximaMs = IDADE_MAXIMA_FIXO_PADRAO_MS,
  agora = Date.now(),
} = {}) {
  const identificador = textoCurto(id, 120);
  if (!identificador) {
    return { ok: false, estado: ESTADOS_FOTO_PARADA.IMAGEM_INVALIDA, motivo: 'O registro precisa de um identificador.', registro: null };
  }

  const validacaoImagem = validarImagem(imagem);
  if (validacaoImagem.erro) {
    return { ok: false, estado: ESTADOS_FOTO_PARADA.IMAGEM_INVALIDA, motivo: validacaoImagem.erro, registro: null };
  }

  const avaliacao = avaliarPosicaoParada({ posicao, agora, precisaoMaximaM, idadeMaximaMs });
  if (!avaliacao.utilizavel) {
    return { ok: false, estado: avaliacao.estado, motivo: avaliacao.motivo, registro: null };
  }

  const lat = Number(posicao.lat);
  const lon = Number(posicao.lon);
  const altitude = numeroFinito(posicao.altitude);
  const fixoEm = numeroFinito(posicao.createdAt ?? posicao.timestamp);

  let mgrs = null;
  try {
    mgrs = latLonParaMGRS(lat, lon, 5, true);
  } catch {
    /* Fora da cobertura UTM o registro continua válido em lat/lon. */
  }

  const registro = {
    schema: ESQUEMA_FOTO_PARADA,
    version: VERSAO_FOTO_PARADA,
    id: identificador,
    lat,
    lon,
    mgrs,
    precisaoM: avaliacao.precisaoM,
    precisaoMaximaM: avaliacao.precisaoMaximaM,
    dentroDoLimite: avaliacao.dentroDoLimite,
    estado: avaliacao.estado,
    ...(altitude != null ? { altitude } : {}),
    capturadaEm: dataIso(capturadaEm) ?? new Date().toISOString(),
    fixoEm: dataIso(fixoEm),
    idadeFixoMs: avaliacao.idadeMs,
    ...(textoCurto(nota, 280) ? { nota: textoCurto(nota, 280) } : {}),
    imagem: validacaoImagem.imagem,
  };

  return { ok: true, estado: avaliacao.estado, motivo: avaliacao.motivo, registro };
}

/** Nome de arquivo estável para a imagem exportada. */
export function nomeArquivoFotoParada(registro) {
  const extensoes = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' };
  const extensao = extensoes[registro?.imagem?.mime] ?? 'bin';
  // O ponto fica fora do conjunto permitido de propósito: sem ponto no corpo do
  // nome não há `..` para atravessar diretório nem extensão dupla ambígua.
  const base = textoCurto(registro?.id, 120)?.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'parada';
  return `${base}.${extensao}`;
}

/**
 * Converte a parada em waypoint do contrato de registro local, para que a foto
 * viaje junto com a coordenada nos formatos que já existem (JSON, GPX e KML).
 */
export function fotoParadaComoWaypoint(registro) {
  if (!registro || !coordenadaValida(numeroFinito(registro.lat), numeroFinito(registro.lon))) {
    throw new Error('Registro de foto sem coordenada válida.');
  }
  const precisao = registro.precisaoM == null ? 'precisão não informada' : `precisão ${Math.round(registro.precisaoM)} m`;
  const ressalva = registro.dentroDoLimite === false ? ' — fora do limite pedido' : '';
  return {
    id: registro.id,
    nome: registro.nota ? `Parada: ${registro.nota}` : `Parada ${registro.id}`,
    lat: Number(registro.lat),
    lon: Number(registro.lon),
    ...(Number.isFinite(Number(registro.altitude)) ? { altitude: Number(registro.altitude) } : {}),
    ...(Number.isFinite(Date.parse(registro.capturadaEm)) ? { createdAt: Date.parse(registro.capturadaEm) } : {}),
    ...(registro.precisaoM != null ? { accuracy: Number(registro.precisaoM) } : {}),
    descricao: `${registro.mgrs ? `MGRS ${registro.mgrs} · ` : ''}${precisao}${ressalva}`,
    arquivo: nomeArquivoFotoParada(registro),
  };
}

export function fotosParadaComoWaypoints(registros = []) {
  return registros.filter(Boolean).map(fotoParadaComoWaypoint);
}
