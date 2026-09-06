/**
 * Vocabulário tátil: cada aviso tem um ritmo próprio, para ser reconhecido
 * **sem tirar o celular do bolso**.
 *
 * A regra que organiza tudo: no sol forte, na chuva, com o grupo andando, a
 * pessoa não vai olhar a tela. Se todo aviso vibrar igual, ela tira o aparelho
 * do bolso para descobrir o que era — e aí o aviso custou mais do que entregou.
 * Por isso o **tipo** está no ritmo e a **gravidade** na repetição:
 *
 * | Aviso | Ritmo | Como se reconhece |
 * |---|---|---|
 * | Exposição ao sol | pulsos longos crescentes | "vai apertando" |
 * | Sem parada | dois pulsos iguais e curtos | batida dupla de lembrete |
 * | Chuva | vários pulsos bem curtos e rápidos | gotas |
 * | Tempestade | curto-longo alternado | sirene |
 * | Frio | três pulsos muito curtos, espaçados | tremor |
 * | Fora da rota | um pulso longo isolado | toque único, seco |
 * | Veículo se aproximando | um longo e dois curtos | "vem pesado — sai, sai" |
 * | Chamado de voz | curto-longo-curto, simétrico | apito de chamada |
 *
 * Um ritmo nunca se repete entre tipos: é isso que torna o vocabulário
 * legível pelo tato, e é o que o teste cobra.
 *
 * ## O que dispara cada um
 *
 * Ter o ritmo pronto não significa ter o gatilho. Sol e tempo sem parada são
 * calculáveis no aparelho, sem rede. Chuva, tempestade e frio dependem de uma
 * fonte externa que o celular não tem: **não existe sensor de chuva, e o
 * barômetro, quando o aparelho tem, não é exposto ao aplicativo**. Esses tipos
 * ficam registrados e sem gatilho até existir uma fonte com origem e horário —
 * `gatilhoDisponivel` diz qual é qual, para a tela nunca prometer um aviso que
 * não vai chegar.
 *
 * Os dois avisos acústicos têm gatilho porque o microfone é um sensor que o
 * aparelho realmente tem e que o navegador realmente entrega: quem os dispara
 * é `src/core/escuta-ambiente.js`, sobre a matemática de `src/engine/escuta.js`.
 * O intervalo deles é de segundos, não de minutos — um caminhão avisado cinco
 * minutos depois não é aviso, é registro.
 */

export const TIPOS_ALERTA = Object.freeze({
  EXPOSICAO_SOL: 'EXPOSICAO_SOL',
  SEM_PARADA: 'SEM_PARADA',
  CHUVA: 'CHUVA',
  TEMPESTADE: 'TEMPESTADE',
  FRIO: 'FRIO',
  FORA_DA_ROTA: 'FORA_DA_ROTA',
  VEICULO_APROXIMANDO: 'VEICULO_APROXIMANDO',
  CHAMADO_VOZ: 'CHAMADO_VOZ',
});

export const GRAVIDADES = Object.freeze({
  AVISO: 'AVISO',
  ALTO: 'ALTO',
  CRITICO: 'CRITICO',
});

const REPETICOES = Object.freeze({
  [GRAVIDADES.AVISO]: 1,
  [GRAVIDADES.ALTO]: 2,
  [GRAVIDADES.CRITICO]: 3,
});

/** Ritmo base de cada tipo: pulso e pausa em milissegundos. */
const RITMOS = Object.freeze({
  [TIPOS_ALERTA.EXPOSICAO_SOL]: { pulsos: [200, 350, 500], pausa: 150 },
  [TIPOS_ALERTA.SEM_PARADA]: { pulsos: [180, 180], pausa: 220 },
  [TIPOS_ALERTA.CHUVA]: { pulsos: [70, 70, 70, 70, 70], pausa: 80 },
  [TIPOS_ALERTA.TEMPESTADE]: { pulsos: [90, 420, 90, 420], pausa: 130 },
  [TIPOS_ALERTA.FRIO]: { pulsos: [60, 60, 60], pausa: 300 },
  [TIPOS_ALERTA.FORA_DA_ROTA]: { pulsos: [700], pausa: 250 },
  [TIPOS_ALERTA.VEICULO_APROXIMANDO]: { pulsos: [450, 120, 120], pausa: 140 },
  [TIPOS_ALERTA.CHAMADO_VOZ]: { pulsos: [140, 300, 140], pausa: 160 },
});

/** Gatilho calculável no aparelho, sem rede nem sensor que ele não tem. */
const GATILHO_DISPONIVEL = Object.freeze({
  [TIPOS_ALERTA.EXPOSICAO_SOL]: true,
  [TIPOS_ALERTA.SEM_PARADA]: true,
  [TIPOS_ALERTA.CHUVA]: false,
  [TIPOS_ALERTA.TEMPESTADE]: false,
  [TIPOS_ALERTA.FRIO]: false,
  [TIPOS_ALERTA.FORA_DA_ROTA]: true,
  [TIPOS_ALERTA.VEICULO_APROXIMANDO]: true,
  [TIPOS_ALERTA.CHAMADO_VOZ]: true,
});

