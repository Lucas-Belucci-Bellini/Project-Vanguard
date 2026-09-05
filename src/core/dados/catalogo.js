/**
 * O catálogo do que o Vanguard guarda no aparelho.
 *
 * ## Por que isto existe antes de qualquer código de migração
 *
 * A regra que governa a V3 é "migrate, never destroy". Só que não se preserva o
 * que não se sabe que existe: hoje os dados do operador estão espalhados por
 * cinco lugares (localStorage com 24 chaves e três bancos IndexedDB), e a única
 * descrição disso era o código que os escreve — cada um num arquivo diferente.
 *
 * Este arquivo é a **declaração única**: o que existe, quem escreve, para que
 * serve, e — o campo que decide tudo — o que acontece se sumir.
 *
 * ## O campo que importa é `classe`
 *
 * `CACHE` se reconstrói sozinho; `CRITICO` é trabalho do operador que não volta
 * nunca. Tratar os dois igual é como o dado se perde. E existe uma quinta
 * classe que não se declara aqui: `DESCONHECIDO`, atribuída em tempo de
 * execução (`inventario.js`) a toda chave encontrada no aparelho que **não**
 * está neste catálogo. Chave desconhecida nunca é apagada — ela é justamente a
 * que veio de uma versão que ninguém lembra, ou de um recurso removido cujo
 * dado ficou.
 *
 * Módulo puro: declaração, sem DOM e sem I/O.
 */

/** O que a perda de cada dado custa ao operador. */
export const CLASSES_DADO = Object.freeze({
  /** Trabalho do operador. Some e não volta. Nunca apagar, nunca truncar. */
  CRITICO: 'CRITICO',
  /** Configuração e contexto. Refazer é chato, mas é possível. */
  IMPORTANTE: 'IMPORTANTE',
  /** Calculado a partir de outro dado; pode ser recomputado. */
  DERIVADO: 'DERIVADO',
  /** Reconstrói sozinho a partir da rede. Pode ser descartado sem perda. */
  CACHE: 'CACHE',
  /** Vive dentro de uma operação; não sobrevive a ela de propósito. */
  TEMPORARIO: 'TEMPORARIO',
  /** Encontrado no aparelho e ausente do catálogo. **Nunca apagar.** */
  DESCONHECIDO: 'DESCONHECIDO',
});

/** Onde o dado mora. */
export const BACKENDS = Object.freeze({
  LOCAL_STORAGE: 'LOCAL_STORAGE',
  INDEXED_DB: 'INDEXED_DB',
  CACHE_STORAGE: 'CACHE_STORAGE',
});

/** Prefixo de toda chave do Vanguard no localStorage (ver core/estado.js). */
export const PREFIXO_LOCAL_STORAGE = 'vanguard:';

/**
 * As chaves do localStorage, uma a uma.
 *
 * `versaoEsquema: null` é uma afirmação, não um esquecimento: a chave **não
 * declara versão hoje**, e por isso uma mudança de formato cairia no fallback
 * em silêncio. É o que a V3 conserta — de forma aditiva, sem apagar o valor v1.
 */
