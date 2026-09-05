/**
 * A migração da trilha v1 (array em `localStorage`) para o Track Store v2.
 *
 * ## A regra que manda aqui
 *
 * `migrate, never destroy`. Esta migração **copia**. A chave `vanguard:trilha`
 * continua exatamente onde está, com o mesmo conteúdo, depois de terminar — e
 * há teste cobrando isso com o checksum de antes e o de depois.
 *
 * Não é excesso de zelo: enquanto a V3 não estiver provada em campo, o array
 * antigo é a única cópia daquele caminho. Apagá-lo ao "concluir com sucesso" é
 * apostar que a conclusão estava certa.
 *
 * ## O que faz a migração FALHAR em vez de concluir
 *
 * - a contagem de destino não bater com a de origem;
 * - o inventário dizer que a leitura foi parcial ou que há conteúdo ilegível.
 *
 * Uma migração que "resolve" a diferença é uma migração que perdeu dado e
 * seguiu adiante. Aqui ela para, diz o número dos dois lados, e não conclui.
 *
 * ## Ponto que não migra não é apagado
 *
 * Ele entra em `pendentes`, com o índice original e o motivo, e o array v1
 * segue intacto para quem quiser recuperá-lo à mão.
 *
 * ## Rodar duas vezes não duplica
 *
 * A sessão criada guarda o checksum da origem. Encontrar uma sessão com o mesmo
 * checksum significa que aquele array já foi migrado, e a segunda execução não
 * faz nada — em vez de criar uma cópia paralela do mesmo caminho.
 */

import { normalizarPontoTrilha } from '../../engine/trilha-ponto.js';
import { ESTADO_SESSAO } from './track-store.js';
import { PREFIXO_LOCAL_STORAGE } from './catalogo.js';

export const CHAVE_TRILHA_V1 = 'trilha';

export const RESULTADO_MIGRACAO = Object.freeze({
  /** Copiou tudo e conferiu a contagem dos dois lados. */
  MIGRADA: 'MIGRADA',
  /** Já havia sido migrada antes; nada foi feito de novo. */
  JA_MIGRADA: 'JA_MIGRADA',
  /** Não há o que migrar (chave ausente ou array vazio). */
  NADA_A_MIGRAR: 'NADA_A_MIGRAR',
  /** Parou antes de concluir. O original continua intacto. */
  FALHOU: 'FALHOU',
});

