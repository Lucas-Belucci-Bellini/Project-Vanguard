import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  MODELO_WMM,
  MOTIVOS_WMM,
  anoDecimal,
  campoGeomagnetico,
  declinacaoMagnetica,
} from '../src/engine/wmm.js';
import { WMM_COEFICIENTES, WMM_COF_SHA256, WMM_VALIDADE } from '../src/data/wmm2025.js';
import { analisarCof } from '../scripts/gerar-wmm.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const COF = join(raiz, 'vendor', 'wmm', 'WMM.COF');
const VALORES = join(raiz, 'vendor', 'wmm', 'WMM2025_TEST_VALUES.txt');

/**
 * Os valores de referência NÃO são digitados aqui: são lidos do arquivo oficial
 * que veio no mesmo pacote dos coeficientes. Copiar 12 linhas de 19 números para
 * dentro de um teste é justamente o jeito de o teste passar a concordar com o
 * erro em vez de pegá-lo.
 */
function valoresOficiais() {
  return readFileSync(VALORES, 'utf8')
    .split(/\r?\n/)
    .filter((linha) => linha.trim() && !linha.trim().startsWith('#'))
    .map((linha) => {
      const n = linha.trim().split(/\s+/).map((t) => (t === 'NaN' ? null : Number(t)));
      const [ano, alturaKm, lat, lon, X, Y, Z, H, F, I, D, GV, Xdot, Ydot, Zdot, Hdot, Fdot, Idot, Ddot] = n;
      return { ano, alturaKm, lat, lon, X, Y, Z, H, F, I, D, GV, Xdot, Ydot, Zdot, Hdot, Fdot, Idot, Ddot };
    });
}

/* O arquivo publica nT com uma casa e graus com duas: o maior desvio possível de
 * um cálculo correto é meia unidade da última casa impressa. É essa a tolerância
 * — e o pior desvio MEDIDO nas 12 linhas ficou em 0,050 nT e 0,0050°, ou seja,
 * dentro do arredondamento em todos os 19 campos. Afrouxar isto é deixar de
 * comparar com o modelo oficial e passar a comparar com a nossa própria conta. */
const TOL_NT = 0.05;
const TOL_DEG = 0.005;

test('o WMM.COF embarcado é o arquivo oficial, conferido pelo cabeçalho e pelo SHA-256', () => {
  const bytes = readFileSync(COF);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), WMM_COF_SHA256,
    'o WMM.COF em vendor/ não é mais o arquivo de onde src/data/wmm2025.js foi gerado — rode scripts/gerar-wmm.mjs');

  // O próprio README oficial manda conferir esta linha para saber se o modelo é o certo.
  const primeira = bytes.toString('utf8').split(/\r?\n/)[0];
  assert.equal(primeira.trim().split(/\s+/).join(' '), '2025.0 WMM-2025 11/13/2024');
});

test('os coeficientes gerados são exatamente os do arquivo oficial', () => {
  const cof = analisarCof(readFileSync(COF, 'utf8'));
  assert.equal(cof.coeficientes.length, WMM_COEFICIENTES.length);
  assert.equal(cof.grauMaximo, MODELO_WMM.grauMaximo);
  assert.equal(cof.epoca, MODELO_WMM.epoca);

  for (const [i, esperado] of cof.coeficientes.entries()) {
    const [n, m, g, h, gPonto, hPonto] = WMM_COEFICIENTES[i];
    assert.deepEqual(
      { n, m, g, h, gPonto, hPonto },
      esperado,
      `coeficiente ${i} (n=${esperado.n}, m=${esperado.m}) divergiu do WMM.COF`
    );
  }
});