export const CHAVES_LOCAIS = Object.freeze([
  {
    chave: 'trilha',
    titulo: 'Trilha gravada',
    classe: CLASSES_DADO.CRITICO,
    formato: 'array de pontos {lat, lon, timestamp, accuracy, altitude, speed, modo}',
    escritoPor: 'src/pages/mapa.js (registrarPosicao)',
    versaoEsquema: null,
    contavel: true,
    observacao: 'O caminho que a pessoa andou. É o dado mais caro do aplicativo e o único que nenhuma outra fonte pode reconstruir.',
  },
  {
    chave: 'waypoints',
    titulo: 'Pontos marcados',
    classe: CLASSES_DADO.CRITICO,
    formato: 'array de {id, nome, lat, lon}',
    escritoPor: 'src/pages/mapa.js',
    versaoEsquema: null,
    contavel: true,
    observacao: 'Marcações feitas à mão em campo.',
  },
  {
    chave: 'trajeto',
    titulo: 'Trajeto e paradas',
    classe: CLASSES_DADO.CRITICO,
    formato: 'objeto vanguard-trajeto v1 com paradas',
    escritoPor: 'src/core/trajeto.js',
    versaoEsquema: 1,
    contavel: false,
    observacao: 'A única chave que já declara esquema e versão.',
  },
  {
    chave: 'destino',
    titulo: 'Destino ativo',
    classe: CLASSES_DADO.IMPORTANTE,
    formato: '{lat, lon, nome}',
    escritoPor: 'src/pages/mapa.js, src/pages/navegacao.js',
    versaoEsquema: null,
    contavel: false,
  },
  {
    chave: 'contatos',
    titulo: 'Contatos de emergência',
    classe: CLASSES_DADO.CRITICO,
    formato: 'array de contatos',
    escritoPor: 'src/pages/socorro.js',
    versaoEsquema: null,
    contavel: true,
    observacao: 'Digitado pelo operador para uso em emergência. Perder isso é perder o pedido de socorro.',
  },
  {
    chave: 'zonas',
    titulo: 'Zonas de contexto',
    classe: CLASSES_DADO.IMPORTANTE,
    formato: 'array de zonas importadas',
    escritoPor: 'src/pages/contexto.js',
    versaoEsquema: null,
    contavel: true,
    observacao: 'Já houve defeito de apagar zona vencida ao regravar lista filtrada; ver CLAUDE.md.',
  },
  {
    chave: 'passos',
    titulo: 'Calibração de passada',
    classe: CLASSES_DADO.IMPORTANTE,
    formato: '{comprimentoM, calibrada, amostras}',
    escritoPor: 'src/core/passos-sensor.js',
    versaoEsquema: null,
    contavel: false,
    observacao: 'Aprendida ao longo de caminhadas reais; refazer custa horas de campo.',
  },
  {
    chave: 'bussola',
    titulo: 'Correção da bússola',
    classe: CLASSES_DADO.IMPORTANTE,
    formato: '{correcaoSensorDeg, fonteCorrecao, usarModeloMagnetico, rumoTravadoDeg}',
    escritoPor: 'src/pages/bussola.js',
    versaoEsquema: null,
    contavel: false,
    observacao: 'A correção medida contra o Sol é uma medição de campo; não se refaz à noite.',
  },
  { chave: 'rotaAtiva', titulo: 'Gravação ativa', classe: CLASSES_DADO.DERIVADO, formato: 'boolean', escritoPor: 'src/pages/mapa.js', versaoEsquema: null, contavel: false },
  { chave: 'rotaPausada', titulo: 'Gravação pausada', classe: CLASSES_DADO.DERIVADO, formato: 'boolean', escritoPor: 'src/pages/mapa.js', versaoEsquema: null, contavel: false },
  { chave: 'local', titulo: 'Último fixo conhecido', classe: CLASSES_DADO.DERIVADO, formato: 'posição normalizada', escritoPor: 'src/core/localizacao.js', versaoEsquema: null, contavel: false },
  { chave: 'modo', titulo: 'Modo de tela', classe: CLASSES_DADO.IMPORTANTE, formato: "'tatico' | 'noite' | 'dia'", escritoPor: 'src/main.js', versaoEsquema: null, contavel: false },
  { chave: 'modoUso', titulo: 'Modo de uso', classe: CLASSES_DADO.IMPORTANTE, formato: 'string', escritoPor: 'src/pages/inicio.js', versaoEsquema: null, contavel: false },
  { chave: 'contexto', titulo: 'Contexto declarado', classe: CLASSES_DADO.IMPORTANTE, formato: 'objeto', escritoPor: 'src/pages/contexto.js', versaoEsquema: null, contavel: false },
  { chave: 'alerta', titulo: 'Preferências de alerta', classe: CLASSES_DADO.IMPORTANTE, formato: 'objeto', escritoPor: 'src/core/alertas-tateis.js', versaoEsquema: null, contavel: false },
  { chave: 'escuta', titulo: 'Preferências da escuta', classe: CLASSES_DADO.IMPORTANTE, formato: 'objeto', escritoPor: 'src/pages/escuta.js', versaoEsquema: null, contavel: false },
  { chave: 'noturno', titulo: 'Preferências da visão noturna', classe: CLASSES_DADO.IMPORTANTE, formato: 'objeto', escritoPor: 'src/pages/noturno.js', versaoEsquema: null, contavel: false },
  { chave: 'mapasOffline', titulo: 'Metadados de mapa offline', classe: CLASSES_DADO.DERIVADO, formato: 'objeto', escritoPor: 'src/core/mapa-offline.js', versaoEsquema: null, contavel: false, observacao: 'Descreve o cache de tiles; os tiles em si são CACHE.' },
  /* Legado da wiki de Arma 3 — fora do fluxo do Vanguard Field, e preservado
   * justamente por isso: é dado do operador numa ferramenta que ele ainda usa. */
  { chave: 'peca', titulo: 'Legado: peça', classe: CLASSES_DADO.IMPORTANTE, formato: 'objeto', escritoPor: 'src/pages/tiro.js', versaoEsquema: null, contavel: false, legado: true },
  { chave: 'alvo', titulo: 'Legado: alvo', classe: CLASSES_DADO.IMPORTANTE, formato: 'objeto', escritoPor: 'src/pages/tiro.js', versaoEsquema: null, contavel: false, legado: true },
  { chave: 'sistema', titulo: 'Legado: sistema', classe: CLASSES_DADO.IMPORTANTE, formato: 'string', escritoPor: 'src/pages/tiro.js', versaoEsquema: null, contavel: false, legado: true },
  { chave: 'quadro', titulo: 'Legado: quadro', classe: CLASSES_DADO.IMPORTANTE, formato: 'objeto', escritoPor: 'src/pages/tiro.js', versaoEsquema: null, contavel: false, legado: true },
  { chave: 'terreno', titulo: 'Legado: terreno', classe: CLASSES_DADO.IMPORTANTE, formato: 'string', escritoPor: 'src/pages/tiro.js', versaoEsquema: null, contavel: false, legado: true },
  { chave: 'ambiente', titulo: 'Legado: ambiente', classe: CLASSES_DADO.IMPORTANTE, formato: 'objeto', escritoPor: 'src/pages/tiro.js', versaoEsquema: null, contavel: false, legado: true },
  { chave: 'sistemaMil', titulo: 'Legado: sistema de mils', classe: CLASSES_DADO.IMPORTANTE, formato: 'string', escritoPor: 'src/pages/tiro.js', versaoEsquema: null, contavel: false, legado: true },
].map(Object.freeze));

