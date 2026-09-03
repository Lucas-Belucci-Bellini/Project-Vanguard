import '../styles/diagnostico.css';
import { h } from '../ui/helpers.js';
import { identidadeDoBuild, rotuloDaVersao } from '../core/versao.js';
import { estado, CHAVES } from '../core/estado.js';
import { CONFIGURACAO_APLICATIVO } from '../core/configuracao.js';
import { desempenhoResumo, diagnosticoResumo, formatarBytes, statusPosicao } from '../core/diagnostico.js';
import { fonteLocalizacao } from '../core/localizacao.js';
import { detectarCapacidades } from '../core/capacidades.js';
import { lerPermissaoGps } from '../platform/permissoes.js';
import { estadoCicloVidaAtual, observarCicloVida } from '../core/ciclo-vida.js';
import { falhasDeTela } from '../core/falhas-tela-app.js';
import { TIPOS_FALHA } from '../core/falhas-tela.js';
import { ROTAS } from '../core/rotas.js';
import { testarRotas, resumirAutoteste, RESULTADO_ROTA } from '../core/autoteste-rotas.js';
import { montarRelatorio } from '../core/relatorio-diagnostico.js';

function plataformaLabel() {
  return navigator.userAgentData?.platform || navigator.platform || 'INDISPONÍVEL';
}

async function armazenamentoLabel() {
  try {
    const estimativa = await navigator.storage?.estimate();
    if (estimativa && Number.isFinite(estimativa.usage) && Number.isFinite(estimativa.quota)) {
      return `${formatarBytes(estimativa.usage)} usados · ${formatarBytes(estimativa.quota)} quota reportada`;
    }
  } catch { /* API indisponível */ }
  return typeof localStorage !== 'undefined' ? 'localStorage disponível · quota indisponível' : 'INDISPONÍVEL';
}

async function cacheStatus() {
  const controlador = navigator.serviceWorker?.controller;
  if (!controlador || typeof MessageChannel === 'undefined') return 'INDISPONÍVEL';
  return new Promise((resolve) => {
    const canal = new MessageChannel();
    const timer = setTimeout(() => resolve('INDISPONÍVEL · tempo esgotado'), 1200);
    canal.port1.onmessage = (event) => {
      clearTimeout(timer);
      const tiles = Number(event.data?.tiles);
      resolve(Number.isFinite(tiles) ? `${tiles} tiles agregados · status informativo` : 'INDISPONÍVEL');
    };
    try {
      controlador.postMessage({ type: 'CACHE_STATUS' }, [canal.port2]);
    } catch {
      clearTimeout(timer);
      resolve('INDISPONÍVEL');
    }
  });
}

async function bateriaAtual() {
  try {
    if (typeof navigator.getBattery !== 'function') return null;
    return await navigator.getBattery();
  } catch {
    return null;
  }
}

/**
 * Três estados, não dois.
 *
 * A versão anterior era binária: tudo que não fosse `ok` virava ATENÇÃO. Com
 * isso "o navegador não expõe o nível de bateria" aparecia com a mesma cara de
 * "algo está errado" — e um diagnóstico que trata desconhecido como problema
 * treina quem lê a ignorá-lo. `INDISPONÍVEL` é uma resposta legítima: o
 * recurso não existe neste ambiente, e não há nada a consertar.
 */
const ROTULO_ESTADO = Object.freeze({ ok: 'OK', atencao: 'ATENÇÃO', indisponivel: 'INDISPONÍVEL' });

/*
 * TELAS — o grupo que responde "essa página não abre no aplicativo".
 *
 * Sem ele, uma falha de carregamento aparecia por um instante na tela e sumia
 * na navegação seguinte: nada sobrava para diagnosticar à distância. Aqui a
 * falha fica, com a rota, a causa classificada e o build em que aconteceu.
 *
 * `CHUNK_NAO_CARREGOU` é o achado importante: significa que o módulo daquela
 * rota não chegou — pacote incompleto ou desatualizado — e é exatamente o que
 * "funciona no site e não no app" parece por dentro.
 */
