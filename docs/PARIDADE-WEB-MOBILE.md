# Paridade web ↔ mobile

Uma aplicação só. A diferença entre web e aplicativo deve ser apenas **quais
APIs a plataforma oferece** — nunca quais páginas existem.

    src → vite build → dist → cap sync → android/assets → APK → WebView → router → página

Uma página só é `MOBILE_IMPLEMENTED` depois de funcionar **na ponta dessa
cadeia**, não por existir em `src/pages/` nem por abrir no Chrome.

## Matriz — medida em 2026-09-02, versão 1.4.2

| Página | Web | Dist | Capacitor | Android Runtime |
| --- | :-: | :-: | :-: | :-: |
| `#/inicio` | ✅ | ✅ | ✅ | ✅ |
| `#/mapa` | ✅ | ✅ | ✅ | ✅ |
| `#/navegacao` | ✅ | ✅ | ✅ | ✅ |
| `#/bussola` | ✅ | ✅ | ✅ | ✅ |
| `#/socorro` | ✅ | ✅ | ✅ | ✅ |
| `#/escuta` | ✅ | ✅ | ✅ | ✅ |
| `#/noturno` | ✅ | ✅ | ✅ | ✅ |
| `#/doar` | ✅ | ✅ | ✅ | ✅ |
| `#/contexto` | ✅ | ✅ | ✅ | ✅ |
| `#/sobrevivencia` | ✅ | ✅ | ✅ | ✅ |
| `#/sobre` | ✅ | ✅ | ✅ | ✅ |
| `#/diagnostico` | ✅ | ✅ | ✅ | ✅ |
| `#/tiro` (legada) | ✅ | ✅ | ✅ | ✅ |

### De onde vem cada coluna

Nenhum `✅` foi escrito sem evidência.

| Coluna | Como foi medida |
| --- | --- |
| **Web** | `npm run verificar:rotas` — 13 rotas renderizam num Chromium a 320 e 390 px, sem exceção e sem vazamento horizontal. |
| **Dist** | O chunk da página existe em `dist/assets/` depois de `npm run build`. |
| **Capacitor** | `npm run verificar:paridade` — 49 arquivos do `dist` presentes em `android/app/src/main/assets/public` com **SHA-256 idêntico**, mais os 2 que o Capacitor injeta. |
| **Android Runtime** | `npm run verificar:webview` — os **assets do APK**, servidos em `http://localhost` com user agent de Android: abre a rota, sai para outra, volta, e nenhum erro de router, bundle, asset ou WebView. |

### O que estas colunas ainda não provam

**Aparelho físico.** A WebView do sistema, as permissões concedidas pelo
usuário, os plugins nativos (câmera, GPS em background, notificação) e o
comportamento de instalação só existem no aparelho. A matriz cobre a cadeia até
os bytes empacotados e o comportamento deles na origem da WebView — não
substitui abrir o APK num telefone.

## Antes de publicar um APK

```bash
npm test                      # motor e contratos
npm run mobile:sync:android   # build + cap sync + guarda de paridade
npm run verificar:webview     # as rotas nos bytes que vão para o APK
```

A guarda de paridade roda dentro do `mobile:sync:android`, então o workflow de
release a executa antes de qualquer Gradle: se os assets do Android
divergirem do `dist`, o build falha **no CI**, não no seu bolso.

## Se uma página aparece no site e não no aplicativo

Abra **`#/diagnostico`** e leia o grupo **BUILD / RUNTIME**:

| Campo | O que ele responde |
| --- | --- |
| Versão do app | A versão que está rodando. Compare com a release. |
| Bundle web | `versao+commit.AAAAMMDDHHMM` — identifica o build exato. |
| Commit | O SHA que gerou este bundle. |
| Execução | `APLICATIVO · android` ou `NAVEGADOR · web`. |
| Origem | `http://localhost` no aplicativo; o domínio no site. |
| Contexto seguro | Se não, não há service worker — e não há cache offline. |
| Service worker | Registrado, controlando, ou ausente. |

**Se a versão na tela for menor que a da release, o APK instalado é antigo** —
e a causa mais comum é conhecida: a chave de assinatura mudou na 1.3.2
(ADR-0042), e o Android **recusa** instalar por cima de 1.1.0/1.2.0. A
instalação falha e o aparelho continua na versão antiga.

O caminho é desinstalar e instalar de novo. Da 1.3.2 em diante toda build
assina igual, e a atualização normal volta a funcionar.

## Regra

Não marque uma página como concluída porque ela existe em `src/pages/`, aparece
no menu ou passa no `npm test`. Ela está concluída quando

    SRC + BUILD + DIST + CAPACITOR + APP

têm a mesma implementação funcional — e há evidência de cada etapa.
