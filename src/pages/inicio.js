import '../styles/inicio.css';
import { h, empty } from '../ui/helpers.js';
import { estado, CHAVES } from '../core/estado.js';
import { solicitarPosicao, precisaoLabel } from '../core/localizacao.js';

function caminho(hash, titulo, descricao, icone, classe = '') {
  return h('button', {
    className: `inicio__atalho ${classe}`,
    type: 'button',
    onclick: () => { location.hash = hash; }
  },
    h('span', { className: 'inicio__atalho-icone', ariaHidden: 'true' }, icone),
    h('span', { className: 'inicio__atalho-copy' },
      h('strong', null, titulo),
      h('small', null, descricao)
    ),
    h('span', { className: 'inicio__atalho-seta', ariaHidden: 'true' }, '→')
  );
}

export function inicioPage() {
  const raiz = h('div', { className: 'vg-pagina inicio' });
  const local = estado.get(CHAVES.LOCAL, null);
  let posicao = local;

  const statusDot = h('span', { className: `inicio__status-dot${posicao ? ' is-ready' : ''}`, ariaHidden: 'true' });
  const statusTitle = h('strong', null, posicao ? 'LOCALIZAÇÃO DISPONÍVEL' : 'GPS PRONTO PARA ATIVAR');
  const statusDetail = h('span', { className: 'inicio__status-detail' }, posicao
    ? `Último fixo salvo no aparelho · ${precisaoLabel(posicao.accuracy)}`
    : 'A posição não sai do dispositivo sem sua confirmação.');
  const statusCard = h('div', { className: 'inicio__status-card' }, statusDot,
    h('div', { className: 'inicio__status-copy' }, statusTitle, statusDetail),
    h('span', { className: 'inicio__status-lock', ariaHidden: 'true' }, '⌖ LOCAL')
  );

  const gpsFeedback = h('p', { className: 'inicio__feedback', role: 'status' }, 'O GPS será usado apenas enquanto você estiver navegando.');
  const gpsButton = h('button', {
    className: 'inicio__primary',
    type: 'button',
    onclick: () => {
      gpsButton.disabled = true;
      gpsButton.textContent = 'BUSCANDO FIXO…';
      gpsFeedback.textContent = 'Aguardando uma leitura precisa do aparelho…';
      solicitarPosicao({
        onPosition: (novaPosicao) => {
          posicao = novaPosicao;
          statusDot.classList.add('is-ready');
          statusTitle.textContent = 'LOCALIZAÇÃO DISPONÍVEL';
          statusDetail.textContent = `Último fixo salvo no aparelho · ${precisaoLabel(posicao.accuracy)}`;
          gpsButton.disabled = false;
          gpsButton.textContent = 'ABRIR MAPA';
          gpsFeedback.textContent = 'Fixo recebido. Confirme a área no mapa antes de iniciar uma rota.';
          location.hash = '#/mapa';
        },
        onError: (erro) => {
          gpsButton.disabled = false;
          gpsButton.textContent = 'TENTAR NOVAMENTE';
          gpsFeedback.textContent = erro?.code === 1
            ? 'Permissão negada. Ative a localização nas configurações do aparelho para continuar.'
            : `Não foi possível obter o fixo: ${erro?.message ?? 'erro desconhecido'}`;
        }
      });
    }
  }, posicao ? 'ABRIR MAPA' : 'ATIVAR GPS');

  const trilha = estado.get(CHAVES.TRILHA, []);
  const rotaAtiva = estado.get(CHAVES.ROTA_ATIVA, false);
  const trilhaStatus = h('span', null, rotaAtiva
    ? `${trilha.length} leituras registradas nesta rota`
    : trilha.length
      ? `${trilha.length} leituras salvas no aparelho`
      : 'Nenhuma rota em andamento');

  raiz.append(
    h('section', { className: 'inicio__scroll' },
      h('div', { className: 'inicio__hero' },
        h('div', { className: 'inicio__eyebrow' }, 'VANGUARD FIELD / NAVEGAÇÃO DE EXPEDIÇÃO'),
        h('h1', null, 'Volte pelo mesmo caminho.'),
        h('p', null, 'Um instrumento de navegação para a cidade e para lugares remotos: escolha um destino, registre sua rota e mantenha sua orientação mesmo quando o sinal de internet desaparece.'),
        statusCard,
        gpsButton,
        gpsFeedback
      ),
      h('section', { className: 'inicio__section', 'aria-labelledby': 'atalhos-titulo' },
        h('div', { className: 'inicio__section-head' },
          h('span', { className: 'inicio__kicker' }, 'PAINEL DE CAMPO'),
          h('h2', { id: 'atalhos-titulo' }, 'Escolha uma ferramenta')
        ),
        h('div', { className: 'inicio__atalhos' },
          caminho('#/mapa', 'Mapa vivo', 'posição, trilha e pontos', '⊕'),
          caminho('#/bussola', 'Bússola', 'azimute e orientação', '◉'),
          caminho('#/socorro', 'Modo socorro', 'coordenadas e instruções', '!', 'inicio__atalho--danger'),
          caminho('#/doar', 'Apoiar projeto', 'transparência e doações', '＋', 'inicio__atalho--support')
        )
      ),
      h('section', { className: 'inicio__section inicio__section--split' },
        h('div', { className: 'inicio__mini-card' },
          h('span', { className: 'inicio__kicker' }, 'ROTA LOCAL'),
          h('strong', null, rotaAtiva ? 'GRAVAÇÃO ATIVA' : 'REGISTRO PRONTO'),
          trilhaStatus,
          h('button', { className: 'inicio__text-button', type: 'button', onclick: () => { location.hash = '#/mapa'; } }, 'GERENCIAR ROTA →')
        ),
        h('div', { className: 'inicio__mini-card inicio__mini-card--amber' },
          h('span', { className: 'inicio__kicker' }, 'COMUNICAÇÃO'),
          h('strong', null, 'URBANO OU REMOTO'),
          h('span', null, 'No dia a dia, escolha um destino e compare direção e distância. Em uma trilha, use o mesmo fluxo para registrar o caminho e preparar sua posição.'),
          h('button', { className: 'inicio__text-button', type: 'button', onclick: () => { location.hash = '#/mapa'; } }, 'ABRIR MAPA →')
        )
      ),
      h('section', { className: 'inicio__section inicio__tutorial', 'aria-labelledby': 'tutorial-titulo' },
        h('div', { className: 'inicio__section-head' },
          h('span', { className: 'inicio__kicker' }, 'PRIMEIRO USO'),
          h('h2', { id: 'tutorial-titulo' }, 'Procedimento rápido')
        ),
        h('ol', null,
          h('li', null, h('b', null, 'Ative o GPS.'), ' Aguarde a precisão melhorar antes de sair.'),
          h('li', null, h('b', null, 'Inicie a rota no mapa.'), ' Salve pontos importantes, como acampamento ou bifurcação.'),
          h('li', null, h('b', null, 'Antes de entrar em área remota,'), ' abra Socorro e confira como compartilhar suas coordenadas.')
        )
      )
    )
  );

  const removeListener = estado.on(CHAVES.LOCAL, (novaPosicao) => {
    posicao = novaPosicao;
    statusDot.classList.add('is-ready');
    statusTitle.textContent = 'LOCALIZAÇÃO DISPONÍVEL';
    statusDetail.textContent = `Último fixo salvo no aparelho · ${precisaoLabel(novaPosicao.accuracy)}`;
  });

  return { elemento: raiz, desmontar: removeListener };
}
