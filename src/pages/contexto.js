/*
 * #/contexto — modo de proteção civil.
 *
 * A detecção automática só usa zonas que foram importadas ou salvas com fonte
 * e data. Sem zona confiável, o app fica no modo escolhido pela pessoa.
 */

import { h } from '../ui/helpers.js';
import { estado, CHAVES } from '../core/estado.js';
import { solicitarPosicao, precisaoLabel } from '../core/localizacao.js';
import { CONTEXTOS, contextoPorId, detectarContexto, exportarZonas, importarZonas, normalizarZona, zonasAtivas } from '../core/contexto.js';
import { EQUIPAMENTOS_EXTERNOS } from '../core/equipamentos.js';
import '../styles/contexto.css';

const PADRAO = 'cidade';

function zonaTexto(zona) {
  return `${zona.nome} · ${zona.raioM} m · ${zona.fonte}`;
}

function cardContexto(contexto, ativo, selecionar) {
  const botao = h('button', { className: `contexto__item${ativo ? ' is-active' : ''}`, type: 'button' },
    h('span', { className: 'contexto__item-index' }, String(contexto.prioridade).padStart(2, '0')),
    h('span', { className: 'contexto__item-copy' },
      h('strong', null, contexto.rotulo),
      h('small', null, contexto.descricao)),
    h('span', { className: 'contexto__item-arrow' }, '→'));
  botao.onclick = selecionar;
  return botao;
}