const DESCRICOES = Object.freeze({
  [TIPOS_ALERTA.EXPOSICAO_SOL]: 'Exposição ao sol — pulsos longos, crescentes.',
  [TIPOS_ALERTA.SEM_PARADA]: 'Tempo sem parada — batida dupla curta.',
  [TIPOS_ALERTA.CHUVA]: 'Chuva — pulsos curtos e rápidos.',
  [TIPOS_ALERTA.TEMPESTADE]: 'Tempestade — curto e longo alternados.',
  [TIPOS_ALERTA.FRIO]: 'Frio — três toques muito curtos, espaçados.',
  [TIPOS_ALERTA.FORA_DA_ROTA]: 'Fora da rota — um toque longo isolado.',
  [TIPOS_ALERTA.VEICULO_APROXIMANDO]: 'Veículo se aproximando — um toque longo e dois curtos.',
  [TIPOS_ALERTA.CHAMADO_VOZ]: 'Alguém chamando — curto, longo e curto.',
});

/** Intervalo mínimo entre dois avisos **do mesmo tipo**. */
export const INTERVALO_POR_TIPO_MS = Object.freeze({
  [TIPOS_ALERTA.EXPOSICAO_SOL]: 15 * 60_000,
  [TIPOS_ALERTA.SEM_PARADA]: 15 * 60_000,
  [TIPOS_ALERTA.CHUVA]: 20 * 60_000,
  [TIPOS_ALERTA.TEMPESTADE]: 10 * 60_000,
  [TIPOS_ALERTA.FRIO]: 20 * 60_000,
  [TIPOS_ALERTA.FORA_DA_ROTA]: 2 * 60_000,
  // Segundos, não minutos: um veículo leva de dez a vinte segundos entre ser
  // ouvido e passar. Um aviso represado por minutos chegaria depois dele.
  [TIPOS_ALERTA.VEICULO_APROXIMANDO]: 30_000,
  [TIPOS_ALERTA.CHAMADO_VOZ]: 20_000,
});

function ritmoDe(tipo) {
  return RITMOS[tipo] ?? null;
}

/**
 * Padrão para `navigator.vibrate`: pulso, pausa, pulso… A gravidade repete o
 * ritmo em vez de trocá-lo, para o tipo continuar reconhecível quando aperta.
 */
export function padraoDoAlerta(tipo, gravidade = GRAVIDADES.ALTO) {
  const ritmo = ritmoDe(tipo);
  if (!ritmo) return null;
  const repeticoes = REPETICOES[gravidade] ?? REPETICOES[GRAVIDADES.AVISO];
  const padrao = [];
  for (let volta = 0; volta < repeticoes; volta += 1) {
    ritmo.pulsos.forEach((pulso, indice) => {
      padrao.push(pulso);
      const ultimoPulsoDaVolta = indice === ritmo.pulsos.length - 1;
      const ultimaVolta = volta === repeticoes - 1;
      if (!ultimoPulsoDaVolta) padrao.push(ritmo.pausa);
      else if (!ultimaVolta) padrao.push(ritmo.pausa * 3);
    });
  }
  return padrao;
}

export function descreverAlerta(tipo) {
  return DESCRICOES[tipo] ?? null;
}

export function gatilhoDisponivel(tipo) {
  return GATILHO_DISPONIVEL[tipo] ?? false;
}

/** Catálogo para a tela mostrar o vocabulário e o que ainda não tem gatilho. */
export function catalogoAlertas() {
  return Object.values(TIPOS_ALERTA).map((tipo) => ({
    tipo,
    descricao: descreverAlerta(tipo),
    padrao: padraoDoAlerta(tipo, GRAVIDADES.ALTO),
    gatilhoDisponivel: gatilhoDisponivel(tipo),
    intervaloMs: INTERVALO_POR_TIPO_MS[tipo],
  }));
}

/**
 * Decide e executa a vibração de um tipo.
 *
 * O intervalo é **por tipo**: um aviso de sol não pode calar um aviso de
 * tempestade, e cada um guarda o próprio último instante.
 */
export function dispararAlerta({
  tipo,
  gravidade = GRAVIDADES.ALTO,
  agora = Date.now(),
  ultimoAvisoPorTipo = {},
  vibrarApi = typeof navigator !== 'undefined' ? navigator.vibrate?.bind(navigator) : null,
} = {}) {
  const padrao = padraoDoAlerta(tipo, gravidade);
  if (!padrao) {
    return { vibrou: false, motivo: 'TIPO_DESCONHECIDO', padrao: null, ultimoAvisoPorTipo };
  }

  const anterior = Number(ultimoAvisoPorTipo?.[tipo]);
  const intervalo = INTERVALO_POR_TIPO_MS[tipo];
  if (Number.isFinite(anterior) && Number(agora) - anterior < intervalo) {
    return { vibrou: false, motivo: 'INTERVALO_NAO_CUMPRIDO', padrao, ultimoAvisoPorTipo };
  }

  const registro = { ...ultimoAvisoPorTipo, [tipo]: Number(agora) };
  if (typeof vibrarApi !== 'function') {
    // Sem vibração o aviso não some: ele continua no texto da tela. iOS ignora
    // a API, e é por isso que o canal visual nunca pode depender dela.
    return { vibrou: false, motivo: 'VIBRACAO_INDISPONIVEL', padrao, ultimoAvisoPorTipo: registro };
  }

  try {
    vibrarApi(padrao);
  } catch {
    return { vibrou: false, motivo: 'VIBRACAO_FALHOU', padrao, ultimoAvisoPorTipo: registro };
  }
  return { vibrou: true, motivo: null, padrao, ultimoAvisoPorTipo: registro };
}
