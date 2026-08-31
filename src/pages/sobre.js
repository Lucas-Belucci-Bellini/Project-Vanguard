/*
 * #/sobre — contrato público do Vanguard Field.
 *
 * A página explica o que o produto faz hoje, o que fica preparado para depois
 * e quais capacidades exigem fontes oficiais, hardware ou comunicação externa.
 */

import { h } from '../ui/helpers.js';
import '../styles/sobre.css';

function painel(titulo, ...corpo) {
  return h('section', { className: 'vg-painel sobre__painel' },
    h('div', { className: 'vg-painel__titulo' }, titulo),
    h('div', { className: 'vg-painel__corpo' }, ...corpo));
}

function linha(status, titulo, descricao) {
  return h('div', { className: 'sobre__linha' },
    h('span', { className: `sobre__status sobre__status--${status}` }, status === 'feito' ? 'FEITO' : status === 'preparado' ? 'PREPARADO' : 'EXTERNO'),
    h('div', { className: 'sobre__linha-copy' }, h('strong', null, titulo), h('p', null, descricao)));
}

export function sobrePage() {
  const raiz = h('div', { className: 'vg-pagina sobre' });
  const wrap = h('div', { className: 'sobre__wrap' });
  raiz.append(wrap);

  wrap.append(
    h('header', { className: 'sobre__header' },
      h('div', null,
        h('div', { className: 'sobre__eyebrow' }, 'CONTRATO PÚBLICO'),
        h('h1', null, 'Navegação que explica seus limites'),
        h('p', null, 'O Vanguard Field é um navegador multiuso para cidade, caminhada, expedição, mar e proteção civil. Ele prioriza dados locais e avisa quando uma função depende de rede, fonte oficial ou equipamento externo.')),
      h('div', { className: 'sobre__version' }, 'PROTÓTIPO', h('small', null, 'OFFLINE-FIRST'))),

    painel('◤ O QUE O PRODUTO FAZ',
      linha('feito', 'Cidade e dia a dia', 'Define destinos por coordenadas ou toque no mapa, mostra distância e rumo e guarda pontos localmente.'),
      linha('feito', 'Trilha e expedição', 'Registra a rota no aparelho, permite pausar/retomar, marca referências e exibe MGRS para orientação.'),
      linha('feito', 'Bússola e GPS/GNSS', 'Usa o sensor de orientação e o rumo do GPS quando disponíveis. O aparelho calcula a posição; isso não é comunicação.'),
      linha('feito', 'Modo Socorro', 'Prepara a última posição, precisão, horário e coordenadas para compartilhamento manual, sem afirmar que uma equipe recebeu o alerta.'),
      linha('feito', 'Sobrevivência', 'Disponibiliza conteúdo local de primeiros passos, abrigo, água, sinalização, alimentação e conduta diante de explosivos.'),
      linha('feito', 'Mapas para uso sem rede', 'Permite preparar a área visível enquanto conectado; a shell, os dados locais e os tiles já guardados podem ser reabertos offline.')),

    painel('◤ MODOS AUTOMÁTICOS DE CONTEXTO',
      h('p', null, 'O modo pode ser escolhido manualmente ou ativado por uma zona local cadastrada com coordenada, raio, fonte e data. A prioridade só sobe quando há uma zona conhecida; sem fonte, o app mantém o modo escolhido.'),
      h('div', { className: 'sobre__contextos' },
        ...['Cidade', 'Expedição', 'Mar', 'Zona de desastre', 'Área contaminada', 'Área de conflito'].map((nome) => h('span', null, nome))),
      h('p', { className: 'sobre__muted' }, 'Uma zona é um aviso geográfico, não um radar. Dados antigos ou sem fonte não devem ser tratados como alerta atual.')),

    painel('◤ O QUE DEPENDE DE FORA',
      linha('preparado', 'Cartas náuticas e profundidade', 'O modo Mar está preparado para cartas, perigos, marés e avisos oficiais. Imagem de satélite não substitui carta náutica atualizada, sonar ou habilitação.'),
      linha('preparado', 'Área contaminada e radiação', 'O app pode exibir uma área de exclusão publicada. Medição de radiação exige contador Geiger ou dosímetro externo identificado e calibrado.'),
      linha('preparado', 'SOS sem rede', 'É necessário mensageiro via satélite, beacon, rádio de dados ou outro canal compatível. GPS, câmera, microfone e bússola não enviam mensagem sozinhos.'),
      linha('externo', 'Drones, tropas e explosões', 'O Vanguard não é radar militar e não confirma a presença de drones, tropas ou explosões. Alertas devem vir de fonte verificada ou equipamento especializado.'),
      linha('externo', 'Minas e restos explosivos', 'O app pode mostrar zonas publicadas e instruções de afastamento. Não identifica, remove, investiga ou libera a passagem por uma área suspeita.'),
      linha('preparado', 'Doações e pagamentos', 'O fluxo Asaas está documentado, mas permanece bloqueado até conta, credenciais, domínio, Webhook e serviço de e-mail reais serem configurados.')),

    painel('◤ PRIVACIDADE E OFFLINE',
      h('ul', null,
        h('li', null, 'A posição fica no aparelho por padrão; compartilhamento exige ação explícita.'),
        h('li', null, 'Sem internet, rotas, pontos, destinos, bússola e manual local continuam disponíveis depois do primeiro carregamento.'),
        h('li', null, 'O aplicativo não tenta enviar pagamento, e-mail ou SOS por uma rede inexistente. Eventos sincronizáveis podem aguardar uma conexão autorizada.'),
        h('li', null, 'O manual de sobrevivência é apoio educacional e não substitui treinamento, atendimento médico, Defesa Civil, autoridade marítima ou especialistas.'))),

    painel('◤ MÓDULO LEGADO ISOLADO',
      h('p', null, 'O repositório preserva um motor e uma tela antigos de cálculo balístico para compatibilidade histórica e testes do projeto original. Eles não fazem parte do produto civil recomendado, não aparecem no fluxo principal e não devem ser usados para emprego real de armamento.'),
      h('button', { className: 'sobre__legacy-button', type: 'button', onclick: () => { location.hash = '#/tiro'; } }, 'ABRIR SOMENTE O MÓDULO LEGADO →')),

    h('footer', { className: 'sobre__footer' },
      h('strong', null, 'Documentação completa'),
      h('p', null, 'Consulte README.md, docs/CONTEXTOS-E-SEGURANCA.md e docs/ASAAS-INTEGRACAO.md no repositório para fontes, preparação offline, auditoria financeira e dependências externas.')));

  return { elemento: raiz, desmontar: null };
}
