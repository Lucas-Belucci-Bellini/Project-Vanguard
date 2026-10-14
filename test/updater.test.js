import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import test from 'node:test';

import { CANAIS, ESTADOS, RESULTADO_DOWNLOAD, criarUpdater } from '../src/core/updater/index.js';
import { criarValidadorDeUrl, escolherAtualizacao, hashDoArquivo, normalizarRelease } from '../src/core/updater/releases.js';
import { updaterAndroid, updaterIos, updaterWeb } from '../src/core/updater/plataformas.js';

const REPO = 'https://github.com/Lucas-Belucci-Bellini/Project-Vanguard';
const API = `https://api.github.com/repos/Lucas-Belucci-Bellini/Project-Vanguard/releases`;
const urlOficial = criarValidadorDeUrl(REPO);

/** Uma release como a API do GitHub a devolve, com os assets reais do projeto. */
function releaseFalsa(versao, { prerelease = false, comApk = true, comChecksums = true, draft = false } = {}) {
  const tag = `mobile-v${versao}`;
  const base = `${REPO}/releases/download/${tag}`;
  const assets = [];
  if (comApk) assets.push({ name: `vanguard-${versao}-debug.apk`, browser_download_url: `${base}/vanguard-${versao}-debug.apk`, size: 10_000_000 });
  if (comChecksums) assets.push({ name: 'SHA256SUMS', browser_download_url: `${base}/SHA256SUMS`, size: 200 });
  assets.push({ name: 'BUILD-MANIFEST.txt', browser_download_url: `${base}/BUILD-MANIFEST.txt`, size: 300 });
  return { tag_name: tag, draft, prerelease, body: `notas da ${versao}`, published_at: '2026-09-03T00:00:00Z', html_url: `${REPO}/releases/tag/${tag}`, assets };
}

function fetchFalso(mapa) {
  return async (url) => {
    const chave = String(url);
    const entrada = mapa[chave] ?? mapa[Object.keys(mapa).find((k) => chave.startsWith(k)) ?? ''];
    if (!entrada) return { ok: false, status: 404 };
    if (entrada.erro) throw new Error(entrada.erro);
    return {
      ok: entrada.ok !== false,
      status: entrada.status ?? 200,
      headers: { get: (n) => (n.toLowerCase() === 'content-length' ? String(entrada.bytes?.byteLength ?? '') : null) },
      json: async () => entrada.json,
      text: async () => entrada.text,
      arrayBuffer: async () => entrada.bytes?.buffer ?? new ArrayBuffer(0),
    };
  };
}

const updaterPadrao = (versaoInstalada, mapa, extra = {}) => criarUpdater({
  versaoInstalada,
  urlRepositorio: REPO,
  urlApiReleases: API,
  fetchApi: fetchFalso(mapa),
  cryptoApi: webcrypto,
  estaOnline: () => true,
  plataforma: updaterAndroid(),
  ...extra,
});

// ── Os cenários do item 19 ──────────────────────────────────────────────────

test('versão IGUAL → atualizado, sem oferecer nada', async () => {
  const u = updaterPadrao('1.4.4', { [API]: { json: [releaseFalsa('1.4.4')] } });
  const estado = await u.checkForUpdate();
  assert.equal(estado.estado, ESTADOS.ATUALIZADO);
  assert.equal(u.isUpdateAvailable(), false);
});

test('versão MAIOR disponível → oferece a atualização', async () => {
  const u = updaterPadrao('1.4.3', { [API]: { json: [releaseFalsa('1.4.4'), releaseFalsa('1.4.3')] } });
  const estado = await u.checkForUpdate();
  assert.equal(estado.estado, ESTADOS.DISPONIVEL);
  assert.equal(u.getLatestVersion(), '1.4.4');
  assert.match(u.getReleaseInfo().apk.url, /vanguard-1\.4\.4-debug\.apk$/);
});

test('versão MENOR disponível → NÃO propõe downgrade', async () => {
  // Oferecer "atualizar" para trás perde correções já aplicadas.
  const u = updaterPadrao('1.4.4', { [API]: { json: [releaseFalsa('1.4.2')] } });
  const estado = await u.checkForUpdate();
  assert.equal(estado.estado, ESTADOS.ATUALIZADO);
  assert.equal(u.isUpdateAvailable(), false);
  // Mas a release anterior continua no histórico, para baixar de propósito.
  assert.equal(u.getHistory().length, 1);
  assert.equal(u.ehDowngrade(u.getHistory()[0]), true);
});

test('BETA não é oferecida a quem está no canal estável', async () => {
  const u = updaterPadrao('1.4.4', { [API]: { json: [releaseFalsa('2.0.0-beta.1', { prerelease: true })] } });
  assert.equal((await u.checkForUpdate()).estado, ESTADOS.ATUALIZADO);
});