/*
 * AUTOTESTE — carrega cada rota no aparelho e diz qual falha.
 *
 * É a única medição que alcança a WebView do sistema do operador. Tudo que
 * roda na máquina de quem desenvolve mede outra coisa parecida, não esta.
 */
function itensDoAutoteste(linhas) {
  if (!linhas) {
    return [{
      grupo: 'AUTOTESTE',
      nome: 'Rotas',
      valor: 'não executado — toque em TESTAR TODAS AS ROTAS',
      estado: 'atencao',
    }];
  }
  const resumo = resumirAutoteste(linhas);
  const cabecalho = {
    grupo: 'AUTOTESTE',
    nome: 'Rotas',
    valor: resumo.tudoOk
      ? `${resumo.total} rota(s) carregam neste aparelho`
      : `${resumo.falhas} de ${resumo.total} FALHARAM: ${resumo.rotasComFalha.join(', ')}`,
    estado: resumo.tudoOk ? 'ok' : 'indisponivel',
  };
  // Só as que falharam viram linha própria: treze linhas verdes empurrariam o
  // que importa para fora da tela.
  const falhas = linhas.filter((l) => l.resultado === RESULTADO_ROTA.FALHOU).map((l) => ({
    grupo: 'AUTOTESTE',
    nome: l.hash,
    valor: `${l.tipo} · ${l.mensagem}`,
    estado: 'indisponivel',
  }));
  return [cabecalho, ...falhas];
}

function itensDeFalhaDeTela() {
  const falhas = falhasDeTela.listar();
  if (!falhas.length) {
    return [{
      grupo: 'TELAS',
      nome: 'Falhas de carregamento',
      valor: 'NENHUMA registrada neste aparelho',
      estado: 'ok',
    }];
  }

  const semChunk = falhasDeTela.rotasComChunkFaltando();
  const cabecalho = {
    grupo: 'TELAS',
    nome: 'Falhas de carregamento',
    valor: semChunk.length
      ? `${falhas.length} registrada(s) · ${semChunk.length} rota(s) sem o módulo no pacote`
      : `${falhas.length} registrada(s)`,
    estado: 'atencao',
  };

  const itens = falhas.slice(0, 8).map((falha) => ({
    grupo: 'TELAS',
    nome: `${falha.rota}${falha.vezes > 1 ? ` (${falha.vezes}×)` : ''}`,
    valor: `${falha.tipo === TIPOS_FALHA.CHUNK_NAO_CARREGOU ? 'MÓDULO NÃO CHEGOU' : falha.tipo} · ${falha.mensagem.slice(0, 80)}`,
    // Módulo que não chegou é defeito de pacote, não de tela: pesa mais.
    estado: falha.tipo === TIPOS_FALHA.CHUNK_NAO_CARREGOU ? 'indisponivel' : 'atencao',
  }));

  return [cabecalho, ...itens];
}

