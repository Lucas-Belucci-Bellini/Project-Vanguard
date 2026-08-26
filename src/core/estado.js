/**
 * Estado compartilhado entre as telas, persistido no localStorage.
 *
 * O dispositivo permanece como fonte padrão dos dados de localização. A posição
 * só deve ser compartilhada quando a pessoa confirmar uma missão de emergência.
 */

const PREFIXO = 'vanguard:';

function ler(chave, padrao) {
  try {
    const bruto = localStorage.getItem(PREFIXO + chave);
    return bruto == null ? padrao : JSON.parse(bruto);
  } catch {
    return padrao;
  }
}

function escrever(chave, valor) {
  try {
    localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
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
    try { localStorage.removeItem(PREFIXO + chave); } catch { /* continua em memória */ }
  }
};

export const CHAVES = {
  MODO: 'modo',
  LOCAL: 'local',
  WAYPOINTS: 'waypoints',
  TRILHA: 'trilha',
  ROTA_ATIVA: 'rotaAtiva',
  DESTINO: 'destino',
  MODO_USO: 'modoUso',
  CONTEXTO: 'contexto',
  ZONAS: 'zonas',
  ALERTA: 'alerta',
  CONTATOS: 'contatos',
  /* Chaves legadas: mantidas para não quebrar os módulos de cálculo existentes. */
  PECA: 'peca',
  ALVO: 'alvo',
  SISTEMA: 'sistema',
  QUADRO: 'quadro',
  TERRENO: 'terreno',
  AMBIENTE: 'ambiente',
  MIL: 'sistemaMil'
};
