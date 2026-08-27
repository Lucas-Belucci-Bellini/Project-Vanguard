function normalizar(valor) {
  return Number.isFinite(Number(valor)) ? Number(valor).toFixed(9) : 'INDISPONÍVEL';
}

/**
 * Cria uma chave estável para evitar redesenhar o canvas quando nada visual mudou.
 * Não mede FPS e não controla a frequência do GPS; apenas deduplica trabalho idempotente.
 */
export function chaveDesenhoGrade({ center = {}, zoom, bearing = 0, pitch = 0, largura, altura, dpr = 1, versaoGrade = 0 } = {}) {
  return [
    normalizar(center.lng),
    normalizar(center.lat),
    normalizar(zoom),
    normalizar(bearing),
    normalizar(pitch),
    normalizar(largura),
    normalizar(altura),
    normalizar(dpr),
    String(versaoGrade),
  ].join('|');
}
