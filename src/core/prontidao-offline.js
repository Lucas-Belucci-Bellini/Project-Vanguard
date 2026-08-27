/**
 * Diagnóstico local de preparação para uso sem internet.
 *
 * Este módulo só avalia dados que o aplicativo já possui. Ele não verifica
 * cobertura, não testa um provedor de SOS e não confunde posicionamento com
 * comunicação.
 */

const LIMITE_IDADE_POSICAO_MS = 24 * 60 * 60 * 1000;

function posicaoValida(posicao) {
  const lat = Number(posicao?.lat);
  const lon = Number(posicao?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function statusPosicao(posicao, agora) {
  if (!posicaoValida(posicao)) return { estado: 'pendente', detalhe: 'Ative o GPS e aguarde um fixo local.' };
  const referencia = Number(agora);
  const criadoEm = Number(posicao.createdAt ?? posicao.timestamp);
  if (!Number.isFinite(referencia) || referencia <= 0 || !Number.isFinite(criadoEm) || criadoEm <= 0 || criadoEm > referencia) {
    return { estado: 'atencao', detalhe: 'A posição é válida, mas a idade do fixo não pode ser confirmada.' };
  }
  if (referencia - criadoEm > LIMITE_IDADE_POSICAO_MS) {
    return { estado: 'atencao', detalhe: 'Há uma posição salva, mas ela tem mais de 24 horas.' };
  }
  return { estado: 'ok', detalhe: 'Último fixo válido guardado no aparelho.' };
}

export function avaliarProntidaoOffline({
  posicao = null,
  mapasOffline = null,
  cacheTiles = 0,
  armazenamento = true,
  serviceWorker = null,
  manualDisponivel = true,
  trilha = [],
  waypoints = [],
  agora = Date.now(),
} = {}) {
  const itens = [];
  const posicaoStatus = statusPosicao(posicao, agora);
  itens.push({ id: 'posicao', nome: 'Posição local', estado: posicaoStatus.estado, detalhe: posicaoStatus.detalhe });

  const tiles = Math.max(Number(cacheTiles) || 0, Number(mapasOffline?.tilesSalvos) || 0);
  itens.push({
    id: 'mapa',
    nome: 'Mapa preparado',
    estado: tiles > 0 ? 'ok' : 'pendente',
    detalhe: tiles > 0 ? `${tiles} tiles registrados como disponíveis no aparelho.` : 'Prepare a área visível enquanto estiver conectado.',
  });

  itens.push({
    id: 'dados',
    nome: 'Dados locais',
    estado: armazenamento ? 'ok' : 'atencao',
    detalhe: armazenamento ? `${trilha.length} pontos de trilha e ${waypoints.length} waypoints no armazenamento local.` : 'O armazenamento local não está disponível neste ambiente.',
  });

  itens.push({
    id: 'manual',
    nome: 'Manual de referência',
    estado: manualDisponivel ? 'ok' : 'atencao',
    detalhe: manualDisponivel ? 'Sobrevivência e instruções básicas estão incluídas no aplicativo.' : 'Abra o manual enquanto estiver conectado para conferir o conteúdo.',
  });

  itens.push({
    id: 'comunicacao',
    nome: 'Comunicação de emergência',
    estado: 'atencao',
    detalhe: serviceWorker === false
      ? 'Nenhum canal externo foi configurado; GPS não transmite SOS sozinho.'
      : 'Prepare um mensageiro, rádio ou contato alternativo; o aplicativo não confirma entrega.',
  });

  const conferidos = itens.filter((item) => item.estado === 'ok').length;
  const essenciais = itens.filter((item) => ['posicao', 'mapa', 'dados', 'manual'].includes(item.id));
  return {
    itens,
    conferidos,
    total: itens.length,
    pronto: essenciais.every((item) => item.estado === 'ok'),
    recomendacao: essenciais.every((item) => item.estado === 'ok')
      ? 'Base local conferida. Faça uma revisão final do itinerário e leve um canal de comunicação independente.'
      : 'Ainda falta preparar a posição ou os dados locais antes de sair sem internet.',
  };
}