/** Os bancos IndexedDB, com store e o que cada um guarda. */
export const BANCOS_INDEXED_DB = Object.freeze([
  {
    banco: 'vanguard-fotos-parada',
    versao: 1,
    stores: ['metadados', 'imagens'],
    titulo: 'Fotos de parada',
    classe: CLASSES_DADO.CRITICO,
    escritoPor: 'src/core/foto-storage.js',
    observacao: 'Foto amarrada à coordenada da captura (ADR-0037). A imagem só existe aqui.',
  },
  {
    banco: 'vanguard-dataset-package',
    versao: 1,
    stores: ['packages'],
    titulo: 'Pacotes de dataset baixados',
    classe: CLASSES_DADO.CACHE,
    escritoPor: 'src/core/dataset-package-storage.js',
    observacao: 'Rebaixável da rede; grande. É cache caro, não trabalho do operador.',
  },
  {
    banco: 'vanguard-dataset-download',
    versao: 1,
    stores: ['checkpoints'],
    titulo: 'Retomada de download',
    classe: CLASSES_DADO.TEMPORARIO,
    escritoPor: 'src/core/dataset-download-checkpoint-storage.js',
    observacao: 'Existe para retomar um download interrompido; morre com ele.',
  },
].map(Object.freeze));

/** Os caches do service worker. Reconstroem-se; nunca guardam dado do operador. */
export const CACHES_SERVICE_WORKER = Object.freeze([
  { prefixo: 'vanguard-field-shell', titulo: 'Shell do aplicativo', classe: CLASSES_DADO.CACHE, escritoPor: 'public/sw.js' },
  { prefixo: 'vanguard-field-tiles', titulo: 'Tiles de mapa', classe: CLASSES_DADO.CACHE, escritoPor: 'public/sw.js' },
].map(Object.freeze));

/** Índice por chave, para o inventário decidir rápido se algo é conhecido. */
const PORNOME = new Map(CHAVES_LOCAIS.map((entrada) => [entrada.chave, entrada]));

/** A declaração desta chave, ou `null` quando ela não está no catálogo. */
export function descreverChaveLocal(chave) {
  return PORNOME.get(String(chave ?? '')) ?? null;
}

/** Toda chave cuja perda é irreversível. É a lista que o backup precisa cobrir. */
export function chavesCriticas() {
  return CHAVES_LOCAIS.filter((entrada) => entrada.classe === CLASSES_DADO.CRITICO);
}

/** Verdadeiro quando a classe indica dado que pode ser descartado sem perda. */
export function descartavel(classe) {
  return classe === CLASSES_DADO.CACHE || classe === CLASSES_DADO.TEMPORARIO;
}