test('BETA é oferecida a quem escolheu o canal beta', async () => {
  const u = updaterPadrao('1.4.4', { [API]: { json: [releaseFalsa('2.0.0-beta.1', { prerelease: true })] } },
    { preferencias: { canal: CANAIS.BETA } });
  const estado = await u.checkForUpdate();
  assert.equal(estado.estado, ESTADOS.DISPONIVEL);
  assert.equal(u.getLatestVersion(), '2.0.0-beta.1');
});

test('SEM INTERNET → estado próprio, e o app segue funcionando', async () => {
  const u = updaterPadrao('1.4.3', { [API]: { json: [releaseFalsa('1.4.4')] } }, { estaOnline: () => false });
  const estado = await u.checkForUpdate();
  assert.equal(estado.estado, ESTADOS.SEM_INTERNET);
});

test('ERRO DE REDE vira estado, nunca exceção', async () => {
  // O updater não pode derrubar o boot do aplicativo (item 21).
  const u = updaterPadrao('1.4.3', { [API]: { erro: 'falha de DNS' } });
  const estado = await u.checkForUpdate();
  assert.equal(estado.estado, ESTADOS.ERRO);
  assert.match(estado.erro, /DNS/);
});

test('RELEASE INDISPONÍVEL (404) vira estado de erro', async () => {
  const u = updaterPadrao('1.4.3', {});
  assert.equal((await u.checkForUpdate()).estado, ESTADOS.ERRO);
});

test('release SEM APK não é oferecida como download', async () => {
  const u = updaterPadrao('1.4.3', { [API]: { json: [releaseFalsa('1.4.4', { comApk: false })] } });
  await u.checkForUpdate();
  assert.equal(u.getReleaseInfo()?.apk, null);
  const r = await u.download();
  assert.equal(r.resultado, RESULTADO_DOWNLOAD.ERRO_REDE);
  assert.match(r.erro, /APK/);
});

test('RASCUNHO é ignorado', async () => {
  const u = updaterPadrao('1.4.3', { [API]: { json: [releaseFalsa('9.9.9', { draft: true })] } });
  assert.equal((await u.checkForUpdate()).estado, ESTADOS.ATUALIZADO);
});

// ── Checksum ────────────────────────────────────────────────────────────────

test('CHECKSUM INVÁLIDO recusa e NÃO devolve os bytes', async () => {
  // A regra do item 11: download completo não é download confiável. Se os
  // bytes voltassem aqui, quem chama poderia instalar por engano.
  const conteudo = new TextEncoder().encode('APK FALSIFICADO');
  const rel = releaseFalsa('1.4.4');
  const u = updaterPadrao('1.4.3', {
    [API]: { json: [rel] },
    [`${REPO}/releases/download/mobile-v1.4.4/SHA256SUMS`]: { text: `${'0'.repeat(64)}  mobile-artifacts/vanguard-1.4.4-debug.apk\n` },
    [`${REPO}/releases/download/mobile-v1.4.4/vanguard-1.4.4-debug.apk`]: { bytes: conteudo },
  });
  await u.checkForUpdate();
  const r = await u.download();
  assert.equal(r.resultado, RESULTADO_DOWNLOAD.CHECKSUM_INVALIDO);
  assert.equal(r.bytes, undefined, 'os bytes reprovados não podem ser entregues');
  assert.equal(r.esperado, '0'.repeat(64));
});

test('CHECKSUM VÁLIDO libera os bytes', async () => {
  const conteudo = new TextEncoder().encode('conteudo do apk');
  const digest = await webcrypto.subtle.digest('SHA-256', conteudo);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const u = updaterPadrao('1.4.3', {
    [API]: { json: [releaseFalsa('1.4.4')] },
    [`${REPO}/releases/download/mobile-v1.4.4/SHA256SUMS`]: { text: `${hex}  mobile-artifacts/vanguard-1.4.4-debug.apk\n` },
    [`${REPO}/releases/download/mobile-v1.4.4/vanguard-1.4.4-debug.apk`]: { bytes: conteudo },
  });
  await u.checkForUpdate();
  const r = await u.download();
  assert.equal(r.resultado, RESULTADO_DOWNLOAD.OK);
  assert.equal(r.sha256, hex);
});

test('sem checksum publicado o resultado NÃO é OK', async () => {
  // Silenciar a ausência da verificação tratando como sucesso seria mentir
  // sobre o que foi conferido.
  const u = updaterPadrao('1.4.3', {
    [API]: { json: [releaseFalsa('1.4.4', { comChecksums: false })] },
    [`${REPO}/releases/download/mobile-v1.4.4/vanguard-1.4.4-debug.apk`]: { bytes: new Uint8Array([1, 2, 3]) },
  });
  await u.checkForUpdate();
  assert.equal((await u.download()).resultado, RESULTADO_DOWNLOAD.SEM_CHECKSUM);
});

