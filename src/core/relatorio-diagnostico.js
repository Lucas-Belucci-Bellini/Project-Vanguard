/**
 * Relatório de diagnóstico em texto — o que o operador cola de volta.
 *
 * O impasse que ele resolve: o app sabe tudo (versão, build, origem, service
 * worker, falhas de tela, autoteste de rotas) e o operador não tem como me
 * contar. Descrever de memória perde exatamente os detalhes que decidem — o
 * `BUILD_ID`, a mensagem de erro exata, qual rota.
 *
 * É texto puro, montado aqui e copiado pela tela. Duas regras:
 *
 * 1. **Nada de dado pessoal.** Sem coordenada, sem trilha, sem foto, sem
 *    contato. O relatório é sobre o BUILD e a CADEIA, não sobre onde a pessoa
 *    esteve. Um relatório que vaza posição não pode ser colado num chat.
 * 2. **Campo ausente aparece como ausente.** `INDISPONÍVEL` é informação —
 *    inventar um valor plausível destruiria o motivo do relatório existir.
 */

const LARGURA = 60;

function linha(rotulo, valor) {
  const v = valor === null || valor === undefined || valor === '' ? 'INDISPONÍVEL' : String(valor);
  return `${rotulo.padEnd(22)} ${v}`;
}

function secao(titulo) {
  return `\n${'─'.repeat(LARGURA)}\n${titulo}\n${'─'.repeat(LARGURA)}`;
}

/**
 * Monta o relatório. Tudo é injetado: nenhuma leitura de global aqui dentro,
 * para o texto poder ser conferido por teste sem navegador.
 */
export function montarRelatorio({
  identidade = {},
  serviceWorker = null,
  falhas = [],
  autoteste = null,
  agora = () => new Date(),
} = {}) {
  const partes = [];
  partes.push('VANGUARD FIELD · RELATÓRIO DE DIAGNÓSTICO');
  partes.push(`gerado em ${agora().toISOString()}`);

  partes.push(secao('BUILD / RUNTIME'));
  partes.push(linha('Versão do app', identidade.versao));
  partes.push(linha('Bundle web', identidade.build));
  partes.push(linha('Commit', identidade.commit));
  partes.push(linha('Execução', identidade.nativo ? `APLICATIVO · ${identidade.plataforma ?? '?'}` : 'NAVEGADOR · web'));
  partes.push(linha('Origem', identidade.origem));
  partes.push(linha('Contexto seguro', identidade.contextoSeguro === undefined ? null : (identidade.contextoSeguro ? 'SIM' : 'NÃO')));
  partes.push(linha('Service worker', serviceWorker));
  partes.push(linha('WebView', identidade.agente ? String(identidade.agente).slice(0, 120) : null));

  partes.push(secao('AUTOTESTE DE ROTAS'));
  if (!autoteste || !autoteste.length) {
    partes.push('não executado — toque em TESTAR TODAS AS ROTAS antes de copiar');
  } else {
    const falhou = autoteste.filter((l) => l.resultado !== 'OK');
    partes.push(`${autoteste.length} rota(s) testada(s) · ${falhou.length} com falha`);
    partes.push('');
    for (const l of autoteste) {
      const marca = l.resultado === 'OK' ? 'OK  ' : 'FALHA';
      partes.push(`${marca} ${l.hash.padEnd(18)} ${String(l.ms).padStart(5)} ms${l.tipo ? `  ${l.tipo}` : ''}`);
      if (l.mensagem) partes.push(`      ${l.mensagem}`);
    }
  }

  partes.push(secao('FALHAS DE TELA REGISTRADAS'));
  if (!falhas.length) {
    partes.push('nenhuma');
  } else {
    for (const f of falhas) {
      partes.push(`${f.rota}${f.vezes > 1 ? ` (${f.vezes}×)` : ''} · ${f.tipo}`);
      partes.push(`  ${f.mensagem}`);
      if (f.build) partes.push(`  build: ${f.build}`);
    }
  }

  partes.push('');
  partes.push('Este relatório não contém coordenada, trilha, foto nem contato.');
  return partes.join('\n');
}
