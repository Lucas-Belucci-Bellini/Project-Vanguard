/**
 * Estado compartilhado entre as telas, persistido no localStorage.
 *
 * O dispositivo permanece como fonte padrão dos dados de localização. A posição
 * só deve ser compartilhada quando a pessoa confirmar uma missão de emergência.
 * Os valores são envelopes versionados para permitir migração sem apagar dados
 * antigos silenciosamente.
 */

const PREFIXO = 'vanguard:';
const CHAVE_META = '__meta';

export const ESQUEMA_ESTADO = 'vanguard-state';
export const VERSAO_ESTADO = 1;

function envelope(valor) {
  return {
    schema: ESQUEMA_ESTADO,
    version: VERSAO_ESTADO,
    value: valor,
  };
}

function eEnvelopeAtual(valor) {
  return Boolean(
    valor &&
      typeof valor === 'object' &&
      !Array.isArray(valor) &&
      valor.schema === ESQUEMA_ESTADO &&
      valor.version === VERSAO_ESTADO &&
      Object.prototype.hasOwnProperty.call(valor, 'version') &&
      Object.prototype.hasOwnProperty.call(valor, 'value')
  );
}

function eEnvelopeFuturo(valor) {
  return Boolean(
    valor &&
      typeof valor === 'object' &&
      !Array.isArray(valor) &&
      valor.schema === ESQUEMA_ESTADO &&
      Number.isInteger(valor.version) &&
      valor.version > VERSAO_ESTADO &&
      Object.prototype.hasOwnProperty.call(valor, 'value')
  );
}

function escreverBruto(chave, valor) {
  try {
    localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

function ler(chave, padrao) {
  try {
    const bruto = localStorage.getItem(PREFIXO + chave);
    if (bruto == null) return padrao;
    const valor = JSON.parse(bruto);
    if (eEnvelopeAtual(valor)) return valor.value;
    if (eEnvelopeFuturo(valor)) return padrao;

    // Migração preguiçosa: dados gravados antes do envelope continuam legíveis
    // e são regravados no formato atual somente quando forem acessados.
    escreverBruto(chave, envelope(valor));
    return valor;
  } catch {
    return padrao;
  }
}

function escrever(chave, valor) {
  return escreverBruto(chave, envelope(valor));
}

function garantirMetadados() {
  try {
    const bruto = localStorage.getItem(PREFIXO + CHAVE_META);
    if (bruto == null) {
      escreverBruto(CHAVE_META, {
        schema: ESQUEMA_ESTADO,
        version: VERSAO_ESTADO,
        criadoEm: new Date().toISOString(),
      });
      return;
    }
    const valor = JSON.parse(bruto);
    if (valor?.schema === ESQUEMA_ESTADO && valor?.version === VERSAO_ESTADO) return;
    if (valor?.schema === ESQUEMA_ESTADO && Number(valor?.version) > VERSAO_ESTADO) return;
    escreverBruto(CHAVE_META, {
      schema: ESQUEMA_ESTADO,
      version: VERSAO_ESTADO,
      migradoEm: new Date().toISOString(),
    });
  } catch {
    // A aplicação segue disponível mesmo quando o armazenamento está cheio ou bloqueado.
  }
}

garantirMetadados();

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
  },
  limparTudo() {
    try {
      const chaves = new Set();
      if (typeof localStorage.length === 'number' && typeof localStorage.key === 'function') {
        for (let indice = 0; indice < localStorage.length; indice += 1) {
          const chave = localStorage.key(indice);
          if (chave?.startsWith(PREFIXO)) chaves.add(chave);
        }
      }
      Object.keys(localStorage)
        .filter((chave) => chave.startsWith(PREFIXO))
        .forEach((chave) => chaves.add(chave));
      chaves.forEach((chave) => localStorage.removeItem(chave));
      return true;
    } catch {
      return false;
    }
  },
  diagnostico() {
    return {
      schema: ESQUEMA_ESTADO,
      version: VERSAO_ESTADO,
      prefixo: PREFIXO,
    };
  },
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
  MAPAS_OFFLINE: 'mapasOffline',
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
