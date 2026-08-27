import '../styles/bussola.css';
import { h } from '../ui/helpers.js';
import { estado, CHAVES } from '../core/estado.js';
import { iniciarAcompanhamento, precisaoLabel } from '../core/localizacao.js';

function grauCardeal(grau) {
  if (!Number.isFinite(grau)) return '—';
  const nomes = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
  return nomes[Math.round(grau / 45) % 8];
}

function formatarGrau(grau) {
  return Number.isFinite(grau) ? `${Math.round((grau + 360) % 360).toString().padStart(3, '0')}°` : '---°';
}

export function bussolaPage() {
  const raiz = h('div', { className: 'vg-pagina bussola' });
  const localSalva = estado.get(CHAVES.LOCAL, null);
  let rumo = Number.isFinite(localSalva?.heading) ? localSalva.heading : null;
  let sensorAtivo = false;
  let assistindoGps = false;
  let pararGps = () => {};

  const grau = h('strong', { className: 'bussola__grau' }, formatarGrau(rumo));
  const cardinal = h('span', { className: 'bussola__cardinal' }, grauCardeal(rumo));
  const origem = h('span', { className: 'bussola__origem' }, rumo == null ? 'AGUARDANDO SENSOR' : 'RUMO DO GPS');
  const rosa = h('div', { className: 'bussola__rosa', role: 'img', 'aria-label': 'Rosa dos ventos' },
    h('span', { className: 'bussola__ponto-norte' }, 'N'),
    h('span', { className: 'bussola__ponto-leste' }, 'L'),
    h('span', { className: 'bussola__ponto-sul' }, 'S'),
    h('span', { className: 'bussola__ponto-oeste' }, 'O'),
    h('div', { className: 'bussola__anel' },
      h('span', { className: 'bussola__marca bussola__marca--1' }),
      h('span', { className: 'bussola__marca bussola__marca--2' }),
      h('span', { className: 'bussola__marca bussola__marca--3' }),
      h('span', { className: 'bussola__marca bussola__marca--4' })
    ),
    h('span', { className: 'bussola__ponteiro', ariaHidden: 'true' }, '▲')
  );

  const status = h('div', { className: 'bussola__status', role: 'status' },
    h('span', { className: 'bussola__status-dot' }),
    h('span', null, rumo == null ? 'Mova o aparelho para obter a direção.' : `${origem.textContent} · ${precisaoLabel(localSalva?.accuracy)}`)
  );
  const ativar = h('button', {
    className: 'bussola__ativar',
    type: 'button',
    onclick: ativarSensor
  }, 'ATIVAR SENSOR DO APARELHO');

  const detalheRumo = h('div', { className: 'bussola__readout' },
    h('span', { className: 'bussola__readout-label' }, 'AZIMUTE'),
    grau,
    cardinal,
    origem
  );

  function atualizar(novoRumo, label = 'RUMO DO GPS') {
    if (!Number.isFinite(novoRumo)) return;
    rumo = (novoRumo + 360) % 360;
    grau.textContent = formatarGrau(rumo);
    cardinal.textContent = grauCardeal(rumo);
    origem.textContent = label;
    rosa.style.setProperty('--heading', `${rumo}deg`);
    status.querySelector('span:last-child').textContent = `${label} · gire devagar para conferir a leitura.`;
  }

  function handleOrientation(event) {
    const heading = Number.isFinite(event.webkitCompassHeading)
      ? event.webkitCompassHeading
      : event.absolute && Number.isFinite(event.alpha)
        ? 360 - event.alpha
        : null;
    if (heading != null) {
      atualizar(heading, 'SENSOR DO APARELHO');
      sensorAtivo = true;
      ativar.textContent = 'SENSOR ATIVO';
      ativar.disabled = true;
      status.classList.add('is-ready');
    }
  }

  async function ativarSensor() {
    try {
      if (!assistindoGps) {
        pararGps = iniciarAcompanhamento({
          mode: 'bussola',
          onPosition: (posicao) => {
            if (!sensorAtivo && Number.isFinite(posicao.heading)) atualizar(posicao.heading, 'RUMO DO GPS');
          },
          onError: () => {
            if (!sensorAtivo) status.querySelector('span:last-child').textContent = 'GPS indisponível. Ative o sensor do aparelho para orientação local.';
          }
        });
        assistindoGps = true;
      }
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const permissao = await DeviceOrientationEvent.requestPermission();
        if (permissao !== 'granted') throw new Error('Permissão do sensor negada.');
      }
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
      window.addEventListener('deviceorientation', handleOrientation, true);
      ativar.textContent = 'MOVIMENTE O APARELHO';
      status.querySelector('span:last-child').textContent = 'Sensor solicitado. Se necessário, calibre fazendo um movimento em oito.';
    } catch (erro) {
      status.querySelector('span:last-child').textContent = erro.message ?? 'Sensor indisponível; usando rumo do GPS quando houver deslocamento.';
    }
  }

  raiz.append(
    h('section', { className: 'bussola__scroll' },
      h('div', { className: 'bussola__head' },
        h('span', { className: 'bussola__eyebrow' }, 'INSTRUMENTO // ORIENTAÇÃO'),
        h('h1', null, 'Bússola de campo'),
        h('p', null, 'Use o sensor do aparelho para manter o norte mesmo quando o mapa não estiver carregado. Segure o telefone plano e longe de objetos magnéticos.')
      ),
      h('div', { className: 'bussola__instrumento' }, rosa, detalheRumo),
      status,
      ativar,
      h('div', { className: 'bussola__cards' },
        h('article', { className: 'bussola__card' },
          h('span', { className: 'bussola__kicker' }, 'PRECISÃO'),
          h('strong', null, 'Confirme a leitura'),
          h('p', null, 'Bússolas de celular são sensíveis a capas, veículos e linhas de energia. Compare o rumo com o deslocamento indicado pelo GPS.')
        ),
        h('article', { className: 'bussola__card bussola__card--amber' },
          h('span', { className: 'bussola__kicker' }, 'PRÓXIMO PASSO'),
          h('strong', null, 'Navegue com contexto'),
          h('p', null, 'Abra o mapa para registrar sua trilha e deixar pontos de referência antes de seguir.')
        )
      ),
      h('button', { className: 'bussola__mapa', type: 'button', onclick: () => { location.hash = '#/mapa'; } }, 'ABRIR MAPA →')
    )
  );

  return {
    elemento: raiz,
    desmontar: () => {
      if (assistindoGps) pararGps();
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    }
  };
}