test('o SHA256SUMS real do projeto é lido, com prefixo de diretório', () => {
  const texto = [
    'dc6eaac2b1e33e23c2497f625376aeea0ea810e4e2134c48eafcc93e213488f6  mobile-artifacts/vanguard-1.4.2-debug.apk',
    '05ff40105941df31d4fc00ed11dd22aebd4106a75430b3d164b141877caeaa7d  mobile-artifacts/vanguard-1.4.2-release-unsigned.aab',
  ].join('\n');
  assert.equal(hashDoArquivo(texto, 'vanguard-1.4.2-debug.apk'), 'dc6eaac2b1e33e23c2497f625376aeea0ea810e4e2134c48eafcc93e213488f6');
  assert.equal(hashDoArquivo(texto, 'nao-existe.apk'), null);
});

// ── Segurança das URLs ──────────────────────────────────────────────────────

test('URL fora do repositório oficial é RECUSADA', async () => {
  // Sem isso o updater entregaria um APK de origem desconhecida — o ataque
  // que ele deveria evitar.
  const maliciosa = {
    tag_name: 'mobile-v9.9.9',
    assets: [{ name: 'vanguard-9.9.9.apk', browser_download_url: 'https://exemplo-malicioso.test/vanguard.apk' }],
    html_url: `${REPO}/releases/tag/mobile-v9.9.9`,
  };
  const normalizada = normalizarRelease(maliciosa, { urlOficial });
  assert.equal(normalizada.apk, null, 'APK de outro host não pode passar');
});

test('http simples é recusado mesmo no host certo', () => {
  assert.equal(urlOficial('http://github.com/Lucas-Belucci-Bellini/Project-Vanguard/x'), null);
});

// ── Plataformas ─────────────────────────────────────────────────────────────

test('a Web NUNCA tenta instalar APK', async () => {
  const u = updaterPadrao('1.4.3', { [API]: { json: [releaseFalsa('1.4.4')] } }, { plataforma: updaterWeb() });
  await u.checkForUpdate();
  assert.equal(u.getPlatform().podeBaixar, false);
  assert.equal((await u.download()).resultado, RESULTADO_DOWNLOAD.ERRO_REDE);
  const inst = await u.install();
  assert.equal(inst.instalou, false);
});

test('iOS não finge que o fluxo de APK serve', () => {
  const ios = updaterIos();
  assert.equal(ios.artefato, null);
  assert.equal(ios.podeBaixar, false);
  assert.ok(ios.limitacoes.some((l) => /App Store|TestFlight/.test(l)));
});

test('Android baixa e confere, mas declara que ainda não instala', async () => {
  const android = updaterAndroid();
  assert.equal(android.podeBaixar, true);
  assert.equal(android.podeVerificarChecksum, true);
  assert.equal(android.podeInstalar, false, 'sem REQUEST_INSTALL_PACKAGES não há instalação');
  assert.ok(android.limitacoes.some((l) => /REQUEST_INSTALL_PACKAGES/.test(l)));
  assert.ok(android.limitacoes.some((l) => /assinatura/.test(l)));

  const u = updaterPadrao('1.4.3', { [API]: { json: [releaseFalsa('1.4.4')] } });
  const inst = await u.install();
  assert.equal(inst.instalou, false);
  assert.equal(inst.motivo, 'PLATAFORMA_NAO_SUPORTA');
});

test('quando a instalação nativa for habilitada, as limitações somem', () => {
  // O interruptor existe para o dia em que permissão, FileProvider, plugin e
  // assinatura de produção estiverem prontos.
  const android = updaterAndroid({ podeInstalarNativamente: true });
  assert.equal(android.podeInstalar, true);
  assert.deepEqual(android.limitacoes, []);
});

// ── Histórico ───────────────────────────────────────────────────────────────

test('o histórico vem ordenado da mais nova para a mais antiga', async () => {
  const u = updaterPadrao('1.4.0', {
    [API]: { json: [releaseFalsa('1.4.2'), releaseFalsa('1.4.4'), releaseFalsa('1.4.3')] },
  });
  await u.checkForUpdate();
  assert.deepEqual(u.getHistory().map((r) => r.versao), ['1.4.4', '1.4.3', '1.4.2']);
});

test('o endpoint "latest" (objeto único) é aceito igual à lista', async () => {
  const u = updaterPadrao('1.4.3', { [API]: { json: releaseFalsa('1.4.4') } });
  assert.equal((await u.checkForUpdate()).estado, ESTADOS.DISPONIVEL);
});

test('escolherAtualizacao não inventa release quando a lista é vazia', () => {
  const d = escolherAtualizacao([], { versaoInstalada: '1.4.4' });
  assert.equal(d.estado, ESTADOS.ATUALIZADO);
  assert.equal(d.release, null);
  assert.deepEqual(d.historico, []);
});
