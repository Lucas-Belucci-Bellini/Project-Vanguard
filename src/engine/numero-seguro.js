/**
 * Conversão numérica que não inventa valor.
 *
 * `Number(null)`, `Number('')`, `Number(false)` e `Number([])` valem **0**, e
 * `Number(['5'])` vale 5. Num aplicativo de navegação isso não é um detalhe de
 * tipagem: um `lon: null` aceito como 0 coloca a pessoa no golfo da Guiné, a
 * milhares de quilômetros de onde ela está, sem nenhum erro aparecer.
 *
 * Este módulo existe porque a armadilha já apareceu em quatro lugares — registro
 * importado, foto de parada, trajeto e posição solar. Mora no motor por ser
 * lógica pura e sem dependência, de onde o motor e o núcleo podem usá-la sem
 * que exista uma segunda cópia para esquecer a guarda.
 */

/** Só número e string numérica viram número; o resto vira `null`. */
export function numeroFinito(valor) {
  if (typeof valor !== 'number' && typeof valor !== 'string') return null;
  if (typeof valor === 'string' && valor.trim() === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

/** Número dentro de um intervalo fechado, ou `null`. */
export function numeroNoIntervalo(valor, minimo, maximo) {
  const numero = numeroFinito(valor);
  return numero != null && numero >= minimo && numero <= maximo ? numero : null;
}

/** Latitude/longitude válidas, ou `null` — nunca um par parcialmente inventado. */
export function coordenadaValida(entrada) {
  const lat = numeroNoIntervalo(entrada?.lat, -90, 90);
  const lon = numeroNoIntervalo(entrada?.lon, -180, 180);
  return lat == null || lon == null ? null : { lat, lon };
}
