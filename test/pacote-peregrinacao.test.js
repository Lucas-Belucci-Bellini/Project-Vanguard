import test from 'node:test';
import assert from 'node:assert/strict';
import { montarPacotePeregrinacao, paradasComoCsv } from '../src/core/pacote-peregrinacao.js';

const FOTO = new Uint8Array([255, 216, 255, 224, 7, 7]);
const AGORA = Date.parse('2026-09-12T18:00:00.000Z');

function parada(extra = {}) {
  return {
    id: 'parada-001',
    lat: -23.3103,
    lon: -51.1628,
    mgrs: '22K DV 83354 22120',
    precisaoM: 9,
    dentroDoLimite: true,
    capturadaEm: '2026-09-12T13:00:00.000Z',
    imagem: { mime: 'image/jpeg', sizeBytes: FOTO.length },
    ...extra,
  };
}

const lerImagemOk = async () => ({ ok: true, bytes: FOTO });

function u16(bytes, posicao) { return bytes[posicao] | (bytes[posicao + 1] << 8); }
function u32(bytes, posicao) { return (bytes[posicao] | (bytes[posicao + 1] << 8) | (bytes[posicao + 2] << 16) | (bytes[posicao + 3] << 24)) >>> 0; }

/** Lê os nomes do diretório central — é assim que um descompactador acha os arquivos. */
function nomesNoPacote(zip) {
  const fim = zip.length - 22;
  let cursor = u32(zip, fim + 16);
  const nomes = [];
  for (let indice = 0; indice < u16(zip, fim + 10); indice += 1) {
    const tamanhoNome = u16(zip, cursor + 28);
    nomes.push(new TextDecoder().decode(zip.slice(cursor + 46, cursor + 46 + tamanhoNome)));
    cursor += 46 + tamanhoNome;
  }
  return nomes;
}

test('o pacote leva foto, CSV, registro, GPX e o leia-me', async () => {
  const pacote = await montarPacotePeregrinacao({
    paradas: [parada()],
    trilha: [{ lat: -23.31, lon: -51.16, createdAt: AGORA }, { lat: -23.311, lon: -51.161, createdAt: AGORA + 60_000 }],
    lerImagem: lerImagemOk,
    agora: AGORA,
  });
  assert.deepEqual(nomesNoPacote(pacote.bytes).sort(), [
    'LEIA-ME.txt', 'fotos/parada-001.jpg', 'paradas.csv', 'registro.json', 'trilha.gpx',
  ]);
  assert.equal(pacote.fotosIncluidas, 1);
  assert.equal(pacote.nomeArquivo, 'vanguard-caminhada-2026-09-12.zip');
  assert.ok(pacote.tamanhoBytes > FOTO.length);
});

test('a coordenada da foto viaja no CSV e também no GPX', async () => {
  const pacote = await montarPacotePeregrinacao({ paradas: [parada()], lerImagem: lerImagemOk, agora: AGORA });
  const texto = new TextDecoder().decode(pacote.bytes);
  // Conteúdo stored: o texto dos arquivos aparece cru dentro do pacote.
  assert.match(texto, /fotos\/parada-001\.jpg,2026-09-12T13:00:00\.000Z,22K DV 83354 22120,-23\.3103,-51\.1628,9,sim/);
  assert.match(texto, /<wpt lat="-23\.3103" lon="-51\.1628">/);
});

test('foto ilegível é reportada em vez de sumir calada', async () => {
  const pacote = await montarPacotePeregrinacao({
    paradas: [parada(), parada({ id: 'parada-002' })],
    lerImagem: async (id) => (id === 'parada-002' ? { ok: false, motivo: 'não encontrada' } : { ok: true, bytes: FOTO }),
    agora: AGORA,
  });
  assert.deepEqual(pacote.fotosAusentes, ['parada-002']);
  assert.equal(pacote.fotosIncluidas, 1);
  const texto = new TextDecoder().decode(pacote.bytes);
  assert.match(texto, /FOTOS QUE FALTARAM/);
  assert.match(texto, /parada-002/);
  // A parada que faltou não pode aparecer como se tivesse foto no pacote.
  assert.equal(nomesNoPacote(pacote.bytes).includes('fotos/parada-002.jpg'), false);
});

test('o leia-me avisa que a coordenada não está dentro do JPEG', async () => {
  const pacote = await montarPacotePeregrinacao({ paradas: [parada()], lerImagem: lerImagemOk, agora: AGORA });
  const texto = new TextDecoder().decode(pacote.bytes);
  assert.match(texto, /não está gravada dentro do JPEG/);
  assert.match(texto, /não uma medição verificada/);
});

test('parada fora do limite de precisão sai marcada no CSV', () => {
  const csv = paradasComoCsv([parada({ dentroDoLimite: false, precisaoM: 90 })]);
  assert.match(csv, /,90,nao,/);
});

test('campo com vírgula ou aspas não quebra as colunas do CSV', () => {
  const csv = paradasComoCsv([parada({ nota: 'sombra, água e "descanso"' })]);
  assert.match(csv, /"sombra, água e ""descanso"""/);
  assert.equal(csv.split('\n')[1].split(',').length > 8, true);
});

test('sem foto nenhuma o pacote ainda leva a trilha', async () => {
  const pacote = await montarPacotePeregrinacao({
    paradas: [],
    trilha: [{ lat: -23.31, lon: -51.16, createdAt: AGORA }, { lat: -23.312, lon: -51.162, createdAt: AGORA + 60_000 }],
    lerImagem: lerImagemOk,
    agora: AGORA,
  });
  assert.deepEqual(nomesNoPacote(pacote.bytes).sort(), ['LEIA-ME.txt', 'paradas.csv', 'registro.json', 'trilha.gpx']);
  assert.equal(pacote.fotosIncluidas, 0);
});

test('sem a função de leitura o pacote é recusado', async () => {
  await assert.rejects(() => montarPacotePeregrinacao({ paradas: [parada()] }), /lerImagem/);
});
