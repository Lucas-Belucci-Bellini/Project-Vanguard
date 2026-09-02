import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

/* A versão exibida na tela sai daqui, do mesmo `package.json` que o
 * `versionName` do Android e o gate de versão do workflow conferem. Digitar o
 * número numa terceira folha seria criar mais uma coisa para esquecer. */
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

/* Mesmo formato do Projeto Baluarte: JS puro, Vite só empacota.
 * Code-splitting por rota acontece sozinho — cada página é `import()`
 * dinâmico em `src/main.js`, então o Rollup gera um chunk por tela.
 *
 * O MapLibre NÃO é dependência npm: entra por CDN sob demanda quando a
 * tela de mapa abre (mesma estratégia do `/mapa` do Baluarte). Isso mantém
 * o bundle inicial pequeno e o motor (`src/engine/`) 100% sem dependências. */
export default defineConfig({
  root: '.',
  define: { __APP_VERSION__: JSON.stringify(version) },
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