export function contextoPage() {
  const raiz = h('div', { className: 'vg-pagina contexto' });
  const local = estado.get(CHAVES.LOCAL, null);
  let contextoAtual = contextoPorId(estado.get(CHAVES.CONTEXTO, PADRAO));
  /*
   * TODAS as zonas guardadas, não só as vigentes.
   *
   * A versão anterior carregava `zonasAtivas(...)` aqui e depois regravava
   * essa lista filtrada — então uma zona que vencia era **apagada em
   * definitivo na gravação seguinte**, sem ninguém ser avisado. Pior: ela
   * sumia da lista antes disso, e a tela dizia "Nenhuma zona local
   * cadastrada", o que era falso. A pessoa tinha digitado a fonte e a data;
   * destruir o registro em silêncio é a última coisa que uma tela de proteção
   * civil pode fazer. O filtro por validade continua existindo — mas só onde
   * ele decide o MODO, nunca onde ele decide o que sobrevive no aparelho.
   */
  let zonas = (estado.get(CHAVES.ZONAS, []) ?? []).map(normalizarZona).filter(Boolean);
  let posicao = local;

  const titulo = h('h1', null, contextoAtual.rotulo);
  const descricao = h('p', { className: 'contexto__lead' }, contextoAtual.descricao);
  const modoBadge = h('span', { className: `contexto__badge contexto__badge--${contextoAtual.tom}` }, contextoAtual.nome);
  const alerta = h('div', { className: 'contexto__alerta' },
    h('strong', null, 'AVISO DE USO'),
    h('p', null, contextoAtual.aviso));
  const status = h('p', { className: 'contexto__status', role: 'status' }, posicao
    ? `Último fixo disponível · ${precisaoLabel(posicao.accuracy)}`
    : 'Sem fixo GPS local. O contexto escolhido continua salvo no aparelho.');
  const itens = h('div', { className: 'contexto__lista' });
  const zonaLista = h('div', { className: 'contexto__zonas-lista' });
  const zonaArquivo = h('input', { className: 'contexto__file', type: 'file', accept: 'application/json,.json', 'aria-label': 'Importar zonas JSON' });
  const zonaDadosFeedback = h('p', { className: 'contexto__form-feedback', role: 'status' });

  function renderContexto() {
    contextoAtual = contextoPorId(estado.get(CHAVES.CONTEXTO, PADRAO));
    titulo.textContent = contextoAtual.rotulo;
    descricao.textContent = contextoAtual.descricao;
    modoBadge.textContent = contextoAtual.nome;
    modoBadge.className = `contexto__badge contexto__badge--${contextoAtual.tom}`;
    alerta.querySelector('p').textContent = contextoAtual.aviso;
    for (const child of itens.children) child.remove();
    for (const contexto of CONTEXTOS) itens.append(cardContexto(contexto, contexto.id === contextoAtual.id, () => {
      estado.set(CHAVES.CONTEXTO, contexto.id);
      renderContexto();
      status.textContent = `Modo ${contexto.nome} salvo no aparelho.`;
    }));
  }

  /** ATIVA, VENCIDA ou DESLIGADA — a zona nunca some sem explicação. */
  function situacaoDaZona(zona) {
    if (!zona.ativo) return { rotulo: 'DESLIGADA', classe: 'is-desligada' };
    if (!zona.validadeEm) return { rotulo: 'ATIVA', classe: 'is-ativa' };
    const validade = Date.parse(zona.validadeEm);
    if (!Number.isFinite(validade)) return { rotulo: 'ATIVA', classe: 'is-ativa' };
    return validade >= Date.now()
      ? { rotulo: 'ATIVA', classe: 'is-ativa' }
      : { rotulo: 'VENCIDA', classe: 'is-vencida' };
  }

  function renderZonas() {
    for (const child of zonaLista.children) child.remove();
    if (!zonas.length) {
      zonaLista.append(h('p', { className: 'contexto__empty' },
        'NENHUMA ZONA LOCAL CADASTRADA. Preencha o formulário acima com uma área verificada por uma fonte responsável, ou importe um arquivo de zonas. Sem fonte confirmada, o app não inventa alertas.'));
      return;
    }
    const vencidas = zonas.filter((zona) => situacaoDaZona(zona).rotulo === 'VENCIDA').length;
    if (vencidas) {
      zonaLista.append(h('p', { className: 'contexto__empty' },
        `${vencidas} zona(s) passaram da validade: continuam guardadas para consulta, mas não ativam mais nenhum modo. Renove a data ou remova.`));
    }
    zonaLista.append(...zonas.map((zona) => h('div', { className: `contexto__zona ${situacaoDaZona(zona).classe}` },
      h('span', { className: `contexto__zona-dot contexto__zona-dot--${contextoPorId(zona.contexto).tom}` }),
      h('span', { className: 'contexto__zona-copy' },
        h('strong', null, `${zona.nome} · ${contextoPorId(zona.contexto).nome}`),
        h('small', null, `${situacaoDaZona(zona).rotulo} · ${zonaTexto(zona)}`)),
      h('button', { className: 'contexto__zona-remove', type: 'button', ariaLabel: `Remover ${zona.nome}`, onclick: () => {
        zonas = zonas.filter((item) => item.id !== zona.id);
        estado.set(CHAVES.ZONAS, zonas);
        renderZonas();
      } }, '×'))));
  }

  const exportarButton = h('button', { className: 'contexto__secondary', type: 'button' }, 'EXPORTAR ZONAS JSON');
  exportarButton.onclick = () => {
    const blob = new Blob([exportarZonas(zonas)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vanguard-zonas-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    zonaDadosFeedback.textContent = `${zonas.length} zona(s) exportada(s). Guarde o arquivo em local seguro.`;
  };

  zonaArquivo.onchange = async () => {
    const arquivo = zonaArquivo.files?.[0];
    if (!arquivo) return;
    try {
      const importadas = importarZonas(await arquivo.text());
      const porId = new Map(zonas.map((zona) => [zona.id, zona]));
      importadas.forEach((zona) => porId.set(zona.id, zona));
      zonas = [...porId.values()];
      estado.set(CHAVES.ZONAS, zonas);
      renderZonas();
      zonaDadosFeedback.textContent = `${importadas.length} zona(s) importada(s) ou atualizada(s). O arquivo foi apenas validado e salvo localmente.`;
    } catch (erro) {
      zonaDadosFeedback.textContent = `Importação recusada: ${erro.message}.`;
    } finally {
      zonaArquivo.value = '';
    }
  };

  const gpsButton = h('button', { className: 'contexto__primary', type: 'button' }, 'ATUALIZAR GPS E DETECTAR');
  gpsButton.onclick = () => {
    gpsButton.disabled = true;
    gpsButton.textContent = 'LENDO POSIÇÃO…';
    solicitarPosicao({
      onPosition: (nova) => {
        posicao = nova;
        // Aqui, e só aqui, o filtro por validade manda: uma zona vencida não
        // troca o modo, mas continua guardada no aparelho.
        const resultado = detectarContexto(posicao, zonasAtivas(zonas), contextoAtual.id);
        if (resultado.zona) {
          estado.set(CHAVES.CONTEXTO, resultado.contexto.id);
          renderContexto();
          status.textContent = `${resultado.contexto.nome} ativado por ${resultado.zona.nome} · ${Math.round(resultado.distanciaM)} m do centro da zona.`;
        } else {
          status.textContent = `Nenhuma zona local cobre este fixo · mantendo ${contextoAtual.nome}.`;
        }
        gpsButton.disabled = false;
        gpsButton.textContent = 'ATUALIZAR GPS E DETECTAR';
      },
      onError: () => {
        gpsButton.disabled = false;
        gpsButton.textContent = 'TENTAR GPS NOVAMENTE';
        status.textContent = 'Sem posição confirmada. Escolha o contexto manualmente e não atravesse áreas desconhecidas.';
      }
    });
  };

  const zonaNome = h('input', { className: 'contexto__input', type: 'text', placeholder: 'Nome da zona', 'aria-label': 'Nome da zona' });
  const zonaLat = h('input', { className: 'contexto__input', type: 'number', step: 'any', placeholder: 'Latitude', 'aria-label': 'Latitude da zona' });
  const zonaLon = h('input', { className: 'contexto__input', type: 'number', step: 'any', placeholder: 'Longitude', 'aria-label': 'Longitude da zona' });
  const zonaRaio = h('input', { className: 'contexto__input', type: 'number', min: '50', max: '100000', step: '50', placeholder: 'Raio em metros', 'aria-label': 'Raio em metros' });
  const zonaFonte = h('input', { className: 'contexto__input', type: 'text', placeholder: 'Fonte/data do aviso', 'aria-label': 'Fonte e data do aviso' });
  const zonaValidade = h('input', { className: 'contexto__input', type: 'date', 'aria-label': 'Validade da zona, opcional' });
  const zonaTipo = h('select', { className: 'contexto__input', 'aria-label': 'Tipo de contexto da zona' },
    ...CONTEXTOS.map((item) => h('option', { value: item.id }, item.nome)));
  const zonaFeedback = h('p', { className: 'contexto__form-feedback', role: 'status' });
  const salvarZona = h('button', { className: 'contexto__secondary', type: 'button' }, 'SALVAR ZONA LOCAL');
  salvarZona.onclick = () => {
    const zona = normalizarZona({
      id: `zona-${Date.now()}`,
      nome: zonaNome.value.trim(),
      contexto: zonaTipo.value,
      lat: zonaLat.value,
      lon: zonaLon.value,
      raioM: zonaRaio.value,
      fonte: zonaFonte.value.trim(),
      validadeEm: zonaValidade.value ? new Date(`${zonaValidade.value}T23:59:59`).toISOString() : null,
      atualizadoEm: new Date().toISOString(),
    });
    if (!zona || !zona.nome || zona.raioM <= 0 || !zona.fonte) {
      zonaFeedback.textContent = 'Informe nome, coordenadas, raio e uma fonte/data verdadeira.';
      return;
    }
    zonas = [...zonas, zona];
    estado.set(CHAVES.ZONAS, zonas);
    zonaNome.value = '';
    zonaLat.value = '';
    zonaLon.value = '';
    zonaRaio.value = '';
    zonaFonte.value = '';
    zonaValidade.value = '';
    zonaFeedback.textContent = 'Zona salva no aparelho. Ela só ativará o modo quando o GPS entrar no raio informado e até a validade definida.';
    renderZonas();
  };

  const equipamentosCard = h('section', { className: 'contexto__card contexto__card--wide' },
    h('div', { className: 'contexto__eyebrow' }, 'EQUIPAMENTOS EXTERNOS'),
    h('h2', null, 'Capacidades preparadas'),
    h('p', null, 'Estas integrações podem ser adicionadas no futuro. Nenhuma delas é simulada pelo aparelho.'),
    h('div', { className: 'contexto__equip-list' }, ...EQUIPAMENTOS_EXTERNOS.map((item) => h('div', { className: 'contexto__equip' },
      h('span', { className: 'contexto__equip-dot' }),
      h('span', { className: 'contexto__equip-copy' }, h('strong', null, item.nome), h('small', null, `${item.uso} Requer: ${item.requer}.`)),
      h('span', { className: 'contexto__equip-state' }, 'NÃO CONECTADO')))));

  const zonasCard = h('section', { className: 'contexto__card' },
    h('div', { className: 'contexto__eyebrow' }, 'ZONAS LOCAIS / OFFLINE'),
    h('h2', null, 'Fontes de risco conhecidas'),
    h('p', null, 'Cadastre apenas áreas verificadas por uma fonte responsável. O app usa o ponto e o raio como aviso, não como detecção de ameaça.'),
    h('div', { className: 'contexto__form' }, zonaNome, zonaTipo,
      h('div', { className: 'contexto__form-grid' }, zonaLat, zonaLon, zonaRaio),
      zonaFonte, zonaValidade, salvarZona, zonaFeedback),
    h('div', { className: 'contexto__data-actions' }, exportarButton, zonaArquivo),
    zonaDadosFeedback,
    zonaLista);

  const raizConteudo = h('div', { className: 'contexto__wrap' },
    h('div', { className: 'contexto__header' },
      h('div', null, h('div', { className: 'contexto__eyebrow' }, 'PROTEÇÃO CIVIL'), titulo, descricao),
      h('div', { className: 'contexto__header-side' }, modoBadge, h('button', { className: 'contexto__back', type: 'button', onclick: () => { location.hash = '#/inicio'; } }, '← INÍCIO'))),
    h('div', { className: 'contexto__grid' },
      h('section', { className: 'contexto__card contexto__card--main' },
        h('div', { className: 'contexto__eyebrow' }, 'MODO AUTOMÁTICO / MANUAL'),
        h('h2', null, 'Escolha o contexto'),
        h('p', null, 'Com posição confirmada, uma zona local de maior prioridade pode substituir o modo padrão. Sem dados confiáveis, a escolha manual permanece ativa.'),
        itens,
        gpsButton,
        status,
        alerta,
        h('div', { className: 'contexto__recursos' }, ...contextoAtual.recursos.map((recurso) => h('span', null, recurso)))),
      zonasCard),
    equipamentosCard,
    h('section', { className: 'contexto__limits' },
      h('strong', null, 'Limites importantes'),
      ' Este recurso não detecta drones, tropas, minas ou radiação por conta própria. Para essas capacidades, use fontes oficiais e equipamentos externos adequados.'));
  raiz.append(raizConteudo);
  renderContexto();
  renderZonas();

  return { elemento: raiz, desmontar: null };
}
