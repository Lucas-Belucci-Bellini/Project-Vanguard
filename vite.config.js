import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

/* A versão exibida na tela sai daqui, do mesmo `package.json` que o
 * `versionName` do Android e o gate de versão do workflow conferem. Digitar o
 * número numa terceira folha seria criar mais uma coisa para esquecer. */
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

/* Identidade do build.
 *
 * Sem isto não há como responder a pergunta que custou esta investigação:
 * "o aplicativo instalado é o desta versão?". O commit e o identificador do
 * build viajam com o bundle e aparecem em `#/diagnostico` — comparar o que
 * está no aparelho com o que está na release vira leitura de tela, não
 * arqueologia de APK. Nada aqui é segredo: é o mesmo SHA público do repositório.
 *
 * O identificador do build também é o que versiona o cache do service worker.
 * Ele PRECISA mudar a cada build, senão o cache antigo sobrevive à atualização
 * e o app continua rodando o bundle velho — que é exatamente o defeito que
 * esta rodada corrige. */
function commitAtual() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 12);
  try {
    return execSync('git rev-parse --short=12 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'sem-git';
  }
}
const commit = commitAtual();
/* Data em vez de `Date.now()`: um build refeito no mesmo minuto com o mesmo
 * commit produz o mesmo identificador, o que mantém o artefato comparável. */
const buildId = `${version}+${commit}.${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}`;

/* Mesmo formato do Projeto Baluarte: JS puro, Vite só empacota.
 * Code-splitting por rota acontece sozinho — cada página é `import()`
 * dinâmico em `src/main.js`, então o Rollup gera um chunk por tela.
 *
 * O MapLibre NÃO é dependência npm: entra por CDN sob demanda quando a
 * tela de mapa abre (mesma estratégia do `/mapa` do Baluarte). Isso mantém
 * o bundle inicial pequeno e o motor (`src/engine/`) 100% sem dependências. */
export default defineConfig({
  root: '.',
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_COMMIT__: JSON.stringify(commit),
    __BUILD_ID__: JSON.stringify(buildId),
  },
  publicDir: 'public',
  server: { port: 5174, host: true, open: false, strictPort: false, allowedHosts: ['localhost', '.manus.computer'] },
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: false,
    emptyOutDir: true,
    /* O MapLibre pesa ~800 kB e já sai em chunk próprio, carregado só quando
     * a tela de mapa abre — que é exatamente o que o aviso padrão pediria
     * para fazer. Subimos o limite para o aviso não virar ruído permanente. */
    chunkSizeWarningLimit: 900
  }
});
