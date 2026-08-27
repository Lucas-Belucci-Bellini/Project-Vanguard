import '../styles/diagnostico.css';
import { h } from '../ui/helpers.js';
import { estado, CHAVES } from '../core/estado.js';
import { VERSAO_ATUAL } from '../core/atualizacao.js';
import { desempenhoResumo, diagnosticoResumo, formatarBytes, statusPosicao } from '../core/diagnostico.js';
import { fonteLocalizacao } from '../core/localizacao.js';
import { detectarCapacidades } from '../core/capacidades.js';
import { lerPermissaoGps } from '../platform/permissoes.js';
import { estadoCicloVidaAtual, observarCicloVida } from '../core/ciclo-vida.js';

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

export function diagnosticoPage() {
  const raiz = h('div', { className: 'vg-pagina diagnostico' });
  const wrap = h('div', { className: 'diagnostico__wrap' });
  const status = h('p', { className: 'diagnostico__status is-loading', role: 'status' }, 'LENDO ESTADOS LOCAIS…');
  const lista = h('div', { className: 'diagnostico__conteudo' });
  const recarregar = h('button', { className: 'diagnostico__atualizar', type: 'button' }, 'ATUALIZAR DIAGNÓSTICO');
  let removido = false;
  let bateria = null;

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
        h('span', { className: `diagnostico__estado is-${item.estado}` }, item.estado === 'ok' ? 'OK' : 'ATENÇÃO'))))
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
      bateria = await bateriaAtual();
      const dados = diagnosticoResumo({
        versao: `Vanguard Field ${VERSAO_ATUAL}`,
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
      const desempenho = desempenhoResumo();
      const gpsItem = dados.find((item) => item.nome === 'GPS/GNSS');
      if (gpsItem) gpsItem.valor = `${gps} · ${statusPosicao(posicao).estado}`;
      const cacheItem = { grupo: 'OFFLINE', nome: 'Tiles em cache', valor: cache, estado: cache.startsWith('INDISPONÍVEL') ? 'atencao' : 'ok' };
      const localizacaoItem = { grupo: 'LOCALIZAÇÃO', nome: 'Fonte GPS', valor: fonteLocalizacao(), estado: fonteLocalizacao() === 'INDISPONÍVEL' ? 'atencao' : 'ok' };
      const backgroundItem = { grupo: 'MOBILE', nome: 'GPS em background', valor: 'DEVICE DEPENDENT · sem garantia contínua', estado: 'atencao' };
      const ciclo = estadoCicloVidaAtual();
      const cicloItem = { grupo: 'MOBILE', nome: 'Ciclo do app', valor: ciclo.rotulo, estado: ciclo.estado === 'UNAVAILABLE' ? 'atencao' : 'ok' };
      const desempenhoItem = { grupo: 'DESEMPENHO', nome: 'Startup DOM', valor: `${desempenho.navegacao} · ${desempenho.fonte}`, estado: desempenho.navegacao === 'INDISPONÍVEL' ? 'atencao' : 'ok' };
      const cargaItem = { grupo: 'DESEMPENHO', nome: 'Carga completa', valor: desempenho.carga, estado: desempenho.carga === 'INDISPONÍVEL' ? 'atencao' : 'ok' };
      const memoriaItem = { grupo: 'DESEMPENHO', nome: 'Memória JS', valor: desempenho.memoria, estado: desempenho.memoria === 'INDISPONÍVEL' ? 'atencao' : 'ok' };
      render([...dados, localizacaoItem, ...capacidadeItens, persistenciaItem, backgroundItem, cicloItem, desempenhoItem, cargaItem, memoriaItem, cacheItem]);
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
  const removeLocal = estado.on(CHAVES.LOCAL, atualizar);
  const removeCiclo = observarCicloVida({ onState: () => atualizar() });
  const aoConectar = () => atualizar();
  addEventListener('online', aoConectar);
  addEventListener('offline', aoConectar);
  raiz.append(wrap);
  wrap.append(
    h('header', { className: 'diagnostico__header' },
      h('div', null,
        h('div', { className: 'diagnostico__eyebrow' }, 'VANGUARD FIELD / DIAGNÓSTICO LOCAL'),
        h('h1', null, 'Estado observável'),
        h('p', { className: 'diagnostico__intro' }, 'Conferência local de versão, rede, GPS, frescor, cache, armazenamento, bateria, lifecycle, performance, sensores e capacidades de compartilhamento. Este painel não envia telemetria e não prova cobertura, comunicação ou resgate.')
      ),
      recarregar
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
