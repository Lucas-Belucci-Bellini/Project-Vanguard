/**
 * Comparação de versões segundo SemVer 2.0.0.
 *
 * ## O defeito que este módulo corrige
 *
 * O comparador anterior fazia `texto.replace(/^v/i, '')` e depois
 * `split('-', 2)`. Com as tags deste projeto — `mobile-v1.4.4` — a ordem das
 * duas operações destruía a leitura: o `replace` não casava (a string começa
 * com `m`), o `split` cortava no primeiro hífen, e a base virava `"mobile"`.
 * Não são três números, então a versão era classificada como **inválida** — e
 * inválida fica abaixo de tudo.
 *
 * Resultado medido: `releaseMaisNova({tag_name: 'mobile-v1.4.4'}, '1.0.0')`
 * devolvia `false`. O aplicativo **nunca** detectou uma atualização, em
 * nenhuma versão publicada. É por isso que descobrir uma versão nova exigia
 * abrir o GitHub à mão.
 *
 * A correção é extrair a versão de dentro da tag, em vez de assumir onde ela
 * começa: procura-se o primeiro trecho que se pareça com `X.Y.Z`.
 *
 * ## Precedência de pré-lançamento
 *
 * O anterior comparava o pré-lançamento inteiro com `localeCompare` numérico.
 * Isso erra casos que a especificação define:
 *
 * - `1.0.0-alpha.2` < `1.0.0-alpha.10` — identificador numérico compara como
 *   NÚMERO. Com `localeCompare` de string, "alpha.10" viria antes de
 *   "alpha.2".
 * - `1.0.0-alpha.beta` > `1.0.0-alpha.1` — numérico tem precedência MENOR que
 *   alfanumérico.
 * - `1.0.0-alpha` < `1.0.0-alpha.1` — mais campos vence quando o prefixo é
 *   igual.
 *
 * Isso importa aqui: canal beta e canal estável são decididos por este campo.
 */

/** Solta a versão de dentro de uma tag (`mobile-v1.4.4`, `v1.4.4`, `1.4.4`). */
export function versaoDaTag(tag) {
  const texto = String(tag ?? '').trim();
  // O `v` opcional gruda no número; o que vem antes é prefixo de tag.
  const achado = texto.match(/(?:^|[^\w.])v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)/);
  return achado ? achado[1] : null;
}

/** Divide em partes; devolve `null` para o que não for versão. */
export function analisar(valor) {
  const versao = typeof valor === 'string' && /^\d+\.\d+\.\d+/.test(valor.trim().replace(/^v/i, ''))
    ? valor.trim().replace(/^v/i, '')
    : versaoDaTag(valor);
  if (!versao) return null;

  // O build metadata (`+abc`) é ignorado na precedência, por especificação.
  const [semBuild] = versao.split('+', 1);
  const corte = semBuild.indexOf('-');
  const base = corte < 0 ? semBuild : semBuild.slice(0, corte);
  const pre = corte < 0 ? '' : semBuild.slice(corte + 1);

  const numeros = base.split('.').map((p) => Number.parseInt(p, 10));
  if (numeros.length !== 3 || numeros.some((n) => !Number.isInteger(n) || n < 0)) return null;

  return { numeros, pre, versao: semBuild };
}

/** Compara dois identificadores de pré-lançamento pela regra da especificação. */
function compararIdentificador(a, b) {
  const aNumerico = /^\d+$/.test(a);
  const bNumerico = /^\d+$/.test(b);
  // "Identificadores só com dígitos têm precedência MENOR que alfanuméricos."
  if (aNumerico && !bNumerico) return -1;
  if (!aNumerico && bNumerico) return 1;
  if (aNumerico && bNumerico) {
    const na = Number(a);
    const nb = Number(b);
    return na === nb ? 0 : (na > nb ? 1 : -1);
  }
  return a === b ? 0 : (a > b ? 1 : -1);
}

function compararPre(a, b) {
  // Sem pré-lançamento é MAIOR: 1.0.0 > 1.0.0-rc.1.
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const ai = a.split('.');
  const bi = b.split('.');
  for (let i = 0; i < Math.max(ai.length, bi.length); i += 1) {
    if (ai[i] === undefined) return -1;   // menos campos, mesmo prefixo → menor
    if (bi[i] === undefined) return 1;
    const ordem = compararIdentificador(ai[i], bi[i]);
    if (ordem !== 0) return ordem;
  }
  return 0;
}

/** 1 se a > b, -1 se a < b, 0 se equivalentes. Inválido fica abaixo de válido. */
export function compararVersoes(a, b) {
  const esquerda = analisar(a);
  const direita = analisar(b);
  if (!esquerda && !direita) return 0;
  if (!esquerda) return -1;
  if (!direita) return 1;
  for (let i = 0; i < 3; i += 1) {
    if (esquerda.numeros[i] !== direita.numeros[i]) {
      return esquerda.numeros[i] > direita.numeros[i] ? 1 : -1;
    }
  }
  return compararPre(esquerda.pre, direita.pre);
}

export const CANAIS = Object.freeze({ STABLE: 'stable', BETA: 'beta', ALPHA: 'alpha' });

/**
 * O canal sai do pré-lançamento, não de um campo à parte: `2.0.0-beta.1` é
 * beta por construção, e oferecê-lo como estável seria mentir sobre o que ele
 * é. Pré-lançamento que não nomeia canal conhecido cai em `alpha`, o mais
 * restrito — o palpite seguro é o que menos gente recebe.
 */
export function canalDaVersao(valor) {
  const partes = analisar(valor);
  if (!partes) return null;
  if (!partes.pre) return CANAIS.STABLE;
  const primeiro = partes.pre.split('.')[0].toLowerCase();
  if (primeiro === 'beta' || primeiro === 'rc') return CANAIS.BETA;
  return CANAIS.ALPHA;
}

/** Quem assina `stable` não recebe beta; quem assina `beta` recebe beta e stable. */
export function canalAceito(canalDesejado, canalDaRelease) {
  if (!canalDaRelease) return false;
  if (canalDesejado === CANAIS.ALPHA) return true;
  if (canalDesejado === CANAIS.BETA) return canalDaRelease !== CANAIS.ALPHA;
  return canalDaRelease === CANAIS.STABLE;
}
