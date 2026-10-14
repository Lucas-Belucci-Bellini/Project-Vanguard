/**
 * Empacotador ZIP mínimo, sem dependência.
 *
 * Existe para o app entregar **um arquivo só** com as fotos da caminhada e a
 * trilha ao lado delas. Duas fotos e um GPX soltos se separam no caminho: o
 * pacote mantém a foto e a coordenada dela juntas, que é a única forma de a
 * imagem continuar dizendo onde foi tirada depois de sair do aparelho.
 *
 * Grava com o método **stored** (sem compressão), de propósito: JPEG e PNG já
 * vêm comprimidos, então comprimir de novo gasta CPU e bateria em campo para
 * não ganhar quase nada. Sem compressão o empacotamento é uma cópia de bytes
 * mais um cabeçalho.
 *
 * Limite: sem ZIP64, então cada arquivo e o pacote inteiro precisam caber em
 * 4 GiB. O código recusa acima disso em vez de gerar um pacote quebrado.
 */

const ASSINATURA_LOCAL = 0x04034b50;
const ASSINATURA_CENTRAL = 0x02014b50;
const ASSINATURA_FIM = 0x06054b50;
const VERSAO = 20;
/** Bit 11: nomes em UTF-8, para acento não virar caractere errado. */
const FLAG_UTF8 = 0x0800;
const METODO_STORED = 0;
const LIMITE_32 = 0xffffffff;

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256);
  for (let indice = 0; indice < 256; indice += 1) {
    let valor = indice;
    for (let bit = 0; bit < 8; bit += 1) {
      valor = valor & 1 ? 0xedb88320 ^ (valor >>> 1) : valor >>> 1;
    }
    tabela[indice] = valor >>> 0;
  }
  return tabela;
})();

/** CRC-32 (IEEE), o mesmo que o formato ZIP exige em cada entrada. */
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (let indice = 0; indice < bytes.length; indice += 1) {
    crc = TABELA_CRC[(crc ^ bytes[indice]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Data e hora no formato DOS, que é o que o cabeçalho ZIP carrega. */
export function dataHoraDos(instanteMs) {
  const data = new Date(Number.isFinite(Number(instanteMs)) ? Number(instanteMs) : Date.now());
  // O formato DOS começa em 1980 e guarda o segundo em passos de dois.
  const ano = Math.max(1980, data.getFullYear());
  const hora = ((data.getHours() & 0x1f) << 11) | ((data.getMinutes() & 0x3f) << 5) | ((data.getSeconds() / 2) & 0x1f);
  const dia = (((ano - 1980) & 0x7f) << 9) | (((data.getMonth() + 1) & 0x0f) << 5) | (data.getDate() & 0x1f);
  return { hora, dia };
}

function nomeEmBytes(nome) {
  const texto = String(nome ?? '').replace(/^\/+/, '').replace(/\\/g, '/');
  if (!texto || texto.includes('..')) throw new RangeError(`Nome de arquivo inválido no pacote: ${nome}`);
  return new TextEncoder().encode(texto);
}

function normalizarConteudo(conteudo) {
  if (conteudo instanceof Uint8Array) return conteudo;
  if (conteudo instanceof ArrayBuffer) return new Uint8Array(conteudo);
  if (ArrayBuffer.isView(conteudo)) return new Uint8Array(conteudo.buffer, conteudo.byteOffset, conteudo.byteLength);
  if (typeof conteudo === 'string') return new TextEncoder().encode(conteudo);
  throw new TypeError('Conteúdo do arquivo deve ser texto ou bytes.');
}

class Escritor {
  constructor() {
    this.partes = [];
    this.tamanho = 0;
  }

  bytes(dados) {
    this.partes.push(dados);
    this.tamanho += dados.length;
  }

  u16(valor) {
    this.bytes(new Uint8Array([valor & 0xff, (valor >>> 8) & 0xff]));
  }

  u32(valor) {
    this.bytes(new Uint8Array([valor & 0xff, (valor >>> 8) & 0xff, (valor >>> 16) & 0xff, (valor >>> 24) & 0xff]));
  }

  concluir() {
    const saida = new Uint8Array(this.tamanho);
    let posicao = 0;
    for (const parte of this.partes) {
      saida.set(parte, posicao);
      posicao += parte.length;
    }
    return saida;
  }
}

/**
 * Monta o pacote. `arquivos` é uma lista de `{ nome, conteudo, dataMs }`.
 */
export function criarZip(arquivos = []) {
  const lista = Array.isArray(arquivos) ? arquivos : [];
  if (lista.length === 0) throw new RangeError('Um pacote precisa de pelo menos um arquivo.');

  const escritor = new Escritor();
  const entradas = [];
  const nomesUsados = new Set();

  for (const arquivo of lista) {
    const nome = nomeEmBytes(arquivo?.nome);
    const chave = new TextDecoder().decode(nome);
    if (nomesUsados.has(chave)) throw new RangeError(`Nome repetido no pacote: ${chave}`);
    nomesUsados.add(chave);

    const conteudo = normalizarConteudo(arquivo?.conteudo);
    if (conteudo.length > LIMITE_32) throw new RangeError(`Arquivo grande demais para ZIP sem ZIP64: ${chave}`);

    const { hora, dia } = dataHoraDos(arquivo?.dataMs);
    const crc = crc32(conteudo);
    const deslocamento = escritor.tamanho;

    escritor.u32(ASSINATURA_LOCAL);
    escritor.u16(VERSAO);
    escritor.u16(FLAG_UTF8);
    escritor.u16(METODO_STORED);
    escritor.u16(hora);
    escritor.u16(dia);
    escritor.u32(crc);
    escritor.u32(conteudo.length);
    escritor.u32(conteudo.length);
    escritor.u16(nome.length);
    escritor.u16(0);
    escritor.bytes(nome);
    escritor.bytes(conteudo);

    entradas.push({ nome, crc, tamanho: conteudo.length, hora, dia, deslocamento });
  }

  const inicioCentral = escritor.tamanho;
  for (const entrada of entradas) {
    escritor.u32(ASSINATURA_CENTRAL);
    escritor.u16(VERSAO);
    escritor.u16(VERSAO);
    escritor.u16(FLAG_UTF8);
    escritor.u16(METODO_STORED);
    escritor.u16(entrada.hora);
    escritor.u16(entrada.dia);
    escritor.u32(entrada.crc);
    escritor.u32(entrada.tamanho);
    escritor.u32(entrada.tamanho);
    escritor.u16(entrada.nome.length);
    escritor.u16(0);
    escritor.u16(0);
    escritor.u16(0);
    escritor.u16(0);
    escritor.u32(0);
    escritor.u32(entrada.deslocamento);
    escritor.bytes(entrada.nome);
  }
  const tamanhoCentral = escritor.tamanho - inicioCentral;

  if (escritor.tamanho > LIMITE_32) throw new RangeError('Pacote grande demais para ZIP sem ZIP64.');

  escritor.u32(ASSINATURA_FIM);
  escritor.u16(0);
  escritor.u16(0);
  escritor.u16(entradas.length);
  escritor.u16(entradas.length);
  escritor.u32(tamanhoCentral);
  escritor.u32(inicioCentral);
  escritor.u16(0);

  return escritor.concluir();
}
