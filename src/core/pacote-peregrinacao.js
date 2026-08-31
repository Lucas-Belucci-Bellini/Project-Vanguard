/**
 * Pacote de backup da caminhada: fotos e trilha num arquivo só.
 *
 * Foto e coordenada precisam viajar juntas. Solta, a imagem não diz onde foi
 * tirada; solto, o GPX não diz o que havia ali. O pacote resolve isso sem
 * colocar nenhum segredo no aplicativo: ele é montado no aparelho e entregue
 * ao menu de compartilhar do sistema, e **a pessoa escolhe o destino** —
 * nuvem, e-mail, cabo. O app não tem token, não tem conta e não envia nada
 * sozinho.
 *
 * Conteúdo:
 *
 *   paradas.csv           uma linha por foto, com MGRS, lat/lon e precisão
 *   registro.json         backup versionado de trilha, waypoints e destino
 *   trilha.gpx            a mesma coisa em formato que qualquer GPS abre
 *   LEIA-ME.txt           o que é cada arquivo e o que a precisão significa
 *   fotos/…               as imagens, com o nome que aparece no CSV
 *
 * Uma foto cujos bytes não puderem ser lidos **não** some em silêncio: ela sai
 * do pacote listada em `fotosAusentes`, para quem exportou saber que faltou.
 */

import { criarZip } from '../engine/zip.js';
import { exportarRegistroLocal, exportarRegistroGpx } from './registro-offline.js';
import { fotosParadaComoWaypoints, nomeArquivoFotoParada } from './foto-parada.js';

export const PASTA_FOTOS = 'fotos';

function csvCampo(valor) {
  const texto = valor == null ? '' : String(valor);
  return /[",;\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** CSV das paradas: abre em planilha e é legível sem o aplicativo. */
export function paradasComoCsv(paradas = []) {
  const cabecalho = ['arquivo', 'capturada_em', 'mgrs', 'latitude', 'longitude', 'precisao_m', 'dentro_do_limite', 'altitude_m', 'nota'];
  const linhas = (Array.isArray(paradas) ? paradas : []).filter(Boolean).map((parada) => [
    `${PASTA_FOTOS}/${nomeArquivoFotoParada(parada)}`,
    parada.capturadaEm ?? '',
    parada.mgrs ?? '',
    parada.lat ?? '',
    parada.lon ?? '',
    parada.precisaoM ?? '',
    parada.dentroDoLimite === false ? 'nao' : parada.dentroDoLimite === true ? 'sim' : '',
    parada.altitude ?? '',
    parada.nota ?? '',
  ].map(csvCampo).join(','));
  return [cabecalho.join(','), ...linhas].join('\n');
}

function leiaMe({ paradas, trilha, geradoEm, ausentes }) {
  return [
    'PACOTE DE CAMINHADA — VANGUARD FIELD',
    `Gerado em ${geradoEm}`,
    '',
    `${paradas} parada(s) com foto · ${trilha} ponto(s) de trilha`,
    '',
    'ARQUIVOS',
    `  ${PASTA_FOTOS}/         as fotos das paradas`,
    '  paradas.csv     uma linha por foto, com MGRS, latitude, longitude e precisão',
    '  registro.json   backup de trilha, waypoints e destino, para reimportar no app',
    '  trilha.gpx      a trilha em formato aberto, que outros programas de GPS abrem',
    '',
    'SOBRE A PRECISÃO',
    '  A coluna precisao_m é o raio informado pelo aparelho no momento da foto,',
    '  não uma medição verificada. dentro_do_limite = nao significa que o fixo',
    '  ficou acima do limite pedido para a parada; a foto foi guardada assim mesmo,',
    '  com a ressalva, em vez de descartada.',
    '',
    'A coordenada não está gravada dentro do JPEG. Ela vive no paradas.csv e no',
    'registro.json — mantenha estes arquivos junto das fotos.',
    ...(ausentes.length
      ? ['', 'FOTOS QUE FALTARAM (bytes não puderam ser lidos no aparelho):', ...ausentes.map((id) => `  ${id}`)]
      : []),
    '',
  ].join('\n');
}

function dataDoArquivo(valor, padrao) {
  const instante = Date.parse(valor ?? '');
  return Number.isFinite(instante) ? instante : padrao;
}

/**
 * Monta o pacote. `lerImagem` recebe o id da parada e devolve `{ ok, bytes }`,
 * o mesmo contrato do storage de fotos.
 */
export async function montarPacotePeregrinacao({
  paradas = [],
  trilha = [],
  waypoints = [],
  destino = null,
  lerImagem,
  agora = Date.now(),
} = {}) {
  if (typeof lerImagem !== 'function') throw new TypeError('montarPacotePeregrinacao exige lerImagem.');

  const lista = (Array.isArray(paradas) ? paradas : []).filter(Boolean);
  const geradoEm = new Date(agora).toISOString();
  const arquivos = [];
  const ausentes = [];

  for (const parada of lista) {
    const leitura = await lerImagem(parada.id);
    if (!leitura?.ok || !leitura.bytes?.length) {
      ausentes.push(parada.id);
      continue;
    }
    arquivos.push({
      nome: `${PASTA_FOTOS}/${nomeArquivoFotoParada(parada)}`,
      conteudo: leitura.bytes,
      dataMs: dataDoArquivo(parada.capturadaEm, agora),
    });
  }

  const incluidas = lista.filter((parada) => !ausentes.includes(parada.id));
  // As paradas entram como waypoints também no registro e no GPX, para a
  // coordenada da foto existir nos formatos que outros programas leem.
  const todosWaypoints = [...(Array.isArray(waypoints) ? waypoints : []), ...fotosParadaComoWaypoints(incluidas)];

  arquivos.push({ nome: 'paradas.csv', conteudo: paradasComoCsv(incluidas), dataMs: agora });
  arquivos.push({ nome: 'registro.json', conteudo: exportarRegistroLocal({ trilha, waypoints: todosWaypoints, destino, exportadoEm: geradoEm }), dataMs: agora });
  arquivos.push({ nome: 'trilha.gpx', conteudo: exportarRegistroGpx({ trilha, waypoints: todosWaypoints, destino }), dataMs: agora });
  arquivos.push({
    nome: 'LEIA-ME.txt',
    conteudo: leiaMe({ paradas: incluidas.length, trilha: Array.isArray(trilha) ? trilha.length : 0, geradoEm, ausentes }),
    dataMs: agora,
  });

  const bytes = criarZip(arquivos);
  return {
    bytes,
    nomeArquivo: `vanguard-caminhada-${geradoEm.slice(0, 10)}.zip`,
    fotosIncluidas: incluidas.length,
    fotosAusentes: ausentes,
    arquivos: arquivos.map((arquivo) => arquivo.nome),
    tamanhoBytes: bytes.length,
  };
}
