/**
 * Como o trajeto vira texto na tela.
 *
 * Mora em `src/ui/` e não em `src/engine/`: não é física, é apresentação — e
 * a regra deste repositório é que o motor não sabe que existe tela. Mas
 * também não mora dentro da página, porque a página importa CSS e o Node não
 * importa CSS: função pura que ninguém consegue testar acaba não testada.
 *
 * Sem DOM, sem dependência.
 */

/** Metros viram quilômetro a partir de 1 000 — e a unidade sai separada do
 * número, para a tela poder dar tamanhos diferentes a cada um. */
export function formatarDistancia(metros) {
  const m = Number.isFinite(metros) ? Math.max(0, metros) : 0;
  if (m < 1000) return { valor: String(Math.round(m)), unidade: 'm' };
  // Acima de 10 km a segunda casa é ruído numa tela lida de relance: o erro
  // do GNSS numa caminhada dessas é de dezenas de metros, não de dez.
  return { valor: (m / 1000).toFixed(m < 10_000 ? 2 : 1), unidade: 'km' };
}

/** Duração em h:mm:ss — em campo, "5 425 s" não responde a pergunta. */
export function formatarDuracao(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const total = Math.floor(ms / 1000);
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  const dois = (n) => String(n).padStart(2, '0');
  return horas ? `${horas}:${dois(minutos)}:${dois(segundos)}` : `${minutos}:${dois(segundos)}`;
}

/** Abaixo disto o ruído do GPS domina e o ritmo seria invenção. */
export const DISTANCIA_MINIMA_RITMO_M = 50;

/**
 * Ritmo em min/km — o número que quem caminha realmente usa.
 *
 * Cala-se em vez de mentir: sem distância suficiente para dividir, ou com um
 * resultado absurdo (parado quase o tempo todo), devolve travessão. Um ritmo
 * de "120:00 /km" na tela é pior que campo vazio, porque parece medida.
 */
export function formatarRitmo(metros, ms) {
  if (!Number.isFinite(metros) || !Number.isFinite(ms)) return '—';
  if (metros < DISTANCIA_MINIMA_RITMO_M || ms <= 0) return '—';
  const minPorKm = (ms / 60_000) / (metros / 1000);
  if (!Number.isFinite(minPorKm) || minPorKm > 99) return '—';
  const minutos = Math.floor(minPorKm);
  const segundos = Math.round((minPorKm - minutos) * 60);
  // 9,99 min/km arredonda para 60 s: sem isto a tela mostraria "9:60".
  if (segundos === 60) return `${minutos + 1}:00 /km`;
  return `${minutos}:${String(segundos).padStart(2, '0')} /km`;
}
