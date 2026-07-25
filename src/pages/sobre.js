/**
 * `#/sobre` — o que a ferramenta é, o que ela não é, e de onde vêm os números.
 *
 * Esta tela existe por um motivo específico: o app cospe números com quatro
 * dígitos e aparência de autoridade. Quem usa precisa saber exatamente qual é
 * a procedência de cada um e onde o modelo para de valer. Esconder isso numa
 * nota de rodapé seria a decisão errada.
 */

import { h } from '../ui/helpers.js';
import { listarSistemas } from '../engine/charges.js';
import { VERSAO_MOTOR, SCHEMA_PEDIDO, SCHEMA_RESPOSTA } from '../engine/fire-mission.js';

export function sobrePage() {
  const raiz = h('div', { className: 'vg-pagina', style: { overflowY: 'auto', padding: '24px', display: 'block' } });
  const wrap = h('div', { style: { maxWidth: '860px', margin: '0 auto' } });
  raiz.append(wrap);

  const painel = (titulo, ...corpo) =>
    h('div', { className: 'vg-painel', style: { marginBottom: '16px' } },
      h('div', { className: 'vg-painel__titulo' }, titulo),
      h('div', { className: 'vg-painel__corpo' }, ...corpo));

  wrap.append(
    h('h1', { style: { color: 'var(--color-cyan)', marginBottom: '8px', letterSpacing: '0.2em' } },
      'PROJECT VANGUARD'),
    h('p', { className: 'u-mudo', style: { marginTop: '0', marginBottom: '24px' } },
      `Motor v${VERSAO_MOTOR} · GPS topográfico tático e computador de tiro · ecossistema Projeto Baluarte`),

    h('div', { className: 'vg-aviso' },
      h('strong', null, 'Ferramenta de treino e simulação. '),
      'Os dados de armamento são valores de referência de modelo, compilados de fontes ' +
      'públicas — não são tabela de tiro oficial e não substituem uma. Não use para ' +
      'emprego real de armamento.'),

    painel('◤ O QUE O MOTOR FAZ',
      h('ul', null,
        h('li', null, h('strong', null, 'Coordenadas: '),
          'lat/lon ⇄ UTM ⇄ MGRS em WGS84, com as exceções de fuso da Noruega e de ' +
          'Svalbard. Precisão de ida-e-volta abaixo de 5 cm no mundo todo.'),
        h('li', null, h('strong', null, 'Grade local: '),
          'grid de 4 a 10 dígitos no estilo Arma 3, com quadro opcionalmente amarrado ao mundo real.'),
        h('li', null, h('strong', null, 'Geodésia: '),
          'Vincenty direto e inverso (precisão milimétrica) para navegação; plano da ' +
          'grade UTM para tiro — que é o que a doutrina de artilharia usa.'),
        h('li', null, h('strong', null, 'Balística: '),
          'solução exata em vácuo (forma fechada) e solução com arrasto quadrático e ' +
          'vento 3D por integração numérica.'))),

    painel('◤ DE ONDE VÊM OS NÚMEROS',
      h('p', null,
        'O coeficiente de arrasto de cada carga não é chutado: ele é ',
        h('strong', { className: 'u-acento' }, 'derivado'),
        ' do par (velocidade inicial, alcance máximo publicado), que é dado verificável. ' +
        'Trocar a fonte por uma tabela de tiro real recalibra a tabela inteira sozinha.'),
      h('table', { className: 'vg-tabela' },
        h('thead', null, h('tr', null,
          h('th', null, 'Sistema'), h('th', null, 'Calibre'), h('th', null, 'Origem'),
          h('th', null, 'Cargas'), h('th', null, 'Alcance máx.'))),
        h('tbody', null, ...listarSistemas().map((s) =>
          h('tr', null,
            h('td', null, s.nome, s.jogo && h('span', { className: 'vg-badge u-ambar', style: { marginLeft: '6px' } }, 'JOGO')),
            h('td', null, `${s.calibre} mm`),
            h('td', null, s.origem),
            h('td', null, String(s.cargas)),
            h('td', null, `${(s.alcanceMaxM / 1000).toFixed(1)} km`)))))),

    painel('◤ ONDE O MODELO PARA DE VALER',
      h('ul', null,
        h('li', null, 'Atmosfera é uniforme: sem gradiente de densidade, temperatura ou vento com a altitude. ' +
          'Num apogeu de 3 km isso é uma simplificação real.'),
        h('li', null, 'Sem efeito Coriolis nem deriva por rotação do projétil (spin drift). ' +
          'Relevante acima de ~10 km; irrelevante em morteiro.'),
        h('li', null, 'Gravidade constante e Terra plana dentro do alcance — válido para os ' +
          'alcances envolvidos (< 10 km).'),
        h('li', null, 'A dispersão é um modelo de ordem de grandeza, não tabela de tiro.'),
        h('li', null, 'A altitude vem de modelo digital de terreno (Open-Meteo), com erro ' +
          'típico de alguns metros. Em terreno acidentado, confira.'))),

    painel('◤ CONTRATO DE INTEGRAÇÃO',
      h('p', null, 'O computador de tiro é chamável de fora — mesma função no navegador, em Web Worker, em Node ou atrás de HTTP:'),
      h('pre', { style: { overflowX: 'auto', fontSize: '11px', color: 'var(--color-text-secondary)' } },
        `POST /api/fire-mission\n{\n  "schema": "${SCHEMA_PEDIDO}",\n  "peca": { "pos": { "tipo": "mgrs", "valor": "23K PQ 83477 60685", "alt": 30 },\n            "sistema": "m252_81mm" },\n  "alvo": { "pos": { "tipo": "mgrs", "valor": "23K PQ 86000 63000", "alt": 120 } },\n  "ambiente": { "ventoVelocidadeMs": 8, "ventoDirecaoDeg": 270 }\n}\n\n→ ${SCHEMA_RESPOSTA}`)),

    painel('◤ ECOSSISTEMA',
      h('p', null,
        'O Vanguard usa a MESMA formulação de arrasto do ',
        h('code', { className: 'u-acento' }, 'arma3-balistica.js'),
        ' do Projeto Baluarte, e os mesmos nomes de token de design — ' +
        'então componente e coeficiente calibrado atravessam os dois projetos sem tradução.'),
      h('p', { className: 'u-mudo' }, 'Ver docs/INTEGRACAO-BALUARTE.md no repositório.'))
  );

  return { elemento: raiz, desmontar: null };
}
