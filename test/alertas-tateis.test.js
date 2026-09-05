import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GRAVIDADES,
  INTERVALO_POR_TIPO_MS,
  TIPOS_ALERTA,
  catalogoAlertas,
  descreverAlerta,
  dispararAlerta,
  gatilhoDisponivel,
  padraoDoAlerta,
} from '../src/core/alertas-tateis.js';

const TIPOS = Object.values(TIPOS_ALERTA);

test('nenhum aviso vibra igual a outro — é isso que o torna reconhecível', () => {
  for (const gravidade of Object.values(GRAVIDADES)) {
    const assinaturas = TIPOS.map((tipo) => padraoDoAlerta(tipo, gravidade).join(','));
    assert.equal(new Set(assinaturas).size, TIPOS.length, `ritmos repetidos em ${gravidade}`);
  }
});

test('o ritmo do tipo sobrevive à mudança de gravidade', () => {
  // Repetir o mesmo ritmo mantém o tipo reconhecível quando aperta; trocar o
  // ritmo faria a pessoa achar que é outro aviso.
  for (const tipo of TIPOS) {
    const aviso = padraoDoAlerta(tipo, GRAVIDADES.AVISO);
    const critico = padraoDoAlerta(tipo, GRAVIDADES.CRITICO);
    assert.deepEqual(critico.slice(0, aviso.length), aviso, `ritmo de ${tipo} mudou com a gravidade`);
  }
});

test('gravidade maior vibra mais, nunca menos', () => {
  for (const tipo of TIPOS) {
    const soma = (gravidade) => padraoDoAlerta(tipo, gravidade).reduce((total, valor) => total + valor, 0);
    assert.ok(soma(GRAVIDADES.AVISO) < soma(GRAVIDADES.ALTO), tipo);
    assert.ok(soma(GRAVIDADES.ALTO) < soma(GRAVIDADES.CRITICO), tipo);
  }
});

test('todo padrão é feito de durações positivas e não vira um zumbido longo', () => {
  for (const tipo of TIPOS) {
    const padrao = padraoDoAlerta(tipo, GRAVIDADES.CRITICO);
    assert.ok(padrao.every((valor) => Number.isInteger(valor) && valor > 0), tipo);
    const total = padrao.reduce((soma, valor) => soma + valor, 0);
    assert.ok(total <= 6000, `${tipo} dura ${total} ms`);
  }
});

test('tipo desconhecido não inventa vibração', () => {
  assert.equal(padraoDoAlerta('TERREMOTO'), null);
  assert.equal(descreverAlerta('TERREMOTO'), null);
  const resultado = dispararAlerta({ tipo: 'TERREMOTO', vibrarApi: () => { throw new Error('não deveria vibrar'); } });
  assert.equal(resultado.vibrou, false);
  assert.equal(resultado.motivo, 'TIPO_DESCONHECIDO');
});

test('o catálogo separa o que tem gatilho do que espera fonte externa', () => {
  const catalogo = catalogoAlertas();
  assert.equal(catalogo.length, TIPOS.length);
  // Sol e tempo sem parada são calculáveis no aparelho.
  assert.equal(gatilhoDisponivel(TIPOS_ALERTA.EXPOSICAO_SOL), true);
  assert.equal(gatilhoDisponivel(TIPOS_ALERTA.SEM_PARADA), true);
  // Não existe sensor de chuva no celular: o ritmo existe, o gatilho não.
  assert.equal(gatilhoDisponivel(TIPOS_ALERTA.CHUVA), false);
  assert.equal(gatilhoDisponivel(TIPOS_ALERTA.TEMPESTADE), false);
  assert.equal(gatilhoDisponivel(TIPOS_ALERTA.FRIO), false);
  assert.ok(catalogo.every((item) => item.descricao && item.padrao.length > 0));
});

test('um tipo não cala outro: o intervalo é por aviso', () => {
  const vibracoes = [];
  const vibrarApi = (padrao) => vibracoes.push(padrao);
  const agora = Date.parse('2026-09-12T13:00:00Z');

  const sol = dispararAlerta({ tipo: TIPOS_ALERTA.EXPOSICAO_SOL, agora, vibrarApi });
  assert.equal(sol.vibrou, true);

  const solDeNovo = dispararAlerta({ tipo: TIPOS_ALERTA.EXPOSICAO_SOL, agora: agora + 60_000, ultimoAvisoPorTipo: sol.ultimoAvisoPorTipo, vibrarApi });
  assert.equal(solDeNovo.vibrou, false);
  assert.equal(solDeNovo.motivo, 'INTERVALO_NAO_CUMPRIDO');

  const tempestade = dispararAlerta({ tipo: TIPOS_ALERTA.TEMPESTADE, agora: agora + 60_000, ultimoAvisoPorTipo: sol.ultimoAvisoPorTipo, vibrarApi });
  assert.equal(tempestade.vibrou, true, 'a tempestade não pode ser calada pelo aviso de sol');
  assert.equal(vibracoes.length, 2);
});

test('o intervalo volta a permitir o aviso quando o tempo passa', () => {
  const agora = Date.parse('2026-09-12T13:00:00Z');
  const primeiro = dispararAlerta({ tipo: TIPOS_ALERTA.SEM_PARADA, agora, vibrarApi: () => {} });
  const depois = dispararAlerta({
    tipo: TIPOS_ALERTA.SEM_PARADA,
    agora: agora + INTERVALO_POR_TIPO_MS[TIPOS_ALERTA.SEM_PARADA],
    ultimoAvisoPorTipo: primeiro.ultimoAvisoPorTipo,
    vibrarApi: () => {},
  });
  assert.equal(depois.vibrou, true);
});

test('sem API de vibração o aviso não quebra nem mente que vibrou', () => {
  const semApi = dispararAlerta({ tipo: TIPOS_ALERTA.CHUVA, vibrarApi: null });
  assert.equal(semApi.vibrou, false);
  assert.equal(semApi.motivo, 'VIBRACAO_INDISPONIVEL');
  assert.ok(semApi.padrao.length > 0, 'o padrão continua disponível para outro canal');

  const quebrada = dispararAlerta({ tipo: TIPOS_ALERTA.CHUVA, vibrarApi: () => { throw new Error('sem permissão'); } });
  assert.equal(quebrada.vibrou, false);
  assert.equal(quebrada.motivo, 'VIBRACAO_FALHOU');
});

test('o registro de avisos não é mutado no lugar', () => {
  const registro = {};
  const resultado = dispararAlerta({ tipo: TIPOS_ALERTA.FORA_DA_ROTA, ultimoAvisoPorTipo: registro, vibrarApi: () => {} });
  assert.deepEqual(registro, {});
  assert.ok(Number.isFinite(resultado.ultimoAvisoPorTipo[TIPOS_ALERTA.FORA_DA_ROTA]));
});
