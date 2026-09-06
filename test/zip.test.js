import test from 'node:test';
import assert from 'node:assert/strict';
import { crc32 as crc32Node } from 'node:zlib';
import { criarZip, crc32, dataHoraDos } from '../src/engine/zip.js';

const texto = (valor) => new TextEncoder().encode(valor);

/** Leitor mínimo de campos do ZIP, para conferir os cabeçalhos byte a byte. */
function u16(bytes, posicao) { return bytes[posicao] | (bytes[posicao + 1] << 8); }
function u32(bytes, posicao) { return (bytes[posicao] | (bytes[posicao + 1] << 8) | (bytes[posicao + 2] << 16) | (bytes[posicao + 3] << 24)) >>> 0; }

test('o CRC-32 confere com a implementação do Node', () => {
  // `zlib.crc32` é implementação independente: é a âncora externa do formato.
  for (const amostra of ['', 'a', 'vanguard field', 'peregrinação com acento', 'x'.repeat(5000)]) {
    assert.equal(crc32(texto(amostra)), crc32Node(Buffer.from(amostra)), `divergiu em "${amostra.slice(0, 20)}"`);
  }
  const binario = new Uint8Array(Array.from({ length: 256 }, (_, indice) => indice));
  assert.equal(crc32(binario), crc32Node(Buffer.from(binario)));
});

test('o pacote abre com as assinaturas que o formato exige', () => {
  const zip = criarZip([{ nome: 'a.txt', conteudo: 'conteudo' }]);
  assert.equal(u32(zip, 0), 0x04034b50, 'cabeçalho local');
  const fim = zip.length - 22;
  assert.equal(u32(zip, fim), 0x06054b50, 'fim do diretório central');
  assert.equal(u16(zip, fim + 10), 1, 'total de entradas');
  const inicioCentral = u32(zip, fim + 16);
  assert.equal(u32(zip, inicioCentral), 0x02014b50, 'diretório central');
});

test('cada entrada guarda tamanho e CRC do próprio conteúdo', () => {
  const conteudo = texto('a trilha inteira');
  const zip = criarZip([{ nome: 'trilha.gpx', conteudo }]);
  assert.equal(u32(zip, 14), crc32Node(Buffer.from(conteudo)), 'crc da entrada');
  assert.equal(u32(zip, 18), conteudo.length, 'tamanho comprimido');
  assert.equal(u32(zip, 22), conteudo.length, 'tamanho original');
  // Método 0 = stored: JPEG já vem comprimido, comprimir de novo gasta bateria à toa.
  assert.equal(u16(zip, 8), 0, 'método stored');
});

test('nomes com acento são marcados como UTF-8', () => {
  const zip = criarZip([{ nome: 'paradas/peregrinação.txt', conteudo: 'x' }]);
  assert.equal(u16(zip, 6) & 0x0800, 0x0800, 'bit 11 de UTF-8');
  const nome = new TextDecoder().decode(zip.slice(30, 30 + u16(zip, 26)));
  assert.equal(nome, 'paradas/peregrinação.txt');
});

test('os bytes do arquivo entram intactos no pacote', () => {
  const foto = new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70]);
  const zip = criarZip([{ nome: 'f.jpg', conteudo: foto }]);
  const inicio = 30 + u16(zip, 26);
  assert.deepEqual([...zip.slice(inicio, inicio + foto.length)], [...foto]);
});

test('o deslocamento registrado aponta para o cabeçalho local certo', () => {
  const zip = criarZip([
    { nome: 'um.txt', conteudo: 'primeiro' },
    { nome: 'dois.txt', conteudo: 'segundo conteudo' },
  ]);
  const fim = zip.length - 22;
  assert.equal(u16(zip, fim + 10), 2);
  let cursor = u32(zip, fim + 16);
  for (let entrada = 0; entrada < 2; entrada += 1) {
    assert.equal(u32(zip, cursor), 0x02014b50);
    const deslocamento = u32(zip, cursor + 42);
    // O ponteiro do diretório central tem que cair num cabeçalho local.
    assert.equal(u32(zip, deslocamento), 0x04034b50, `entrada ${entrada}`);
    cursor += 46 + u16(zip, cursor + 28);
  }
});

test('a data DOS começa em 1980 e guarda o segundo em passos de dois', () => {
  const { hora, dia } = dataHoraDos(new Date(2026, 8, 12, 14, 35, 45).getTime());
  assert.equal((dia >> 9) + 1980, 2026);
  assert.equal((dia >> 5) & 0x0f, 9);
  assert.equal(dia & 0x1f, 12);
  assert.equal(hora >> 11, 14);
  assert.equal((hora >> 5) & 0x3f, 35);
  assert.equal((hora & 0x1f) * 2, 44, 'o formato perde o segundo ímpar');
});

test('data anterior a 1980 não estoura o campo do formato', () => {
  const { dia } = dataHoraDos(new Date(1970, 0, 1).getTime());
  assert.equal(dia >> 9, 0);
});

test('entrada inválida é recusada em vez de gerar pacote quebrado', () => {
  assert.throws(() => criarZip([]), /pelo menos um arquivo/);
  assert.throws(() => criarZip([{ nome: '../fuga.txt', conteudo: 'x' }]), /inválido/);
  assert.throws(() => criarZip([{ nome: '', conteudo: 'x' }]), /inválido/);
  assert.throws(() => criarZip([{ nome: 'a', conteudo: 'x' }, { nome: 'a', conteudo: 'y' }]), /repetido/);
  assert.throws(() => criarZip([{ nome: 'a', conteudo: 42 }]), /texto ou bytes/);
});

test('barra inicial é removida para o pacote não virar caminho absoluto', () => {
  const zip = criarZip([{ nome: '/fotos/a.jpg', conteudo: 'x' }]);
  assert.equal(new TextDecoder().decode(zip.slice(30, 30 + u16(zip, 26))), 'fotos/a.jpg');
});
