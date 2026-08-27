import '../styles/socorro.css';
import { h, empty, num } from '../ui/helpers.js';
import { estado, CHAVES } from '../core/estado.js';
import { solicitarPosicao, precisaoLabel } from '../core/localizacao.js';
import { latLonParaMGRS } from '../engine/mgrs.js';
import { prepararMensagemExterna } from '../core/equipamentos.js';

function coordenadasDa(posicao) {
  if (!posicao) return null;
  let mgrs = 'MGRS indisponível';
  try { mgrs = latLonParaMGRS(posicao.lat, posicao.lon, 5, true); } catch { /* região sem UTM */ }
  return { mgrs, latlon: `${num(posicao.lat, 6)}, ${num(posicao.lon, 6)}` };
}

function textoCoordenadas(posicao) {
  const coords = coordenadasDa(posicao);
  if (!coords) return 'Localização ainda não obtida.';
  return `VANGUARD FIELD\nMGRS: ${coords.mgrs}\nLAT/LON: ${coords.latlon}\nPRECISÃO: ${precisaoLabel(posicao.accuracy)}\nHORÁRIO: ${new Date(posicao.timestamp).toISOString()}`;
}

export function socorroPage() {
  const raiz = h('div', { className: 'vg-pagina socorro' });
  let posicao = estado.get(CHAVES.LOCAL, null);
  let alerta = estado.get(CHAVES.ALERTA, null);

  const localValue = h('strong', { className: 'socorro__location-value' });
  const localMeta = h('span', { className: 'socorro__location-meta' });
  const localAction = h('button', { className: 'socorro__outline-button', type: 'button' }, 'ATUALIZAR GPS');
  const feedback = h('p', { className: 'socorro__feedback', role: 'status' }, 'O alerta só é preparado no aparelho até você escolher como compartilhar.');
  const alertaArea = h('div', { className: 'socorro__alert-area' });

  function atualizarLocal(pos) {
    posicao = pos;
    const coords = coordenadasDa(pos);
    empty(localValue).append(coords ? coords.mgrs : 'LOCALIZAÇÃO PENDENTE');
    localMeta.textContent = coords
      ? `${coords.latlon} · ${precisaoLabel(pos.accuracy)} · ${new Date(pos.timestamp).toLocaleTimeString()}`
      : 'Ative o GPS para obter a posição.';
  }

  function renderAlerta() {
    empty(alertaArea);
    if (!alerta) {
      alertaArea.append(
        h('div', { className: 'socorro__alert-idle' },
          h('span', { className: 'socorro__alert-kicker' }, 'MODO SOCORRO'),
          h('strong', null, 'Prepare antes de sair do alcance'),
          h('p', null, 'Crie um registro local da sua posição. Depois, compartilhe por mensagem, rádio ou comunicador via satélite quando tiver um canal disponível.')
        ),
        h('button', {
          className: 'socorro__alert-button',
          type: 'button',
          onclick: prepararAlerta
        }, 'PREPARAR ALERTA LOCAL')
      );
      return;
    }

    alertaArea.append(
      h('div', { className: 'socorro__alert-active' },
        h('div', { className: 'socorro__alert-title' },
          h('span', { className: 'socorro__pulse', ariaHidden: 'true' }),
          h('strong', null, 'ALERTA PREPARADO NO APARELHO'),
          h('span', { className: 'socorro__alert-time' }, new Date(alerta.createdAt).toLocaleTimeString())
        ),
        h('p', null, alerta.message?.estado === 'compartilhada'
          ? 'O sistema operacional abriu o compartilhamento. Isso não confirma entrega nem acionamento de equipe.'
          : 'Isto ainda não avisou uma equipe. Escolha um canal de comunicação e confirme o destinatário antes de enviar.'),
        h('div', { className: 'socorro__alert-actions' },
          h('span', { className: 'socorro__message-state' }, alerta.message?.estado === 'compartilhada' ? 'PACOTE COMPARTILHADO PELO SISTEMA' : 'PACOTE PREPARADO LOCALMENTE'),
          h('button', { className: 'socorro__share-button', type: 'button', onclick: compartilhar }, 'COMPARTILHAR COORDENADAS'),
          h('button', { className: 'socorro__cancel-button', type: 'button', onclick: () => { alerta = null; estado.remover(CHAVES.ALERTA); renderAlerta(); feedback.textContent = 'Registro local cancelado. Nenhuma mensagem foi enviada.'; } }, 'CANCELAR')
        )
      )
    );
  }

  function prepararAlerta() {
    if (!posicao) {
      feedback.textContent = 'Obtenha uma posição primeiro. Sem coordenadas, não prepare um alerta de localização.';
      return;
    }
    const pacote = prepararMensagemExterna({ posicao, tipo: 'sos', texto: textoCoordenadas(posicao) });
    if (!pacote) {
      feedback.textContent = 'Não foi possível validar a posição para preparar o pacote local.';
      return;
    }
    alerta = { createdAt: Date.now(), status: 'preparado', position: posicao, message: pacote };
    estado.set(CHAVES.ALERTA, alerta);
    feedback.textContent = 'Registro criado localmente. Nenhuma equipe foi contatada.';
    renderAlerta();
  }

  async function compartilhar() {
    if (!alerta?.position) return;
    const texto = textoCoordenadas(alerta.position);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Coordenadas Vanguard Field', text: texto });
        alerta = { ...alerta, status: 'compartilhado', message: { ...alerta.message, estado: 'compartilhada', confirmadoPor: 'sistema operacional' } };
        estado.set(CHAVES.ALERTA, alerta);
        feedback.textContent = 'Compartilhamento aberto. Confirme o contato ou canal no aparelho; a entrega não foi confirmada pelo Vanguard.';
        renderAlerta();
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(texto);
        alerta = { ...alerta, status: 'compartilhado', message: { ...alerta.message, estado: 'compartilhada', confirmadoPor: 'área de transferência' } };
        estado.set(CHAVES.ALERTA, alerta);
        feedback.textContent = 'Coordenadas copiadas. Cole em uma mensagem, rádio digital ou comunicador compatível; a entrega não foi confirmada pelo Vanguard.';
        renderAlerta();
      } else {
        feedback.textContent = texto;
      }
    } catch (erro) {
      if (erro?.name !== 'AbortError') feedback.textContent = 'O compartilhamento foi bloqueado. Use as coordenadas exibidas e outro canal.';
    }
  }

  localAction.onclick = () => {
    localAction.disabled = true;
    localAction.textContent = 'BUSCANDO…';
    solicitarPosicao({
      onPosition: (pos) => {
        localAction.disabled = false;
        localAction.textContent = 'ATUALIZAR GPS';
        atualizarLocal(pos);
        feedback.textContent = 'Posição atualizada e mantida somente no aparelho.';
        if (alerta) {
          alerta = { ...alerta, position: posicao };
          estado.set(CHAVES.ALERTA, alerta);
          renderAlerta();
        }
      },
      onError: (erro) => {
        localAction.disabled = false;
        localAction.textContent = 'TENTAR NOVAMENTE';
        feedback.textContent = erro?.code === 1
          ? 'Permissão de localização negada. Ative-a nas configurações do aparelho.'
          : `GPS indisponível: ${erro?.message ?? 'erro desconhecido'}`;
      }
    });
  };

  atualizarLocal(posicao);
  renderAlerta();

  const pararGps = (() => {
    /* Este módulo não acompanha continuamente: no Socorro, atualização é uma
     * ação explícita para reduzir consumo e evitar compartilhar uma trilha sem
     * intenção. A tela escuta apenas a última leitura já salva. */
    return estado.on(CHAVES.LOCAL, (pos) => atualizarLocal(pos));
  })();

  raiz.append(
    h('section', { className: 'socorro__scroll' },
      h('div', { className: 'socorro__hero' },
        h('span', { className: 'socorro__eyebrow' }, 'PROTOCOLO // ÚLTIMO RECURSO'),
        h('h1', null, 'Modo socorro'),
        h('p', null, 'Tenha sua posição pronta para transmitir. O aplicativo não chama resgate sozinho e não promete comunicação onde não existe um canal.'),
        h('div', { className: 'socorro__location-card' },
          h('div', { className: 'socorro__location-heading' },
            h('span', { className: 'socorro__kicker' }, 'POSIÇÃO ATUAL'),
            h('span', { className: 'socorro__privacy' }, '⌖ LOCAL')
          ),
          localValue,
          localMeta,
          localAction
        ),
        feedback
      ),
      alertaArea,
      h('section', { className: 'socorro__section', 'aria-labelledby': 'entenda-titulo' },
        h('div', { className: 'socorro__section-head' },
          h('span', { className: 'socorro__kicker' }, 'ENTENDA A TECNOLOGIA'),
          h('h2', { id: 'entenda-titulo' }, 'GPS não é comunicador')
        ),
        h('div', { className: 'socorro__explain-grid' },
          h('article', { className: 'socorro__explain-card' },
            h('span', { className: 'socorro__explain-number' }, '01'),
            h('strong', null, 'Posicionamento'),
            h('p', null, 'O aparelho calcula uma posição a partir de sinais de satélites GNSS. Isso pode funcionar sem internet, mas a precisão varia com céu aberto, relevo e o próprio aparelho.')
          ),
          h('article', { className: 'socorro__explain-card socorro__explain-card--amber' },
            h('span', { className: 'socorro__explain-number' }, '02'),
            h('strong', null, 'Transmissão'),
            h('p', null, 'Para uma equipe receber a posição, você precisa de rede móvel, Wi-Fi, rádio com dados ou mensageiro via satélite compatível. O GPS, sozinho, não envia um pedido de resgate.')
          )
        )
      ),
      h('section', { className: 'socorro__section socorro__checklist', 'aria-labelledby': 'checklist-titulo' },
        h('div', { className: 'socorro__section-head' },
          h('span', { className: 'socorro__kicker' }, 'ANTES DA EXPEDIÇÃO'),
          h('h2', { id: 'checklist-titulo' }, 'Checklist essencial')
        ),
        h('ul', null,
          h('li', null, h('b', null, 'Carregue o aparelho e uma fonte reserva.'), ' Frio e busca contínua de GPS drenam bateria.'),
          h('li', null, h('b', null, 'Baixe ou prepare a área do mapa.'), ' A posição pode existir mesmo sem os tiles do mapa.'),
          h('li', null, h('b', null, 'Avise alguém do itinerário.'), ' Combine horário de retorno e o que fazer se você não responder.'),
          h('li', null, h('b', null, 'Leve um canal redundante.'), ' Um mensageiro via satélite ou rádio adequado é diferente do GPS do celular.')
        )
      )
    )
  );

  return { elemento: raiz, desmontar: pararGps };
}
