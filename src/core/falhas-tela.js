/**
 * Registro das falhas de carregamento de tela.
 *
 * ## Por que isto existe
 *
 * O router já mostrava um aviso quando uma tela falhava — e **esquecia**.
 * A mensagem sumia na próxima navegação, não chegava ao diagnóstico, e o
 * operador em campo não tinha como dizer mais do que "essa página não abre no
 * aplicativo". Do lado de cá, isso é indistinguível de dez causas diferentes.
 *
 * Guardar a falha transforma um relato em evidência: qual rota, qual erro, em
 * qual build, quantas vezes. É o que permite responder "o chunk não chegou no
 * pacote" em vez de "vou tentar reproduzir".
 *
 * ## A classificação é o ponto
 *
 * Distinguir **o módulo não chegou** de **o módulo rodou e quebrou** é a
 * diferença entre um defeito de empacotamento e um defeito de página — e é
 * exatamente a pergunta de "funciona no site e não no app":
 *
 * - `CHUNK_NAO_CARREGOU` — o `import()` dinâmico não trouxe o arquivo. O chunk
 *   não está no pacote, ou a origem da WebView não consegue servi-lo. **Este é
 *   o sintoma de paridade quebrada.**
 * - `TELA_FALHOU` — o módulo chegou e executou, mas lançou. O empacotamento
 *   está certo; o defeito é da página (ou de uma API que a plataforma não tem).
 * - `DESCONHECIDO` — não deu para separar. Nunca chutar para um dos outros
 *   dois: um palpete errado aqui manda o diagnóstico para o lado oposto.
 *
 * O módulo é puro e sem DOM de propósito: recebe armazenamento e relógio, para
 * poder ser testado sem navegador.
 */

export const TIPOS_FALHA = Object.freeze({
  CHUNK_NAO_CARREGOU: 'CHUNK_NAO_CARREGOU',
  TELA_FALHOU: 'TELA_FALHOU',
  DESCONHECIDO: 'DESCONHECIDO',
});

export const CHAVE_FALHAS = 'vanguard:falhas-tela';
const LIMITE_PADRAO = 20;

/*
 * As mensagens de falha de import dinâmico não são padronizadas — cada motor
 * escreve a sua. Estas são as formas reais dos três motores que importam aqui;
 * o Android usa Chromium e o iOS usa WebKit, então as duas primeiras famílias
 * cobrem o aplicativo nas duas plataformas.
 */
const MARCAS_DE_CHUNK = [
  'failed to fetch dynamically imported module',   // Chromium (Android WebView)
  'error loading dynamically imported module',     // Firefox
  'importing a module script failed',              // WebKit (iOS WKWebView)
  'unable to preload css',                         // Vite: CSS do chunk não veio
  'dynamically imported module',                   // rede de segurança
];

/** Classifica a falha sem chutar: o que não casa vira DESCONHECIDO. */
export function classificarFalha(erro) {
  const mensagem = String(erro?.message ?? erro ?? '').toLowerCase();
  if (!mensagem) return TIPOS_FALHA.DESCONHECIDO;
  if (MARCAS_DE_CHUNK.some((marca) => mensagem.includes(marca))) {
    return TIPOS_FALHA.CHUNK_NAO_CARREGOU;
  }
  // Um erro que chegou com pilha de execução veio de dentro da tela: o módulo
  // carregou. Sem pilha e sem marca de chunk, não dá para afirmar nada.
  if (erro instanceof Error && erro.stack) return TIPOS_FALHA.TELA_FALHOU;
  return TIPOS_FALHA.DESCONHECIDO;
}

/**
 * Cria o registro. `armazenamento` segue a interface do `localStorage`
 * (`getItem`/`setItem`/`removeItem`) e pode ser nulo — sem ele o registro
 * funciona só em memória, que é o comportamento certo numa janela anônima.
 */
export function criarRegistroDeFalhas({
  armazenamento = null,
  agora = () => Date.now(),
  limite = LIMITE_PADRAO,
  build = null,
} = {}) {
  let emMemoria = ler();

  function ler() {
    if (!armazenamento) return [];
    try {
      const cru = armazenamento.getItem(CHAVE_FALHAS);
      if (!cru) return [];
      const lido = JSON.parse(cru);
      return Array.isArray(lido) ? lido.filter((f) => f && typeof f.rota === 'string') : [];
    } catch {
      // Dado corrompido não pode derrubar o app nem apagar o resto do estado:
      // o registro volta vazio e segue gravando.
      return [];
    }
  }

  function gravar(lista) {
    emMemoria = lista;
    if (!armazenamento) return;
    try {
      armazenamento.setItem(CHAVE_FALHAS, JSON.stringify(lista));
    } catch {
      /* Cota cheia ou storage bloqueado: a memória continua valendo. */
    }
  }

  return {
    /** Registra uma falha. Repetição da mesma rota+tipo vira contagem, não entrada nova. */
    registrar(rota, erro) {
      const tipo = classificarFalha(erro);
      const mensagem = String(erro?.message ?? erro ?? 'erro sem mensagem').slice(0, 300);
      const lista = [...emMemoria];
      const existente = lista.findIndex((f) => f.rota === rota && f.tipo === tipo && f.mensagem === mensagem);
      if (existente >= 0) {
        lista[existente] = { ...lista[existente], vezes: (lista[existente].vezes ?? 1) + 1, quando: agora() };
      } else {
        lista.unshift({ rota, tipo, mensagem, vezes: 1, quando: agora(), build });
      }
      gravar(lista.slice(0, limite));
      return { rota, tipo, mensagem };
    },

    /** Todas as falhas, mais recente primeiro. */
    listar() {
      return [...emMemoria];
    },

    /** Quantas rotas distintas falharam por não conseguir carregar o módulo. */
    rotasComChunkFaltando() {
      return [...new Set(emMemoria
        .filter((f) => f.tipo === TIPOS_FALHA.CHUNK_NAO_CARREGOU)
        .map((f) => f.rota))];
    },

    limpar() {
      gravar([]);
    },
  };
}
