/*
 * #/doar — apoio transparente ao Vanguard Field.
 *
 * Esta tela é intencionalmente segura por padrão: enquanto a conta Asaas,
 * webhook e e-mail transacional não estiverem configurados, nenhum botão cria
 * cobrança nem simula pagamento aprovado.
 */

import { h } from '../ui/helpers.js';
import '../styles/doar.css';

const SUGESTOES = [20, 50, 100, 250];
const RECIPIENT = 'lucasbb2007@gmail.com';

function moeda(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function linha(titulo, texto) {
  return h('div', { className: 'doar__linha' },
    h('strong', null, titulo),
    h('span', null, texto));
}

export function doarPage() {
  const raiz = h('div', { className: 'vg-pagina doar' });
  const wrap = h('div', { className: 'doar__wrap' });
  const aviso = h('div', { className: 'vg-aviso doar__aviso' },
    h('span', { className: 'vg-badge u-ambar' }, 'MODO PREPARADO'),
    h('p', null, 'Os pagamentos ainda não estão ativos. Esta tela documenta o fluxo e não cria cobranças reais.'));

  const valorInput = h('input', {
    className: 'doar__valor',
    type: 'number',
    min: '5',
    max: '10000',
    step: '1',
    value: '50',
    inputMode: 'decimal',
    ariaLabel: 'Valor da doação em reais'
  });
  const valorResumo = h('span', { className: 'doar__valor-resumo' }, moeda(valorInput.value));
  const status = h('p', { className: 'doar__status', role: 'status' }, 'Pronto para configurar o checkout hospedado do Asaas.');
  const checkoutButton = h('button', { className: 'doar__checkout', type: 'button' }, 'PAGAMENTOS AINDA NÃO ATIVADOS');

  const sugestoes = h('div', { className: 'doar__sugestoes', role: 'group', ariaLabel: 'Sugestões de valor' },
    ...SUGESTOES.map((valor) => {
      const botao = h('button', { className: `doar__sugestao${valor === 50 ? ' is-active' : ''}`, type: 'button' }, moeda(valor));
      botao.onclick = () => {
        valorInput.value = String(valor);
        valorResumo.textContent = moeda(valor);
        for (const outro of sugestoes.querySelectorAll('button')) outro.classList.remove('is-active');
        botao.classList.add('is-active');
      };
      return botao;
    }));

  valorInput.oninput = () => {
    valorResumo.textContent = moeda(Number(valorInput.value) || 0);
    for (const outro of sugestoes.querySelectorAll('button')) outro.classList.remove('is-active');
  };

  checkoutButton.onclick = () => {
    status.textContent = 'Checkout bloqueado com segurança: configure ASAAS_API_KEY, Webhook e domínio público antes de cobrar.';
    status.className = 'doar__status doar__status--alerta';
  };

  const doacao = h('section', { className: 'doar__card doar__card--principal' },
    h('div', { className: 'doar__eyebrow' }, 'APOIE O PROJETO'),
    h('h1', null, 'Ajude a manter o Vanguard Field'),
    h('p', { className: 'doar__lead' }, 'Apoie uma ferramenta de navegação multiuso pensada para cidade, caminhadas e expedições. O fluxo será transparente e registrado do início ao fim.'),
    h('label', { className: 'doar__label', htmlFor: 'doar-valor' }, 'VALOR DA DOAÇÃO'),
    sugestoes,
    h('div', { className: 'doar__valor-wrap' },
      h('span', null, 'R$'),
      valorInput,
      valorResumo),
    checkoutButton,
    status,
    h('p', { className: 'doar__microcopy' }, 'Quando ativado, o checkout hospedado do Asaas exibirá PIX e cartão. O Vanguard não armazenará dados de cartão.'));

  const auditoria = h('section', { className: 'doar__card' },
    h('div', { className: 'doar__eyebrow' }, 'TRANSPARÊNCIA'),
    h('h2', null, 'O que será registrado'),
    h('p', null, 'Ao final de cada transação, o sistema enviará um resumo operacional para o responsável e manterá o histórico protegido no painel.'),
    h('div', { className: 'doar__linhas' },
      linha('Origem', 'tela, campanha ou botão que iniciou a doação'),
      linha('Identificação', 'ID interno, checkout, pagamento e evento do Asaas'),
      linha('Valores', 'bruto, tarifas, líquido e moeda'),
      linha('Status', 'criado, confirmado, recebido, estornado ou contestado'),
      linha('Linha do tempo', 'criação, pagamento, atualização e compensação'),
      linha('Notificação', `resumo enviado para ${RECIPIENT}`)),
    h('p', { className: 'doar__privacy' }, 'O Vanguard não solicitará CPF/CNPJ do doador apenas para registrar a origem financeira.'));

  const ativacao = h('section', { className: 'doar__card' },
    h('div', { className: 'doar__eyebrow' }, 'ATIVAÇÃO FUTURA'),
    h('h2', null, 'Quando você criar o Asaas'),
    h('ol', { className: 'doar__passos' },
      h('li', null, 'Criar e verificar a conta de recebedor no Asaas.'),
      h('li', null, 'Configurar a chave no backend, nunca no navegador.'),
      h('li', null, 'Cadastrar o Webhook com token próprio e URL pública.'),
      h('li', null, 'Testar todo o fluxo no Sandbox antes de usar produção.'),
      h('li', null, 'Conferir o histórico mensal com os extratos do Asaas e do banco.')),
    h('p', { className: 'doar__fiscal' }, 'O relatório ajuda na organização e na auditoria, mas não é uma declaração automática à Receita Federal. A classificação tributária deve ser conferida com um contador.'));

  wrap.append(h('div', { className: 'doar__header' },
    h('span', { className: 'doar__kicker' }, 'VANGUARD FIELD / APOIO'),
    h('button', { className: 'doar__back', type: 'button', onclick: () => { location.hash = '#/inicio'; } }, '← VOLTAR')),
    aviso,
    h('div', { className: 'doar__grid' }, doacao, auditoria, ativacao));
  raiz.append(wrap);

  return { elemento: raiz, desmontar: null };
}