export function diagnosticoPage() {
  const raiz = h('div', { className: 'vg-pagina diagnostico' });
  const wrap = h('div', { className: 'diagnostico__wrap' });
  const status = h('p', { className: 'diagnostico__status is-loading', role: 'status' }, 'LENDO ESTADOS LOCAIS…');
  const lista = h('div', { className: 'diagnostico__conteudo' });
  const recarregar = h('button', { className: 'diagnostico__atualizar', type: 'button' }, 'ATUALIZAR DIAGNÓSTICO');
  /*
   * Os dois botões que respondem "essa página não abre no aplicativo" a partir
   * do próprio aparelho: um carrega cada rota e mostra qual falha; o outro põe
   * tudo em texto para o operador colar. Sem eles, o relato depende de memória
   * e perde justo o que decide — o BUILD_ID e a mensagem exata.
   */
  const autotestar = h('button', { className: 'diagnostico__atualizar', type: 'button' }, 'TESTAR TODAS AS ROTAS');
  const copiar = h('button', { className: 'diagnostico__atualizar', type: 'button' }, 'COPIAR RELATÓRIO');
  const acoes = h('div', { className: 'diagnostico__acoes' }, recarregar, autotestar, copiar);
  let removido = false;
  let bateria = null;
  let autoteste = null;

  function render(itens) {
    const grupos = new Map();
    for (const item of itens) {
      if (!grupos.has(item.grupo)) grupos.set(item.grupo, []);
      grupos.get(item.grupo).push(item);
    }
    lista.replaceChildren(...[...grupos].map(([grupo, valores]) => h('section', { className: 'diagnostico__grupo', 'aria-labelledby': `diagnostico-${grupo}` },
      h('h2', { className: 'diagnostico__grupo-titulo', id: `diagnostico-${grupo}` }, grupo),
      h('div', { className: 'diagnostico__lista' }, ...valores.map((item) => h('div', { className: 'diagnostico__linha' },
        h('strong', { className: 'diagnostico__nome' }, item.nome),
        h('span', { className: 'diagnostico__valor' }, item.valor),
        h('span', { className: `diagnostico__estado is-${item.estado}` }, ROTULO_ESTADO[item.estado] ?? item.estado.toUpperCase()))))
    )));
  }

  async function atualizar() {
    if (removido) return;
    recarregar.disabled = true;
    status.className = 'diagnostico__status is-loading';
    status.textContent = 'LENDO ESTADOS LOCAIS…';
    try {
      const posicao = estado.get(CHAVES.LOCAL, null);
      const reg = navigator.serviceWorker ? await navigator.serviceWorker.getRegistration().catch(() => null) : null;
      /*
       * BUILD / RUNTIME — o grupo que responde "o aplicativo instalado é
       * mesmo o desta versão?".
       *
       * Sem isto, descobrir que o aparelho rodava um bundle de quatro
       * versões atrás exigiu baixar o APK publicado e comparar chunks. Agora
       * é comparar o que está na tela com o que está na release.
       */
      const identidade = identidadeDoBuild();
      bateria = await bateriaAtual();
      const dados = diagnosticoResumo({
        versao: `${CONFIGURACAO_APLICATIVO.nome} ${rotuloDaVersao(identidade.versao)}`,
        plataforma: plataformaLabel(),
        rede: navigator.onLine !== false,
        posicao,
        serviceWorker: { controller: Boolean(navigator.serviceWorker?.controller), waiting: Boolean(reg?.waiting) },
        armazenamento: await armazenamentoLabel(),
        bateria,
        bussola: 'BROWSER DEPENDENT',
      });
      const gps = await lerPermissaoGps();
      const capacidades = detectarCapacidades({ gpsPermission: gps });
      const capacidadeItens = capacidades.map((capacidade) => ({
        grupo: 'CAPACIDADES',
        nome: capacidade.nome,
        valor: `${capacidade.estado} · ${capacidade.detalhe}`,
        estado: capacidade.estado === 'AVAILABLE' ? 'ok' : 'atencao',
      }));
      const cache = await cacheStatus();
      const persistencia = estado.statusPersistencia?.() ?? { estado: 'NAO_TESTADO', chave: null, erro: null };
      const persistenciaItem = {
        grupo: 'ARMAZENAMENTO',
        nome: 'Última persistência',
        valor: persistencia.estado === 'PERSISTIDO'
          ? `PERSISTIDO · ${persistencia.chave}`
          : persistencia.estado === 'FALHA'
            ? `FALHA · ${persistencia.erro}`
            : 'NÃO TESTADO',
        estado: persistencia.estado === 'PERSISTIDO' ? 'ok' : 'atencao',
      };
      const swRegistrado = Boolean(reg);
      const buildItens = [
        { grupo: 'BUILD / RUNTIME', nome: 'Versão do app', valor: rotuloDaVersao(identidade.versao), estado: identidade.versao ? 'ok' : 'indisponivel' },
        { grupo: 'BUILD / RUNTIME', nome: 'Bundle web', valor: identidade.build ?? 'INDISPONÍVEL', estado: identidade.build ? 'ok' : 'indisponivel' },
        { grupo: 'BUILD / RUNTIME', nome: 'Commit', valor: identidade.commit ?? 'INDISPONÍVEL', estado: identidade.commit ? 'ok' : 'indisponivel' },
        { grupo: 'BUILD / RUNTIME', nome: 'Execução', valor: identidade.nativo ? `APLICATIVO · ${identidade.plataforma}` : 'NAVEGADOR · web', estado: 'ok' },
        // A origem entra porque foi ela que escondeu o defeito: em
        // `http://localhost` o registro do service worker exigia `https:` e
        // nunca acontecia dentro do aplicativo.
        { grupo: 'BUILD / RUNTIME', nome: 'Origem', valor: identidade.origem ?? 'INDISPONÍVEL', estado: identidade.origem ? 'ok' : 'indisponivel' },
        { grupo: 'BUILD / RUNTIME', nome: 'Contexto seguro', valor: identidade.contextoSeguro ? 'SIM · service worker permitido' : 'NÃO · sem service worker', estado: identidade.contextoSeguro ? 'ok' : 'atencao' },
        { grupo: 'BUILD / RUNTIME', nome: 'Service worker', valor: swRegistrado ? `REGISTRADO${navigator.serviceWorker?.controller ? ' · controlando' : ' · sem controlar ainda'}` : 'NÃO REGISTRADO', estado: swRegistrado ? 'ok' : 'atencao' },
        { grupo: 'BUILD / RUNTIME', nome: 'WebView', valor: identidade.agente ? identidade.agente.slice(0, 96) : 'INDISPONÍVEL', estado: identidade.agente ? 'ok' : 'indisponivel' },
      ];

      const desempenho = desempenhoResumo();
      const gpsItem = dados.find((item) => item.nome === 'GPS/GNSS');
      if (gpsItem) gpsItem.valor = `${gps} · ${statusPosicao(posicao).estado}`;
      const cacheItem = { grupo: 'OFFLINE', nome: 'Tiles em cache', valor: cache, estado: cache.startsWith('INDISPONÍVEL') ? 'indisponivel' : 'ok' };
      const localizacaoItem = { grupo: 'LOCALIZAÇÃO', nome: 'Fonte GPS', valor: fonteLocalizacao(), estado: fonteLocalizacao() === 'INDISPONÍVEL' ? 'indisponivel' : 'ok' };
      const backgroundItem = { grupo: 'MOBILE', nome: 'GPS em background', valor: 'DEVICE DEPENDENT · sem garantia contínua', estado: 'atencao' };
      const ciclo = estadoCicloVidaAtual();
      const cicloItem = { grupo: 'MOBILE', nome: 'Ciclo do app', valor: ciclo.rotulo, estado: ciclo.estado === 'UNAVAILABLE' ? 'indisponivel' : 'ok' };
      const desempenhoItem = { grupo: 'DESEMPENHO', nome: 'Startup DOM', valor: `${desempenho.navegacao} · ${desempenho.fonte}`, estado: desempenho.navegacao === 'INDISPONÍVEL' ? 'indisponivel' : 'ok' };
      const cargaItem = { grupo: 'DESEMPENHO', nome: 'Carga completa', valor: desempenho.carga, estado: desempenho.carga === 'INDISPONÍVEL' ? 'indisponivel' : 'ok' };
      const memoriaItem = { grupo: 'DESEMPENHO', nome: 'Memória JS', valor: desempenho.memoria, estado: desempenho.memoria === 'INDISPONÍVEL' ? 'atencao' : 'ok' };
      render([...buildItens, ...dados, localizacaoItem, ...capacidadeItens, persistenciaItem, backgroundItem, cicloItem, desempenhoItem, cargaItem, memoriaItem, cacheItem, ...itensDoAutoteste(autoteste), ...itensDeFalhaDeTela()]);
      status.className = 'diagnostico__status';
      status.textContent = 'Diagnóstico local atualizado. Nenhum dado foi enviado para um servidor.';
    } catch {
      status.className = 'diagnostico__status';
      status.textContent = 'Não foi possível ler todos os estados locais. Nenhum dado foi enviado.';
    } finally {
      recarregar.disabled = false;
    }
  }

  recarregar.onclick = atualizar;

  /*
   * O autoteste carrega cada rota de verdade. Pode demorar alguns segundos num
   * aparelho lento, então o botão informa o progresso em vez de ficar mudo —
   * um botão que não responde é indistinguível de um que travou.
   */
  autotestar.onclick = async () => {
    autotestar.disabled = true;
    const rotulo = autotestar.textContent;
    try {
      autoteste = await testarRotas(ROTAS, {
        aoProgresso: (feitas, total) => {
          if (!removido) autotestar.textContent = `TESTANDO ${feitas}/${total}…`;
        },
      });
      if (removido) return;
      // `atualizar()` reescreve o status ao terminar, então o resultado do
      // autoteste vem DEPOIS — na ordem inversa a mensagem aparecia e sumia no
      // mesmo instante, e o operador não via o que o teste achou.
      await atualizar();
      if (removido) return;
      const resumo = resumirAutoteste(autoteste);
      status.className = 'diagnostico__status';
      status.textContent = resumo.tudoOk
        ? `Autoteste: as ${resumo.total} rotas carregam neste aparelho.`
        : `Autoteste: ${resumo.falhas} rota(s) FALHARAM — ${resumo.rotasComFalha.join(', ')}. Toque em COPIAR RELATÓRIO e envie o texto.`;
    } finally {
      if (!removido) {
        autotestar.textContent = rotulo;
        autotestar.disabled = false;
      }
    }
  };

  copiar.onclick = async () => {
    const identidade = identidadeDoBuild();
    let sw = 'NÃO REGISTRADO';
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) sw = navigator.serviceWorker?.controller ? 'REGISTRADO · controlando' : 'REGISTRADO · sem controlar ainda';
    } catch { sw = 'INDISPONÍVEL'; }

    const texto = montarRelatorio({
      identidade,
      serviceWorker: sw,
      falhas: falhasDeTela.listar(),
      autoteste,
    });

    // `navigator.clipboard` exige contexto seguro e pode ser negado; o textarea
    // é a saída que sempre existe. Falhar em silêncio aqui deixaria o operador
    // achando que copiou.
    let copiado = false;
    try {
      await navigator.clipboard.writeText(texto);
      copiado = true;
    } catch { copiado = false; }

    status.className = 'diagnostico__status';
    if (copiado) {
      status.textContent = 'Relatório copiado. Cole na conversa — ele não contém coordenada, trilha, foto nem contato.';
    } else {
      status.textContent = 'Não foi possível copiar automaticamente. O texto está abaixo: selecione e copie.';
      const saida = h('textarea', {
        className: 'diagnostico__relatorio',
        readOnly: true,
        rows: 18,
        'aria-label': 'Relatório de diagnóstico para copiar',
      });
      saida.value = texto;
      lista.prepend(saida);
      saida.focus();
      saida.select();
    }
  };
  const removeLocal = estado.on(CHAVES.LOCAL, atualizar);
  const removeCiclo = observarCicloVida({ onState: () => atualizar() });
  const aoConectar = () => atualizar();
  addEventListener('online', aoConectar);
  addEventListener('offline', aoConectar);
  raiz.append(wrap);
  wrap.append(
    h('header', { className: 'diagnostico__header' },
      h('div', null,
        h('div', { className: 'diagnostico__eyebrow' }, 'DIAGNÓSTICO LOCAL'),
        h('h1', null, 'Estado observável'),
        h('p', { className: 'diagnostico__intro' }, 'Conferência local de versão, rede, GPS, frescor, cache, armazenamento, bateria, lifecycle, performance, sensores e capacidades de compartilhamento. Este painel não envia telemetria e não prova cobertura, comunicação ou resgate.')
      ),
      acoes
    ),
    status,
    lista,
    h('p', { className: 'diagnostico__rodape' }, 'Estados como INDISPONÍVEL, BROWSER DEPENDENT e DEVICE DEPENDENT são resultados honestos de capacidade; não são falhas silenciosas nem garantias de funcionamento em segundo plano.')
  );
  atualizar();

  return {
    elemento: raiz,
    desmontar() {
      removido = true;
      removeLocal();
      removeCiclo();
      removeEventListener('online', aoConectar);
      removeEventListener('offline', aoConectar);
      if (bateria) {
        /* Os listeners de bateria são evitados; o dado é lido somente sob demanda. */
        bateria = null;
      }
    },
  };
}
