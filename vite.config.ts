import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig({
  // Relative base: design-sandbox is a private repo, so GitHub Pages serves
  // from an access-controlled root domain, not moverdc.github.io/design-sandbox/.
  // A relative base makes built assets resolve wherever the page is served.
  base: process.env.VITE_BASE_PATH ?? './',
  plugins: [react(), tsconfigPaths()],
  css: {
    postcss: './postcss.config.cjs',
  },
  resolve: {
    alias: {
      'styled-system': path.resolve(__dirname, './styled-system'),
    },
  },
})
