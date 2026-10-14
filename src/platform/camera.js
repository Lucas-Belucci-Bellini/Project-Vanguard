/**
 * Captura de foto pela câmera nativa, com a imagem indo também para a galeria
 * do aparelho.
 *
 * O caminho web (`<input type="file" capture>`) funciona e continua sendo o
 * padrão fora do APK. O que ele **não** faz é garantir que a foto apareça na
 * galeria: o arquivo devolvido ao navegador costuma ficar num diretório
 * temporário do próprio app, e se o aplicativo for desinstalado a foto vai
 * junto. Para uma peregrinação isso é perda de registro.
 *
 * Aqui a foto é tirada pelo plugin nativo com `saveToGallery`, e o resultado
 * diz **se a gravação na galeria aconteceu de verdade** (`saved`). Esse valor é
 * repassado como veio: o app não afirma que salvou na galeria sem o sistema ter
 * confirmado.
 *
 * Este módulo nunca é o único caminho. Se o plugin não existir, a plataforma
 * não for nativa ou a chamada falhar, ele devolve `INDISPONIVEL` e quem chama
 * volta para o `<input capture>` — perder a foto porque um plugin faltou seria
 * inaceitável em campo.
 */

export const RESULTADOS_CAPTURA = Object.freeze({
  CAPTURADA: 'CAPTURADA',
  CANCELADA: 'CANCELADA',
  INDISPONIVEL: 'INDISPONIVEL',
  FALHOU: 'FALHOU',
});

let pluginPromise;

function plataformaNativa(capacitorApi) {
  try {
    return capacitorApi?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

async function cameraNativa(override) {
  if (override) return override;
  pluginPromise ??= import('@capacitor/camera').then(({ Camera }) => ({
    takePhoto: (...args) => Camera.takePhoto(...args),
  }));
  return pluginPromise;
}

function indisponivel(motivo) {
  return { estado: RESULTADOS_CAPTURA.INDISPONIVEL, bytes: null, mime: null, salvouNaGaleria: false, motivo };
}

function cancelamento(erro) {
  const texto = String(erro?.message ?? erro ?? '').toLowerCase();
  return texto.includes('cancel') || texto.includes('cancelad') || texto.includes('user denied');
}

/** `true` quando vale a pena tentar o caminho nativo antes do `<input>`. */
export function cameraNativaDisponivel(capacitorApi = globalThis.Capacitor) {
  return plataformaNativa(capacitorApi);
}

export async function capturarFotoDaParada({
  capacitorApi = globalThis.Capacitor,
  cameraApi = null,
  buscar = typeof fetch === 'function' ? fetch : null,
  salvarNaGaleria = true,
  qualidade = 82,
} = {}) {
  if (!plataformaNativa(capacitorApi)) {
    return indisponivel('A câmera nativa só existe dentro do aplicativo instalado.');
  }

  let camera;
  try {
    camera = await cameraNativa(cameraApi);
  } catch (erro) {
    return indisponivel(erro?.message ?? 'O plugin de câmera não pôde ser carregado.');
  }
  if (typeof camera?.takePhoto !== 'function') {
    return indisponivel('O plugin de câmera não expõe a captura de foto.');
  }

  let resultado;
  try {
    resultado = await camera.takePhoto({
      quality: qualidade,
      saveToGallery: salvarNaGaleria,
      correctOrientation: true,
    });
  } catch (erro) {
    return cancelamento(erro)
      ? { estado: RESULTADOS_CAPTURA.CANCELADA, bytes: null, mime: null, salvouNaGaleria: false, motivo: 'Captura cancelada.' }
      : { estado: RESULTADOS_CAPTURA.FALHOU, bytes: null, mime: null, salvouNaGaleria: false, motivo: erro?.message ?? 'A câmera nativa falhou.' };
  }

  const uri = resultado?.uri;
  if (!uri || typeof buscar !== 'function') {
    return { estado: RESULTADOS_CAPTURA.FALHOU, bytes: null, mime: null, salvouNaGaleria: resultado?.saved === true, motivo: 'A câmera não devolveu um arquivo legível.' };
  }

  try {
    // `convertFileSrc` traduz o caminho nativo para uma URL que a WebView lê.
    const endereco = typeof capacitorApi?.convertFileSrc === 'function' ? capacitorApi.convertFileSrc(uri) : uri;
    const resposta = await buscar(endereco);
    if (!resposta?.ok) throw new Error(`leitura do arquivo respondeu ${resposta?.status ?? 'sem status'}`);
    const buffer = await resposta.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes.byteLength === 0) throw new Error('o arquivo da foto veio vazio');
    return {
      estado: RESULTADOS_CAPTURA.CAPTURADA,
      bytes,
      mime: resposta.headers?.get?.('content-type') || 'image/jpeg',
      // Repassado como o sistema devolveu: sem confirmação, não afirmamos.
      salvouNaGaleria: resultado?.saved === true,
      motivo: null,
    };
  } catch (erro) {
    return { estado: RESULTADOS_CAPTURA.FALHOU, bytes: null, mime: null, salvouNaGaleria: resultado?.saved === true, motivo: erro?.message ?? 'A foto não pôde ser lida do aparelho.' };
  }
}