test('os 12 valores de teste oficiais do WMM2025 batem em todos os 19 campos', () => {
  const linhas = valoresOficiais();
  assert.equal(linhas.length, 12, 'o arquivo oficial tem 12 pontos de teste');

  for (const v of linhas) {
    const r = campoGeomagnetico({ lat: v.lat, lon: v.lon, alturaKm: v.alturaKm, ano: v.ano });
    assert.equal(r.ok, true, `${v.ano} lat ${v.lat} lon ${v.lon}`);
    const onde = `${v.ano} · ${v.alturaKm} km · lat ${v.lat} · lon ${v.lon}`;

    const perto = (obtido, esperado, tol, nome) => assert.ok(
      Math.abs(obtido - esperado) <= tol,
      `${nome} em ${onde}: obtido ${obtido}, oficial ${esperado} (Δ ${Math.abs(obtido - esperado)})`
    );

    perto(r.componentes.norteNt, v.X, TOL_NT, 'X');
    perto(r.componentes.lesteNt, v.Y, TOL_NT, 'Y');
    perto(r.componentes.verticalNt, v.Z, TOL_NT, 'Z');
    perto(r.horizontalNt, v.H, TOL_NT, 'H');
    perto(r.intensidadeNt, v.F, TOL_NT, 'F');
    perto(r.inclinacaoDeg, v.I, TOL_DEG, 'inclinação');
    perto(r.declinacaoDeg, v.D, TOL_DEG, 'declinação');

    perto(r.variacaoAnual.componentes.norteNt, v.Xdot, TOL_NT, 'Ẋ');
    perto(r.variacaoAnual.componentes.lesteNt, v.Ydot, TOL_NT, 'Ẏ');
    perto(r.variacaoAnual.componentes.verticalNt, v.Zdot, TOL_NT, 'Ż');
    perto(r.variacaoAnual.horizontalNt, v.Hdot, TOL_NT, 'Ḣ');
    perto(r.variacaoAnual.intensidadeNt, v.Fdot, TOL_NT, 'Ḟ');
    perto(r.variacaoAnual.inclinacaoDeg, v.Idot, TOL_DEG, 'İ');
    perto(r.variacaoAnual.declinacaoDeg, v.Ddot, TOL_DEG, 'Ḋ');

    if (v.GV === null) {
      // O arquivo oficial escreve NaN fora da região polar: ali a variação de
      // grade não é definida. `null` é como este motor diz a mesma coisa.
      assert.equal(r.variacaoDeGradeDeg, null, `GV deveria ser indefinida em ${onde}`);
    } else {
      perto(r.variacaoDeGradeDeg, v.GV, TOL_DEG, 'GV');
    }
  }
});

test('fora da janela de validade o modelo recusa em vez de extrapolar', () => {
  for (const ano of [WMM_VALIDADE.inicio - 0.01, WMM_VALIDADE.fim + 0.01, 2019, 2035]) {
    const r = campoGeomagnetico({ lat: -23.5, lon: -46.6, ano });
    assert.equal(r.ok, false, `${ano} deveria ser recusado`);
    assert.equal(r.motivo, MOTIVOS_WMM.FORA_DE_VALIDADE);
    assert.ok(r.explicacao.includes(String(WMM_VALIDADE.fim)));
    assert.equal(r.declinacaoDeg, undefined, 'recusa não pode vir com número junto');
  }
  // As duas bordas exatas valem.
  assert.equal(campoGeomagnetico({ lat: 0, lon: 0, ano: WMM_VALIDADE.inicio }).ok, true);
  assert.equal(campoGeomagnetico({ lat: 0, lon: 0, ano: WMM_VALIDADE.fim }).ok, true);
});

test('entrada inválida é recusada com motivo, nunca com declinação 0', () => {
  // `Number('')` é 0 e 0 é uma latitude válida: é assim que campo vazio vira
  // "declinação de 0°". A recusa tem de vir do módulo, não da tela.
  for (const entrada of [
    { lat: null, lon: -46.6, ano: 2026 },
    { lat: -23.5, lon: undefined, ano: 2026 },
    { lat: '', lon: '', ano: 2026 },
    { lat: 91, lon: 0, ano: 2026 },
    { lat: NaN, lon: 0, ano: 2026 },
  ]) {
    const r = campoGeomagnetico(entrada);
    assert.equal(r.ok, false, JSON.stringify(entrada));
    assert.equal(r.motivo, MOTIVOS_WMM.POSICAO_INVALIDA);
    assert.equal(r.declinacaoDeg, undefined);
  }

  const semData = campoGeomagnetico({ lat: -23.5, lon: -46.6, ano: null });
  assert.equal(semData.ok, false);
  assert.equal(semData.motivo, MOTIVOS_WMM.DATA_INVALIDA);
});

