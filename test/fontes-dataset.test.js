import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CRITERIOS_GOVERNANCA_FONTE,
  ESTADOS_GOVERNANCA_FONTE,
  FONTES_DATASET_ATUAIS,
  avaliarCatalogoFontes,
  avaliarFonteDataset,
  fonteAptaParaPacoteOffline,
  validarFonteDataset,
} from '../src/data/fontes-dataset.js';

function fonteAprovada() {
  return {
    sourceId: 'licensed-provider',
    nome: 'Licensed Provider',
    layerId: 'base',
    sourceUrl: 'https://example.test/tiles/{z}/{x}/{y}.pbf',
    policyUrls: ['https://example.test/terms'],
    currentUse: 'ONLINE_RENDER_ONLY',
    ...Object.fromEntries(CRITERIOS_GOVERNANCA_FONTE.map((criterio) => [criterio, true])),
  };
}

test('catálogo atual é válido, mas nenhuma fonte fica aprovada automaticamente para pacote offline', () => {
  const resultado = avaliarCatalogoFontes();
  assert.equal(resultado.valido, true);
  assert.equal(resultado.podeCriarPacote, false);
  assert.deepEqual(resultado.fontesAptas, []);
  assert.equal(resultado.resultados.length, FONTES_DATASET_ATUAIS.length);
  assert.equal(resultado.resultados.find((item) => item.sourceId === 'openstreetmap-standard-raster').estado, ESTADOS_GOVERNANCA_FONTE.REVISAR);
  assert.equal(resultado.resultados.find((item) => item.sourceId === 'openstreetmap-standard-raster').criteriosAusentes.includes('offlineUseConfirmed'), true);
});

test('uma fonte só é aprovada quando todos os critérios de governança são true', () => {
  const fonte = fonteAprovada();
  const validacao = validarFonteDataset(fonte);
  assert.equal(validacao.valido, true);
  const avaliacao = avaliarFonteDataset(fonte);
  assert.equal(avaliacao.estado, ESTADOS_GOVERNANCA_FONTE.APROVADA);
  assert.equal(fonteAptaParaPacoteOffline(fonte), true);
  assert.deepEqual(avaliacao.criteriosAusentes, []);
});

test('critério ausente mantém a fonte em revisão e impede a aptidão para pacote', () => {
  const fonte = fonteAprovada();
  fonte.storageRightsConfirmed = false;
  const avaliacao = avaliarFonteDataset(fonte);
  assert.equal(avaliacao.valido, true);
  assert.equal(avaliacao.estado, ESTADOS_GOVERNANCA_FONTE.REVISAR);
  assert.equal(avaliacao.criteriosAusentes.includes('storageRightsConfirmed'), true);
  assert.equal(fonteAptaParaPacoteOffline(fonte), false);
});

test('registro malformado vira UNKNOWN e não autoriza distribuição', () => {
  const fonte = fonteAprovada();
  delete fonte.policyUrls;
  fonte.sourceUrl = 'http://inseguro.test/tiles';
  fonte.licenseConfirmed = 'sim';
  const validacao = validarFonteDataset(fonte);
  assert.equal(validacao.valido, false);
  const avaliacao = avaliarFonteDataset(fonte);
  assert.equal(avaliacao.estado, ESTADOS_GOVERNANCA_FONTE.DESCONHECIDA);
  assert.equal(fonteAptaParaPacoteOffline(fonte), false);
});

test('catálogo inválido é recusado como pacote e não oculta o erro estrutural', () => {
  const resultado = avaliarCatalogoFontes([fonteAprovada(), null]);
  assert.equal(resultado.valido, false);
  assert.equal(resultado.podeCriarPacote, false);
  assert.equal(resultado.resultados[1].estado, ESTADOS_GOVERNANCA_FONTE.DESCONHECIDA);
  assert.equal(resultado.erros[0].campo, 'fonte');
});

test('catálogo e critérios são imutáveis para evitar alteração acidental da política', () => {
  assert.equal(Object.isFrozen(FONTES_DATASET_ATUAIS), true);
  assert.equal(Object.isFrozen(FONTES_DATASET_ATUAIS[0]), true);
  assert.equal(Object.isFrozen(CRITERIOS_GOVERNANCA_FONTE), true);
});
