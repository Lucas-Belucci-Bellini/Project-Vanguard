/**
 * Configuração pública de basemap do Vanguard.
 *
 * A chave CARTO é fornecida em build/runtime pelo Vite:
 *   VITE_CARTO_API_KEY=...
 *
 * Nunca comite a chave real no repositório.
 */
export function cartoBasemapKey() {
  return import.meta.env?.VITE_CARTO_API_KEY || '';
}

export function cartoVoyagerTiles() {
  const key = cartoBasemapKey();
  const suffix = key ? `?key=${encodeURIComponent(key)}` : '';
  return [
    `https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png${suffix}`,
    `https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png${suffix}`,
    `https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png${suffix}`,
    `https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png${suffix}`,
  ];
}

export function cartoBasemapDisponivel() {
  return Boolean(cartoBasemapKey());
}