test('o polo geográfico exato devolve número finito, e contínuo com a vizinhança', () => {
  // O termo leste do campo divide por cos(latitude geocêntrica), que é zero no
  // polo exato. O que se cobra aqui não é um valor de tabela — é que o
  // tratamento do polo não crie descontinuidade nem NaN.
  //
  // Não se cobra inclinação quase vertical: o polo GEOGRÁFICO não é o polo
  // MAGNÉTICO. No polo Sul geográfico a inclinação fica perto de −72°, porque o
  // polo magnético sul está a milhares de quilômetros dali.
  for (const lat of [90, -90]) {
    const noPolo = campoGeomagnetico({ lat, lon: 0, ano: 2026.5 });
    assert.equal(noPolo.ok, true, `lat ${lat}`);
    for (const [nome, valor] of Object.entries({
      declinacao: noPolo.declinacaoDeg,
      inclinacao: noPolo.inclinacaoDeg,
      intensidade: noPolo.intensidadeNt,
      leste: noPolo.componentes.lesteNt,
    })) {
      assert.ok(Number.isFinite(valor), `lat ${lat}: ${nome} = ${valor}`);
    }

    // Campo da Terra à superfície: entre ~22 000 e ~67 000 nT (faixa publicada
    // pelo próprio NCEI). Fora disso o número é ruído de divisão, não campo.
    assert.ok(
      noPolo.intensidadeNt > 20_000 && noPolo.intensidadeNt < 70_000,
      `lat ${lat}: intensidade ${noPolo.intensidadeNt} nT fora da faixa terrestre`
    );

    // Um metro antes do polo o campo tem de ser praticamente o mesmo.
    const perto = campoGeomagnetico({ lat: lat > 0 ? lat - 0.00001 : lat + 0.00001, lon: 0, ano: 2026.5 });
    assert.ok(
      Math.abs(perto.intensidadeNt - noPolo.intensidadeNt) < 1,
      `lat ${lat}: salto de ${Math.abs(perto.intensidadeNt - noPolo.intensidadeNt)} nT no polo`
    );
    assert.ok(
      Math.abs(perto.inclinacaoDeg - noPolo.inclinacaoDeg) < 0.01,
      `lat ${lat}: salto de inclinação no polo`
    );
  }
});

test('anoDecimal converte instante em ano fracionário', () => {
  assert.equal(anoDecimal(Date.UTC(2026, 0, 1)), 2026);
  const meio = anoDecimal(Date.UTC(2026, 6, 2, 12));
  assert.ok(Math.abs(meio - 2026.5) < 0.01, `${meio}`);
  // 2028 é bissexto: o denominador precisa acompanhar, senão o ano "estica".
  assert.equal(anoDecimal(Date.UTC(2029, 0, 1)), 2029);
  assert.equal(anoDecimal('nada'), null);
  assert.equal(anoDecimal(NaN), null);
});

test('declinacaoMagnetica devolve o mesmo número que o campo completo', () => {
  const instanteMs = Date.UTC(2026, 8, 3, 12);
  const so = declinacaoMagnetica({ lat: -23.5505, lon: -46.6333, instanteMs });
  const completo = campoGeomagnetico({ lat: -23.5505, lon: -46.6333, ano: anoDecimal(instanteMs) });
  assert.equal(so.ok, true);
  assert.equal(so.declinacaoDeg, completo.declinacaoDeg);
  assert.equal(so.variacaoAnualDeg, completo.variacaoAnual.declinacaoDeg);
  // São Paulo tem declinação oeste (negativa) de mais de 15° nesta época — é o
  // tipo de número que ninguém acerta de cabeça, e é por isso que ele é calculado.
  assert.ok(so.declinacaoDeg < -15 && so.declinacaoDeg > -25, `${so.declinacaoDeg}`);
});

test('a declinação varia com o lugar e com o tempo, no ritmo que o próprio modelo declara', () => {
  const base = { lat: 64.13, lon: -21.9, alturaKm: 0 }; // Reiquiavique: declinação grande
  const a = campoGeomagnetico({ ...base, ano: 2026 });
  const b = campoGeomagnetico({ ...base, ano: 2027 });
  const variacaoObservada = b.declinacaoDeg - a.declinacaoDeg;
  // Um ano de diferença tem de valer, com folga pequena, a variação anual que o
  // modelo publica para o mesmo ponto — é a checagem de que o termo secular
  // entrou no lugar certo, e não foi só somado em algum canto.
  assert.ok(
    Math.abs(variacaoObservada - a.variacaoAnual.declinacaoDeg) < 0.01,
    `observado ${variacaoObservada}, declarado ${a.variacaoAnual.declinacaoDeg}`
  );

  // Dois lugares distantes não podem dar a mesma declinação.
  const saoPaulo = campoGeomagnetico({ lat: -23.55, lon: -46.63, ano: 2026 });
  assert.ok(Math.abs(saoPaulo.declinacaoDeg - a.declinacaoDeg) > 5);
});