async function sha256(texto, cryptoImpl) {
  const subtle = cryptoImpl?.subtle;
  if (!subtle?.digest) return null;
  const hash = await subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * @param {object} opcoes
 * @param {object} opcoes.store Track Store de destino
 * @param {Storage} [opcoes.localStorageImpl]
 * @param {Crypto} [opcoes.cryptoImpl]
 */
export async function migrarTrilhaV1({
  store,
  localStorageImpl = globalThis.localStorage,
  cryptoImpl = globalThis.crypto,
} = {}) {
  if (!store) throw new TypeError('migrarTrilhaV1 exige o store de destino.');

  const caminho = `${PREFIXO_LOCAL_STORAGE}${CHAVE_TRILHA_V1}`;
  let bruto = null;
  try {
    bruto = localStorageImpl?.getItem(caminho) ?? null;
  } catch (erro) {
    return { resultado: RESULTADO_MIGRACAO.FALHOU, motivo: `Não foi possível LER a trilha v1: ${erro?.message ?? erro}. Nada foi alterado.` };
  }

  if (bruto == null || bruto === '') {
    return { resultado: RESULTADO_MIGRACAO.NADA_A_MIGRAR, motivo: 'Não há trilha v1 neste aparelho.', origem: { registros: 0 } };
  }

  const checksumAntes = await sha256(bruto, cryptoImpl);

  let v1;
  try {
    v1 = JSON.parse(bruto);
  } catch {
    // Ilegível não é vazio. Converter por cima aqui seria destruir.
    return {
      resultado: RESULTADO_MIGRACAO.FALHOU,
      motivo: 'A trilha v1 não é JSON válido. O conteúdo foi preservado e nada foi convertido — recupere-o à mão antes de migrar.',
      origem: { checksum: checksumAntes, bytes: bruto.length },
    };
  }

  if (!Array.isArray(v1)) {
    return { resultado: RESULTADO_MIGRACAO.FALHOU, motivo: 'A trilha v1 não é uma lista de pontos. Original preservado.', origem: { checksum: checksumAntes } };
  }
  if (v1.length === 0) {
    return { resultado: RESULTADO_MIGRACAO.NADA_A_MIGRAR, motivo: 'A trilha v1 está vazia.', origem: { registros: 0, checksum: checksumAntes } };
  }

  // Rodar duas vezes não pode criar uma segunda cópia do mesmo caminho.
  const anteriores = await store.sessoes();
  const jaMigrada = anteriores.find((s) => s.origem === 'MIGRACAO_V1' && s.checksumOrigem === checksumAntes);
  if (jaMigrada) {
    return {
      resultado: RESULTADO_MIGRACAO.JA_MIGRADA,
      motivo: `Este array já foi migrado para a sessão ${jaMigrada.id}.`,
      sessaoId: jaMigrada.id,
      origem: { registros: v1.length, checksum: checksumAntes },
    };
  }

  const sessao = await store.iniciar({
    nome: 'Trilha migrada da v1',
    origem: 'MIGRACAO_V1',
  });

  const pendentes = [];
  let copiados = 0;

  for (const [indice, cru] of v1.entries()) {
    const ponto = normalizarPontoTrilha(cru);
    if (!ponto) {
      // Nunca `delete`. O índice e o motivo ficam registrados, e o array v1
      // continua inteiro para quem quiser recuperar este ponto à mão.
      pendentes.push({ indice, motivo: 'Sem coordenada válida no registro v1.', original: cru });
      continue;
    }
    // Migração é cópia fiel: aqui NÃO se classifica nem se filtra. Reclassificar
    // um caminho já andado seria reescrever a história dele com regras que não
    // existiam quando ele foi gravado.
    const r = await store.registrar({ ...cru, ...ponto }, { velocidadeMaximaMs: Infinity });
    if (r.resultado === 'GRAVADO') copiados += 1;
    else pendentes.push({ indice, motivo: r.motivo ?? 'Recusado pelo store.', original: cru });
  }

  const noDestino = await store.contar(sessao.id);
  const esperado = v1.length - pendentes.length;

  let bruto2 = null;
  try {
    bruto2 = localStorageImpl?.getItem(caminho) ?? null;
  } catch { /* a conferência abaixo trata */ }
  const checksumDepois = await sha256(bruto2 ?? '', cryptoImpl);

  const conferencia = {
    origem: v1.length,
    copiados,
    pendentes: pendentes.length,
    noDestino,
    esperado,
    checksumOrigemAntes: checksumAntes,
    checksumOrigemDepois: checksumDepois,
    originalIntacto: checksumAntes != null && checksumAntes === checksumDepois,
  };

  if (noDestino !== esperado) {
    return {
      resultado: RESULTADO_MIGRACAO.FALHOU,
      motivo: `Contagem não bate: ${esperado} esperados no destino, ${noDestino} encontrados. A migração não foi concluída e o original continua intacto.`,
      sessaoId: sessao.id,
      conferencia,
      pendentes,
    };
  }

  if (!conferencia.originalIntacto) {
    return {
      resultado: RESULTADO_MIGRACAO.FALHOU,
      motivo: 'A trilha v1 mudou durante a migração. A cópia não pode ser considerada fiel.',
      sessaoId: sessao.id,
      conferencia,
      pendentes,
    };
  }

  // O checksum da origem viaja com a sessão: é ele que faz a segunda execução
  // reconhecer que este array já foi migrado.
  const agora = Date.now();
  await store.anotarSessao({
    checksumOrigem: checksumAntes,
    migradaEm: agora,
    pendentes: pendentes.length,
    estado: ESTADO_SESSAO.ENCERRADA,
    encerradaEm: agora,
  });

  return {
    resultado: RESULTADO_MIGRACAO.MIGRADA,
    motivo: `${copiados} de ${v1.length} pontos copiados. A trilha v1 continua no aparelho, intacta.`,
    sessaoId: sessao.id,
    conferencia,
    pendentes,
  };
}
