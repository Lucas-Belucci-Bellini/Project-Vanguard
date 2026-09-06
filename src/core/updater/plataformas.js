/**
 * O que cada plataforma consegue fazer de verdade com uma atualização.
 *
 * ## Por que isto reporta capacidade em vez de executar
 *
 * O item 12 do pedido é explícito: *"Não criar workaround para ignorar isso."*
 * E há o que ignorar. Hoje, neste repositório:
 *
 * - a pipeline gera **APK debug** e **AAB release não assinado** — nenhum dos
 *   dois é artefato de produção;
 * - o `AndroidManifest.xml` **não** declara `REQUEST_INSTALL_PACKAGES`, sem a
 *   qual o Android não deixa um app iniciar a instalação de outro;
 * - não há plugin de sistema de arquivos nem `FileProvider` configurado, então
 *   o app não tem onde gravar o APK de modo que o instalador do sistema
 *   consiga lê-lo.
 *
 * Fingir que instala e falhar no aparelho seria pior que não oferecer: o
 * usuário ficaria sem saber se atualizou. Então cada plataforma declara o que
 * suporta, a interface pergunta antes de oferecer, e o que falta aparece
 * escrito — inclusive no diagnóstico.
 *
 * Quando a instalação nativa for habilitada (permissão + FileProvider + plugin
 * + assinatura de produção), muda-se `podeInstalar` para true e a interface
 * passa a oferecer o passo, sem tocar no resto do updater.
 */

export const CAPACIDADES = Object.freeze({
  BAIXAR: 'baixar',
  VERIFICAR_CHECKSUM: 'verificarChecksum',
  INSTALAR: 'instalar',
  ABRIR_PAGINA: 'abrirPagina',
});

/**
 * Android. Baixa e confere, mas **não instala** — e diz por quê.
 *
 * Baixar e conferir já tem valor sozinho: o usuário sai do fluxo "abrir
 * navegador → GitHub → Releases → procurar → baixar" e recebe um arquivo cuja
 * integridade o próprio aplicativo confirmou.
 */
export function updaterAndroid({ podeInstalarNativamente = false } = {}) {
  return {
    nome: 'android',
    artefato: 'apk',
    podeBaixar: true,
    podeVerificarChecksum: true,
    podeInstalar: podeInstalarNativamente,
    podeAbrirPagina: true,
    // Some quando `podeInstalar` for true — é a lista do que falta habilitar.
    limitacoes: podeInstalarNativamente ? [] : [
      'A instalação a partir do aplicativo exige a permissão REQUEST_INSTALL_PACKAGES, um FileProvider e um plugin nativo de instalação — nenhum deles está configurado.',
      'A pipeline publica APK debug e AAB não assinado; nenhum dos dois é artefato de produção.',
      'A atualização precisa manter a continuidade de assinatura exigida pelo Android: um APK com certificado diferente não substitui o instalado.',
    ],
  };
}

/**
 * iOS. Não existe instalação de arquivo por fora da loja — e o fluxo de APK
 * não serve aqui (item 23). O que o app pode fazer é avisar e apontar.
 */
export function updaterIos() {
  return {
    nome: 'ios',
    artefato: null,
    podeBaixar: false,
    podeVerificarChecksum: false,
    podeInstalar: false,
    podeAbrirPagina: true,
    limitacoes: [
      'No iOS a distribuição passa pela App Store ou por TestFlight; o aplicativo não instala arquivo por conta própria.',
      'Este repositório ainda não publica artefato iOS (`ios_artifact=false` no manifesto de build).',
    ],
  };
}

/**
 * Web. Nunca tenta instalar APK (item 24): mostra as versões e aponta o canal
 * de distribuição. A atualização do próprio site é do service worker, que é
 * outro caminho e já existe.
 */
export function updaterWeb() {
  return {
    nome: 'web',
    artefato: null,
    podeBaixar: false,
    podeVerificarChecksum: false,
    podeInstalar: false,
    podeAbrirPagina: true,
    limitacoes: [
      'No navegador a atualização do aplicativo é feita pelo service worker; o APK não se aplica.',
    ],
  };
}

/** Escolhe pela plataforma de execução, sem que a interface precise saber. */
export function detectarUpdaterDePlataforma({ nativo = false, plataforma = 'web', podeInstalarNativamente = false } = {}) {
  if (nativo && plataforma === 'android') return updaterAndroid({ podeInstalarNativamente });
  if (nativo && plataforma === 'ios') return updaterIos();
  return updaterWeb();
}
