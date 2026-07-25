/**
 * Estado compartilhado entre as telas, persistido no localStorage.
 *
 * Namespace `vanguard:` — mesmo padrão do `baluarte:` no Projeto Baluarte,
 * para os dois poderem coexistir no mesmo domínio sem colidir.
 *
 * Regra: só entra aqui o que precisa **sobreviver à troca de aba ou ao
 * fechamento do app** — posição da peça, alvo, sistema escolhido, waypoints.
 * Estado efêmero de tela fica na própria tela.
 */

const PREFIXO = 'vanguard:';

function ler(chave, padrao) {
  try {
    const bruto = localStorage.getItem(PREFIXO + chave);
    return bruto == null ? padrao : JSON.parse(bruto);
  } catch {
    /* localStorage bloqueado (modo privado, iframe sem permissão) ou JSON
     * corrompido: o app continua funcionando em memória, sem persistir. */
    return padrao;
  }
}

function escrever(chave, valor) {
  try {
    localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
    return true;
  } catch {
    return false; // cota estourada ou storage indisponível — não é fatal
  }
}

const ouvintes = new Map();

export const estado = {
  get: ler,
  set(chave, valor) {
    escrever(chave, valor);
    (ouvintes.get(chave) ?? []).forEach((fn) => fn(valor));
    return valor;
  },
  /** Assina mudanças de uma chave. Devolve a função para cancelar. */
  on(chave, fn) {
    if (!ouvintes.has(chave)) ouvintes.set(chave, []);
    ouvintes.get(chave).push(fn);
    return () => {
      const l = ouvintes.get(chave) ?? [];
      const i = l.indexOf(fn);
      if (i >= 0) l.splice(i, 1);
    };
  },
  remover(chave) {
    try { localStorage.removeItem(PREFIXO + chave); } catch { /* ok */ }
  }
};

/* ── Chaves conhecidas ──
 * Centralizadas para não haver string solta espalhada pelas telas. */
export const CHAVES = {
  MODO: 'modo',
  PECA: 'peca',              // {lat, lon, alt} ou {x, y, alt}
  ALVO: 'alvo',              // idem
  SISTEMA: 'sistema',        // id em SISTEMAS
  QUADRO: 'quadro',          // 'geo' | 'local'
  TERRENO: 'terreno',        // id em TERRENOS quando quadro = 'local'
  WAYPOINTS: 'waypoints',    // [{id, nome, pos, afiliacao}]
  AMBIENTE: 'ambiente',      // {ventoVelocidadeMs, ventoDirecaoDeg, declinacaoMagDeg}
  MIL: 'sistemaMil'          // 'nato' | 'mrad' | 'warsaw' | 'swedish'
};
