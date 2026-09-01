/**
 * Aviso persistente com o quanto se andou hoje, legível na tela bloqueada.
 *
 * ## Por que uma notificação SEPARADA da do serviço de fundo
 *
 * O rastreamento em segundo plano já mostra uma notificação — é ela que mantém
 * o serviço vivo no Android. Mas o `@capgo/background-geolocation` **não expõe
 * nenhum método para trocar o texto dela depois de iniciada**: `backgroundTitle`
 * e `backgroundMessage` são fixados no `start()`, e a API só tem `start`,
 * `stop`, `updateHeaders` e as funções de geofence. Reiniciar o serviço a cada
 * atualização de número interromperia o rastreamento — trocar registro de
 * trilha por texto bonito seria péssimo negócio numa peregrinação.
 *
 * Por isso os números vão numa notificação própria, atualizada no lugar sempre
 * com o **mesmo id**: o Android substitui o conteúdo em vez de empilhar avisos.
 *
 * ## Ritmo de atualização
 *
 * A cada 60 s, ou quando a distância mudar o suficiente para o texto mudar.
 * Reescrever a cada fixo faria a notificação piscar e gastaria bateria à toa.
 */

import { resumoDoDia } from './trilha.js';

export const ESTADOS_AVISO = Object.freeze({
  PARADO: 'PARADO',
  INDISPONIVEL: 'INDISPONIVEL',
  NEGADO: 'NEGADO',
  ATIVO: 'ATIVO',
});

/** Id fixo: é ele que faz o Android substituir em vez de empilhar. */
export const ID_NOTIFICACAO = 4201;

function metrosLabel(metros) {
  if (!Number.isFinite(metros) || metros < 0) return '—';
  return metros >= 1000 ? `${(metros / 1000).toFixed(2)} km` : `${Math.round(metros)} m`;
}

/**
 * Texto do aviso. Função pura, para o formato ser testável sem plugin.
 *
 * Diz explicitamente quando a caminhada parou: um número que continua na tela
 * enquanto a pessoa está sentada há uma hora induz a erro sobre o próprio
 * esforço do dia.
 */
export function textoDoAviso(resumo, { passos = null, passosCalibrados = false } = {}) {
  const partes = [`${metrosLabel(resumo.distanciaM)} hoje`, resumo.duracaoLabel];
  if (Number.isFinite(resumo.ganhoElevacaoM) && resumo.ganhoElevacaoM >= 10) {
    partes.push(`+${Math.round(resumo.ganhoElevacaoM)} m de subida`);
  }
  if (Number.isFinite(passos) && passos > 0) {
    partes.push(`${passos} passos${passosCalibrados ? '' : ' (estimativa)'}`);
  }
  return {
    titulo: resumo.emMovimento ? 'Vanguard · em marcha' : 'Vanguard · parado',
    corpo: partes.join(' · '),
  };
}

export function criarAvisoDaJornada({
  plugin = null,
  pluginLoader = async () => (await import('@capacitor/local-notifications')).LocalNotifications,
  capacitorApi = globalThis.Capacitor,
  agora = () => Date.now(),
  intervaloMinimoMs = 60_000,
  aoEstado = () => {},
} = {}) {
  let api = plugin;
  let estado = ESTADOS_AVISO.PARADO;
  let ultimoEnvioEm = 0;
  let ultimoTexto = null;

  function nativo() {
    try { return capacitorApi?.isNativePlatform?.() === true; } catch { return false; }
  }

  function mudar(novo) {
    estado = novo;
    aoEstado({ estado: novo });
  }

  async function carregar() {
    if (api) return api;
    api = await pluginLoader();
    if (!api || typeof api.schedule !== 'function') throw new Error('Plugin de notificação indisponível.');
    return api;
  }

  return {
    estado: () => estado,

    async iniciar() {
      if (!nativo()) { mudar(ESTADOS_AVISO.INDISPONIVEL); return estado; }
      try {
        const plug = await carregar();
        // Android 13+ exige POST_NOTIFICATIONS; sem ela o aviso não aparece e
        // é melhor dizer isso do que ficar publicando no vazio.
        const permissao = await plug.requestPermissions?.();
        if (permissao && permissao.display !== 'granted') { mudar(ESTADOS_AVISO.NEGADO); return estado; }
        mudar(ESTADOS_AVISO.ATIVO);
      } catch {
        mudar(ESTADOS_AVISO.INDISPONIVEL);
      }
      return estado;
    },

    /**
     * Publica ou atualiza o aviso. Só escreve quando o texto muda ou quando o
     * intervalo mínimo passou — piscar a notificação a cada fixo gasta bateria
     * e não acrescenta informação.
     */
    async atualizar(trilha, extras = {}) {
      if (estado !== ESTADOS_AVISO.ATIVO) return { publicado: false, motivo: estado };
      const instante = agora();
      const resumo = resumoDoDia(trilha, instante);
      const texto = textoDoAviso(resumo, extras);
      const assinatura = `${texto.titulo}|${texto.corpo}`;
      if (assinatura === ultimoTexto && instante - ultimoEnvioEm < intervaloMinimoMs) {
        return { publicado: false, motivo: 'SEM_MUDANCA', texto };
      }
      try {
        await api.schedule({
          notifications: [{
            id: ID_NOTIFICACAO,
            title: texto.titulo,
            body: texto.corpo,
            // Persistente e silenciosa: ela existe para ser LIDA na tela
            // bloqueada, não para interromper quem está andando.
            ongoing: true,
            autoCancel: false,
            silent: true,
          }],
        });
        ultimoTexto = assinatura;
        ultimoEnvioEm = instante;
        return { publicado: true, texto, resumo };
      } catch (erro) {
        return { publicado: false, motivo: 'FALHOU', erro: erro?.message ?? null };
      }
    },

    async encerrar() {
      if (api?.cancel) {
        try { await api.cancel({ notifications: [{ id: ID_NOTIFICACAO }] }); } catch { /* já removida */ }
      }
      ultimoTexto = null;
      ultimoEnvioEm = 0;
      if (estado !== ESTADOS_AVISO.PARADO) mudar(ESTADOS_AVISO.PARADO);
      return estado;
    },
  };
}
