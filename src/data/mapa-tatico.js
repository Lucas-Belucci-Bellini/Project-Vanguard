/**
 * Mapa tático de resgate do Vanguard.
 *
 * Em vez de depender de CARTO/raster tiles, esta opção usa o estilo vetorial
 * Dark do OpenFreeMap sobre dados OpenStreetMap. A arquitetura permite trocar
 * a URL por um endpoint próprio/self-hosted no futuro, sem mudar o renderer.
 *
 * Importante: a instância pública é ONLINE. Ela não é declarada como dataset
 * offline. Para offline distribuível, o Vanguard deverá hospedar/processar
 * seus próprios dados OSM e cumprir ODbL/atribuição.
 */
export const MAPA_TATICO_RESGATE = {
  id: 'vanguard-rescue-tactical',
  nome: 'Vanguard Tactical — Resgate',
  tipo: 'vector-style',
  onlineStyle: 'https://tiles.openfreemap.org/styles/dark',
  fonteDados: 'OpenStreetMap via OpenFreeMap/OpenMapTiles',
  creditos: 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap',
  apiKeyRequired: false,
  offline: false,
};

export function estiloTaticoOnline() {
  return MAPA_TATICO_RESGATE.onlineStyle;
}

export function avisoOfflineTatico() {
  return 'O mapa tático online não é o dataset offline. O modo offline exige dados OSM processados e distribuídos pelo Vanguard sob as condições aplicáveis da ODbL.';
}
