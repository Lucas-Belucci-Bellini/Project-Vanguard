#!/usr/bin/env node
/**
 * Gera `src/data/wmm2025.js` a partir do `WMM.COF` oficial em `vendor/wmm/`.
 *
 * Existe para que nenhum coeficiente geomagnético seja digitado à mão. São 90
 * linhas de quatro números cada; um dígito trocado não quebra nada visivelmente
 * — só move o norte magnético alguns graus, no lugar errado do planeta, sem
 * aviso. O arquivo oficial é a fonte, este script é a única ponte, e o teste
 * contra os valores publicados é a prova.
 *
 * Uso: node scripts/gerar-wmm.mjs [caminho/para/WMM.COF]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const entrada = process.argv[2] ?? join(raiz, 'vendor', 'wmm', 'WMM.COF');
const saida = join(raiz, 'src', 'data', 'wmm2025.js');

/** O cabeçalho que o README oficial manda conferir. Trocar de arquivo sem trocar de código é o erro que isto pega. */
const CABECALHO_ESPERADO = '2025.0 WMM-2025 11/13/2024';

export function analisarCof(texto) {
  const linhas = texto.split(/\r?\n/).map((l) => l.trimEnd());
  const cabecalho = linhas.find((l) => l.trim().length > 0);
  if (!cabecalho) throw new Error('WMM.COF vazio.');

  const campos = cabecalho.trim().split(/\s+/);
  if (campos.length !== 3) {
    throw new Error(`Cabeçalho inesperado no WMM.COF: ${JSON.stringify(cabecalho)}`);
  }
  const [epocaTexto, modelo, dataModelo] = campos;
  const epoca = Number(epocaTexto);
  if (!Number.isFinite(epoca)) throw new Error(`Época inválida no cabeçalho: ${epocaTexto}`);

  const coeficientes = [];
  for (const linha of linhas.slice(linhas.indexOf(cabecalho) + 1)) {
    const bruto = linha.trim();
    if (!bruto) continue;
    // O arquivo termina com duas linhas de 9s: é o marcador de fim do formato.
    if (/^9{10,}$/.test(bruto)) break;

    const partes = bruto.split(/\s+/);
    if (partes.length !== 6) throw new Error(`Linha de coeficiente inesperada: ${JSON.stringify(linha)}`);
    const numeros = partes.map(Number);
    if (numeros.some((v) => !Number.isFinite(v))) {
      throw new Error(`Número inválido na linha: ${JSON.stringify(linha)}`);
    }
    const [n, m, g, h, gPonto, hPonto] = numeros;
    if (!Number.isInteger(n) || !Number.isInteger(m) || m > n || n < 1) {
      throw new Error(`Grau/ordem inválidos: n=${n} m=${m}`);
    }
    coeficientes.push({ n, m, g, h, gPonto, hPonto });
  }

  const grauMaximo = coeficientes.reduce((maior, c) => Math.max(maior, c.n), 0);
  // Um triângulo completo tem (nMax+1)(nMax+2)/2 − 1 termos (sem o n=0).
  const esperados = ((grauMaximo + 1) * (grauMaximo + 2)) / 2 - 1;
  if (coeficientes.length !== esperados) {
    throw new Error(`Faltam coeficientes: ${coeficientes.length} lidos, ${esperados} esperados para grau ${grauMaximo}.`);
  }
  for (let n = 1, i = 0; n <= grauMaximo; n += 1) {
    for (let m = 0; m <= n; m += 1, i += 1) {
      if (coeficientes[i].n !== n || coeficientes[i].m !== m) {
        throw new Error(`Coeficientes fora de ordem em n=${n}, m=${m}.`);
      }
    }
  }

  return { epoca, modelo, dataModelo, grauMaximo, coeficientes, cabecalho: campos.join(' ') };
}

function gerar() {
  const texto = readFileSync(entrada, 'utf8');
  const sha256 = createHash('sha256').update(readFileSync(entrada)).digest('hex');
  const cof = analisarCof(texto);

  if (cof.cabecalho !== CABECALHO_ESPERADO) {
    throw new Error(
      `O cabeçalho do WMM.COF mudou: esperado ${JSON.stringify(CABECALHO_ESPERADO)}, lido ${JSON.stringify(cof.cabecalho)}. `
      + 'Se o modelo foi trocado de propósito, atualize CABECALHO_ESPERADO aqui, vendor/wmm/PROVENIENCIA.md e o teste.'
    );
  }

  // Uma tabela achatada, na ordem canônica (n crescente, m crescente). O motor
  // indexa por n(n+1)/2 + m, o mesmo índice do código de referência da NOAA.
  // `String(-0)` é "0": sem isto o zero negativo que existe no arquivo oficial
  // viraria zero positivo, e a tabela gerada deixaria de ser transcrição fiel.
  // Na aritmética dá no mesmo; na conferência contra o arquivo, não.
  const numero = (v) => (Object.is(v, -0) ? '-0' : String(v));
  const linhas = cof.coeficientes.map(
    ({ n, m, g, h, gPonto, hPonto }) =>
      `  [${n}, ${m}, ${numero(g)}, ${numero(h)}, ${numero(gPonto)}, ${numero(hPonto)}],`
  );

  const conteudo = `/* ⚠️ ARQUIVO GERADO — não edite à mão (scripts/gerar-wmm.mjs).
 *
 * Coeficientes do World Magnetic Model ${cof.modelo.replace('WMM-', '')}, lidos do arquivo oficial
 * ${relative(raiz, entrada)} (SHA-256 ${sha256}).
 *
 * AVISO EXIGIDO POR 17 U.S.C. 403: este arquivo incorpora o World Magnetic
 * Model, material produzido por agências do Governo dos Estados Unidos
 * (NOAA/NCEI) com o British Geological Survey, NÃO sujeito a proteção por
 * direito autoral. Proveniência, licença e citação: vendor/wmm/PROVENIENCIA.md
 *
 * Cada linha é [n, m, g, h, ġ, ḣ]: grau, ordem, os dois coeficientes de Gauss
 * em nT na época, e a variação secular de cada um em nT/ano.
 */

/** Época do modelo, em ano decimal. */
export const WMM_EPOCA = ${cof.epoca};

/** Nome do modelo, como está no cabeçalho do arquivo oficial. */
export const WMM_MODELO = ${JSON.stringify(cof.modelo)};

/** Data de emissão declarada no cabeçalho (MM/DD/AAAA, como no arquivo). */
export const WMM_DATA_MODELO = ${JSON.stringify(cof.dataModelo)};

/** Grau/ordem máximos da expansão. */
export const WMM_GRAU_MAXIMO = ${cof.grauMaximo};

/** O modelo vale desta época até cinco anos depois; fora disso não se extrapola. */
export const WMM_VALIDADE = Object.freeze({ inicio: ${cof.epoca}, fim: ${cof.epoca + 5} });

/** SHA-256 do WMM.COF de onde estes números saíram. */
export const WMM_COF_SHA256 = ${JSON.stringify(sha256)};

/** [n, m, g, h, ġ, ḣ] — ordem canônica, n crescente e m crescente dentro de n. */
export const WMM_COEFICIENTES = Object.freeze([
${linhas.join('\n')}
].map(Object.freeze));
`;

  writeFileSync(saida, conteudo);
  return { cof, sha256, saida };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { cof, sha256, saida } = gerar();
  console.log(`${cof.modelo} época ${cof.epoca}, grau ${cof.grauMaximo}, ${cof.coeficientes.length} coeficientes.`);
  console.log(`WMM.COF SHA-256 ${sha256}`);
  console.log(`escrito: ${relative(raiz, saida)}`);
}
