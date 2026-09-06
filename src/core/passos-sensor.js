/**
 * Ponte entre o acelerômetro do aparelho e o contador de passos do motor.
 *
 * ## Para que serve, em campo
 *
 * Dentro de prédio, em escada, sob mata fechada ou entre paredes altas, o GPS
 * não entrega fixo utilizável — e o app fica dizendo que a pessoa está parada
 * enquanto ela anda. O acelerômetro não tem esse problema: ele mede o próprio
 * movimento do aparelho e funciona onde nenhum satélite chega.
 *
 * ## O que ele acrescenta e o que ele não substitui
 *
 * Passo **não é posição**. Este módulo responde "você andou, e mais ou menos
 * quanto", nunca "você está aqui". A trilha e o mapa continuam sendo do GPS.
 * A distância por passos entra como **segunda opinião**: quando o GPS some, é
 * ela que impede o dia inteiro de virar zero.
 *
 * ## A passada é calibrada, não chutada
 *
 * Enquanto o GPS está bom, o módulo compara distância medida com passos
 * contados no mesmo trecho e aprende o comprimento da passada daquela pessoa
 * naquele terreno. Sem calibração ele usa um valor padrão e **diz que é
 * estimativa** — número apresentado como medida quando é chute é pior que
 * número nenhum.
 *
 * No Android o `devicemotion` não pede permissão. No iOS 13+ pede, e a
 * permissão só pode ser solicitada dentro de um gesto da pessoa — por isso
 * `iniciar()` precisa ser chamado a partir de um toque.
 */

import { criarContadorDePassos, calibrarPassada, distanciaPorPassos, LIMITES_PASSOS } from '../engine/passos.js';
import { estado, CHAVES } from './estado.js';

export const ESTADOS_PASSOS = Object.freeze({
  PARADO: 'PARADO',
  INDISPONIVEL: 'INDISPONIVEL',
  NEGADO: 'NEGADO',
  CONTANDO: 'CONTANDO',
});

/** Trecho mínimo de GPS confiável para uma calibração valer alguma coisa. */
const CALIBRACAO = Object.freeze({ passosMinimos: 60, distanciaMinimaM: 40, precisaoMaximaM: 15 });

export function criarSensorDePassos({
  aoAtualizar = () => {},
  aoEstado = () => {},
  janela = typeof window !== 'undefined' ? window : null,
  armazenamento = estado,
} = {}) {
  const contador = criarContadorDePassos();
  let estadoAtual = ESTADOS_PASSOS.PARADO;
  let ouvindo = false;
  let passadaM = null;
  // Âncora da calibração: onde estávamos e quantos passos tínhamos quando o
  // trecho confiável começou.
  let ancora = null;

  try {
    const guardado = armazenamento?.get?.(CHAVES.PASSOS, null);
    const valor = Number(guardado?.passadaM);
    if (Number.isFinite(valor) && valor >= LIMITES_PASSOS.passadaMinimaM && valor <= LIMITES_PASSOS.passadaMaximaM) {
      passadaM = valor;
    }
  } catch { /* sem passada guardada; segue com estimativa */ }

  function mudarEstado(novo) {
    estadoAtual = novo;
    aoEstado({ estado: novo, passos: contador.passos(), passadaM });
  }

  function aoMovimento(evento) {
    // `accelerationIncludingGravity` é o que existe em todo aparelho; a versão
    // sem gravidade falta em muitos, e o motor já remove a gravidade sozinho.
    const a = evento?.accelerationIncludingGravity ?? evento?.acceleration;
    if (!a) return;
    const resultado = contador.observar({
      instante: typeof evento.timeStamp === 'number' ? evento.timeStamp : Date.now(),
      x: a.x, y: a.y, z: a.z,
    });
    if (resultado.passo) aoAtualizar(resumo());
  }

  function resumo() {
    const passos = contador.passos();
    const { distanciaM, passadaUsadaM, calibrada } = distanciaPorPassos({ passos, passadaM });
    return {
      estado: estadoAtual,
      passos,
      distanciaM,
      passadaUsadaM,
      calibrada,
      cadenciaPpm: contador.cadenciaPpm(),
    };
  }

  return {
    estado: () => estadoAtual,
    resumo,

    async iniciar() {
      if (ouvindo) return estadoAtual;
      const Motion = janela?.DeviceMotionEvent;
      if (!Motion || typeof janela.addEventListener !== 'function') {
        mudarEstado(ESTADOS_PASSOS.INDISPONIVEL);
        return estadoAtual;
      }
      // iOS 13+ exige pedido explícito, e só dentro de um gesto.
      if (typeof Motion.requestPermission === 'function') {
        try {
          const resposta = await Motion.requestPermission();
          if (resposta !== 'granted') { mudarEstado(ESTADOS_PASSOS.NEGADO); return estadoAtual; }
        } catch {
          mudarEstado(ESTADOS_PASSOS.NEGADO);
          return estadoAtual;
        }
      }
      janela.addEventListener('devicemotion', aoMovimento);
      ouvindo = true;
      mudarEstado(ESTADOS_PASSOS.CONTANDO);
      return estadoAtual;
    },

    parar() {
      if (ouvindo) janela.removeEventListener('devicemotion', aoMovimento);
      ouvindo = false;
      ancora = null;
      if (estadoAtual !== ESTADOS_PASSOS.PARADO) mudarEstado(ESTADOS_PASSOS.PARADO);
      return estadoAtual;
    },

    /**
     * Alimenta a calibração com um fixo de GPS.
     *
     * Só trechos com precisão boa entram: calibrar contra deriva de GPS
     * produziria passada de dois metros e estragaria toda a contagem seguinte —
     * `calibrarPassada` recusa isso, e aqui o trecho ruim nem chega lá.
     */
    observarGps(posicao, distanciaAcumuladaM) {
      const precisao = Number(posicao?.accuracy);
      const distancia = Number(distanciaAcumuladaM);
      if (!Number.isFinite(distancia)) return null;
      if (!Number.isFinite(precisao) || precisao > CALIBRACAO.precisaoMaximaM) {
        ancora = null;   // trecho deixou de ser confiável; recomeça depois
        return null;
      }
      if (!ancora) { ancora = { distanciaM: distancia, passos: contador.passos() }; return null; }

      const deltaDistancia = distancia - ancora.distanciaM;
      const deltaPassos = contador.passos() - ancora.passos;
      if (deltaPassos < CALIBRACAO.passosMinimos || deltaDistancia < CALIBRACAO.distanciaMinimaM) return null;

      const resultado = calibrarPassada({ distanciaM: deltaDistancia, passos: deltaPassos });
      ancora = { distanciaM: distancia, passos: contador.passos() };
      if (!resultado.aceita) return resultado;
      passadaM = resultado.passadaM;
      try { armazenamento?.set?.(CHAVES.PASSOS, { passadaM, calibradaEm: Date.now() }); } catch { /* segue sem persistir */ }
      aoAtualizar(resumo());
      return resultado;
    },

    zerar() {
      contador.reiniciar();
      ancora = null;
      aoAtualizar(resumo());
    },
  };
}
